const db = require('../connect');

/**
 * Ottiene l'ID della funzione basato sul nome della tabella
 * @param {string} tableName - Nome della tabella da cercare
 * @returns {Promise<number|null>} - ID della funzione associata alla tabella o null se non trovata
 */
function getFunctionIdByTableName(tableName) {
  return new Promise((resolve, reject) => {
    if (!tableName) {
      return resolve(null);
    }
    
    const query = `
      SELECT EFU_Id_Funzioni 
      FROM ANS_Funzioni 
      WHERE EFU_NomeTabella = ? 
      AND EFU_StatoRecord = 'A' 
      LIMIT 1
    `;
    
    db.query(query, [tableName], (err, results) => {
      if (err) {
        console.error('Errore durante la ricerca dell\'ID funzione:', err);
        return reject(err);
      }
      
      if (results && results.length > 0) {
        resolve(results[0].EFU_Id_Funzioni);
      } else {
        // Se non troviamo un match esatto, cerchiamo un match parziale
        const fallbackQuery = `
          SELECT EFU_Id_Funzioni 
          FROM ANS_Funzioni 
          WHERE EFU_NomeTabella LIKE ? 
          AND EFU_StatoRecord = 'A' 
          LIMIT 1
        `;
        
        db.query(fallbackQuery, [`%${tableName}%`], (fallbackErr, fallbackResults) => {
          if (fallbackErr) {
            console.error('Errore durante la ricerca dell\'ID funzione (fallback):', fallbackErr);
            return reject(fallbackErr);
          }
          
          if (fallbackResults && fallbackResults.length > 0) {
            resolve(fallbackResults[0].EFU_Id_Funzioni);
          } else {
            // Se ancora non troviamo nulla, restituiamo l'ID di default
            console.warn(`Nessuna funzione trovata per la tabella ${tableName}, usando ID di default (10)`);
            resolve(10); // ID di default per le operazioni generali
          }
        });
      }
    });
  });
}

module.exports = {
  getFunctionIdByTableName
};
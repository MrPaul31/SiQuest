// middleware/checkOperationPermission.js
const db = require('../connect');

/**
 * Middleware to verify permissions for a list of operations.
 *
 * @param {string[]} operationTypes - Array of operations (e.g. ['access', 'insert', 'modify', 'advanced']).
 * @param {number} functionId - The ID of the function to check (relates to ANS_ElencoFunzioni).
 */
function checkOperationPermission(operationTypes, functionId) {
  return (req, res, next) => {
    const userGroupId = req.user.UTE_Id_GruppiAbilitazioni;

    const query = `
      SELECT ABO_Accesso, ABO_Inserimento, ABO_Modifica, ABO_GestioneAvanzata
      FROM ANS_AbilitazioniOperazioni
      WHERE ABO_Id_Funzioni = ? 
        AND ABO_Id_GruppiAbilitazioni = ?
        AND ABO_StatoRecord = 'A'
    `;

    db.query(query, [functionId, userGroupId], (err, results) => {
      if (err) {
        console.error('Errore durante il controllo dei permessi:', err);
        return res.status(500).json({ message: 'Errore interno del server' });
      }
      console.log("Permessi per l'utente per la funzione", functionId, results);
      if (results.length === 0) {
        return res.status(403).json({ message: 'Permesso non trovato per questa funzione' });
      }
      
      const perms = results[0];

      // Map each operation to its corresponding permission field
      const permissionMapping = {
        access: perms.ABO_Accesso,
        insert: perms.ABO_Inserimento,
        modify: perms.ABO_Modifica,
        advanced: perms.ABO_GestioneAvanzata
      };

      // Verify that every specified operation is allowed (equals 1)
      for (const operation of operationTypes) {
        if (permissionMapping[operation] !== 1) {
          return res.status(403).json({ message: `Permesso non autorizzato per l'operazione: ${operation}` });
        }
      }

      // All specified operations are allowed, proceed to the next middleware/handler
      next();
    });
  };
}

module.exports = checkOperationPermission;

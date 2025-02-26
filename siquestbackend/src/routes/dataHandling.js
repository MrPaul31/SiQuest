const express = require('express');
const router = express.Router();
const db = require('../connect');
const { validateSession } = require('../utility');

const checkOperationPermission = require("../middleware/checkOperationPermission");

const allowedTables = [
  'ANS_Utenti',
  'ANS_Questionari',
  'ANS_DomandeQuestionari',
  'ANS_RisposteQuestionari',
  'CNF_RisposteProposte',
  'ANS_TipiDomande',
  'DOM_TipiDomande',
  // Add more tables as needed
];
function findStatoRecordColumn(tableName) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW COLUMNS FROM ${tableName}`;
    db.query(sql, (err, columns) => {
      if (err) {
        return reject(err);
      }
      const attivitaColumn = columns.find((col) => col.Field.endsWith('StatoRecord'));
      if (!attivitaColumn) {
        // No matching column found, resolve with null or handle as needed
        return resolve(null);
      }
      resolve(attivitaColumn.Field);
    });
  });
}


// Questa rotta è destinata a servire la funzione ANS_RisposteQuestionari (ID 5)
// e per questo motivo applichiamo il middleware checkOperationPermission per il tipo "access".
router.post(
  "/risposteQuestionari",
  validateSession,
  checkOperationPermission(["access"], 5),
  async (req, res) => {
    try {
      const { tableName, filtro } = req.body;

      if (!tableName) {
        console.error("❌ ERRORE: Nome della tabella mancante!");
        return res.status(400).json({ message: "Nome della tabella mancante" });
      }

      if (!allowedTables.includes(tableName)) {
        console.error(`❌ ERRORE: Nome tabella non valido (${tableName})`);
        return res.status(400).json({ message: "Nome della tabella non valido" });
      }

      console.log("✅ Tabella valida:", tableName);

      // Ripristino della rilevazione dinamica della colonna "StatoRecord"
      const statoAttivitaColumn = await findStatoRecordColumn(tableName);
      console.log("📌 Colonna stato attività:", statoAttivitaColumn);

      let query = `SELECT * FROM \`${tableName}\` WHERE \`${statoAttivitaColumn}\` = 'A'`;
      let params = [];

      if (filtro && Object.keys(filtro).length > 0) {
        // Se il filtro contiene la descrizione del questionario, la processiamo separatamente.
        if (filtro.QUE_Descrizione) {
          query += " AND `RQU_IdRif_Questionari` IN (SELECT `QUE_IdRif_Questionari` FROM `ANS_Questionari` WHERE `QUE_Descrizione` LIKE ?)";
          params.push(`%${filtro.QUE_Descrizione}%`);
        }

        Object.keys(filtro).forEach((key) => {
          // Saltiamo il filtro per la descrizione, già processato.
          if (key === "QUE_Descrizione") {
            return;
          }
          
          if (key === "RQU_DataOraInserimento" && filtro[key].between) {
            query += ` AND \`${key}\` BETWEEN ? AND ?`;
            params.push(filtro[key].between[0], filtro[key].between[1]);
          } else {
            query += ` AND \`${key}\` = ?`;
            params.push(filtro[key]);
            // Questo sembra un adattamento particolare: sommiamo 1 al valore del parametro.
            params[params.length - 1] = params[params.length - 1] + 1;
          }
        });
      } else {
        console.log("📡 Nessun filtro applicato, restituisco tutti i dati.");
      }

      console.log("🛠 Query generata:", query);
      console.log("🔗 Parametri SQL:", params);

      db.query(query, params, (err, results) => {
        if (err) {
          console.error("❌ ERRORE SQL:", err);
          return res.status(500).json({ error: "Errore del server" });
        }
        res.json({ data: results, tableName });
      });
    } catch (err) {
      console.error("❌ ERRORE GENERALE:", err);
      res.status(500).json({ error: err.message });
    }
  }
);


const permissionMiddleware = (req, res, next) => {
  let operationType;
  if (req.body.operation && req.body.operation === 'read') {
    operationType = 'access';
  } else if (req.body.changes && Array.isArray(req.body.changes)) {
    // Per semplicità, se almeno una operazione è "create" si richiede il permesso "insert"
    if (req.body.changes.some(change => change.operation === 'create')) {
      operationType = 'insert';
    } else if (req.body.changes.some(change => change.operation === 'update' || change.operation === 'delete')) {
      operationType = 'modify';
    } else {
      return res.status(400).json({ message: 'Operazione non riconosciuta' });
    }
  } else {
    return res.status(400).json({ message: 'Payload non valido' });
  }
  // Specifica il functionId (da sostituire con il valore appropriato)
  const functionId = 123;
  return checkOperationPermission(operationType, functionId)(req, res, next);
};

/**
 * Endpoint CRUD per operazioni dinamiche su una tabella.
 * Supporta:
 * - Lettura (read) con filtri dinamici
 * - Operazioni create, update, delete (con transazione MySQL)
 */
router.post('/crudTabella',validateSession, permissionMiddleware, async (req, res) => {
  const { tableName } = req.body;
  if (!tableName) {
    return res.status(400).json({ message: 'Nome della tabella mancante' });
  }
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Nome della tabella non valido' });
  }

  // Se l'operazione richiesta è "read" (lettura) con filtri dinamici
  if (req.body.operation && req.body.operation === 'read') {
    const { filters } = req.body;
    try {
      const prefix = await getPrefixFromTable(tableName);
      // Costruzione dinamica della clausola WHERE
      let whereClauses = [];
      let values = [];
      if (filters) {
        for (const [field, condition] of Object.entries(filters)) {
          if (typeof condition === 'object' && condition !== null && condition.from && condition.to) {
            // Filtro per range di date (BETWEEN)
            whereClauses.push(`${field} BETWEEN ? AND ?`);
            values.push(formatDateForMySQL(condition.from), formatDateForMySQL(condition.to));
          } else if (typeof condition === 'string') {
            // Filtro LIKE per le stringhe
            whereClauses.push(`${field} LIKE ?`);
            values.push(`%${condition}%`);
          } else {
            // Filtro per corrispondenza esatta (numeri, ecc.)
            whereClauses.push(`${field} = ?`);
            values.push(condition);
          }
        }
      }
      const whereClause = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
      const query = `SELECT * FROM ${tableName} ${whereClause}`;
      db.query(query, values, (err, results) => {
        if (err) {
          console.error('Errore durante l\'esecuzione della query di read:', err);
          return res.status(500).json({ error: err.message });
        }
        return res.status(200).json(results);
      });
    } catch (error) {
      console.error('Errore durante la read operation:', error);
      return res.status(500).json({ error: error.message });
    }
  }
  // Gestione delle operazioni create/update/delete
  else if (req.body.changes && Array.isArray(req.body.changes)) {
    const { changes } = req.body;
    try {
      const statoRecordColumn = await findStatoRecordColumn(tableName);
      if (!statoRecordColumn) {
        return res.status(400).json({ message: 'Colonna StatoRecord non trovata' });
      }
      const prefix = await getPrefixFromTable(tableName);
      const idField = await getPrimaryKeyField(tableName);

      // Ottenimento di una connessione e avvio della transazione
      db.getConnection((connErr, connection) => {
        if (connErr) {
          console.error('Errore di connessione:', connErr);
          return res.status(500).json({ error: connErr.message });
        }

        connection.beginTransaction(async (txErr) => {
          if (txErr) {
            connection.release();
            console.error('Errore durante l\'inizio della transazione:', txErr);
            return res.status(500).json({ error: txErr.message });
          }

          try {
            // Elaborazione sequenziale di ogni operazione contenuta in changes
            for (const change of changes) {
              const { operation, ...data } = change;
              if (!operation) {
                throw new Error('Tipo di operazione mancante per una delle righe');
              }

              if (operation === 'update') {
                if (!data[idField]) {
                  throw new Error(`ID mancante per l'aggiornamento (campo atteso: ${idField})`);
                }
                const id = data[idField];
                delete data[idField]; // Escludo la chiave primaria dai campi da aggiornare
                const fields = Object.keys(data);
                const values = Object.values(data);
                const setClause = fields.map(field => `${field} = ?`).join(', ');
                const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`;
                values.push(id);

                await new Promise((resolve, reject) => {
                  connection.query(updateQuery, values, (err, results) => {
                    if (err) {
                      console.error(`Errore nell'update della riga con ID ${id}:`, err);
                      return reject(err);
                    }
                    resolve(results);
                  });
                });
              } else if (operation === 'create') {
                // Calcolo del nuovo ID incrementale
                const getLastIdQuery = `SELECT COALESCE(MAX(${idField}), 0) + 1 AS newId FROM ${tableName}`;
                const lastIdResults = await new Promise((resolve, reject) => {
                  connection.query(getLastIdQuery, (err, results) => {
                    if (err) {
                      console.error('Errore nel recupero dell\'ultimo ID:', err);
                      return reject(err);
                    }
                    resolve(results);
                  });
                });
                const newId = lastIdResults[0].newId;
                data[idField] = newId;
                // Creazione del campo di riferimento dinamico (es. UTE_IdRif_Utenti)
                const tableSuffix = tableName.substring(prefix.length);
                data[`${prefix}IdRif_${tableSuffix}`] = newId;
                // Impostazione dei campi di validità e audit
                data[`${prefix}InizioValidita`] = formatDateForMySQL(new Date().toISOString());
                data[`${prefix}StatoRecord`] = 'A';
                data[`${prefix}UtenteInserimento`] = req.ip;
                data[`${prefix}Utente`] = 0;
                data[`${prefix}Terminale`] = req.ip;
                data[`${prefix}TerminaleInserimento`] = req.ip;

                const fields = Object.keys(data);
                const values = Object.values(data);
                const placeholders = fields.map(() => '?').join(', ');
                const insertQuery = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

                await new Promise((resolve, reject) => {
                  connection.query(insertQuery, values, (err, results) => {
                    if (err) {
                      console.error('Errore durante l\'inserimento della nuova riga:', err);
                      return reject(err);
                    }
                    resolve(results);
                  });
                });
              } else if (operation === 'delete') {
                if (!data[idField]) {
                  throw new Error(`ID mancante per la cancellazione (campo atteso: ${idField})`);
                }
                const id = data[idField];
                // Cancellazione logica: si aggiorna la colonna StatoRecord a 'C'
                const deleteQuery = `UPDATE ${tableName} SET ${statoRecordColumn} = 'C' WHERE ${idField} = ?`;
                await new Promise((resolve, reject) => {
                  connection.query(deleteQuery, [id], (err, results) => {
                    if (err) {
                      console.error(`Errore nell'aggiornamento di StatoRecord per l'ID ${id}:`, err);
                      return reject(err);
                    }
                    resolve(results);
                  });
                });
              } else {
                throw new Error(`Operazione non supportata: ${operation}`);
              }
            }

            // Commit della transazione
            connection.commit((commitErr) => {
              if (commitErr) {
                connection.rollback(() => {
                  connection.release();
                  console.error('Errore nel commit della transazione:', commitErr);
                  return res.status(500).json({ error: commitErr.message });
                });
              } else {
                connection.release();
                return res.status(200).json({ message: 'Operazioni eseguite con successo' });
              }
            });
          } catch (error) {
            // Rollback in caso di errore
            connection.rollback(() => {
              connection.release();
              console.error('Errore nella transazione:', error);
              return res.status(500).json({ error: error.message });
            });
          }
        });
      });
    } catch (err) {
      console.error('Errore durante l\'esecuzione delle operazioni:', err);
      return res.status(500).json({ error: err.message });
    }
  } else {
    return res.status(400).json({ message: 'Payload non valido. Inviare "operation": "read" oppure un array "changes" per create/update/delete.' });
  }
});




// Export the router so it can be used in routes.js
module.exports = router;
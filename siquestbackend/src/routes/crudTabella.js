// routes/crudTabella.js

// Import dei moduli necessari
const express = require('express');
const router = express.Router();
const db = require('../connect'); // modulo di connessione al DB MySQL (es. pool di connessioni)
// Import del middleware per il controllo dei permessi
const checkOperationPermission = require('../middleware/checkOperationPermission');

// Lista delle tabelle autorizzate
const allowedTables = [
  'ANS_Utenti',
  'ANS_Questionari',
  'ANS_DomandeQuestionari',
  'ANS_RisposteQuestionari',
  'CNF_RisposteProposte',
  'ANS_TipiDomande',
  'DOM_TipiDomande'
  // Aggiungere altre tabelle se necessario
];

/**
 * Funzione helper per ottenere la chiave primaria di una tabella.
 * Viene eseguita una query SHOW KEYS per recuperare la primary key.
 */
function getPrimaryKeyField(tableName) {
  return new Promise((resolve, reject) => {
    const sql = `SHOW KEYS FROM ${tableName} WHERE Key_name = 'PRIMARY'`;
    db.query(sql, (err, keys) => {
      if (err) {
        console.error(`Errore fetching primary key per la tabella ${tableName}:`, err);
        return reject(err);
      }
      if (!keys || keys.length === 0) {
        return reject(new Error(`Primary key non trovata per la tabella ${tableName}`));
      }
      resolve(keys[0].Column_name);
    });
  });
}

/**
 * Funzione helper per recuperare il prefisso associato ad una tabella.
 * Si assume che la chiave primaria sia formattata come "PREFIX_Id_NomeTabella".
 */
async function getPrefixFromTable(tableName) {
  try {
    const pkField = await getPrimaryKeyField(tableName);
    const index = pkField.indexOf('Id');
    if (index > 0) {
      return pkField.substring(0, index); // Es. "UTE_" da "UTE_Id_Utenti"
    }
    return '';
  } catch (err) {
    throw err;
  }
}

/**
 * Funzione helper per recuperare il nome della colonna StatoRecord.
 * Si assume che la colonna segua il pattern: prefix + "StatoRecord".
 */
async function findStatoRecordColumn(tableName) {
  try {
    const prefix = await getPrefixFromTable(tableName);
    return prefix + "StatoRecord";
  } catch (err) {
    throw err;
  }
}

/**
 * Funzione helper per formattare una data nel formato MySQL (YYYY-MM-DD HH:mm:ss).
 */
function formatDateForMySQL(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2);
  const day = ('0' + date.getDate()).slice(-2);
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  const seconds = ('0' + date.getSeconds()).slice(-2);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Funzione helper che restituisce un array di campi data/ora dato un prefisso.
 */
function getDateTimeFields(prefix) {
  return [
    `${prefix}DataInserimento`,
    `${prefix}DataModifica`,
    `${prefix}InizioValidita`,
    `${prefix}FineValidita`
  ];
}

/**
 * Middleware per verificare i permessi in base all'operazione.
 * In questo caso, si determina il tipo di operazione:
 * - "read"   => 'access'
 * - "create" => 'insert'
 * - "update" e "delete" => 'modify'
 * 
 * Il functionId è fisso per questo endpoint (sostituire con il valore reale).
 */
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
router.post('/crudTabella', permissionMiddleware, async (req, res) => {
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

// Esportazione del router
module.exports = router;

// routes.js
const express = require('express');
const router = express.Router();
const db = require('./connect');

const { logActivity, validateSession } = require('./utility');
const bcrypt = require('bcrypt');

// ins admin(one time used method)
router.post('/utenteIns', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
    }

    // tiro fuori i parametri dalla tabella parametri
    const checkParamsQuery = `
      SELECT PAR_Codice, PAR_Descrizione 
      FROM ANS_Parametri 
      WHERE PAR_Codice IN ('CONFIG', 'DURATASESSIONE')
    `;

    db.query(checkParamsQuery, async (err, paramResults) => {
      if (err) {
        console.error('Errore durante il controllo dei parametri:', err);
        return res.status(500).json({ message: 'Errore durante il controllo dei parametri' });
      }

      // Conversione dei risultati in un oggetto
      const params = {};
      paramResults.forEach(row => {
        params[row.PAR_Codice] = row.PAR_Descrizione;
      });

      // Verifica CONFIG
      if (params['CONFIG'] !== '1') {
        return res.status(400).json({ message: 'CONFIG non è impostato a 1' });
      }

      // Verifica se l'username esiste già
      const checkUsernameQuery = `
        SELECT UTE_NomeUtente 
        FROM ANS_Utenti 
        WHERE UTE_NomeUtente = ?
      `;

      db.query(checkUsernameQuery, [username], async (err, userResults) => {
        if (err) {
          console.error('Errore durante il controllo del nome utente:', err);
          return res.status(500).json({ message: 'Errore durante il controllo del nome utente' });
        }

        if (userResults.length > 0) {
          return res.status(400).json({ message: 'Nome utente già esistente' });
        }

        // Durata della sessione presa dalla tabella dei parametri
        const sessionDuration = params['DURATASESSIONE'];
        if (!sessionDuration) {
          return res.status(404).json({ message: 'Durata sessione non trovata nei parametri' });
        }

        // Hashing della password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hashSync(password, saltRounds);

        // Inserimento dell'utente amministratore
        const insertAdminQuery = `
          INSERT INTO ANS_Utenti (
            UTE_NomeUtente, 
            UTE_Password, 
            UTE_Email, 
            UTE_LivelloAbilitazione, 
            UTE_DurataSessione, 
            UTE_inizioValidita,
            UTE_DataOraInserimento,
            UTE_StatoRecord,
            UTE_Utente,
            UTE_Terminale 

          ) 
          VALUES (?, ?, ?, 1, ?, NOW(), NOW(), ?, ?,?)
        `;
        const utente = 0;
        const terminale = req.ip;
        const statoRecord = "A"
        db.query(insertAdminQuery, [username, hashedPassword, email, sessionDuration, statoRecord, utente, terminale], (err) => {
          if (err) {
            console.error('Errore durante l\'inserimento dell\'utente amministratore:', err);
            return res.status(500).json({ message: 'Errore durante l\'inserimento dell\'utente amministratore' });
          }

          // Imposta CONFIG a 0
          const updateConfigQuery = `
            UPDATE ANS_Parametri 
            SET PAR_Descrizione = 0 
            WHERE PAR_Codice = 'CONFIG'
          `;

          db.query(updateConfigQuery, (err) => {
            if (err) {
              console.error('Errore durante l\'aggiornamento del parametro CONFIG:', err);
              return res.status(500).json({ message: 'Errore durante l\'aggiornamento del parametro CONFIG' });
            }

            res.status(201).json({ message: 'Utente amministratore inserito con successo' });
          });
        });
      });
    });
  } catch (err) {
    console.error('Errore imprevisto:', err);
    res.status(500).json({ message: 'Errore imprevisto' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // verifico se i campi sono stati inseriti
    if (!username || !password) {
      return res.status(400).json({ message: 'Nome utente e password sono obbligatori' });
    }

    // trovo l'utente
    const findUserQuery = `
      SELECT UTE_Password, UTE_DurataSessione 
      FROM ANS_Utenti 
      WHERE UTE_NomeUtente = ?
    `;

    db.query(findUserQuery, [username], async (err, userResults) => {
      if (err) {
        console.error('Errore durante la ricerca dell\'utente:', err);
        return res.status(500).json({ message: 'Errore interno del server' });
      }
      console.log(userResults);
      // Controllo se l'utente esiste
      if (userResults.length === 0) {
        return res.status(401).json({ message: 'Nome utente o password errati' });
      }

      const { UTE_Password: hashedPassword, UTE_DurataSessione: sessionDuration } = userResults[0];
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Nome utente o password errati' });
      }

      // token di sessione
      const timestamp = Date.now();
      const clientIp = req.ip;
      const sessionString = `${username}|${clientIp}|${timestamp}`;
      const token = Buffer.from(sessionString).toString('base64');

      // Calcolo della fine validità
      const sessionDurationMinutes = sessionDuration || 30; // da specificare
      const fineValidita = new Date(timestamp + sessionDurationMinutes * 60000); // minuti in millisecondi convertiti

      // inserimento della sessione nel db
      const insertSessionQuery = `
  INSERT INTO ANS_Sessioni (
    SSN_Sessione, 
    SSN_InizioValidita, 
    SSN_FineValidita, 
    SSN_Utente, 
    SSN_Terminale,
    SSN_StatoRecord
  )
  VALUES (?, NOW(), ?, ?, ?, ?)
`;

      db.query(insertSessionQuery, [token, fineValidita, 0, clientIp, "A"], (err) => {
        if (err) {
          console.error('Errore durante l\'inserimento della sessione:', err);
          return res.status(500).json({ message: 'Errore interno del server' });
        }

        return res.status(200).json({ message: 'Accesso effettuato con successo', token });
      });
    });
  } catch (err) {
    console.error('Errore imprevisto durante il login:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Token di sessione mancante' });
  }

  const deleteSessionQuery = `
    DELETE FROM SIS_Sessioni WHERE SSN_Sessione = ?
  `;

  db.query(deleteSessionQuery, [token], (err) => {
    if (err) {
      console.error('Errore durante la cancellazione della sessione:', err);
      return res.status(500).json({ message: 'Errore interno del server' });
    }

    return res.status(200).json({ message: 'Logout effettuato con successo' });
  });
});


router.post('/listaRecords', (req, res) => {
  const { tableName, filtro } = req.body;

  if (!tableName) {
    return res.status(400).json({ message: 'Nome della tabella mancante' });
  }

  // Validate the table name against a list of allowed tables
  const allowedTables = ['ANS_Questionari', 'ANS_RisposteQuestionari', 'ANS_RisposteQuestionari', 'CNF_RisposteProposte', 'ANS_Utenti']; // Add other table names if needed
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Nome della tabella non valido' });
  }

  let query = `SELECT * FROM ${tableName}`;
  const params = [];

  if (filtro) {
    // Add conditions to the query based on the filter
    // Ensure to use parameterized queries to prevent SQL injection
  }

  console.log(query);
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Errore nella query:', err);
      res.status(500).send('Errore del server');
    } else {
      console.log('Risultati:', results);
      res.json({
        data: results,
        tableName: tableName,
      });
    }
  });
});

// CHECKCONFIG
router.get('/check-config', (req, res) => {
  const queryCheck = "SELECT PAR_Codice FROM ANS_Parametri WHERE PAR_Descrizione = 1";

  db.query(queryCheck, (err, results) => {
    console.log(results);
    if (err) {
      console.error('Errore durante la verifica del parametro CONFIG:', err);
      return res.status(500).json({ allowConfig: false, message: 'Errore durante la verifica del parametro CONFIG' });
    }

    const allowConfig = results.length > 0 && results[0].PAR_Codice === "CONFIG";
    res.json({ allowConfig });
  });
});



// restituisce i dati delle chiavi esterne
router.post('/getForeignKeyData', (req, res) => {
  const { tableName } = req.body;

  // Validate tableName to prevent SQL Injection
  const allowedTables = ['ANS_Questionari', 'ANS_DomandeQuestionari', "ANS_RisposteQuestionari", "CNF_RisposteProposte", 'ANS_Utenti'/* Add other tables */];
  if (!allowedTables.includes(tableName)) {
    return res.status(400).json({ message: 'Nome della tabella non valido' });
  }

  const query = `SELECT * FROM ${tableName}`;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Errore nella query:', err);
      res.status(500).send('Errore del server');
    } else {
      res.json(results);
    }
  });


});



// Definisce una rotta GET per '/api/questionari/:id'
router.get('/api/questionari/:id', (req, res) => {
  // Estrae l'ID del questionario dai parametri della richiesta
  const questionarioId = req.params.id;

  // Query SQL per ottenere i dettagli del questionario specifico
  const questionarioQuery = `
    SELECT 
      q.QUE_Id_Questionari, 
      q.QUE_Descrizione, 
      q.QUE_Sottotitoli
    FROM ANS_Questionari q
    WHERE q.QUE_Id_Questionari = ? AND q.QUE_StatoRecord = 'A';
  `;

  // Query SQL per ottenere le domande associate al questionario
  const domandeQuery = `
    SELECT 
      d.DQU_Id_DomandeQuestionari AS DOM_Id_DomandeQuestionari, 
      d.DQU_TestoDomanda AS DOM_Descrizione,
      d.DQU_Id_TipiDomande AS DOM_TipoDomanda
    FROM ANS_DomandeQuestionari d
    WHERE d.DQU_IdRif_Questionari = ? AND d.DQU_StatoRecord = 'A';
  `;

  // Query SQL per ottenere le risposte proposte associate alle domande del questionario
  const risposteProposteQuery = `
    SELECT 
      r.RPR_Id_RisposteProposte, 
      r.RPR_Id_DomandeQuestionari, 
      r.RPR_TestoRisposta, 
      r.RPR_Ordinamento
    FROM CNF_RisposteProposte r
    WHERE r.RPR_StatoRecord = 'A' 
      AND r.RPR_Id_DomandeQuestionari IN (
        SELECT DQU_Id_DomandeQuestionari 
        FROM ANS_DomandeQuestionari 
        WHERE DQU_IdRif_Questionari = ? AND DQU_StatoRecord = 'A'
      )
    ORDER BY r.RPR_Id_DomandeQuestionari, r.RPR_Ordinamento;
  `;

  // Esegue la query per ottenere il questionario
  db.query(questionarioQuery, [questionarioId], (err, questionarioResult) => {
    if (err) {
      // Gestisce eventuali errori nell'esecuzione della query
      console.error('Errore nel recupero del questionario:', err);
      return res.status(500).json({ message: 'Errore nel recupero del questionario' });
    }

    if (questionarioResult.length === 0) {
      // Se il questionario non esiste, restituisce un errore 404
      return res.status(404).json({ message: 'Questionario non trovato' });
    }

    // Ottiene i dati del questionario
    const questionario = questionarioResult[0];

    // Esegue la query per ottenere le domande del questionario
    db.query(domandeQuery, [questionarioId], (err, domandeResult) => {
      if (err) {
        // Gestisce eventuali errori nell'esecuzione della query
        console.error('Errore nel recupero delle domande:', err);
        return res.status(500).json({ message: 'Errore nel recupero delle domande' });
      }

      // Esegue la query per ottenere le risposte proposte alle domande
db.query(risposteProposteQuery, [questionarioId], (err, risposteResult) => {
  if (err) {
    // Gestisce eventuali errori nell'esecuzione della query
    console.error('Errore nel recupero delle risposte proposte:', err);
    return res.status(500).json({ message: 'Errore nel recupero delle risposte proposte' });
  }

  // Combina le domande con le rispettive risposte proposte
  const domandeWithRisposte = domandeResult.map((domanda) => ({
    // Copia tutti i campi della domanda
    ...domanda,
    // Aggiunge un campo 'risposte' contenente le risposte relative alla domanda corrente
    risposte: risposteResult.filter(
      (risposta) => risposta.RPR_Id_DomandeQuestionari === domanda.DOM_Id_DomandeQuestionari
    ) || [],
  }));

  // Logga le domande con le risposte per debug
  console.log('Domande con Risposte:', JSON.stringify(domandeWithRisposte, null, 2));

  // Restituisce come risposta JSON il questionario completo di domande e risposte
  res.json({ ...questionario, domande: domandeWithRisposte });
});
    });
  });
});
// Definisci la rotta POST per '/api/questionari/:id/risposte'
router.post('/api/questionari/:id/risposte', (req, res) => {
  const questionarioId = req.params.id;
  const risposte = req.body.risposte; // Dati inviati dal client

  if (!risposte || !Array.isArray(risposte)) {
    return res.status(400).json({ message: 'Formato delle risposte non valido' });
  }

  // Esempio di query per inserire le risposte nel database
  const insertQuery = `
    INSERT INTO ANS_RisposteQuestionari (
      RQU_Id_DomandeQuestionari, 
      RQU_Id_RisposteProposte, 
      RQU_TestoRisposta,
      RQU_InizioValidita,
      RQU_StatoRecord,
      RQU_Utente,
      RQU_Terminale
    )
    VALUES ?
  `;
  const clientIp = req.ip;
  // Prepara i valori per l'inserimento
  const values = risposte.map((risposta) => [
    risposta.RQU_Id_DomandeQuestionari,
    risposta.RQU_Id_RisposteProposte || null,
    risposta.RQU_TestoRisposta || null,
    new Date() ,
    "A",
    0,
    clientIp
  ]);

  // Esegui la query di inserimento
  db.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error('Errore nel salvataggio delle risposte:', err);
      return res.status(500).json({ message: 'Errore nel salvataggio delle risposte' });
    }

    res.status(200).json({ message: 'Risposte salvate con successo' });
  });
});


function getPrefixFromTable(tableName, callback) {
  const query = `SHOW COLUMNS FROM ${tableName}`;
  db.query(query, (err, results) => {
    if (err) {
      return callback(err);
    }
    if (results.length === 0) {
      return callback(new Error('No columns found in the table'));
    }
    // Assume the prefix is the first three characters followed by an underscore from the first column name
    const prefix = results[0].Field.substring(0, 4); // Extract the prefix
    callback(null, prefix);
  });
}





// Route per gestire le operazioni CRUD dalla tabella
// Funzione per convertire le date nel formato MySQL
// Funzione per convertire le date nel formato MySQL
// Funzione per costruire i nomi dei campi datetime in base al prefisso
function getDateTimeFields(prefix) {
  return [
    `${prefix}DataInserimento`,
    `${prefix}DataModifica`,
    `${prefix}InizioValidita`,
    `${prefix}FineValidita`,
  ];
}

function formatDateForMySQL(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = ('0' + (date.getMonth() + 1)).slice(-2); // Mesi da 0 a 11
  const day = ('0' + date.getDate()).slice(-2);
  const hours = ('0' + date.getHours()).slice(-2);
  const minutes = ('0' + date.getMinutes()).slice(-2);
  const seconds = ('0' + date.getSeconds()).slice(-2);
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
//quando faccio la insert :
//-inserisco nella colonna  il valore di id quindi post insert valorizzi l idrif con il record appena inserito
router.post('/crudTabella', (req, res) => {
  const { tableName, changes } = req.body;

  if (!tableName || !changes || !Array.isArray(changes)) {
    return res.status(400).json({ message: 'Invalid data' });
  }

  // Get the prefix from the table columns
  getPrefixFromTable(tableName, (err, prefix) => {
    if (err) {
      console.error('Error getting prefix:', err);
      return res.status(500).json({ message: 'Error getting prefix' });
    }

    const datetimeFields = [
      `${prefix}DataInserimento`,
      `${prefix}DataModifica`,
      `${prefix}InizioValidita`,
      `${prefix}FineValidita`,
    ];

    const queryPromises = [];

    changes.forEach((change) => {
      const { operation, ...data } = change;

      if (!operation) {
        return res.status(400).json({ message: 'Operation type missing for one of the rows' });
      }

      const idField = Object.keys(data).find((field) => field.startsWith(prefix+"Id_"));

      if (!idField) {
        return res.status(400).json({ message: 'Primary key field not found in data' });
      }

      const id = data[idField];

      if (operation === 'update') {
        if (!id) {
          return res.status(400).json({ message: 'ID missing for one of the rows to update' });
        }

        delete data[idField];

        datetimeFields.forEach((field) => {
          if (data[field]) {
            data[field] = new Date(data[field]).toISOString().slice(0, 19).replace('T', ' ');
          }
        });

        const fields = Object.keys(data);
        const values = Object.values(data);
        const setClause = fields.map((field) => `${field} = ?`).join(', ');
        const updateQuery = `UPDATE ${tableName} SET ${setClause} WHERE ${idField} = ?`;

        values.push(id);

        const queryPromise = new Promise((resolve, reject) => {
          db.query(updateQuery, values, (err, results) => {
            if (err) {
              console.error(`Error updating row with ID ${id}:`, err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        queryPromises.push(queryPromise);

      } else if (operation === 'create') {
        
        delete data[idField];
        
        data[`${prefix}InizioValidita`] = new Date().toISOString().slice(0, 19).replace('T', ' ');
        data[`${prefix}StatoRecord`] = 'A';
        data[`${prefix}Utente`] = 0;
        data[`${prefix}Terminale`] = req.ip;

        datetimeFields.forEach((field) => {
          if (data[field]) {
            data[field] = new Date(data[field]).toISOString().slice(0, 19).replace('T', ' ');
          }
        });

        const fields = Object.keys(data);
        const values = Object.values(data);
        const placeholders = fields.map(() => '?').join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${fields.join(', ')}) VALUES (${placeholders})`;

        const queryPromise = new Promise((resolve, reject) => {
          db.query(insertQuery, values, (err, results) => {
            if (err) {
              console.error('Error inserting new row:', err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        queryPromises.push(queryPromise);

      } else if (operation === 'delete') {
        if (!id) {
          return res.status(400).json({ message: 'ID missing for the row to delete' });
        }

        const deleteQuery = `DELETE FROM ${tableName} WHERE ${idField} = ?`;

        const queryPromise = new Promise((resolve, reject) => {
          db.query(deleteQuery, [id], (err, results) => {
            if (err) {
              console.error(`Error deleting row with ID ${id}:`, err);
              reject(err);
            } else {
              resolve(results);
            }
          });
        });

        queryPromises.push(queryPromise);

      } else {
        return res.status(400).json({ message: `Unsupported operation: ${operation}` });
      }
    });

    Promise.all(queryPromises)
      .then(() => {
        res.status(200).json({ message: 'Operations completed successfully' });
      })
      .catch((err) => {
        console.error('Error executing operations:', err);
        res.status(500).json({ message: 'Error executing operations', error: err });
      });
  });
});



module.exports = router;
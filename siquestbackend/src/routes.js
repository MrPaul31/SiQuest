// rootteeeee
const express = require('express');
const router = express.Router();
const db = require('./connect');
const { logActivity, validateSession } = require('./utility');
const bcrypt = require('bcrypt');
const crypto = require('crypto');


// Define the global allowedTables array
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
  console.log('Richiesta di login:', req.body);
  try {
    const { username, password } = req.body;

    // Verifico se i campi sono stati inseriti
    if (!username || !password) {
      return res.status(400).json({ message: 'Nome utente e password sono obbligatori' });
    }

    // Trovo l'utente
    const findUserQuery = `
      SELECT UTE_Id_Utenti, UTE_Password, UTE_DurataSessione 
      FROM ANS_Utenti 
      WHERE UTE_NomeUtente = ?
    `;

    db.query(findUserQuery, [username], async (err, userResults) => {
      if (err) {
        console.error('Errore durante la ricerca dell\'utente:', err);
        return res.status(500).json({ message: 'Errore interno del server' });
      }
      console.log('User Results:', userResults);
  
      // Controllo se l'utente esiste
      if (userResults.length === 0) {
        return res.status(401).json({ message: 'Nome utente o password errati' });
      }

      const { UTE_Id_Utenti: userId, UTE_Password: hashedPassword, UTE_DurataSessione: sessionDuration } = userResults[0];
      const passwordMatch = await bcrypt.compare(password, hashedPassword);

      if (!passwordMatch) {
        return res.status(401).json({ message: 'Nome utente o password errati' });
      }

      const timestamp = Date.now();
      const clientIp = req.ip;
      const sessionString = `${username}|${clientIp}|${timestamp}`;
      const token = Buffer.from(sessionString).toString('base64');

      // Calcolo della fine validità
      const sessionDurationMinutes = sessionDuration || 30; // Durata della sessione in minuti
      const fineValidita = new Date(Date.now() + sessionDurationMinutes * 60000); // Data di scadenza

      // Inserimento della sessione nel database
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

      db.query(insertSessionQuery, [token, fineValidita, userId, clientIp, "A"], (err) => {
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
router.post('/logout', validateSession, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];

    const deleteSessionQuery = `
      DELETE FROM ANS_Sessioni WHERE SSN_Sessione = ?
    `;

    db.query(deleteSessionQuery, [token], (err) => {
      if (err) {
        console.error('Errore durante la cancellazione della sessione:', err);
        return res.status(500).json({ message: 'Errore interno del server' });
      }

      res.status(200).json({ message: 'Logout effettuato con successo.' });
    });
  } catch (err) {
    console.error('Errore durante il logout:', err);
    res.status(500).json({ message: 'Errore interno del server' });
  }
});



router.get('/api/questionari/:descrizione/domandeMapping', validateSession, (req, res) => {
  const questionarioDescrizione = req.params.descrizione;

  // Query to find the questionario by its unique description
  const findQuestionarioQuery = `
    SELECT QUE_IdRif_Questionari 
    FROM ANS_Questionari 
    WHERE QUE_Descrizione = ? 
      AND QUE_StatoRecord = 'A'
  `;

  db.query(findQuestionarioQuery, [questionarioDescrizione], (err, questionarioResults) => {
    if (err) {
      console.error("Errore nel recupero del questionario:", err);
      return res.status(500).json({ error: "Errore del server durante il recupero del questionario" });
    }
    
    if (!questionarioResults || questionarioResults.length === 0) {
      return res.status(404).json({ message: "Questionario non trovato con la descrizione fornita." });
    }
    
    const questionarioId = questionarioResults[0].QUE_IdRif_Questionari;

    // Query to retrieve the questions based on the found questionarioId
    const query = `
      SELECT DQU_TestoDomanda 
      FROM ANS_DomandeQuestionari 
      WHERE DQU_IdRif_Questionari = ? 
        AND DQU_StatoRecord = 'A'
      ORDER BY DQU_IdRif_DomandeQuestionari ASC
    `;
  
    db.query(query, [questionarioId], (err, results) => {
      if (err) {
        console.error("Errore nel recupero delle domande:", err);
        return res.status(500).json({ error: "Errore del server durante il recupero delle domande" });
      }
      
      if (!results || results.length === 0) {
        return res.status(404).json({ message: "Nessuna domanda trovata per questo questionario." });
      }
      
      const mapping = results.map((row, index) => ({
        indice: index + 1,
        domanda: row.DQU_TestoDomanda || "",
      }));
      res.status(200).json({ domandeMapping: mapping });
    });
  });
});

// CHECKCONFIG
router.get('/check-config', (req, res) => {
  const queryCheck = "SELECT PAR_Codice FROM ANS_Parametri WHERE PAR_Descrizione = 1";

  db.query(queryCheck, (err, results) => {
    if (err) {
      console.error('Errore durante la verifica del parametro CONFIG:', err);
      return res.status(500).json({ allowConfig: false, message: 'Errore durante la verifica del parametro CONFIG' });
    }

    const allowConfig = results.length > 0 && results[0].PAR_Codice === "CONFIG";
    res.json({ allowConfig });
  });
});

// ===========================
// ROUTE: GET /referenceData
// Returns ID + displayField from a given table
// ===========================
// ===========================
// ROUTE: GET /referenceDataSimple
// Returns an array of objects like:
//   [ { id: 123, <displayField>: "Label" }, ... ]
// ===========================
router.get('/referenceDataSimple',validateSession, (req, res) => {
  const { table, idColumn, displayField } = req.query;

  // 1) Validate query params
  if (!table || !idColumn || !displayField) {
    return res.status(400).json({
      message: "Params 'table', 'idColumn', and 'displayField' are all required."
    });
  }

  // 2) Validate the table name against the globasl allowedTables array
  if (!allowedTables.includes(table)) {
    return res.status(400).json({
      message: `Table '${table}' not in allowed list.`,
    });
  }

  // 3) Build query
  // We'll select the ID column as 'id' plus the displayField as is,
  // but filter by StatoRecord = 'A' if you want only active records.
  // Adjust the WHERE clause if your schema uses a different column for state.
  const sql = `
    SELECT 
      ${idColumn} AS id, 
      ${displayField} 
    FROM ${table}
    WHERE ${idColumn} IS NOT NULL
    ORDER BY ${idColumn} ASC
  `;

  // 4) Execute query
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Errore nella query referenceDataSimple:', err);
      return res.status(500).json({ message: 'Errore del server durante referenceDataSimple' });
    }
    // results is an array of rows with { id, <displayField> }
    res.json(results);
  });
});



// restituisce i dati delle chiavi esterne
router.post('/getForeignKeyData',validateSession, (req, res) => {
  const { tableName } = req.body;

  // Validate tableName to prevent SQL Injection
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
      q.QUE_IdRif_Questionari, 
      q.QUE_Descrizione, 
      q.QUE_Sottotitoli
    FROM ANS_Questionari q
    WHERE q.QUE_IdRif_Questionari = ? AND q.QUE_StatoRecord = 'A';
  `;

  // Query SQL per ottenere le domande associate al questionario
  const domandeQuery = `
    SELECT 
      d.DQU_IdRif_DomandeQuestionari AS DOM_IdRif_DomandeQuestionari, 
      d.DQU_TestoDomanda AS DOM_Descrizione,
      d.DQU_Id_TipiDomande AS DOM_TipoDomanda
    FROM ANS_DomandeQuestionari d
    WHERE d.DQU_IdRif_Questionari = ? AND d.DQU_StatoRecord = 'A';
  `;

  // Query SQL per ottenere le risposte proposte associate alle domande del questionario
  const risposteProposteQuery = `
    SELECT 
      r.RPR_IdRif_RisposteProposte, 
      r.RPR_IdRif_DomandeQuestionari, 
      r.RPR_TestoRisposta, 
      r.RPR_Ordinamento
    FROM CNF_RisposteProposte r
    WHERE r.RPR_StatoRecord = 'A' 
      AND r.RPR_IdRif_DomandeQuestionari IN (
        SELECT DQU_IdRif_DomandeQuestionari 
        FROM ANS_DomandeQuestionari 
        WHERE DQU_IdRif_Questionari = ? AND DQU_StatoRecord = 'A'
      )
    ORDER BY r.RPR_IdRif_DomandeQuestionari, r.RPR_Ordinamento;
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
    console.log(questionario);
    console.log(questionarioId);
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
      (risposta) => risposta.RPR_IdRif_DomandeQuestionari === domanda.DOM_IdRif_DomandeQuestionari
    ) || [],
  }));

  // Restituisce come risposta JSON il questionario completo di domande e risposte
  res.json({ ...questionario, domande: domandeWithRisposte });
});
    });
  });
});
// Definisci la rotta POST per '/api/questionari/:id/risposte'
router.post('/api/questionari/:id/risposte', (req, res) => {
  const risposte = req.body.risposte;

  if (!risposte || !Array.isArray(risposte)) {
    return res.status(400).json({ error: "Dati delle risposte mancanti o non validi." });
  }

  // Esempio di query per inserire le risposte nel database
  const insertQuery = `
    INSERT INTO ANS_RisposteQuestionari (
      RQU_IdRif_Questionari,
      RQU_IdRif_DomandeQuestionari, 
      RQU_IdRif_RisposteProposte, 
      RQU_TerminaleInserimento,
      RQU_DataOraInserimento,
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
    risposta.RQU_IdRif_Questionari,                     // RQU_IdRif_Questionari (Integer)
    risposta.RQU_IdRif_DomandeQuestionari,              // RQU_IdRif_DomandeQuestionari (Integer)
    risposta.RQU_IdRif_RisposteProposte || null,         // RQU_IdRif_RisposteProposte (Integer or NULL)
    clientIp,   
    formatDateForMySQL(new Date())  ,                                      // RQU_TerminaleInserimento (String)
    risposta.RQU_TestoRisposta || null,                 // RQU_TestoRisposta (String or NULL)
    formatDateForMySQL(new Date()),                     // RQU_InizioValidita (Datetime)
    "A",                                                // RQU_StatoRecord (String/Char)
    0,                                                  // RQU_Utente (Integer)
    clientIp                                            // RQU_Terminale (String)
  ]);

  // Esegui la query di inserimento
  db.query(insertQuery, [values], (err, result) => {
    if (err) {
      console.error("❌ Errore nel salvataggio delle risposte:", err);
      return res.status(500).json({ error: "Errore nel salvataggio delle risposte." });
    }
    res.status(200).json({ message: "Risposte salvate con successo." });
  });
});



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


module.exports = router;
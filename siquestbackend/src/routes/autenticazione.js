const express = require('express');
const router = express.Router();
const db = require('../connect');
const bcrypt = require('bcrypt');

const validateSession = require('../utility').validateSession;
// ...existing code such as the POST /utenteIns route...

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
            UTE_Id_GruppiAbilitazioni, 
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
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'Tutti i campi sono obbligatori' });
    }

    // Check if the username already exists
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

      // Hash the password using bcrypt
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Set default values for the new user
      const defaultGroup = 1;           // Default group ID
      const defaultSessionDuration = 30;  // Default session duration in minutes
      const statoRecord = "A";          // Active record
      const utente = 0;                 // Default user flag
      const terminale = req.ip;         // Client's IP address

      // Insert new user into ANS_Utenti table
      const insertUserQuery = `
        INSERT INTO ANS_Utenti (
          UTE_NomeUtente, 
          UTE_Password, 
          UTE_Email, 
          UTE_Id_GruppiAbilitazioni, 
          UTE_DurataSessione, 
          UTE_inizioValidita,
          UTE_DataOraInserimento,
          UTE_StatoRecord,
          UTE_Utente,
          UTE_Terminale 
        ) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)
      `;
      db.query(
        insertUserQuery,
        [username, hashedPassword, email, defaultGroup, defaultSessionDuration, statoRecord, utente, terminale],
        (err) => {
          if (err) {
            console.error('Errore durante l\'inserimento del nuovo utente:', err);
            return res.status(500).json({ message: 'Errore durante l\'inserimento del nuovo utente' });
          }
          res.status(201).json({ message: 'Utente registrato con successo' });
        }
      );
    });
  } catch (err) {
    console.error('Errore imprevisto:', err);
    res.status(500).json({ message: 'Errore imprevisto durante la registrazione' });
  }
});

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
// Export the router so it can be used in routes.js
module.exports = router;
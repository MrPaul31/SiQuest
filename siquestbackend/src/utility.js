// utility.js
const fs = require('fs');
const db = require('./connect'); // Import db

// Function to log activity
function logActivity(logFile, logEntry) {
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Errore durante il logging dell\'attività:', err);
    }
  });
}

// Middleware to validate session
function validateSession(req, res, next) {
  console.log('Richiesta:', req.originalUrl);
  if (
    req.originalUrl === '/api/questionari/:id'
  ) {
    console.log('Route di login o inserimento admin, bypassando la validazione della sessione');
    return next();
  }
  const token = req.headers['authorization'];
  console.log('Token:', token);
  if (!token) {
    return res.status(401).json({ message: 'Token di sessione mancante' });
  }

  const selectSessionQuery = `
    SELECT * FROM ANS_Sessioni WHERE SSN_Sessione = ?
  `;
  const tokenWithoutBearer = token.replace('Bearer ', '');
  db.query(selectSessionQuery, [tokenWithoutBearer], (err, results) => {
    console.log('Risultati:', results);
    if (err) {
      console.error('Errore durante la verifica della sessione:', err);
      return res.status(500).json({ message: 'Errore interno del server' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Sessione non valida o scaduta' });
    }

    const session = results[0];
    const currentTime = new Date();

    if (currentTime > session.SSN_FineValidita) {
      console.log('Sessione scaduta:', session.SSN_Sessione);
      // Session expired, remove it from the database
      const deleteSessionQuery = `DELETE FROM ANS_Sessioni WHERE SSN_Sessione = ?`;
      db.query(deleteSessionQuery, [tokenWithoutBearer], (err) => {
        if (err) {
          console.error('Errore durante la cancellazione della sessione scaduta:', err);
        }
        return res.status(401).json({ message: 'Sessione scaduta' });
      });
    } else {
      // Valid session
      req.user = session.SSN_Utente;
      next();
    }
  });
}

// Function to clean up expired sessions
function cleanupSessions() {
  const cleanupQuery = `
    DELETE FROM ANS_Sessioni WHERE SSN_FineValidita < NOW()
  `;
  db.query(cleanupQuery, (err) => {
    if (err) {
      console.error('Errore durante la pulizia delle sessioni scadute:', err);
    } else {
      console.log('Pulizia delle sessioni scadute completata');
    }
  });
}

// Schedule the cleanup to run every minute
setInterval(cleanupSessions, 60000); // Every 60,000 milliseconds (1 minute)

module.exports = {
  logActivity,
  validateSession,
};
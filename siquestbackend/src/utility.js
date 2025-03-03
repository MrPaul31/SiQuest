const fs = require('fs');
const db = require('./connect'); // Import db

function logActivity(logFile, logEntry) {
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Errore durante il logging dell\'attività:', err);
    }
  });
}

const validateSession = (req, res, next) => {
  // Skip validation for authentication routes
  if (req.originalUrl.startsWith('/api/autenticazione')) {
    return next();
  }

  // Log the request for debugging
  
  // Token verification logic..
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Access denied. No token provided.');
    return res.status(401).json({ message: 'Accesso negato. Token non fornito.' });
  }

  const token = authHeader.split(' ')[1];

  // Query to retrieve the session from the database
  const selectSessionQuery = `
    SELECT * FROM ANS_Sessioni WHERE SSN_Sessione = ?
  `;
  db.query(selectSessionQuery, [token], (err, results) => {
    if (err) {
      console.error('❌ Error verifying session:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
    if (!results || results.length === 0) {
      console.warn('🚨 No session found for token:', token);
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }

    const session = results[0];
    const currentTime = new Date();
    const sessionExpiry = new Date(session.SSN_FineValidita);
    if (currentTime > sessionExpiry) {
      console.warn('⚠️ Session expired:', session.SSN_Sessione);
      const deleteSessionQuery = `DELETE FROM ANS_Sessioni WHERE SSN_Sessione = ?`;
      db.query(deleteSessionQuery, [token], (deleteErr) => {
        if (deleteErr) {
          console.error('❌ Error deleting expired session:', deleteErr);
          return res.status(500).json({ message: 'Internal server error.' });
        }
        console.warn('✅ Session expired and removed:', token);
        return res.status(401).json({ message: 'Session expired.' });
      });
      return;
    }

    if (!session.SSN_Utente) {
      console.warn('🚨 Session found but user is missing!');
      return res.status(401).json({ message: 'Invalid session.' });
    }

    const userId = session.SSN_Utente;
    const getUserQuery = `
      SELECT * FROM ANS_Utenti WHERE UTE_Id_Utenti = ?
    `;
    db.query(getUserQuery, [userId], (userErr, userResults) => {
      if (userErr) {
        console.error('❌ Error retrieving user details:', userErr);
        return res.status(500).json({ message: 'Internal server error.' });
      }
      if (!userResults || userResults.length === 0) {
        console.warn('🚨 User not found for session:', session.SSN_Sessione);
        return res.status(401).json({ message: 'Invalid session.' });
      }
      req.user = userResults[0];
      return next();
    });
  });
};

module.exports = {
  logActivity,
  validateSession,
};
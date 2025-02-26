//utility.js
const fs = require('fs');
const db = require('./connect'); // Import db

/**
 * Middleware to validate session tokens.
 * Excludes specific routes from authentication.
 */

function logActivity(logFile, logEntry) {
  fs.appendFile(logFile, logEntry, (err) => {
    if (err) {
      console.error('Errore durante il logging dell\'attività:', err);
    }
  });
}
function validateSession(req, res, next) {
  console.log('Request URL:', req.originalUrl);

  // Define routes that do not require authentication
  const openRoutes = [
    { method: 'POST', path: '/api/login' },
    { method: 'GET', path: /^\/api\/questionari\/\d+$/ }, // e.g., /api/questionari/123
    { method: 'GET', path: /^\/api\/questionari\/\d+\/risposte$/ }, // e.g., /api/questionari/123/risposte
  ];

  // Check if the current route is open
  const isOpenRoute = openRoutes.some((route) => {
    if (route.method !== req.method) return false;
    return typeof route.path === 'string' ? route.path === req.path : route.path.test(req.path);
  });

  if (isOpenRoute) {
    console.log('Open route detected, bypassing session validation.');
    return next();
  }

  // Extract the token from the Authorization header
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader);

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Access denied. No token provided.');
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token part
  console.log('Token:', token);

  const selectSessionQuery = `
    SELECT * FROM ANS_Sessioni WHERE SSN_Sessione = ?
  `;

  console.log('🔍 Checking session for token:', token);

  db.query(selectSessionQuery, [token], (err, results) => {
    if (err) {
      console.error('❌ Error verifying session:', err);
      return res.status(500).json({ message: 'Internal server error.' });
    }
  
    console.log('🛠 Session Query Results:', results);
  
    if (!results || results.length === 0) {
      console.warn('🚨 No session found for token:', token);
      return res.status(401).json({ message: 'Invalid or expired session.' });
    }
  
    const session = results[0];
    console.log('✅ Valid session found:', session);
  
    const currentTime = new Date();
    const sessionExpiry = new Date(session.SSN_FineValidita);
  
    if (currentTime > sessionExpiry) {
      console.warn('⚠️ Session expired:', session.SSN_Sessione);
  
      // Delete the expired session
      const deleteSessionQuery = `DELETE FROM ANS_Sessioni WHERE SSN_Sessione = ?`;
      console.log('🗑️ Deleting expired session:', token);
  
      db.query(deleteSessionQuery, [token], (deleteErr) => {
        if (deleteErr) {
          console.error('❌ Error deleting expired session:', deleteErr);
          return res.status(500).json({ message: 'Internal server error.' });
        }
        console.warn('✅ Session expired and removed:', token);
        return res.status(401).json({ message: 'Session expired.' });
      });
  
      return; // Stop further execution
    }
  
    // If session is valid, set req.user and proceed
    if (!session.SSN_Utente) {
      console.warn('🚨 Session found but user is missing!');
      return res.status(401).json({ message: 'Invalid session.' });
    }
  
    req.user = session.SSN_Utente;
    console.log('✅ Valid session for user:', req.user);
    return next();
  });}
module.exports = {
  logActivity,
  validateSession,  // ✅ Make sure this is exported properly
};
//server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const routes = require('./routes');

// Fix imports - remove duplicates and add missing imports
const abilitazioneUtenti = require('./routes/abilitazioneUtenti');
const autenticazione = require('./routes/autenticazione'); // Add this first!
const crudUtenti = require('./routes/internalUtenti');
const dataHandling = require('./routes/dataHandling');
const { validateSession } = require('./utility'); // adjust path if needed

const app = express();
const PORT = process.env.PORT || 5000; // Fallback port

// Lista delle origini permesse
const allowedOrigins = [
  'http://10.10.100.50:3000',
  'http://questionari.centrochirurgicotoscano.it:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  /^http:\/\/192\.168\.5\.\d+:3000$/,
  'http://192.168.5.35:3000',
  'http://192.168.5.35:2000',
  // Frontend in locale
];

// Configurazione middleware CORS
const corsOptions = {
  origin: function (origin, callback) {
    console.log('Richiesta da origine:', origin);
    if (!origin) return callback(null, true);
    let allowed = allowedOrigins.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string' && allowedOrigin === origin) {
        return true;
      }
      if (allowedOrigin instanceof RegExp && allowedOrigin.test(origin)) {
        return true;
      }
      return false;
    });
    if (allowed) {
      callback(null, true);
    } else {
      callback(new Error('Origine non permessa da CORS'));
    }
  },
};

// Basic logging setup without external dependencies first
const logDir = path.join(__dirname, '../logs');
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Simple logging function that doesn't depend on Winston
  const simpleLog = (message) => {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${message}\n`;
    
    try {
      fs.appendFileSync(path.join(logDir, 'server.log'), logEntry);
      console.log(message);
    } catch (err) {
      console.error(`Failed to write to log: ${err.message}`);
    }
  };

  // Create a simple logger object
  const logger = {
    info: (msg) => simpleLog(`INFO: ${msg}`),
    error: (msg) => simpleLog(`ERROR: ${msg}`),
    warn: (msg) => simpleLog(`WARN: ${msg}`),
    debug: (msg) => simpleLog(`DEBUG: ${msg}`)
  };

  // Export logger for use in other files
  module.exports.logger = logger;

  // Update the existing utility.js logActivity function
  const { logActivity, validateSession } = require('./utility');
  
  // Override the existing logActivity function with our logger
  global.logActivity = (_, message) => logger.info(message);

  // Middleware
  app.use(cors(corsOptions)); // Abilita CORS
  app.options('*', cors(corsOptions)); // Gestione delle richieste OPTIONS
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${req.ip}`);
    });
    next();
  });

  // Mount authentication routes first (no validation needed)
  app.use('/api/autenticazione', autenticazione);

  app.use('', routes);
  // Apply validateSession middleware to all routes below this point
  app.use(validateSession);

  // Routes that require authentication
  app.use('/api/abilitazioneUtenti', abilitazioneUtenti);
  app.use('/api/internalUtenti', crudUtenti);
  app.use("/api/dataHandling", dataHandling);

  // Avvio del server
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server avviato sulla porta ${PORT}`);
    console.log(`Server avviato sulla porta ${PORT}`);
  });

} catch (err) {
  console.error(`Fatal error during startup: ${err.message}`);
  process.exit(1);
}
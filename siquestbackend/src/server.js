//server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const routes = require('./routes');
// Import routes from the routes folder
const abilitazioneUtenti = require('./routes/abilitazioneUtenti');
const autenticazione= require('./routes/autenticazione');
const crudTabella = require('./routes/crudTabella');
const dataHandling = require('./routes/dataHandling');

const { validateSession } = require('./utility'); // adjust path if needed

const app = express();
const PORT = process.env.PORT;

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

// Middleware
app.use(cors(corsOptions)); // Abilita CORS
app.options('*', cors(corsOptions)); // Gestione delle richieste OPTIONS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/autenticazione', autenticazione);
app.use(validateSession);

app.use('/api/abilitazioneUtenti', abilitazioneUtenti);
app.use('/api', routes);
app.use("/api/dataHandling",dataHandling);

// Avvio del server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});



const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5002;

// MIDDLEWARE
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Allowed origins for CORS (dynamic rule for 192.168.5.x)

const allowedOrigins = [
  'http://10.10.100.50:3000',
  'http://10.10.100.50:4000',
  'http://questionari.centrochirurgicotoscano.it:3000',
  'http://questionari.centrochirurgicotoscano.it:4000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      // Allow requests with matching origin or no origin (e.g., non-browser clients)
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Use routes
app.use('/', routes);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

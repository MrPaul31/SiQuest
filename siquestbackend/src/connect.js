// connect.js
const mysql = require('mysql2');

const db = mysql.createPool({
  host: process.env.DB_HOST || '192.168.5.35',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'simeds',
  password: process.env.DB_PASSWORD || 's1m3ds18', // Replace with your password or use an environment variable
  database: process.env.DB_NAME || 'ANSSIQUEST',
  waitForConnections: true,
  connectionLimit: 10, // Adjust the limit based on your needs
  queueLimit: 0,
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('Errore di connessione al database:', err.message);
    process.exit(1); // Terminate the application in case of error
  }
  if (connection) connection.release();
  console.log('Connesso al database MySQL');
});

module.exports = db;

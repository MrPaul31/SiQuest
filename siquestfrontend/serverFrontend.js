require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT;

// Serve static files from the React build directory
app.use(express.static(path.join(__dirname, 'build')));

// Catch-all handler to return React's index.html for unknown routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, () => {
  console.log(`React app is running at http://localhost:${port}`);
});

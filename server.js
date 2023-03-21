const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Test server');
});

app.listen(5000, () => {
  console.log('Server listening on port 5000');
});
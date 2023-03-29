const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.get('/api/data', (req, res) => {
  const data = { youtubeApiKey: process.env.YOUTUBE_API_KEY };
  res.send(data);
});

app.listen(4000, () => console.log('Server started on port 4000'));
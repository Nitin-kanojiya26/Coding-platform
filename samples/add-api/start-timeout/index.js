const express = require('express');
const app = express();

app.use(express.json());

app.post('/add', (req, res) => {
  const { a, b } = req.body;
  res.json({ sum: a + b });
});

// Bug: Bound to 127.0.0.1 instead of 0.0.0.0 -> Start Timeout
const PORT = process.env.PORT || 3000;
app.listen(PORT, '127.0.0.1', () => {
  console.log(`Server listening on loopback 127.0.0.1:${PORT}`);
});

const express = require('express');
const app = express();

app.use(express.json());

// Bug: subtracts instead of adds -> Wrong Answer
app.post('/add', (req, res) => {
  const { a, b } = req.body;
  res.json({ sum: a - b });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on 0.0.0.0:${PORT}`);
});

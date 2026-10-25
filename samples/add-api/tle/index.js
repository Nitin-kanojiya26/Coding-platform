const express = require('express');
const app = express();

app.use(express.json());

// Infinite loop inside request handler triggers Time Limit Exceeded (watchdog kills containers)
app.post('/add', (req, res) => {
  while (true) {
    // Hangs forever handling request
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});

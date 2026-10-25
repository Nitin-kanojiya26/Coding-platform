const express = require('express');

// Bug: Syntax error crashes node on startup -> Runtime Error
const app = express(;

app.listen(3000, '0.0.0.0');

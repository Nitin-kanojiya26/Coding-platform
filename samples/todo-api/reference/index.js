const express = require('express');
const app = express();

app.use(express.json());

let todos = [];
let nextId = 1;

// POST /todos - Create a todo (400 if title missing)
app.post('/todos', (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ message: 'Title is required' });
  }
  const newTodo = {
    id: nextId++,
    title: title.trim(),
    completed: false,
  };
  todos.push(newTodo);
  res.status(201).json(newTodo);
});

// GET /todos - List all todos
app.get('/todos', (req, res) => {
  res.status(200).json(todos);
});

// GET /todos/:id - Get todo by id (404 if not found)
app.get('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ message: 'Todo not found' });
  }
  res.status(200).json(todo);
});

// PUT /todos/:id - Update todo by id (404 if not found)
app.put('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const todo = todos.find((t) => t.id === id);
  if (!todo) {
    return res.status(404).json({ message: 'Todo not found' });
  }
  if (req.body.title !== undefined) todo.title = req.body.title;
  if (req.body.completed !== undefined) todo.completed = req.body.completed;
  res.status(200).json(todo);
});

// DELETE /todos/:id - Delete todo by id (404 if not found)
app.delete('/todos/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'Todo not found' });
  }
  todos.splice(index, 1);
  res.status(200).json({ message: 'Todo deleted successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Todo API listening on 0.0.0.0:${PORT}`);
});

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const BuildProblem = require('../src/models/BuildProblem');
const { validateTestCases } = require('../src/utils/buildValidation');

const seedProblems = [
  {
    slug: 'add-api',
    title: 'Add Numbers API',
    difficulty: 'Easy',
    statement: `### Problem Description
Build a RESTful API using Node.js and Express.

#### Requirements:
- Listen on \`0.0.0.0:3000\` (or \`process.env.PORT || 3000\`).
- Implement \`POST /add\`:
  - Receives JSON payload: \`{ "a": number, "b": number }\`
  - Returns JSON response: \`{ "sum": a + b }\` with status code \`200\`.`,
    runtime: 'node-express',
    starterFiles: [
      {
        path: 'index.js',
        content: `const express = require('express');
const app = express();

app.use(express.json());

// TODO: Implement POST /add

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server listening on 0.0.0.0:\${PORT}\`);
});
`,
      },
    ],
    visibleTests: [
      {
        name: 'adds positive numbers',
        request: {
          method: 'POST',
          path: '/add',
          body: { a: 2, b: 3 },
        },
        expect: {
          status: 200,
          bodyContains: { sum: 5 },
          bodyHasKeys: ['sum'],
        },
      },
      {
        name: 'adds negative numbers',
        request: {
          method: 'POST',
          path: '/add',
          body: { a: -5, b: 2 },
        },
        expect: {
          status: 200,
          bodyContains: { sum: -3 },
        },
      },
    ],
    hiddenTests: [
      {
        name: 'adds zeros',
        request: {
          method: 'POST',
          path: '/add',
          body: { a: 0, b: 0 },
        },
        expect: {
          status: 200,
          bodyContains: { sum: 0 },
        },
      },
      {
        name: 'adds large numbers',
        request: {
          method: 'POST',
          path: '/add',
          body: { a: 1000000, b: 2000000 },
        },
        expect: {
          status: 200,
          bodyContains: { sum: 3000000 },
        },
      },
    ],
    limits: {
      startTimeoutMs: 3000,
      totalTimeoutMs: 20000,
    },
  },
  {
    slug: 'todo-api',
    title: 'Todo REST API',
    difficulty: 'Medium',
    statement: `### Problem Description
Build an in-memory Todo REST API with Express listening on \`0.0.0.0:3000\`.

#### Endpoints:
1. \`POST /todos\` - Create a todo:
   - Body: \`{ "title": string }\`
   - Returns: \`201 Created\` with \`{ "id": number, "title": string, "completed": false }\`
   - If \`title\` is missing or empty, returns \`400 Bad Request\`.
2. \`GET /todos\` - List todos:
   - Returns: \`200 OK\` with array of all todo objects.
3. \`GET /todos/:id\` - Get single todo:
   - Returns: \`200 OK\` with matching todo object.
   - If id is not found, returns \`404 Not Found\`.
4. \`PUT /todos/:id\` - Update todo:
   - Body: \`{ "title"?: string, "completed"?: boolean }\`
   - Returns: \`200 OK\` with updated todo object.
   - If not found, returns \`404 Not Found\`.
5. \`DELETE /todos/:id\` - Delete todo:
   - Returns: \`200 OK\` or \`204 No Content\`.
   - If not found, returns \`404 Not Found\`.`,
    runtime: 'node-express',
    starterFiles: [
      {
        path: 'index.js',
        content: `const express = require('express');
const app = express();

app.use(express.json());

// In-memory todos state
let todos = [];
let nextId = 1;

// TODO: Implement Todo endpoints

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Todo API listening on 0.0.0.0:\${PORT}\`);
});
`,
      },
    ],
    visibleTests: [
      {
        name: 'create todo item',
        request: {
          method: 'POST',
          path: '/todos',
          body: { title: 'Buy groceries' },
        },
        expect: {
          status: 201,
          bodyContains: { title: 'Buy groceries', completed: false },
          bodyHasKeys: ['id', 'title', 'completed'],
        },
        save: { todoId: 'id' },
      },
      {
        name: 'list todos',
        request: {
          method: 'GET',
          path: '/todos',
        },
        expect: {
          status: 200,
        },
      },
      {
        name: 'get todo by id',
        request: {
          method: 'GET',
          path: '/todos/{{todoId}}',
        },
        expect: {
          status: 200,
          bodyContains: { title: 'Buy groceries' },
        },
      },
      {
        name: 'update todo',
        request: {
          method: 'PUT',
          path: '/todos/{{todoId}}',
          body: { completed: true },
        },
        expect: {
          status: 200,
          bodyContains: { completed: true },
        },
      },
      {
        name: 'delete todo',
        request: {
          method: 'DELETE',
          path: '/todos/{{todoId}}',
        },
        expect: {
          status: 200,
        },
      },
    ],
    hiddenTests: [
      {
        name: '400 missing title',
        request: {
          method: 'POST',
          path: '/todos',
          body: {},
        },
        expect: {
          status: 400,
        },
      },
      {
        name: '404 unknown id on get',
        request: {
          method: 'GET',
          path: '/todos/99999',
        },
        expect: {
          status: 404,
        },
      },
      {
        name: '404 on deleted todo',
        request: {
          method: 'GET',
          path: '/todos/{{todoId}}',
        },
        expect: {
          status: 404,
        },
      },
    ],
    limits: {
      startTimeoutMs: 3000,
      totalTimeoutMs: 20000,
    },
  },
];

async function seed() {
  console.log('🌱 Connecting to database to seed Build Mode problems...');
  await connectDB();

  for (const prob of seedProblems) {
    // Validate test cases format
    const vErr = validateTestCases(prob.visibleTests, `${prob.slug} visibleTests`);
    if (vErr) throw new Error(vErr);

    const hErr = validateTestCases(prob.hiddenTests, `${prob.slug} hiddenTests`);
    if (hErr) throw new Error(hErr);

    await BuildProblem.findOneAndUpdate(
      { slug: prob.slug },
      prob,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Seeded problem: [${prob.slug}] "${prob.title}"`);
  }

  console.log('\n✨ All Build Mode problems seeded successfully!\n');
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';

import hierarchyRouter from './routes/hierarchy.js';
import projectsRouter from './routes/projects.js';
import capacityRouter from './routes/capacity.js';
import assignmentsRouter from './routes/assignments.js';
import dependenciesRouter from './routes/dependencies.js';
import historyRouter from './routes/history.js';
import decisionsRouter from './routes/decisions.js';
import demoRouter from './routes/demo.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB and auto-seed if empty
const db = getDatabase();
const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get();
if (projectCount.count === 0) {
  console.log('Database is empty. Running initial idempotent seed...');
  seedDatabase(db);
}

// Register API Routes
app.use('/api/hierarchy', hierarchyRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/capacity', capacityRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/dependencies', dependenciesRouter);
app.use('/api/history', historyRouter);
app.use('/api/decisions', decisionsRouter);
app.use('/api/demo', demoRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Only bind the port when run directly (npm run server). Imports (e.g. the
// e2e test suite) receive the app without listening and bind on their own.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  app.listen(PORT, () => {
    console.log(`[ZupaViz Server] Express API running on http://localhost:${PORT}`);
  });
}

export default app;

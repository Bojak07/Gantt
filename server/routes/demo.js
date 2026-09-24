import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { seedDatabase } from '../db/seed.js';

const router = Router();

router.post('/reset', (req, res) => {
  try {
    const db = getDatabase();
    const result = seedDatabase(db);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

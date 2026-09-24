import { Router } from 'express';
import { getDatabase } from '../db/database.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM change_history
      ORDER BY id DESC
      LIMIT 200
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

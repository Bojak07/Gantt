import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';
import { hasCircularDependency } from '../services/calculations.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT d.*, 
             p.name as predecessor_name, 
             s.name as successor_name
      FROM dependencies d
      JOIN work_items p ON d.predecessor_id = p.id
      JOIN work_items s ON d.successor_id = s.id
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { predecessor_id, successor_id, type } = req.body;
    if (!predecessor_id || !successor_id) {
      return res.status(400).json({ error: 'predecessor_id and successor_id are required.' });
    }

    if (predecessor_id === successor_id) {
      return res.status(400).json({ error: 'A work item cannot depend on itself.' });
    }

    const db = getDatabase();
    const allDeps = db.prepare('SELECT predecessor_id, successor_id FROM dependencies').all();

    if (hasCircularDependency(allDeps, predecessor_id, successor_id)) {
      return res.status(400).json({ error: 'Circular dependency detected! This link would create a loop in the project schedule.' });
    }

    const id = `dep-${predecessor_id}-${successor_id}`;
    db.prepare(`
      INSERT INTO dependencies (id, predecessor_id, successor_id, type)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(predecessor_id, successor_id) DO UPDATE SET type = excluded.type
    `).run(id, predecessor_id, successor_id, type || 'FS');

    logChange(db, 'DEPENDENCY', id, 'CREATE', `Created dependency: ${predecessor_id} -> ${successor_id}`);
    const created = db.prepare('SELECT * FROM dependencies WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM dependencies WHERE id = ?').run(id);
    logChange(db, 'DEPENDENCY', id, 'DELETE', `Deleted dependency ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

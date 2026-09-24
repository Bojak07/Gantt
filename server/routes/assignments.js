import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';

const router = Router();

router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT a.*, p.name as person_name, t.name as team_name, w.name as work_item_name
      FROM assignments a
      LEFT JOIN people p ON a.person_id = p.id
      LEFT JOIN teams t ON a.team_id = t.id
      LEFT JOIN work_items w ON a.work_item_id = w.id
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { work_item_id, person_id, team_id, allocated_hours, allocation_pct, role_in_task } = req.body;
    if (!work_item_id) return res.status(400).json({ error: 'work_item_id is required.' });

    const db = getDatabase();
    const id = `asgn-${Date.now()}`;
    db.prepare(`
      INSERT INTO assignments (id, work_item_id, person_id, team_id, allocated_hours, allocation_pct, role_in_task)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, work_item_id, person_id || null, team_id || null, allocated_hours || 40, allocation_pct || 100, role_in_task || 'Contributor');

    logChange(db, 'ASSIGNMENT', id, 'CREATE', `Assigned person ${person_id} to task ${work_item_id}`);
    const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM assignments WHERE id = ?').run(id);
    logChange(db, 'ASSIGNMENT', id, 'DELETE', `Deleted assignment ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

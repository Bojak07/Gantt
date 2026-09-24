import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';

const router = Router();

// GET all decisions
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const decisions = db.prepare(`
      SELECT dl.*, p.name as project_name, p.code as project_code,
             pe.name as person_name, pe.avatar_initials as person_avatar
      FROM decision_log dl
      LEFT JOIN projects p ON dl.project_id = p.id
      LEFT JOIN people pe ON dl.person_id = pe.id
      ORDER BY dl.date DESC
    `).all();
    res.json(decisions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create decision
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { title, project_id, date, person_id, decision_summary, impact_status } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required.' });
    }
    const id = `dec-${Date.now()}`;
    db.prepare(`
      INSERT INTO decision_log (id, title, project_id, date, person_id, decision_summary, impact_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, project_id || null, date, person_id || null, decision_summary || '', impact_status || 'NEUTRAL');
    
    logChange(db, 'DECISION', id, 'CREATE', title);
    res.json({ id, message: 'Decision created.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update decision
router.put('/:id', (req, res) => {
  try {
    const db = getDatabase();
    const { title, project_id, date, person_id, decision_summary, impact_status } = req.body;
    db.prepare(`
      UPDATE decision_log SET title = ?, project_id = ?, date = ?, person_id = ?, decision_summary = ?, impact_status = ?
      WHERE id = ?
    `).run(title, project_id || null, date, person_id || null, decision_summary || '', impact_status || 'NEUTRAL', req.params.id);
    
    logChange(db, 'DECISION', req.params.id, 'UPDATE', title);
    res.json({ message: 'Decision updated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE decision
router.delete('/:id', (req, res) => {
  try {
    const db = getDatabase();
    db.prepare('DELETE FROM decision_log WHERE id = ?').run(req.params.id);
    logChange(db, 'DECISION', req.params.id, 'DELETE', '');
    res.json({ message: 'Decision deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';
import { calculateRollups } from '../services/calculations.js';

const router = Router();

// GET all projects with nested phases, work items, assignments, dependencies, and rollups
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const rawProjects = db.prepare(`
      SELECT p.*, pe.name as owner_name, pe.avatar_initials as owner_avatar
      FROM projects p
      LEFT JOIN people pe ON p.owner_id = pe.id
      ORDER BY p.start_date ASC, p.name ASC
    `).all();

    const rawPhases = db.prepare(`
      SELECT * FROM phases ORDER BY sort_order ASC, start_date ASC
    `).all();

    const rawWorkItems = db.prepare(`
      SELECT w.*, ph.project_id
      FROM work_items w
      JOIN phases ph ON w.phase_id = ph.id
      ORDER BY w.start_date ASC, w.name ASC
    `).all();

    const rawAssignments = db.prepare(`
      SELECT a.*, p.name as person_name, p.avatar_initials, p.role as person_role, t.name as team_name, t.code as team_code
      FROM assignments a
      LEFT JOIN people p ON a.person_id = p.id
      LEFT JOIN teams t ON a.team_id = t.id
    `).all();

    const rawDependencies = db.prepare(`
      SELECT * FROM dependencies
    `).all();

    // Calculate rollups
    const { projects: rolledProjects, phases: rolledPhases } = calculateRollups(
      rawProjects,
      rawPhases,
      rawWorkItems
    );

    // Attach assignments & dependencies to work items
    const assignmentsByItem = {};
    rawAssignments.forEach((a) => {
      if (!assignmentsByItem[a.work_item_id]) assignmentsByItem[a.work_item_id] = [];
      assignmentsByItem[a.work_item_id].push(a);
    });

    const workItemsWithMeta = rawWorkItems.map((item) => {
      const itemAssignments = assignmentsByItem[item.id] || [];
      const itemDependencies = rawDependencies
        .filter((d) => d.successor_id === item.id)
        .map((d) => d.predecessor_id);

      return {
        ...item,
        assignments: itemAssignments,
        dependencies: itemDependencies,
        primaryAssignee: itemAssignments[0]?.person_name || 'Unassigned',
        avatar: itemAssignments[0]?.avatar_initials || 'UN',
        allocatedHours: itemAssignments.reduce((s, a) => s + (Number(a.allocated_hours) || 0), 0)
      };
    });

    // Assemble nested structure
    const workItemsByPhase = {};
    workItemsWithMeta.forEach((w) => {
      if (!workItemsByPhase[w.phase_id]) workItemsByPhase[w.phase_id] = [];
      workItemsByPhase[w.phase_id].push(w);
    });

    const phasesByProject = {};
    rolledPhases.forEach((ph) => {
      const items = workItemsByPhase[ph.id] || [];
      const phaseObj = {
        ...ph,
        workItems: items,
        workItemsCount: items.length
      };
      if (!phasesByProject[ph.project_id]) phasesByProject[ph.project_id] = [];
      phasesByProject[ph.project_id].push(phaseObj);
    });

    const fullProjects = rolledProjects.map((proj) => {
      const phases = phasesByProject[proj.id] || [];
      const totalWorkItems = phases.reduce((sum, p) => sum + p.workItems.length, 0);
      return {
        ...proj,
        phases,
        totalWorkItems
      };
    });

    res.json({
      projects: fullProjects,
      flatPhases: rolledPhases,
      flatWorkItems: workItemsWithMeta,
      dependencies: rawDependencies
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Project CRUD
router.post('/projects', (req, res) => {
  try {
    const { name, code, description, status, health, start_date, end_date, owner_id, budget } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required.' });

    const db = getDatabase();
    const id = `proj-${Date.now()}`;
    db.prepare(`
      INSERT INTO projects (id, name, code, description, status, health, start_date, end_date, owner_id, budget)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, code.toUpperCase(), description || '',
      status || 'ON_TRACK', health || 'HEALTHY',
      start_date || '2025-01-01', end_date || '2025-12-31',
      owner_id || null, budget || 0
    );

    // Auto-create a default Phase 1
    const phaseId = `ph-${id}-1`;
    db.prepare(`
      INSERT INTO phases (id, project_id, name, sort_order, start_date, end_date, status, progress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(phaseId, id, 'Phase 1: Inception & Architecture', 1, start_date || '2025-01-01', end_date || '2025-06-30', 'ON_TRACK', 0);

    logChange(db, 'PROJECT', id, 'CREATE', `Created project: ${name} (${code})`);
    const created = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, status, health, start_date, end_date, owner_id, budget } = req.body;
    const db = getDatabase();
    db.prepare(`
      UPDATE projects
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          status = COALESCE(?, status),
          health = COALESCE(?, health),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          owner_id = COALESCE(?, owner_id),
          budget = COALESCE(?, budget)
      WHERE id = ?
    `).run(
      name, code ? code.toUpperCase() : null, description, status, health,
      start_date, end_date, owner_id, budget, id
    );
    logChange(db, 'PROJECT', id, 'UPDATE', `Updated project ${id}`);
    const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
    logChange(db, 'PROJECT', id, 'DELETE', `Deleted project ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Phase CRUD
router.post('/phases', (req, res) => {
  try {
    const { project_id, name, sort_order, start_date, end_date, status, progress } = req.body;
    if (!project_id || !name) return res.status(400).json({ error: 'project_id and name are required.' });

    const db = getDatabase();
    const id = `ph-${Date.now()}`;
    db.prepare(`
      INSERT INTO phases (id, project_id, name, sort_order, start_date, end_date, status, progress)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, project_id, name, sort_order || 1,
      start_date || '2025-01-01', end_date || '2025-06-30',
      status || 'NOT_STARTED', progress || 0
    );
    logChange(db, 'PHASE', id, 'CREATE', `Created phase: ${name}`);
    const created = db.prepare('SELECT * FROM phases WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/phases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, sort_order, start_date, end_date, status, progress } = req.body;
    const db = getDatabase();
    db.prepare(`
      UPDATE phases
      SET name = COALESCE(?, name),
          sort_order = COALESCE(?, sort_order),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          status = COALESCE(?, status),
          progress = COALESCE(?, progress)
      WHERE id = ?
    `).run(name, sort_order, start_date, end_date, status, progress, id);
    logChange(db, 'PHASE', id, 'UPDATE', `Updated phase ${id}`);
    const updated = db.prepare('SELECT * FROM phases WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/phases/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM phases WHERE id = ?').run(id);
    logChange(db, 'PHASE', id, 'DELETE', `Deleted phase ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Work Items CRUD
router.post('/work-items', (req, res) => {
  try {
    const { phase_id, name, description, start_date, end_date, progress, status, is_milestone, priority, assignments, dependencies } = req.body;
    if (!phase_id || !name || !start_date || !end_date) {
      return res.status(400).json({ error: 'phase_id, name, start_date, and end_date are required.' });
    }

    const db = getDatabase();
    const id = `item-${Date.now()}`;
    db.prepare(`
      INSERT INTO work_items (id, phase_id, name, description, start_date, end_date, progress, status, is_milestone, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, phase_id, name, description || '',
      start_date, end_date, progress || 0,
      status || 'NOT_STARTED', is_milestone ? 1 : 0, priority || 'MEDIUM'
    );

    // Save assignments if provided
    if (Array.isArray(assignments)) {
      const insertAsgn = db.prepare(`
        INSERT INTO assignments (id, work_item_id, person_id, team_id, allocated_hours, allocation_pct, role_in_task)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      assignments.forEach((a, idx) => {
        insertAsgn.run(`asgn-${id}-${idx}`, id, a.person_id || null, a.team_id || null, a.allocated_hours || 40, a.allocation_pct || 100, a.role_in_task || 'Contributor');
      });
    }

    // Save dependencies if provided
    if (Array.isArray(dependencies)) {
      const insertDep = db.prepare(`
        INSERT OR IGNORE INTO dependencies (id, predecessor_id, successor_id, type)
        VALUES (?, ?, ?, ?)
      `);
      dependencies.forEach((predId) => {
        insertDep.run(`dep-${predId}-${id}`, predId, id, 'FS');
      });
    }

    logChange(db, 'WORK_ITEM', id, 'CREATE', `Created work item: ${name}`);
    const created = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/work-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { phase_id, name, description, start_date, end_date, progress, status, is_milestone, priority, assignments, dependencies } = req.body;
    const db = getDatabase();
    
    db.prepare(`
      UPDATE work_items
      SET phase_id = COALESCE(?, phase_id),
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          start_date = COALESCE(?, start_date),
          end_date = COALESCE(?, end_date),
          progress = COALESCE(?, progress),
          status = COALESCE(?, status),
          is_milestone = COALESCE(?, is_milestone),
          priority = COALESCE(?, priority)
      WHERE id = ?
    `).run(
      phase_id, name, description, start_date, end_date,
      progress, status, is_milestone !== undefined ? (is_milestone ? 1 : 0) : null,
      priority, id
    );

    // Sync assignments if provided
    if (Array.isArray(assignments)) {
      db.prepare('DELETE FROM assignments WHERE work_item_id = ?').run(id);
      const insertAsgn = db.prepare(`
        INSERT INTO assignments (id, work_item_id, person_id, team_id, allocated_hours, allocation_pct, role_in_task)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      assignments.forEach((a, idx) => {
        insertAsgn.run(`asgn-${id}-${idx}-${Date.now()}`, id, a.person_id || null, a.team_id || null, a.allocated_hours || 40, a.allocation_pct || 100, a.role_in_task || 'Contributor');
      });
    }

    // Sync dependencies if provided
    if (Array.isArray(dependencies)) {
      db.prepare('DELETE FROM dependencies WHERE successor_id = ?').run(id);
      const insertDep = db.prepare(`
        INSERT OR IGNORE INTO dependencies (id, predecessor_id, successor_id, type)
        VALUES (?, ?, ?, ?)
      `);
      dependencies.forEach((predId) => {
        insertDep.run(`dep-${predId}-${id}`, predId, id, 'FS');
      });
    }

    logChange(db, 'WORK_ITEM', id, 'UPDATE', `Updated work item ${id}`);
    const updated = db.prepare('SELECT * FROM work_items WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/work-items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM work_items WHERE id = ?').run(id);
    logChange(db, 'WORK_ITEM', id, 'DELETE', `Deleted work item ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

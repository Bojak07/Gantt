import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';

const router = Router();

// GET full hierarchy
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const domains = db.prepare('SELECT * FROM domains ORDER BY code ASC, name ASC').all();
    const tribes = db.prepare('SELECT * FROM tribes ORDER BY code ASC, name ASC').all();
    const teams = db.prepare('SELECT * FROM teams ORDER BY code ASC, name ASC').all();
    const people = db.prepare('SELECT * FROM people ORDER BY name ASC').all();

    // Assemble nested tree
    const tree = domains.map((domain) => {
      const domainTribes = tribes
        .filter((t) => t.domain_id === domain.id)
        .map((tribe) => {
          const tribeTeams = teams
            .filter((tm) => tm.tribe_id === tribe.id)
            .map((team) => {
              const teamPeople = people.filter((p) => p.team_id === team.id);
              return {
                ...team,
                people: teamPeople,
                memberCount: teamPeople.length
              };
            });

          const totalPeopleInTribe = tribeTeams.reduce((sum, tm) => sum + tm.people.length, 0);
          return {
            ...tribe,
            teams: tribeTeams,
            teamCount: tribeTeams.length,
            memberCount: totalPeopleInTribe
          };
        });

      const totalPeopleInDomain = domainTribes.reduce((sum, tr) => sum + tr.memberCount, 0);
      return {
        ...domain,
        tribes: domainTribes,
        tribeCount: domainTribes.length,
        memberCount: totalPeopleInDomain
      };
    });

    res.json({
      tree,
      domains,
      tribes,
      teams,
      people
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Domain CRUD
router.post('/domains', (req, res) => {
  try {
    const { name, code, description } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and code are required.' });
    
    const db = getDatabase();
    const id = `dom-${Date.now()}`;
    db.prepare('INSERT INTO domains (id, name, code, description) VALUES (?, ?, ?, ?)').run(
      id, name, code.toUpperCase(), description || ''
    );
    logChange(db, 'DOMAIN', id, 'CREATE', `Created domain: ${name} (${code})`);
    
    const created = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/domains/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    const db = getDatabase();
    db.prepare('UPDATE domains SET name = COALESCE(?, name), code = COALESCE(?, code), description = COALESCE(?, description) WHERE id = ?').run(
      name, code ? code.toUpperCase() : null, description, id
    );
    logChange(db, 'DOMAIN', id, 'UPDATE', `Updated domain ${id}`);
    const updated = db.prepare('SELECT * FROM domains WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/domains/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM domains WHERE id = ?').run(id);
    logChange(db, 'DOMAIN', id, 'DELETE', `Deleted domain ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Tribe CRUD
router.post('/tribes', (req, res) => {
  try {
    const { domain_id, name, code, lead_name } = req.body;
    if (!domain_id || !name || !code) return res.status(400).json({ error: 'domain_id, name, and code are required.' });
    
    const db = getDatabase();
    const id = `trb-${Date.now()}`;
    db.prepare('INSERT INTO tribes (id, domain_id, name, code, lead_name) VALUES (?, ?, ?, ?, ?)').run(
      id, domain_id, name, code.toUpperCase(), lead_name || ''
    );
    logChange(db, 'TRIBE', id, 'CREATE', `Created tribe: ${name} (${code})`);
    
    const created = db.prepare('SELECT * FROM tribes WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/tribes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { domain_id, name, code, lead_name } = req.body;
    const db = getDatabase();
    db.prepare('UPDATE tribes SET domain_id = COALESCE(?, domain_id), name = COALESCE(?, name), code = COALESCE(?, code), lead_name = COALESCE(?, lead_name) WHERE id = ?').run(
      domain_id, name, code ? code.toUpperCase() : null, lead_name, id
    );
    logChange(db, 'TRIBE', id, 'UPDATE', `Updated tribe ${id}`);
    const updated = db.prepare('SELECT * FROM tribes WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/tribes/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM tribes WHERE id = ?').run(id);
    logChange(db, 'TRIBE', id, 'DELETE', `Deleted tribe ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Team CRUD
router.post('/teams', (req, res) => {
  try {
    const { tribe_id, name, code, focus_area } = req.body;
    if (!tribe_id || !name || !code) return res.status(400).json({ error: 'tribe_id, name, and code are required.' });
    
    const db = getDatabase();
    const id = `team-${Date.now()}`;
    db.prepare('INSERT INTO teams (id, tribe_id, name, code, focus_area) VALUES (?, ?, ?, ?, ?)').run(
      id, tribe_id, name, code.toUpperCase(), focus_area || ''
    );
    logChange(db, 'TEAM', id, 'CREATE', `Created team: ${name} (${code})`);
    
    const created = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/teams/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { tribe_id, name, code, focus_area } = req.body;
    const db = getDatabase();
    db.prepare('UPDATE teams SET tribe_id = COALESCE(?, tribe_id), name = COALESCE(?, name), code = COALESCE(?, code), focus_area = COALESCE(?, focus_area) WHERE id = ?').run(
      tribe_id, name, code ? code.toUpperCase() : null, focus_area, id
    );
    logChange(db, 'TEAM', id, 'UPDATE', `Updated team ${id}`);
    const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/teams/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM teams WHERE id = ?').run(id);
    logChange(db, 'TEAM', id, 'DELETE', `Deleted team ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// People CRUD
router.post('/people', (req, res) => {
  try {
    const { team_id, name, email, role, avatar_initials, default_weekly_hours } = req.body;
    if (!name || !email || !role) return res.status(400).json({ error: 'Name, email, and role are required.' });

    const initials = avatar_initials || name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
    const db = getDatabase();
    const id = `pers-${Date.now()}`;
    db.prepare('INSERT INTO people (id, team_id, name, email, role, avatar_initials, default_weekly_hours) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, team_id || null, name, email, role, initials, default_weekly_hours || 40
    );

    // No flat capacity records: the capacity matrix computes day-based
    // monthly capacity dynamically from default_weekly_hours. Explicit
    // records are only created when a user overrides a specific month.

    logChange(db, 'PERSON', id, 'CREATE', `Added person: ${name} (${role})`);
    const created = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/people/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { team_id, name, email, role, avatar_initials, default_weekly_hours } = req.body;
    const db = getDatabase();
    db.prepare(`
      UPDATE people
      SET team_id = COALESCE(?, team_id),
          name = COALESCE(?, name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          avatar_initials = COALESCE(?, avatar_initials),
          default_weekly_hours = COALESCE(?, default_weekly_hours)
      WHERE id = ?
    `).run(
      team_id !== undefined ? team_id : null,
      name, email, role, avatar_initials, default_weekly_hours, id
    );
    logChange(db, 'PERSON', id, 'UPDATE', `Updated person ${id}`);
    const updated = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/people/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.prepare('DELETE FROM people WHERE id = ?').run(id);
    logChange(db, 'PERSON', id, 'DELETE', `Deleted person ${id}`);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

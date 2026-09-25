import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';

test('Database and Seed Idempotency', () => {
  const db = getDatabase();
  
  // First seed
  const result1 = seedDatabase(db);
  assert.equal(result1.success, true);
  
  const projCount1 = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const personCount1 = db.prepare('SELECT COUNT(*) as count FROM people').get().count;
  const domainCount1 = db.prepare('SELECT COUNT(*) as count FROM domains').get().count;

  assert.equal(projCount1, 4);
  assert.equal(personCount1, 16);
  assert.equal(domainCount1, 3);

  // Second seed (verify no duplicates created)
  const result2 = seedDatabase(db);
  assert.equal(result2.success, true);

  const projCount2 = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
  const personCount2 = db.prepare('SELECT COUNT(*) as count FROM people').get().count;
  const domainCount2 = db.prepare('SELECT COUNT(*) as count FROM domains').get().count;

  assert.equal(projCount1, projCount2);
  assert.equal(personCount1, personCount2);
  assert.equal(domainCount1, domainCount2);
});

test('Audit Log Recording', () => {
  const db = getDatabase();
  const history = db.prepare('SELECT * FROM change_history ORDER BY id DESC LIMIT 5').all();
  assert.ok(history.length > 0);
  assert.equal(history[0].action, 'RESET');
});

test('Dynamic Date Anchors: all seeded dates live in the current year', () => {
  const db = getDatabase();
  seedDatabase(db);
  const year = String(new Date().getFullYear());

  const tables = [
    ['projects', 'start_date', 'end_date'],
    ['phases', 'start_date', 'end_date'],
    ['work_items', 'start_date', 'end_date'],
    ['decision_log', 'date', null]
  ];

  for (const [table, colA, colB] of tables) {
    const rows = db.prepare(`SELECT ${colA} AS a${colB ? `, ${colB} AS b` : ''} FROM ${table}`).all();
    assert.ok(rows.length > 0, `expected seed data in ${table}`);
    for (const row of rows) {
      assert.ok(row.a.startsWith(`${year}-`), `${table}.${colA} should be anchored to current year, got ${row.a}`);
      if (colB) {
        assert.ok(row.b.startsWith(`${year}-`), `${table}.${colB} should be anchored to current year, got ${row.b}`);
      }
    }
  }
});

test('Decision Log: seeded decisions join to projects and people', () => {
  const db = getDatabase();
  seedDatabase(db);

  const rows = db.prepare(`
    SELECT dl.*, p.name as project_name, pe.name as person_name
    FROM decision_log dl
    LEFT JOIN projects p ON dl.project_id = p.id
    LEFT JOIN people pe ON dl.person_id = pe.id
    ORDER BY dl.date DESC
  `).all();

  assert.ok(rows.length >= 5, 'expected at least the 5 seeded decisions');
  for (const row of rows) {
    assert.ok(row.title, 'decision must have a title');
    assert.ok(row.date, 'decision must have a date');
    assert.ok(row.project_name, `decision ${row.id} should join to a project`);
    assert.ok(row.person_name, `decision ${row.id} should join to a person`);
  }

  // Ordered by date DESC
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i - 1].date >= rows[i].date, 'decisions must be ordered by date DESC');
  }
});

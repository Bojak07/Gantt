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

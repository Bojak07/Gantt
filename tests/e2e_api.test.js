import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server/index.js';
import { getDynamicMonthlyCapacity } from '../server/services/calculations.js';

const BASE_URL = 'http://localhost:3001/api';
const PORT = 3001;
let httpServer = null;

async function healthUp() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

before(async () => {
  // Reuse an already-running dev server if present, otherwise boot the app in-process.
  if (await healthUp()) return;
  await new Promise((resolve, reject) => {
    httpServer = app.listen(PORT, resolve);
    httpServer.once('error', reject);
  });
}, { timeout: 15000 });

after(() => {
  if (httpServer) httpServer.close();
});

test('E2E Full Flow: Hierarchy, Projects, Capacity Matrix, Dependencies, History & Reset', async () => {
  // 1. Health check & ensure clean seed
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.equal(healthRes.ok, true);
  const health = await healthRes.json();
  assert.equal(health.status, 'ok');

  await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });

  // 2. Hierarchy Tree & Entities
  const hierRes = await fetch(`${BASE_URL}/hierarchy`);
  assert.equal(hierRes.ok, true);
  const hierarchy = await hierRes.json();
  assert.ok(hierarchy.tree.length >= 3);
  assert.ok(hierarchy.people.length >= 16);
  // Baseline seeded count so step 10 can verify the reset without
  // hardcoding a number that breaks if the seed grows.
  const baselinePeople = hierarchy.people.length;

  // 3. Create Person
  const testEmail = `test.engineer.${Date.now()}@bank.com`;
  const newPersonRes = await fetch(`${BASE_URL}/hierarchy/people`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Integration Test Engineer',
      email: testEmail,
      role: 'Staff Automation Specialist',
      team_id: hierarchy.teams[0].id,
      default_weekly_hours: 40
    })
  });
  if (!newPersonRes.ok) {
    console.error('Create Person Error:', await newPersonRes.text());
  }
  assert.equal(newPersonRes.status, 201);
  const createdPerson = await newPersonRes.json();
  assert.equal(createdPerson.name, 'Integration Test Engineer');

  // 4. Projects & Schedule
  const projRes = await fetch(`${BASE_URL}/projects`);
  assert.equal(projRes.ok, true);
  const projects = await projRes.json();
  assert.ok(projects.projects.length >= 4);
  const firstPhase = projects.flatPhases[0];

  // 5. Create Work Item with Assignment (dynamic year: full April of CURRENT_YEAR)
  const year = new Date().getFullYear();
  const ym = `${year}-04`;
  const newWorkItemRes = await fetch(`${BASE_URL}/projects/work-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phase_id: firstPhase.id,
      name: 'Automated E2E Test Suite Task',
      description: 'Verifying end to end execution',
      start_date: `${year}-04-01`,
      end_date: `${year}-04-30`,
      progress: 50,
      status: 'ON_TRACK',
      priority: 'HIGH',
      assignments: [
        {
          person_id: createdPerson.id,
          team_id: hierarchy.teams[0].id,
          allocated_hours: 80,
          role_in_task: 'Lead Test Engineer'
        }
      ]
    })
  });
  assert.equal(newWorkItemRes.status, 201);
  const createdWorkItem = await newWorkItemRes.json();
  assert.equal(createdWorkItem.name, 'Automated E2E Test Suite Task');

  // 6. Verify Capacity Matrix calculates demand for new assignment.
  // Capacity is day-based: (40h / 5) * workingDays(April), not a flat 160h.
  const capRes = await fetch(`${BASE_URL}/capacity/matrix`);
  assert.equal(capRes.ok, true);
  const capMatrix = await capRes.json();
  const engineerMetric = capMatrix.peopleMetrics.find((pm) => pm.person.id === createdPerson.id);
  assert.ok(engineerMetric);
  const expectedCapacity = getDynamicMonthlyCapacity(year, 4, 40);
  assert.equal(engineerMetric.monthlyData[ym].demandHours, 80);
  assert.equal(engineerMetric.monthlyData[ym].capacityHours, expectedCapacity);
  assert.equal(engineerMetric.monthlyData[ym].utilizationPct, Math.round((80 / expectedCapacity) * 100));

  // 7. Dependencies & Circular Cycle Detection
  const allItems = projects.flatWorkItems;
  if (allItems.length >= 2) {
    const itemA = allItems[0].id;
    const itemB = allItems[1].id;

    // Self dependency should fail
    const selfDepRes = await fetch(`${BASE_URL}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predecessor_id: itemA, successor_id: itemA, type: 'FS' })
    });
    assert.equal(selfDepRes.status, 400);
  }

  // 8. Audit History Log
  const histRes = await fetch(`${BASE_URL}/history`);
  assert.equal(histRes.ok, true);
  const history = await histRes.json();
  assert.ok(history.length > 0);
  assert.ok(history.some((h) => h.action === 'CREATE' && h.entity_type === 'PERSON'));

  // 9. Reset Demo Data
  const resetRes = await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });
  assert.equal(resetRes.ok, true);
  const resetData = await resetRes.json();
  assert.equal(resetData.success, true);

  // 10. Verify Clean State after Reset
  const postResetHier = await (await fetch(`${BASE_URL}/hierarchy`)).json();
  assert.equal(postResetHier.people.length, baselinePeople);
  assert.equal(postResetHier.people.some((p) => p.id === createdPerson.id), false);
});

test('E2E Business Decision Log: validation, CRUD, joins, ordering', async () => {
  // 0. Server must be reachable
  const healthRes = await fetch(`${BASE_URL}/health`);
  assert.equal(healthRes.ok, true);

  await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });

  const year = new Date().getFullYear();
  const [hier, projRes] = await Promise.all([
    fetch(`${BASE_URL}/hierarchy`).then((r) => r.json()),
    fetch(`${BASE_URL}/projects`).then((r) => r.json())
  ]);
  const project = projRes.projects[0];
  const person = hier.people[0];

  // 1. Validation: missing title/date is rejected
  const badRes = await fetch(`${BASE_URL}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: project.id })
  });
  assert.equal(badRes.status, 400);

  // 2. Create
  const createRes = await fetch(`${BASE_URL}/decisions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated E2E Decision',
      project_id: project.id,
      date: `${year}-07-15`,
      person_id: person.id,
      decision_summary: 'Decision created by the E2E test suite.',
      impact_status: 'POSITIVE'
    })
  });
  assert.equal(createRes.status, 200);
  const created = await createRes.json();
  assert.ok(created.id);

  // 3. List: joined fields + date DESC ordering
  const list1 = await (await fetch(`${BASE_URL}/decisions`)).json();
  const found = list1.find((d) => d.id === created.id);
  assert.ok(found, 'created decision must appear in list');
  assert.equal(found.title, 'Automated E2E Decision');
  assert.equal(found.project_name, project.name);
  assert.equal(found.person_name, person.name);
  assert.equal(found.impact_status, 'POSITIVE');
  for (let i = 1; i < list1.length; i++) {
    assert.ok(list1[i - 1].date >= list1[i].date, 'decisions must be ordered by date DESC');
  }

  // 4. Update
  const updateRes = await fetch(`${BASE_URL}/decisions/${created.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Automated E2E Decision (updated)',
      project_id: project.id,
      date: `${year}-07-15`,
      person_id: person.id,
      decision_summary: 'Updated by the E2E test suite.',
      impact_status: 'NEUTRAL'
    })
  });
  assert.equal(updateRes.status, 200);
  const list2 = await (await fetch(`${BASE_URL}/decisions`)).json();
  const updated = list2.find((d) => d.id === created.id);
  assert.equal(updated.title, 'Automated E2E Decision (updated)');
  assert.equal(updated.impact_status, 'NEUTRAL');

  // 5. Delete
  const deleteRes = await fetch(`${BASE_URL}/decisions/${created.id}`, { method: 'DELETE' });
  assert.equal(deleteRes.status, 200);
  const list3 = await (await fetch(`${BASE_URL}/decisions`)).json();
  assert.equal(list3.some((d) => d.id === created.id), false, 'decision must be gone after delete');

  // 6. Leave a clean state
  await fetch(`${BASE_URL}/demo/reset`, { method: 'POST' });
});

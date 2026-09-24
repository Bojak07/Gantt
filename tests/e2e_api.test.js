import test from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3001/api';

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
      default_monthly_hours: 160
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

  // 5. Create Work Item with Assignment
  const newWorkItemRes = await fetch(`${BASE_URL}/projects/work-items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phase_id: firstPhase.id,
      name: 'Automated E2E Test Suite Task',
      description: 'Verifying end to end execution',
      start_date: '2025-04-01',
      end_date: '2025-04-30',
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

  // 6. Verify Capacity Matrix calculates demand for new assignment
  const capRes = await fetch(`${BASE_URL}/capacity/matrix`);
  assert.equal(capRes.ok, true);
  const capMatrix = await capRes.json();
  const engineerMetric = capMatrix.peopleMetrics.find((pm) => pm.person.id === createdPerson.id);
  assert.ok(engineerMetric);
  assert.equal(engineerMetric.monthlyData['2025-04'].demandHours, 80);
  assert.equal(engineerMetric.monthlyData['2025-04'].capacityHours, 160);
  assert.equal(engineerMetric.monthlyData['2025-04'].utilizationPct, 50);

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
  assert.equal(postResetHier.people.length, 16);
  assert.equal(postResetHier.people.some((p) => p.id === createdPerson.id), false);
});

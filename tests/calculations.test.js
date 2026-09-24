import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getInclusiveDays,
  getMonthlyOverlapDays,
  calculateMonthlyDemandForAssignment,
  calculateRollups,
  hasCircularDependency
} from '../server/services/calculations.js';

test('Date Helpers: getInclusiveDays', () => {
  assert.equal(getInclusiveDays('2025-01-01', '2025-01-01'), 1);
  assert.equal(getInclusiveDays('2025-01-01', '2025-01-31'), 31);
  assert.equal(getInclusiveDays('2025-02-01', '2025-02-28'), 28);
});

test('Date Helpers: getMonthlyOverlapDays', () => {
  // Task entirely in January
  assert.equal(getMonthlyOverlapDays('2025-01-10', '2025-01-20', '2025-01'), 11);
  
  // Task in February, query January
  assert.equal(getMonthlyOverlapDays('2025-02-01', '2025-02-28', '2025-01'), 0);
  
  // Task spanning Jan 15 to Feb 14 (31 days total, 17 in Jan, 14 in Feb)
  assert.equal(getMonthlyOverlapDays('2025-01-15', '2025-02-14', '2025-01'), 17);
  assert.equal(getMonthlyOverlapDays('2025-01-15', '2025-02-14', '2025-02'), 14);
});

test('Demand calculation: calculateMonthlyDemandForAssignment', () => {
  // 100 hours allocated over whole of Jan
  const janDemand = calculateMonthlyDemandForAssignment('2025-01-01', '2025-01-31', 100, '2025-01');
  assert.equal(janDemand, 100);

  // 100 hours allocated from Jan 1 to Feb 19 (50 days: 31 Jan, 19 Feb)
  const partialJan = calculateMonthlyDemandForAssignment('2025-01-01', '2025-02-19', 100, '2025-01');
  assert.equal(partialJan, 62); // 100 * (31/50) = 62.0
});

test('Rollups: calculateRollups computes correct min/max dates and average progress', () => {
  const projects = [{ id: 'p1', name: 'Proj 1', start_date: '2025-01-01', end_date: '2025-12-31' }];
  const phases = [{ id: 'ph1', project_id: 'p1', name: 'Phase 1', start_date: '2025-01-01', end_date: '2025-06-30' }];
  const workItems = [
    { id: 'w1', phase_id: 'ph1', start_date: '2025-02-01', end_date: '2025-03-31', progress: 100, status: 'COMPLETED' },
    { id: 'w2', phase_id: 'ph1', start_date: '2025-03-15', end_date: '2025-05-30', progress: 50, status: 'ON_TRACK' }
  ];

  const { projects: rolledProj, phases: rolledPhases } = calculateRollups(projects, phases, workItems);

  assert.equal(rolledPhases[0].computedStartDate, '2025-02-01');
  assert.equal(rolledPhases[0].computedEndDate, '2025-05-30');
  assert.equal(rolledPhases[0].computedProgress, 75);
  assert.equal(rolledPhases[0].totalItems, 2);
  assert.equal(rolledPhases[0].completedItems, 1);

  assert.equal(rolledProj[0].computedStartDate, '2025-02-01');
  assert.equal(rolledProj[0].computedEndDate, '2025-05-30');
  assert.equal(rolledProj[0].computedProgress, 75);
});

test('Dependencies: hasCircularDependency prevents cycles', () => {
  const deps = [
    { predecessor_id: 'A', successor_id: 'B' },
    { predecessor_id: 'B', successor_id: 'C' }
  ];

  // Self-dependency
  assert.equal(hasCircularDependency(deps, 'A', 'A'), true);

  // Cycle C -> A
  assert.equal(hasCircularDependency(deps, 'C', 'A'), true);

  // Valid non-cycle D -> A
  assert.equal(hasCircularDependency(deps, 'D', 'A'), false);

  // Valid non-cycle C -> D
  assert.equal(hasCircularDependency(deps, 'C', 'D'), false);
});

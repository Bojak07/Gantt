import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getWorkingDaysInMonth,
  getDynamicMonthlyCapacity,
  getInclusiveDays,
  getMonthlyOverlapDays,
  calculateMonthlyDemandForAssignment,
  calculateRollups,
  hasCircularDependency
} from '../server/services/calculations.js';

test('Day-based capacity: getWorkingDaysInMonth counts Monday-Friday only', () => {
  // Jan 2025: starts Wednesday, 31 days -> 3 (Wed-Fri) + 4x5 = 23
  assert.equal(getWorkingDaysInMonth(2025, 1), 23);

  // Feb 2026: starts Sunday, 28 days -> 4 full Mon-Fri weeks = 20
  assert.equal(getWorkingDaysInMonth(2026, 2), 20);

  // Feb 2024: leap month, starts Thursday -> 2 (Thu-Fri) + 3x5 + 4 (Mon-Thu) = 21
  assert.equal(getWorkingDaysInMonth(2024, 2), 21);

  // Dec 2023: starts Friday, 31 days -> 1 (Fri) + 4x5 = 21
  assert.equal(getWorkingDaysInMonth(2023, 12), 21);

  // Apr 2025: starts Tuesday, 30 days -> 4 (Tue-Fri) + 3x5 + 3 (Mon-Wed) = 22
  assert.equal(getWorkingDaysInMonth(2025, 4), 22);

  // May 2026: starts Friday, 31 days -> 1 (Fri) + 4x5 = 21
  assert.equal(getWorkingDaysInMonth(2026, 5), 21);
});

test('Day-based capacity: getDynamicMonthlyCapacity prorates (weeklyHours / 5) * workingDays', () => {
  // Default 40h/week -> 8h per working day
  assert.equal(getDynamicMonthlyCapacity(2025, 1), 184); // 23 working days
  assert.equal(getDynamicMonthlyCapacity(2026, 2), 160); // 20 working days
  assert.equal(getDynamicMonthlyCapacity(2024, 2), 168); // 21 working days (leap Feb)
  assert.equal(getDynamicMonthlyCapacity(2023, 12), 168); // 21 working days

  // Custom weekly hours
  assert.equal(getDynamicMonthlyCapacity(2025, 4, 45), 198); // 9h/day * 22
  assert.equal(getDynamicMonthlyCapacity(2026, 5, 35), 147); // 7h/day * 21
});

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

test('Rollups: empty phase and project fall back to their own dates', () => {
  const projects = [{ id: 'p1', name: 'Empty Proj', start_date: '2026-04-01', end_date: '2026-06-30', progress: 0 }];
  const phases = [{ id: 'ph1', project_id: 'p1', name: 'Empty Phase', start_date: '2026-04-10', end_date: '2026-05-10', progress: 30 }];

  const { projects: rolledProj, phases: rolledPhases } = calculateRollups(projects, phases, []);

  assert.equal(rolledPhases[0].computedStartDate, '2026-04-10');
  assert.equal(rolledPhases[0].computedEndDate, '2026-05-10');
  assert.equal(rolledPhases[0].computedProgress, 30);
  assert.equal(rolledPhases[0].totalItems, 0);
  assert.equal(rolledPhases[0].completedItems, 0);

  assert.equal(rolledProj[0].computedStartDate, '2026-04-10');
  assert.equal(rolledProj[0].computedEndDate, '2026-05-10');
  assert.equal(rolledProj[0].computedProgress, 30);
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

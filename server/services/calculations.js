/**
 * Calculations service for date rollups, capacity & utilization, and dependency validation.
 * Day-based monthly capacity: (defaultWeeklyHours / 5) * workingDays
 */

/**
 * Returns number of working days (Mon–Fri) in a given year/month.
 */
export function getWorkingDaysInMonth(year, month) {
  // month is 1-indexed (1 = Jan)
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
  }
  return workingDays;
}

/**
 * Computes dynamic monthly capacity from weekly hours.
 * Default: 40h/week, prorated by actual working days.
 */
export function getDynamicMonthlyCapacity(year, month, weeklyHours = 40) {
  const workingDays = getWorkingDaysInMonth(year, month);
  return Math.round((weeklyHours / 5) * workingDays * 10) / 10;
}

/**
 * Returns number of days between two YYYY-MM-DD dates (inclusive of start and end).
 */
export function getInclusiveDays(startStr, endStr) {
  if (!startStr || !endStr) return 1;
  const start = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  const diffTime = end.getTime() - start.getTime();
  if (isNaN(diffTime) || diffTime < 0) return 1;
  return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Returns overlap days between a task range and a month range (YYYY-MM).
 */
export function getMonthlyOverlapDays(taskStartStr, taskEndStr, yearMonthStr) {
  if (!taskStartStr || !taskEndStr || !yearMonthStr) return 0;
  
  const [year, month] = yearMonthStr.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  // Last day of month
  const monthEnd = new Date(Date.UTC(year, month, 0));

  const taskStart = new Date(taskStartStr + 'T00:00:00Z');
  const taskEnd = new Date(taskEndStr + 'T00:00:00Z');

  const overlapStart = new Date(Math.max(taskStart.getTime(), monthStart.getTime()));
  const overlapEnd = new Date(Math.min(taskEnd.getTime(), monthEnd.getTime()));

  if (overlapStart.getTime() > overlapEnd.getTime()) {
    return 0;
  }

  const diffTime = overlapEnd.getTime() - overlapStart.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculates demand hours for a specific month for an assignment.
 */
export function calculateMonthlyDemandForAssignment(taskStart, taskEnd, allocatedHours, yearMonth) {
  const totalDays = getInclusiveDays(taskStart, taskEnd);
  const overlapDays = getMonthlyOverlapDays(taskStart, taskEnd, yearMonth);
  if (totalDays <= 0 || overlapDays <= 0) return 0;
  const demand = (allocatedHours * overlapDays) / totalDays;
  return Math.round(demand * 10) / 10;
}

/**
 * Computes rollups for phases and projects from work items.
 */
export function calculateRollups(projects, phases, workItems) {
  const phaseMap = {};
  phases.forEach((p) => {
    phaseMap[p.id] = {
      ...p,
      items: [],
      computedStartDate: null,
      computedEndDate: null,
      computedProgress: 0,
      totalItems: 0,
      completedItems: 0
    };
  });

  workItems.forEach((item) => {
    if (phaseMap[item.phase_id]) {
      phaseMap[item.phase_id].items.push(item);
    }
  });

  Object.values(phaseMap).forEach((p) => {
    if (p.items.length > 0) {
      const startDates = p.items.map((i) => i.start_date).filter(Boolean);
      const endDates = p.items.map((i) => i.end_date).filter(Boolean);
      
      p.computedStartDate = startDates.length > 0 ? startDates.sort()[0] : p.start_date;
      p.computedEndDate = endDates.length > 0 ? endDates.sort().reverse()[0] : p.end_date;
      
      const totalProgress = p.items.reduce((sum, i) => sum + (Number(i.progress) || 0), 0);
      p.computedProgress = Math.round(totalProgress / p.items.length);
      p.totalItems = p.items.length;
      p.completedItems = p.items.filter((i) => (Number(i.progress) || 0) === 100 || i.status === 'COMPLETED').length;
    } else {
      p.computedStartDate = p.start_date;
      p.computedEndDate = p.end_date;
      p.computedProgress = p.progress || 0;
    }
  });

  const projectMap = {};
  projects.forEach((proj) => {
    projectMap[proj.id] = {
      ...proj,
      phases: [],
      computedStartDate: null,
      computedEndDate: null,
      computedProgress: 0
    };
  });

  Object.values(phaseMap).forEach((p) => {
    if (projectMap[p.project_id]) {
      projectMap[p.project_id].phases.push(p);
    }
  });

  Object.values(projectMap).forEach((proj) => {
    if (proj.phases.length > 0) {
      const startDates = proj.phases.map((ph) => ph.computedStartDate).filter(Boolean);
      const endDates = proj.phases.map((ph) => ph.computedEndDate).filter(Boolean);

      proj.computedStartDate = startDates.length > 0 ? startDates.sort()[0] : proj.start_date;
      proj.computedEndDate = endDates.length > 0 ? endDates.sort().reverse()[0] : proj.end_date;

      const totalProgress = proj.phases.reduce((sum, ph) => sum + ph.computedProgress, 0);
      proj.computedProgress = Math.round(totalProgress / proj.phases.length);
    } else {
      proj.computedStartDate = proj.start_date;
      proj.computedEndDate = proj.end_date;
      proj.computedProgress = 0;
    }
  });

  return { projects: Object.values(projectMap), phases: Object.values(phaseMap) };
}

/**
 * Detects if adding a dependency (predecessorId -> successorId) causes a cycle.
 */
export function hasCircularDependency(allDependencies, newPredecessorId, newSuccessorId) {
  if (newPredecessorId === newSuccessorId) return true;

  const adjList = new Map();
  
  // Build graph
  allDependencies.forEach((dep) => {
    if (!adjList.has(dep.predecessor_id)) adjList.set(dep.predecessor_id, []);
    adjList.get(dep.predecessor_id).push(dep.successor_id);
  });

  // Add the proposed edge
  if (!adjList.has(newPredecessorId)) adjList.set(newPredecessorId, []);
  adjList.get(newPredecessorId).push(newSuccessorId);

  // DFS cycle detection starting from newSuccessorId to see if it reaches newPredecessorId
  const visited = new Set();
  const queue = [newSuccessorId];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === newPredecessorId) return true;
    if (!visited.has(current)) {
      visited.add(current);
      const neighbors = adjList.get(current) || [];
      for (const next of neighbors) {
        if (!visited.has(next)) {
          queue.push(next);
        }
      }
    }
  }

  return false;
}

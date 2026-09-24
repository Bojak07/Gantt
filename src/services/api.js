/**
 * Client API Service Wrapper for Express + SQLite backend.
 */

const BASE_URL = '/api';

async function fetchJson(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    let errMsg = `API error ${response.status}: ${response.statusText}`;
    try {
      const body = await response.json();
      if (body.error) errMsg = body.error;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
}

export const api = {
  // Hierarchy
  getHierarchy: () => fetchJson('/hierarchy'),
  createDomain: (data) => fetchJson('/hierarchy/domains', { method: 'POST', body: JSON.stringify(data) }),
  updateDomain: (id, data) => fetchJson(`/hierarchy/domains/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDomain: (id) => fetchJson(`/hierarchy/domains/${id}`, { method: 'DELETE' }),

  createTribe: (data) => fetchJson('/hierarchy/tribes', { method: 'POST', body: JSON.stringify(data) }),
  updateTribe: (id, data) => fetchJson(`/hierarchy/tribes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTribe: (id) => fetchJson(`/hierarchy/tribes/${id}`, { method: 'DELETE' }),

  createTeam: (data) => fetchJson('/hierarchy/teams', { method: 'POST', body: JSON.stringify(data) }),
  updateTeam: (id, data) => fetchJson(`/hierarchy/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeam: (id) => fetchJson(`/hierarchy/teams/${id}`, { method: 'DELETE' }),

  createPerson: (data) => fetchJson('/hierarchy/people', { method: 'POST', body: JSON.stringify(data) }),
  updatePerson: (id, data) => fetchJson(`/hierarchy/people/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePerson: (id) => fetchJson(`/hierarchy/people/${id}`, { method: 'DELETE' }),

  // Projects & Schedule
  getProjects: () => fetchJson('/projects'),
  createProject: (data) => fetchJson('/projects/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => fetchJson(`/projects/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => fetchJson(`/projects/projects/${id}`, { method: 'DELETE' }),

  createPhase: (data) => fetchJson('/projects/phases', { method: 'POST', body: JSON.stringify(data) }),
  updatePhase: (id, data) => fetchJson(`/projects/phases/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePhase: (id) => fetchJson(`/projects/phases/${id}`, { method: 'DELETE' }),

  createWorkItem: (data) => fetchJson('/projects/work-items', { method: 'POST', body: JSON.stringify(data) }),
  updateWorkItem: (id, data) => fetchJson(`/projects/work-items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkItem: (id) => fetchJson(`/projects/work-items/${id}`, { method: 'DELETE' }),

  // Capacity & Utilization
  getCapacityMatrix: () => fetchJson('/capacity/matrix'),
  updateCapacityRecord: (data) => fetchJson('/capacity/records', { method: 'POST', body: JSON.stringify(data) }),

  // Dependencies
  getDependencies: () => fetchJson('/dependencies'),
  createDependency: (data) => fetchJson('/dependencies', { method: 'POST', body: JSON.stringify(data) }),
  deleteDependency: (id) => fetchJson(`/dependencies/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: () => fetchJson('/assignments'),
  createAssignment: (data) => fetchJson('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  deleteAssignment: (id) => fetchJson(`/assignments/${id}`, { method: 'DELETE' }),

  // History
  getHistory: () => fetchJson('/history'),

  // Demo Reset
  resetDemoData: () => fetchJson('/demo/reset', { method: 'POST' })
};

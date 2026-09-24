import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../services/api.js';

export default function ManagementView() {
  const { hierarchyData, projectsData, auditHistory, refreshAll, addToast } = useApp();
  const [activeTab, setActiveTab] = useState('resources'); // 'resources', 'projects', 'dependencies', 'history'

  // Resource creation modal/inline states
  const [newPersonModal, setNewPersonModal] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: '',
    email: '',
    role: '',
    team_id: '',
    default_weekly_hours: 40
  });

  const [newProjectModal, setNewProjectModal] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    code: '',
    description: '',
    status: 'ON_TRACK',
    budget: 1500000,
    start_date: '2025-01-01',
    end_date: '2025-12-31'
  });

  const [newDepModal, setNewDepModal] = useState(false);
  const [depForm, setDepForm] = useState({
    predecessor_id: '',
    successor_id: '',
    type: 'FS'
  });

  const [saving, setSaving] = useState(false);

  // Person CRUD handlers
  const handleCreatePerson = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createPerson(personForm);
      addToast(`Added ${personForm.name} to resource pool!`, 'success');
      await refreshAll();
      setNewPersonModal(false);
      setPersonForm({ name: '', email: '', role: '', team_id: '', default_weekly_hours: 40 });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePerson = async (id, name) => {
    if (window.confirm(`Delete person "${name}"? This will also remove their assignments.`)) {
      try {
        await api.deletePerson(id);
        addToast(`Deleted ${name}`, 'success');
        await refreshAll();
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  // Project CRUD handlers
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createProject(projectForm);
      addToast(`Created project ${projectForm.name}!`, 'success');
      await refreshAll();
      setNewProjectModal(false);
      setProjectForm({ name: '', code: '', description: '', status: 'ON_TRACK', budget: 1500000, start_date: '2025-01-01', end_date: '2025-12-31' });
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id, name) => {
    if (window.confirm(`Delete project "${name}"? This will delete all phases and work items inside it.`)) {
      try {
        await api.deleteProject(id);
        addToast(`Deleted project ${name}`, 'success');
        await refreshAll();
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  // Dependency CRUD handlers
  const handleCreateDependency = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createDependency(depForm);
      addToast('Created dependency link!', 'success');
      await refreshAll();
      setNewDepModal(false);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDependency = async (id) => {
    if (window.confirm('Delete this dependency link?')) {
      try {
        await api.deleteDependency(id);
        addToast('Deleted dependency link', 'success');
        await refreshAll();
      } catch (err) {
        addToast(err.message, 'error');
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '24px', gap: '20px' }}>
      {/* Sub Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'resources', label: 'Resource Hierarchy', icon: 'fa-sitemap' },
            { id: 'projects', label: 'Projects & Phases', icon: 'fa-folder-tree' },
            { id: 'dependencies', label: 'Dependencies', icon: 'fa-link' },
            { id: 'history', label: 'Audit Change History', icon: 'fa-clock-rotate-left' }
          ].map((tab) => (
            <button
              key={tab.id}
              className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`fa-solid ${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === 'resources' && (
          <button className="btn btn-primary" onClick={() => setNewPersonModal(true)}>
            <i className="fa-solid fa-user-plus"></i>
            <span>Add Person</span>
          </button>
        )}

        {activeTab === 'projects' && (
          <button className="btn btn-primary" onClick={() => setNewProjectModal(true)}>
            <i className="fa-solid fa-folder-plus"></i>
            <span>Add Project</span>
          </button>
        )}

        {activeTab === 'dependencies' && (
          <button className="btn btn-primary" onClick={() => setNewDepModal(true)}>
            <i className="fa-solid fa-plus"></i>
            <span>Add Dependency</span>
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 1. Resources Hierarchy Manager */}
        {activeTab === 'resources' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="matrix-container">
              <div className="matrix-header-title">
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Domain → Tribe → Squad → People Roster</h3>
                <span className="badge badge-team">{hierarchyData.people.length} Active People</span>
              </div>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Person Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Squad / Team</th>
                    <th>Weekly Hours</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hierarchyData.people.map((p) => {
                    const team = hierarchyData.teams.find((t) => t.id === p.team_id);
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="avatar">{p.avatar_initials}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                          {p.email}
                        </td>
                        <td>{p.role}</td>
                        <td>
                          <span className="badge badge-tribe">{team?.name || 'Unassigned'}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{p.default_weekly_hours}h / week</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-icon"
                            style={{ color: 'var(--status-delayed)' }}
                            title="Delete person"
                            onClick={() => handleDeletePerson(p.id, p.name)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. Projects & Phases */}
        {activeTab === 'projects' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="matrix-container">
              <div className="matrix-header-title">
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Strategic Projects & Active Phases</h3>
                <span className="badge badge-domain">{projectsData.projects.length} Total Projects</span>
              </div>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Project Name & Code</th>
                    <th>Status</th>
                    <th>Schedule Span</th>
                    <th>Progress</th>
                    <th>Phases Count</th>
                    <th>Budget</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsData.projects.map((proj) => (
                    <tr key={proj.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{proj.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Code: {proj.code}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${proj.status.toLowerCase().replace('_', '-')}`}>
                          {proj.status}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {proj.computedStartDate || proj.start_date} → {proj.computedEndDate || proj.end_date}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {proj.computedProgress || 0}%
                      </td>
                      <td>{proj.phases?.length || 0} phases ({proj.totalWorkItems || 0} tasks)</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>${Number(proj.budget).toLocaleString()}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-icon"
                          style={{ color: 'var(--status-delayed)' }}
                          title="Delete Project"
                          onClick={() => handleDeleteProject(proj.id, proj.name)}
                        >
                          <i className="fa-solid fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. Dependencies */}
        {activeTab === 'dependencies' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="matrix-container">
              <div className="matrix-header-title">
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Task Dependency Links & Predecessor Rules</h3>
                <span className="badge badge-team">{projectsData.dependencies.length} Active Links</span>
              </div>
              <table className="matrix-table">
                <thead>
                  <tr>
                    <th>Predecessor Task (Must Finish / Start)</th>
                    <th>Link Type</th>
                    <th>Successor Task (Dependent)</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsData.dependencies.map((dep) => {
                    const pred = projectsData.flatWorkItems.find((i) => i.id === dep.predecessor_id);
                    const succ = projectsData.flatWorkItems.find((i) => i.id === dep.successor_id);
                    return (
                      <tr key={dep.id}>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {pred?.name || dep.predecessor_id}
                        </td>
                        <td>
                          <span className="badge badge-team">{dep.type === 'FS' ? 'Finish-to-Start (FS)' : 'Start-to-Start (SS)'}</span>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {succ?.name || dep.successor_id}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn-icon"
                            style={{ color: 'var(--status-delayed)' }}
                            title="Delete dependency link"
                            onClick={() => handleDeleteDependency(dep.id)}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Audit History */}
        {activeTab === 'history' && (
          <div className="matrix-container">
            <div className="matrix-header-title">
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Audit Trail & Change History Log</h3>
              <span className="badge badge-domain">{auditHistory.length} Logged Events</span>
            </div>
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.timestamp}
                    </td>
                    <td>
                      <span className="badge badge-tribe">{item.entity_type}</span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{item.entity_id}</td>
                    <td>
                      <span
                        className={`badge ${
                          item.action === 'CREATE'
                            ? 'badge-on-track'
                            : item.action === 'DELETE'
                            ? 'badge-delayed'
                            : item.action === 'RESET'
                            ? 'badge-completed'
                            : 'badge-at-risk'
                        }`}
                      >
                        {item.action}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{item.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Person Modal */}
      {newPersonModal && (
        <div className="modal-overlay" onClick={() => setNewPersonModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Person to Resource Roster</h3>
              <button className="btn-icon" onClick={() => setNewPersonModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleCreatePerson}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={personForm.name}
                    onChange={(e) => setPersonForm({ ...personForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={personForm.email}
                    onChange={(e) => setPersonForm({ ...personForm, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Specialization *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={personForm.role}
                    onChange={(e) => setPersonForm({ ...personForm, role: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Assigned Squad / Team</label>
                    <select
                      className="form-select"
                      value={personForm.team_id}
                      onChange={(e) => setPersonForm({ ...personForm, team_id: e.target.value })}
                    >
                      <option value="">-- No Squad --</option>
                      {hierarchyData.teams.map((tm) => (
                        <option key={tm.id} value={tm.id}>
                          {tm.name} ({tm.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Standard Weekly Hours (40 = full-time)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={personForm.default_monthly_hours}
                      onChange={(e) => setPersonForm({ ...personForm, default_monthly_hours: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewPersonModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fa-solid fa-plus"></i>
                  <span>{saving ? 'Creating...' : 'Create Person'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {newProjectModal && (
        <div className="modal-overlay" onClick={() => setNewProjectModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Strategic Project</h3>
              <button className="btn-icon" onClick={() => setNewProjectModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Project Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={projectForm.code}
                      onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Budget ($)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={projectForm.budget}
                      onChange={(e) => setProjectForm({ ...projectForm, budget: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={projectForm.start_date}
                      onChange={(e) => setProjectForm({ ...projectForm, start_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={projectForm.end_date}
                      onChange={(e) => setProjectForm({ ...projectForm, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    rows="3"
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewProjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fa-solid fa-plus"></i>
                  <span>{saving ? 'Creating...' : 'Create Project'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Dependency Modal */}
      {newDepModal && (
        <div className="modal-overlay" onClick={() => setNewDepModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Link Task Dependency</h3>
              <button className="btn-icon" onClick={() => setNewDepModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleCreateDependency}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Predecessor Task (Must come first) *</label>
                  <select
                    className="form-select"
                    value={depForm.predecessor_id}
                    onChange={(e) => setDepForm({ ...depForm, predecessor_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Predecessor --</option>
                    {projectsData.flatWorkItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.start_date} - {item.end_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Successor Task (Depends on predecessor) *</label>
                  <select
                    className="form-select"
                    value={depForm.successor_id}
                    onChange={(e) => setDepForm({ ...depForm, successor_id: e.target.value })}
                    required
                  >
                    <option value="">-- Select Successor --</option>
                    {projectsData.flatWorkItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.start_date} - {item.end_date})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Link Type</label>
                  <select
                    className="form-select"
                    value={depForm.type}
                    onChange={(e) => setDepForm({ ...depForm, type: e.target.value })}
                  >
                    <option value="FS">Finish-to-Start (FS)</option>
                    <option value="SS">Start-to-Start (SS)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setNewDepModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <i className="fa-solid fa-link"></i>
                  <span>{saving ? 'Linking...' : 'Add Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

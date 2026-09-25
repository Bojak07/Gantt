import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';

// Dynamic defaults anchored to the current date (no hardcoded years)
const nextMonthStart = () => {
  const n = new Date();
  const y = n.getFullYear() + (n.getMonth() === 11 ? 1 : 0);
  const m = n.getMonth() === 11 ? 1 : n.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
};

const defaultEnd = () => {
  const [y, m] = nextMonthStart().split('-').map(Number);
  const endMonthNum = m + 5;
  const ey = y + Math.floor((endMonthNum - 1) / 12);
  const em = ((endMonthNum - 1) % 12) + 1;
  const last = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  return `${ey}-${String(em).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
};

export default function ProjectModal({ isOpen, onClose, initialProject = null }) {
  const { hierarchyData, refreshAll, addToast } = useApp();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('ON_TRACK');
  const [health, setHealth] = useState('HEALTHY');
  const [startDate, setStartDate] = useState(nextMonthStart());
  const [endDate, setEndDate] = useState(defaultEnd());
  const [ownerId, setOwnerId] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setCode(initialProject.code || '');
      setDescription(initialProject.description || '');
      setStatus(initialProject.status || 'ON_TRACK');
      setHealth(initialProject.health || 'HEALTHY');
      setStartDate(initialProject.start_date || nextMonthStart());
      setEndDate(initialProject.end_date || defaultEnd());
      setOwnerId(initialProject.owner_id || '');
      setBudget(initialProject.budget != null ? String(initialProject.budget) : '');
    } else {
      setName('');
      setCode('');
      setDescription('');
      setStatus('ON_TRACK');
      setHealth('HEALTHY');
      setStartDate(nextMonthStart());
      setEndDate(defaultEnd());
      setOwnerId('');
      setBudget('');
    }
  }, [initialProject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      addToast('Project name and code are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        code,
        description,
        status,
        health,
        start_date: startDate,
        end_date: endDate,
        owner_id: ownerId || null,
        budget: budget !== '' ? Number(budget) : 0
      };

      if (initialProject?.id) {
        await api.updateProject(initialProject.id, payload);
        addToast('Project updated successfully!', 'success');
      } else {
        await api.createProject(payload);
        addToast('Project created successfully!', 'success');
      }

      await refreshAll();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete project "${initialProject.name}"? All its phases and work items will be removed.`)) return;
    try {
      await api.deleteProject(initialProject.id);
      addToast('Project deleted.', 'success');
      await refreshAll();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-folder-plus" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
            {initialProject?.id ? 'Edit Project' : 'New Project'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Global Digital Transformation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Code *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. DX-MAIN"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                rows="2"
                placeholder="Scope, business value, and key outcomes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="ON_TRACK">On Track</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Health</label>
                <select className="form-select" value={health} onChange={(e) => setHealth(e.target.value)}>
                  <option value="HEALTHY">Healthy</option>
                  <option value="WARNING">Warning</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Executive Owner</label>
                <select className="form-select" value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
                  <option value="">-- Unassigned --</option>
                  {hierarchyData.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Budget (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  className="form-input"
                  placeholder="0"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {initialProject?.id && (
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                <i className="fa-solid fa-trash-can"></i>
                <span>Delete</span>
              </button>
            )}
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fa-solid fa-floppy-disk"></i>
              <span>{saving ? 'Saving...' : initialProject?.id ? 'Save Changes' : 'Create Project'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';
import { CURRENT_YEAR } from '../../utils/dateUtils.js';

export default function PhaseModal({ isOpen, onClose, initialPhase = null, defaultProjectId = null }) {
  const { projectsData, refreshAll, addToast } = useApp();
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || projectsData.projects[0]?.id || '');
  const [startDate, setStartDate] = useState(`${CURRENT_YEAR}-01-01`);
  const [endDate, setEndDate] = useState(`${CURRENT_YEAR}-03-31`);
  const [status, setStatus] = useState('NOT_STARTED');
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialPhase) {
      setName(initialPhase.name || '');
      setProjectId(initialPhase.project_id || defaultProjectId || projectsData.projects[0]?.id || '');
      setStartDate(initialPhase.start_date || `${CURRENT_YEAR}-01-01`);
      setEndDate(initialPhase.end_date || `${CURRENT_YEAR}-03-31`);
      setStatus(initialPhase.status || 'NOT_STARTED');
      setProgress(initialPhase.progress || initialPhase.computedProgress || 0);
    } else {
      setName('');
      setProjectId(defaultProjectId || projectsData.projects[0]?.id || '');
      setStartDate(`${CURRENT_YEAR}-01-01`);
      setEndDate(`${CURRENT_YEAR}-03-31`);
      setStatus('NOT_STARTED');
      setProgress(0);
    }
  }, [initialPhase, defaultProjectId, projectsData.projects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter a phase name.', 'error');
      return;
    }
    if (!projectId) {
      addToast('Please select a project.', 'error');
      return;
    }

    setSaving(true);
    try {
      const basePayload = {
        name,
        start_date: startDate,
        end_date: endDate,
        status,
        progress: Number(progress) || 0
      };

      if (initialPhase?.id) {
        // Server PUT ignores project_id — phase stays in its original project
        await api.updatePhase(initialPhase.id, basePayload);
        addToast('Phase updated successfully!', 'success');
      } else {
        await api.createPhase({ ...basePayload, project_id: projectId });
        addToast('Phase created successfully!', 'success');
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
    if (!window.confirm(`Delete phase "${initialPhase.name}"? Work items inside it will be removed too.`)) return;
    try {
      await api.deletePhase(initialPhase.id);
      addToast('Phase deleted.', 'success');
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
            <i className="fa-solid fa-layer-group" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
            {initialPhase?.id ? 'Edit Phase' : 'New Phase'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Phase Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Integration & Validation"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Project *</label>
              <select
                className="form-select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={Boolean(initialPhase?.id)}
                required
              >
                {projectsData.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="NOT_STARTED">Not Started</option>
                  <option value="ON_TRACK">On Track</option>
                  <option value="AT_RISK">At Risk</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Progress ({progress}%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  className="form-input"
                  style={{ padding: '4px' }}
                  value={progress}
                  onChange={(e) => setProgress(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            {initialPhase?.id && (
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
              <span>{saving ? 'Saving...' : initialPhase?.id ? 'Save Changes' : 'Create Phase'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

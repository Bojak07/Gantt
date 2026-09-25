import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';

const todayStr = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

export default function DecisionModal({ isOpen, onClose, initialDecision = null }) {
  const { projectsData, hierarchyData, refreshAll, addToast } = useApp();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [personId, setPersonId] = useState('');
  const [summary, setSummary] = useState('');
  const [impactStatus, setImpactStatus] = useState('NEUTRAL');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialDecision) {
      setTitle(initialDecision.title || '');
      setProjectId(initialDecision.project_id || '');
      setDate(initialDecision.date || todayStr());
      setPersonId(initialDecision.person_id || '');
      setSummary(initialDecision.decision_summary || '');
      setImpactStatus(initialDecision.impact_status || 'NEUTRAL');
    } else {
      setTitle('');
      setProjectId('');
      setDate(todayStr());
      setPersonId('');
      setSummary('');
      setImpactStatus('NEUTRAL');
    }
  }, [initialDecision, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      addToast('Decision title and date are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        project_id: projectId || null,
        date,
        person_id: personId || null,
        decision_summary: summary,
        impact_status: impactStatus
      };

      if (initialDecision?.id) {
        await api.updateDecision(initialDecision.id, payload);
        addToast('Decision updated.', 'success');
      } else {
        await api.createDecision(payload);
        addToast('Decision logged.', 'success');
      }

      await refreshAll();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-file-signature" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
            {initialDecision?.id ? 'Edit Business Decision' : 'Log Business Decision'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Decision Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Accelerate ISO 20022 migration timeline"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Project</label>
                <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                  <option value="">-- No project --</option>
                  {projectsData.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Date *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Person Responsible</label>
                <select className="form-select" value={personId} onChange={(e) => setPersonId(e.target.value)}>
                  <option value="">-- Unassigned --</option>
                  {hierarchyData.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Impact / Status</label>
                <select className="form-select" value={impactStatus} onChange={(e) => setImpactStatus(e.target.value)}>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEUTRAL">Neutral</option>
                  <option value="NEGATIVE">Negative</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Decision Summary / Rationale</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Business rationale, expected impact, and follow-up actions..."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fa-solid fa-floppy-disk"></i>
              <span>{saving ? 'Saving...' : initialDecision?.id ? 'Save Changes' : 'Log Decision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

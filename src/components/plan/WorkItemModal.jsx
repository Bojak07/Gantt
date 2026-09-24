import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';

export default function WorkItemModal({ isOpen, onClose, initialItem = null, defaultPhaseId = null }) {
  const { projectsData, hierarchyData, refreshAll, addToast } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phaseId, setPhaseId] = useState(defaultPhaseId || '');
  const [startDate, setStartDate] = useState('2025-03-01');
  const [endDate, setEndDate] = useState('2025-04-30');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('NOT_STARTED');
  const [isMilestone, setIsMilestone] = useState(false);
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedPersonId, setAssignedPersonId] = useState('');
  const [allocatedHours, setAllocatedHours] = useState(80);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name || '');
      setDescription(initialItem.description || '');
      setPhaseId(initialItem.phase_id || defaultPhaseId || '');
      setStartDate(initialItem.start_date || '2025-03-01');
      setEndDate(initialItem.end_date || '2025-04-30');
      setProgress(initialItem.progress || 0);
      setStatus(initialItem.status || 'NOT_STARTED');
      setIsMilestone(Boolean(initialItem.is_milestone));
      setPriority(initialItem.priority || 'MEDIUM');
      
      if (initialItem.assignments && initialItem.assignments.length > 0) {
        setAssignedPersonId(initialItem.assignments[0].person_id || '');
        setAllocatedHours(initialItem.assignments[0].allocated_hours || 80);
      } else {
        setAssignedPersonId('');
        setAllocatedHours(80);
      }
    } else {
      setName('');
      setDescription('');
      setPhaseId(defaultPhaseId || projectsData.flatPhases[0]?.id || '');
      setStartDate('2025-03-01');
      setEndDate('2025-04-30');
      setProgress(0);
      setStatus('NOT_STARTED');
      setIsMilestone(false);
      setPriority('MEDIUM');
      setAssignedPersonId('');
      setAllocatedHours(80);
    }
  }, [initialItem, defaultPhaseId, projectsData.flatPhases, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('Please enter a work item name.', 'error');
      return;
    }
    if (!phaseId) {
      addToast('Please select a project phase.', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedPerson = hierarchyData.people.find((p) => p.id === assignedPersonId);
      const assignments = assignedPersonId
        ? [
            {
              person_id: assignedPersonId,
              team_id: selectedPerson?.team_id || null,
              allocated_hours: Number(allocatedHours) || 40,
              allocation_pct: 100,
              role_in_task: selectedPerson?.role || 'Lead Contributor'
            }
          ]
        : [];

      const payload = {
        phase_id: phaseId,
        name,
        description,
        start_date: startDate,
        end_date: isMilestone ? startDate : endDate,
        progress: Number(progress),
        status,
        is_milestone: isMilestone ? 1 : 0,
        priority,
        assignments
      };

      if (initialItem?.id) {
        await api.updateWorkItem(initialItem.id, payload);
        addToast('Work item updated successfully!', 'success');
      } else {
        await api.createWorkItem(payload);
        addToast('Work item created successfully!', 'success');
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
            <i className="fa-solid fa-list-check" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
            {initialItem?.id ? 'Edit Work Item' : 'New Work Item / Milestone'}
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Work Item Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Flutter Mobile Client v4 Build"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Project Phase *</label>
              <select
                className="form-select"
                value={phaseId}
                onChange={(e) => setPhaseId(e.target.value)}
                required
              >
                {projectsData.flatPhases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.name}
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
                  disabled={isMilestone}
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Assigned Resource</label>
                <select
                  className="form-select"
                  value={assignedPersonId}
                  onChange={(e) => setAssignedPersonId(e.target.value)}
                >
                  <option value="">-- Unassigned --</option>
                  {hierarchyData.people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Allocated Hours</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  className="form-input"
                  value={allocatedHours}
                  onChange={(e) => setAllocatedHours(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row" style={{ alignItems: 'center' }}>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="chk-milestone"
                  checked={isMilestone}
                  onChange={(e) => setIsMilestone(e.target.checked)}
                />
                <label htmlFor="chk-milestone" className="form-label" style={{ cursor: 'pointer' }}>
                  Is Milestone (0-Duration Diamond)
                </label>
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Scope Notes</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Key deliverables, acceptance criteria, and technical dependencies..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fa-solid fa-floppy-disk"></i>
              <span>{saving ? 'Saving...' : initialItem?.id ? 'Save Changes' : 'Create Item'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useApp } from '../../context/AppContext.jsx';

export default function DependencyModal({ isOpen, onClose }) {
  const { projectsData, refreshAll, addToast } = useApp();
  const [predecessorId, setPredecessorId] = useState('');
  const [successorId, setSuccessorId] = useState('');
  const [depType, setDepType] = useState('FS');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPredecessorId('');
    setSuccessorId('');
    setDepType('FS');
  }, [isOpen]);

  if (!isOpen) return null;

  const itemLabel = (id) => {
    const item = projectsData.flatWorkItems.find((i) => i.id === id);
    if (!item) return id;
    const phase = projectsData.flatPhases.find((ph) => ph.id === item.phase_id);
    const project = projectsData.projects.find((p) => p.id === (phase?.project_id || item.project_id));
    return [project?.code || project?.name, phase?.name, item.name].filter(Boolean).join(' / ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!predecessorId || !successorId) {
      addToast('Select both predecessor and successor tasks.', 'error');
      return;
    }
    if (predecessorId === successorId) {
      addToast('Predecessor and successor must be different tasks.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.createDependency({
        predecessor_id: predecessorId,
        successor_id: successorId,
        type: depType
      });
      addToast('Dependency created successfully!', 'success');
      await refreshAll();
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dep) => {
    try {
      await api.deleteDependency(dep.id);
      addToast('Dependency removed.', 'success');
      await refreshAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <i className="fa-solid fa-arrow-right-long" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
            Task Dependencies
          </h3>
          <button className="btn-icon" onClick={onClose} type="button">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Predecessor (drives the dependency) *</label>
              <select
                className="form-select"
                value={predecessorId}
                onChange={(e) => setPredecessorId(e.target.value)}
                required
              >
                <option value="">-- Select task --</option>
                {projectsData.flatWorkItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {itemLabel(i.id)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Successor (waits for predecessor) *</label>
                <select
                  className="form-select"
                  value={successorId}
                  onChange={(e) => setSuccessorId(e.target.value)}
                  required
                >
                  <option value="">-- Select task --</option>
                  {projectsData.flatWorkItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {itemLabel(i.id)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Type</label>
                <select
                  className="form-select"
                  value={depType}
                  onChange={(e) => setDepType(e.target.value)}
                >
                  <option value="FS">Finish → Start (FS)</option>
                  <option value="SS">Start → Start (SS)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Existing Dependencies ({projectsData.dependencies.length})</label>
              {projectsData.dependencies.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No dependencies defined yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {projectsData.dependencies.map((dep) => (
                    <div
                      key={dep.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        padding: '6px 8px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px'
                      }}
                    >
                      <i className="fa-solid fa-arrow-right-long" style={{ color: 'var(--primary)' }}></i>
                      <span style={{ flex: 1 }}>{itemLabel(dep.predecessor_id)} → {itemLabel(dep.successor_id)}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{dep.type}</span>
                      <button type="button" className="btn-icon" title="Delete dependency" onClick={() => handleDelete(dep)}>
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <i className="fa-solid fa-floppy-disk"></i>
              <span>{saving ? 'Saving...' : 'Add Dependency'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

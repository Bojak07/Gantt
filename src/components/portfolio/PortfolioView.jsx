import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../utils/formatters.js';
import { formatShortDate, CURRENT_YEAR } from '../../utils/dateUtils.js';
import ProjectModal from './ProjectModal.jsx';
import '../../styles/portfolio.css';

export default function PortfolioView() {
  const { projectsData, setCurrentView, refreshAll, addToast } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const projects = projectsData.projects;
  const activeProjects = projects.filter((p) => p.status !== 'COMPLETED').length;
  const onTrackProjects = projects.filter((p) => p.status === 'ON_TRACK').length;
  const atRiskProjects = projects.filter((p) => p.status === 'AT_RISK' || p.status === 'DELAYED').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;

  const openCreate = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const openEdit = (project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleDeleteProject = async (project) => {
    if (!window.confirm(`Delete project "${project.name}"? All its phases and work items will be removed.`)) return;
    try {
      await api.deleteProject(project.id);
      addToast('Project deleted.', 'success');
      await refreshAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const summaryCards = [
    { key: 'active', label: 'Active Projects', value: activeProjects, icon: 'fa-rocket', tone: 'active' },
    { key: 'ontrack', label: 'On Track', value: onTrackProjects, icon: 'fa-circle-check', tone: 'ontrack' },
    { key: 'atrisk', label: 'At Risk / Delayed', value: atRiskProjects, icon: 'fa-triangle-exclamation', tone: 'atrisk' },
    { key: 'completed', label: 'Completed', value: completedProjects, icon: 'fa-flag-checkered', tone: 'completed' }
  ];

  return (
    <div className="portfolio-view">
      <div className="portfolio-header">
        <div>
          <h2 className="portfolio-title">Portfolio</h2>
          <p className="portfolio-subtitle">
            FY {CURRENT_YEAR} — cross-domain initiatives, delivery health and budget
          </p>
        </div>
        <div className="portfolio-header-actions">
          <button className="btn btn-secondary" onClick={() => setCurrentView('plan')}>
            <i className="fa-solid fa-chart-gantt"></i>
            <span>Open Gantt</span>
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <i className="fa-solid fa-plus"></i>
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Data-derived summary cards */}
      <div className="portfolio-summary-grid">
        {summaryCards.map((card) => (
          <div key={card.key} className="summary-card">
            <span className={`summary-card-icon ${card.tone}`}>
              <i className={`fa-solid ${card.icon}`}></i>
            </span>
            <div>
              <div className="summary-card-value">{card.value}</div>
              <div className="summary-card-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Project list table */}
      <div className="portfolio-table-card">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Status</th>
              <th>Health</th>
              <th>Owner</th>
              <th>Timeline</th>
              <th>Progress</th>
              <th>Budget</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="portfolio-row" onClick={() => openEdit(p)}>
                <td>
                  <div className="portfolio-cell-project">
                    <span className="badge badge-domain">{p.code}</span>
                    <div>
                      <div className="portfolio-cell-name">{p.name}</div>
                      <div className="portfolio-cell-sub">{p.description}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge badge-${(p.status || 'NOT_STARTED').toLowerCase().replace('_', '-')}`}>
                    {(p.status || 'NOT_STARTED').replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`health-chip health-${(p.health || 'HEALTHY').toLowerCase()}`}>
                    {(p.health || 'HEALTHY').charAt(0) + (p.health || 'HEALTHY').slice(1).toLowerCase()}
                  </span>
                </td>
                <td>
                  <div className="portfolio-cell-owner">
                    <span className="avatar">{p.owner_avatar || 'EX'}</span>
                    <span>{p.owner_name || 'Unassigned'}</span>
                  </div>
                </td>
                <td className="portfolio-cell-dates">
                  {formatShortDate(p.start_date)} – {formatShortDate(p.end_date)}
                </td>
                <td>
                  <div className="portfolio-cell-progress">
                    <div className="progress-track">
                      <div className="progress-fill" style={{ width: `${p.computedProgress || 0}%` }}></div>
                    </div>
                    <span>{p.computedProgress || 0}%</span>
                  </div>
                </td>
                <td className="portfolio-cell-budget">{formatCurrency(p.budget)}</td>
                <td>
                  <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="btn-icon" title="Edit project" onClick={() => openEdit(p)}>
                      <i className="fa-solid fa-pen"></i>
                    </button>
                    <button className="btn-icon" title="Delete project" onClick={() => handleDeleteProject(p)}>
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialProject={editingProject}
      />
    </div>
  );
}

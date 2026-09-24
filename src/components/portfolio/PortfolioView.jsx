import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';

export default function PortfolioView() {
  const { projectsData, hierarchyData, setCurrentView } = useApp();

  const totalBudget = projectsData.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const avgProgress = projectsData.projects.length > 0
    ? Math.round(projectsData.projects.reduce((sum, p) => sum + (p.computedProgress || 0), 0) / projectsData.projects.length)
    : 0;

  const totalHeadcount = hierarchyData.people.length;
  const healthyProjects = projectsData.projects.filter((p) => p.status === 'ON_TRACK' || p.status === 'COMPLETED').length;
  const atRiskProjects = projectsData.projects.filter((p) => p.status === 'AT_RISK' || p.status === 'DELAYED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '24px', gap: '24px' }}>
      {/* Portfolio Headline Banner (Theme Aware) */}
      <div style={{
        background: 'var(--banner-bg)',
        border: '1px solid var(--banner-border)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-domain">Executive Summary</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FY 2025 Roadmap & Budget</span>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginTop: '6px', color: 'var(--text-primary)' }}>
            Enterprise Strategic Banking Portfolio
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '650px' }}>
            Cross-domain execution status, resource allocations, and roadmap milestones across Digital Channels, Core Banking, and Cyber Defense.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary" onClick={() => setCurrentView('plan')}>
            <i className="fa-solid fa-chart-gantt"></i>
            <span>Open Detailed Gantt</span>
          </button>
          <button className="btn btn-secondary" onClick={() => setCurrentView('presentation')}>
            <i className="fa-solid fa-display"></i>
            <span>Executive Presentation</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {/*
      <div className="resource-kpi-grid">
        <div className="kpi-card optimal">
          <div className="kpi-header">
            <span>Portfolio Capital Investment</span>
            <i className="fa-solid fa-vault"></i>
          </div>
          <div className="kpi-value">{formatCurrency(totalBudget)}</div>
          <div className="kpi-subtitle">Across {projectsData.projects.length} major initiatives</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Overall Roadmap Completion</span>
            <i className="fa-solid fa-circle-notch"></i>
          </div>
          <div className="kpi-value">{avgProgress}%</div>
          <div className="kpi-subtitle">Weighted average across all project phases</div>
        </div>

        <div className={`kpi-card ${atRiskProjects > 0 ? 'overbooked' : 'optimal'}`}>
          <div className="kpi-header">
            <span>Delivery Health Status</span>
            <i className="fa-solid fa-heart-pulse"></i>
          </div>
          <div className="kpi-value">{healthyProjects} / {projectsData.projects.length}</div>
          <div className="kpi-subtitle">
            {atRiskProjects > 0 ? `${atRiskProjects} project(s) requiring executive intervention` : 'All projects on schedule'}
          </div>
        </div>

        <div className="kpi-card optimal">
          <div className="kpi-header">
            <span>Total Resource Capacity</span>
            <i className="fa-solid fa-users"></i>
          </div>
          <div className="kpi-value">{totalHeadcount} Specialists</div>
          <div className="kpi-subtitle">Across {hierarchyData.teams.length} squads and {hierarchyData.domains.length} domains</div>
        </div>
      </div>
      */}

      {/* Project Status Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {projectsData.projects.map((proj) => {
          return (
            <div
              key={proj.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-domain">{proj.code}</span>
                    <span className={`badge badge-${proj.status.toLowerCase().replace('_', '-')}`}>{proj.status}</span>
                  </div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, marginTop: '6px', color: 'var(--text-primary)' }}>
                    {proj.name}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--primary)' }}>
                    {proj.computedProgress || 0}%
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Complete</div>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {proj.description}
              </p>

              {/* Progress Bar */}
              <div style={{ width: '100%', height: '6px', background: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${proj.computedProgress || 0}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    borderRadius: '3px'
                  }}
                ></div>
              </div>

              {/* Phases List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Execution Phases ({proj.phases.length})
                </span>
                {proj.phases.map((ph) => (
                  <div
                    key={ph.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge badge-${ph.status.toLowerCase().replace('_', '-')}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                        {ph.status}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{ph.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {ph.computedProgress || 0}%
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
                <span>Budget: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(proj.budget)}</strong></span>
                <span>Owner: <strong style={{ color: 'var(--text-primary)' }}>{proj.owner_name || 'Executive Steering'}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

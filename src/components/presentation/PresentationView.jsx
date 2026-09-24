import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { formatCurrency, formatPercent } from '../../utils/formatters.js';
import { MONTH_NAMES, QUARTERS, calculateBarCoordinates, formatShortDate } from '../../utils/dateUtils.js';

export default function PresentationView() {
  const { projectsData, hierarchyData } = useApp();
  const [showTasks, setShowTasks] = useState(true);

  const totalBudget = projectsData.projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const avgProgress = projectsData.projects.length > 0
    ? Math.round(projectsData.projects.reduce((sum, p) => sum + (p.computedProgress || 0), 0) / projectsData.projects.length)
    : 0;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    const norm = (status || 'NOT_STARTED').toLowerCase().replace('_', '-');
    return <span className={`badge badge-${norm}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{status}</span>;
  };

  const getStatusBarClass = (status) => {
    const norm = (status || 'NOT_STARTED').toLowerCase().replace('_', '-');
    return `gantt-bar-${norm}`;
  };

  return (
    <div className="presentation-view-container" style={{ padding: '28px', gap: '28px' }}>
      {/* Executive Slide Banner */}
      <div className="presentation-banner" style={{ background: 'var(--banner-bg)', border: '1px solid var(--banner-border)', padding: '28px 32px' }}>
        <div>
          <span className="badge badge-domain" style={{ marginBottom: '8px' }}>Executive Board Roadmap</span>
          <h2 className="presentation-banner-title" style={{ fontSize: '26px' }}>Strategic Banking Technology Portfolio 2025</h2>
          <p className="presentation-banner-sub" style={{ fontSize: '14px', marginTop: '6px' }}>
            Global Digital Channels • Real-Time Payments • Zero Trust Identity • Cloud Infrastructure
          </p>
        </div>

        <div className="presentation-kpi-row" style={{ gap: '36px' }}>
          <div className="presentation-kpi-item">
            <span className="presentation-kpi-num" style={{ fontSize: '32px' }}>{formatCurrency(totalBudget)}</span>
            <span className="presentation-kpi-label">Capital Investment</span>
          </div>

          <div className="presentation-kpi-item">
            <span className="presentation-kpi-num" style={{ fontSize: '32px' }}>{avgProgress}%</span>
            <span className="presentation-kpi-label">Overall Completion</span>
          </div>

          <div className="presentation-kpi-item">
            <span className="presentation-kpi-num" style={{ fontSize: '32px' }}>{hierarchyData.people.length}</span>
            <span className="presentation-kpi-label">Active Headcount</span>
          </div>

          <div className="no-print" style={{ marginLeft: '16px', display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowTasks(!showTasks)}
              title="Toggle Work Items & Milestones in roadmap"
            >
              <i className={`fa-solid ${showTasks ? 'fa-eye-slash' : 'fa-list-check'}`}></i>
              <span>{showTasks ? 'Phases Only' : 'Show All Tasks'}</span>
            </button>
            <button className="btn btn-primary" onClick={handlePrint}>
              <i className="fa-solid fa-print"></i>
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacious Full-Height Annual Strategic Roadmap Timeline */}
      <div className="matrix-container" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-timeline" style={{ color: 'var(--primary)', fontSize: '18px' }}></i>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              Annual Strategic Roadmap & Phase Delivery
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Showing {projectsData.projects.length} Strategic Initiatives across FY2025 (Jan – Dec)
          </span>
        </div>

        {/* Timeline Header & Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {/* Quarter Header */}
          <div style={{ display: 'flex', height: '36px', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ width: '420px', padding: '8px 16px', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              Initiative / Phase / Deliverable
            </div>
            <div style={{ flex: 1, display: 'flex' }}>
              {QUARTERS.map((q) => (
                <div key={q.name} style={{ flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: 800, borderRight: '1px solid var(--border-color)', lineHeight: '36px', color: 'var(--text-primary)', background: 'rgba(255, 255, 255, 0.02)' }}>
                  {q.name}
                </div>
              ))}
            </div>
          </div>

          {/* Month Header */}
          <div style={{ display: 'flex', height: '28px', background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
            <div style={{ width: '420px' }}></div>
            <div style={{ flex: 1, display: 'flex' }}>
              {MONTH_NAMES.map((m, idx) => (
                <div key={m + idx} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 700, borderRight: '1px solid var(--border-subtle)', lineHeight: '28px', color: 'var(--text-secondary)' }}>
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Project & Phase & Task Rows */}
          {projectsData.projects.map((proj) => {
            const projCoords = calculateBarCoordinates(proj.computedStartDate || proj.start_date, proj.computedEndDate || proj.end_date);
            return (
              <div key={proj.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '2px solid var(--border-color)' }}>
                {/* Project Header Row */}
                <div style={{ display: 'flex', minHeight: '48px', background: 'var(--bg-tertiary)', alignItems: 'center' }}>
                  <div style={{ width: '420px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="badge badge-domain">{proj.code}</span>
                    <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {proj.name}
                    </span>
                    <span style={{ marginLeft: 'auto' }}>{getStatusBadge(proj.status)}</span>
                  </div>
                  <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: `${projCoords.leftPct}%`,
                        width: `${projCoords.widthPct}%`,
                        height: '18px',
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        borderRadius: '5px',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 8px',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700
                      }}
                    >
                      <span>{proj.computedProgress || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Phase Rows */}
                {proj.phases.map((ph) => {
                  const phCoords = calculateBarCoordinates(ph.computedStartDate || ph.start_date, ph.computedEndDate || ph.end_date);
                  return (
                    <React.Fragment key={ph.id}>
                      <div style={{ display: 'flex', minHeight: '38px', background: 'var(--bg-secondary)', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                        <div style={{ width: '420px', padding: '0 16px 0 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-diagram-next" style={{ color: 'var(--color-phase)', fontSize: '12px' }}></i>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {ph.name}
                          </span>
                          <span style={{ marginLeft: 'auto' }}>{getStatusBadge(ph.status)}</span>
                        </div>
                        <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${phCoords.leftPct}%`,
                              width: `${phCoords.widthPct}%`,
                              height: '10px',
                              background: '#8b5cf6',
                              borderRadius: '3px'
                            }}
                          ></div>
                        </div>
                      </div>

                      {/* Work Items / Milestones beneath Phase if showTasks is enabled */}
                      {showTasks && ph.workItems?.map((item) => {
                        const itemCoords = calculateBarCoordinates(item.start_date, item.end_date);
                        return (
                          <div key={item.id} style={{ display: 'flex', minHeight: '32px', background: 'var(--bg-primary)', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)' }}>
                            <div style={{ width: '420px', padding: '0 16px 0 54px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className={`fa-solid ${item.is_milestone ? 'fa-diamond text-amber-400' : 'fa-check text-sky-400'}`} style={{ fontSize: '10px' }}></i>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {item.name}
                              </span>
                              <span style={{ marginLeft: 'auto' }}>{getStatusBadge(item.status)}</span>
                            </div>
                            <div style={{ flex: 1, height: '100%', position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                              {item.is_milestone ? (
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: `calc(${itemCoords.leftPct}% - 6px)`,
                                    width: '12px',
                                    height: '12px',
                                    background: '#f59e0b',
                                    transform: 'rotate(45deg)',
                                    borderRadius: '2px',
                                    border: '1px solid #fff'
                                  }}
                                  title={`Milestone: ${item.name} (${formatShortDate(item.start_date)})`}
                                ></div>
                              ) : (
                                <div
                                  className={`gantt-bar-item ${getStatusBarClass(item.status)}`}
                                  style={{
                                    position: 'absolute',
                                    left: `${itemCoords.leftPct}%`,
                                    width: `${itemCoords.widthPct}%`,
                                    height: '8px',
                                    borderRadius: '2px'
                                  }}
                                  title={`${item.name} (${item.progress}%)`}
                                ></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

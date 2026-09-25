import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../services/api.js';
import { formatShortDate, CURRENT_YEAR } from '../../utils/dateUtils.js';
import DecisionModal from './DecisionModal.jsx';
import '../../styles/management.css';

// R/G/Y utilization rules (identical to the Resources view)
function utilizationClass(pct) {
  const v = Number(pct) || 0;
  if (v > 100) return 'overbooked';
  if (v >= 90) return 'high';
  return 'optimal';
}

const STATUS_ORDER = ['ON_TRACK', 'AT_RISK', 'DELAYED', 'COMPLETED', 'NOT_STARTED'];

const toDateStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ManagementView() {
  const { projectsData, capacityData, decisions, refreshAll, addToast } = useApp();
  const [decisionModal, setDecisionModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', decision }

  const projects = projectsData.projects;
  const workItems = projectsData.flatWorkItems;
  const projById = useMemo(() => {
    const map = {};
    projects.forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  /* (a) Delivery status — status breakdown of all initiatives */
  const statusCounts = useMemo(
    () => STATUS_ORDER.map((status) => ({
      status,
      count: projects.filter((p) => p.status === status).length
    })),
    [projects]
  );
  const maxStatusCount = Math.max(1, ...statusCounts.map((s) => s.count));

  /* (b) Upcoming key milestones — next 90 days (milestones + active project end dates) */
  const upcomingMilestones = useMemo(() => {
    const today = new Date();
    const horizon = new Date(today);
    horizon.setDate(today.getDate() + 90);
    const t0 = toDateStr(today);
    const t1 = toDateStr(horizon);

    const milestones = workItems
      .filter((w) => w.is_milestone && w.start_date >= t0 && w.start_date <= t1)
      .map((w) => ({
        date: w.start_date,
        name: w.name,
        projectCode: projById[w.project_id]?.code,
        kind: 'milestone'
      }));

    const projectEnds = projects
      .filter((p) => p.status !== 'COMPLETED' && p.end_date >= t0 && p.end_date <= t1)
      .map((p) => ({
        date: p.end_date,
        name: `${p.name} — project end`,
        projectCode: p.code,
        kind: 'project-end'
      }));

    return [...milestones, ...projectEnds]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [workItems, projects, projById]);

  /* (c) Top risks & issues — flagged AT_RISK and DELAYED deliverables */
  const topRisks = useMemo(
    () => workItems
      .filter((w) => w.status === 'AT_RISK' || w.status === 'DELAYED')
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === 'DELAYED' ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 6),
    [workItems]
  );

  /* (d) Critical dependencies — cross-squad handoffs first */
  const criticalDependencies = useMemo(() => {
    const itemById = {};
    workItems.forEach((w) => { itemById[w.id] = w; });

    return projectsData.dependencies
      .map((dep) => {
        const pred = itemById[dep.predecessor_id];
        const succ = itemById[dep.successor_id];
        if (!pred || !succ) return null;
        const predTeam = pred.assignments?.[0]?.team_name || null;
        const succTeam = succ.assignments?.[0]?.team_name || null;
        return {
          id: dep.id,
          type: dep.type,
          predName: pred.name,
          succName: succ.name,
          predTeam,
          succTeam,
          projectCode: projById[succ.project_id]?.code,
          succStatus: succ.status,
          crossSquad: Boolean(predTeam && succTeam && predTeam !== succTeam)
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b.crossSquad - a.crossSquad))
      .slice(0, 6);
  }, [projectsData.dependencies, workItems, projById]);

  /* (e) Resursläge — squad capacity situation, R/G/Y */
  const squadSituation = useMemo(() => {
    if (!capacityData?.teamAggregates) return [];
    return Object.values(capacityData.teamAggregates)
      .map((tm) => {
        const months = Object.values(tm.monthlyData || {});
        const capacity = months.reduce((s, m) => s + (Number(m.capacity) || 0), 0);
        const demand = months.reduce((s, m) => s + (Number(m.demand) || 0), 0);
        const utilizationPct = capacity > 0 ? Math.round((demand / capacity) * 100) : 0;
        return {
          id: tm.id,
          name: tm.name,
          code: tm.code,
          capacity,
          demand: Math.round(demand),
          utilizationPct
        };
      })
      .sort((a, b) => b.utilizationPct - a.utilizationPct);
  }, [capacityData?.teamAggregates]);

  const strainedCount = squadSituation.filter((s) => s.utilizationPct > 100).length;
  const availableCount = squadSituation.filter((s) => s.utilizationPct < 90).length;

  const handleDeleteDecision = async (decision) => {
    if (!window.confirm(`Delete decision "${decision.title}"?`)) return;
    try {
      await api.deleteDecision(decision.id);
      addToast('Decision deleted.', 'success');
      await refreshAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div className="management-view">
      {/* Header */}
      <div className="management-header">
        <div>
          <h2 className="management-title">Leadership Management View</h2>
          <span className="management-subtitle">
            Executive briefing — FY {CURRENT_YEAR} · delivery, risk, dependencies, resursläge &amp; business decisions
          </span>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setDecisionModal({ mode: 'create' })}>
          <i className="fa-solid fa-file-signature"></i>
          <span>Log Decision</span>
        </button>
      </div>

      {/* Top grid: 4 briefing cards */}
      <div className="mgmt-grid">
        {/* (a) Delivery status */}
        <div className="mgmt-card">
          <div className="mgmt-card-header">
            <i className="fa-solid fa-gauge-high mgmt-card-icon"></i>
            <span>Delivery Status</span>
            <span className="mgmt-card-count">{projects.length} initiatives</span>
          </div>
          <div className="mgmt-card-body">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="status-row">
                <span className={`badge badge-${status.toLowerCase().replace('_', '-')}`}>
                  {status.replace('_', ' ')}
                </span>
                <div className="status-bar">
                  <div className="status-bar-fill" style={{ width: `${(count / maxStatusCount) * 100}%` }}></div>
                </div>
                <span className="status-row-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* (b) Upcoming key milestones */}
        <div className="mgmt-card">
          <div className="mgmt-card-header">
            <i className="fa-solid fa-flag mgmt-card-icon"></i>
            <span>Upcoming Key Milestones</span>
            <span className="mgmt-card-count">next 90 days</span>
          </div>
          <div className="mgmt-card-body">
            {upcomingMilestones.length === 0 ? (
              <div className="mgmt-empty">No milestones or project deadlines in the next 90 days.</div>
            ) : (
              upcomingMilestones.map((m, idx) => (
                <div key={idx} className="briefing-row">
                  <span className="briefing-row-date">{formatShortDate(m.date)}</span>
                  <div className="briefing-row-main">
                    <span className="briefing-row-name">{m.name}</span>
                    {m.projectCode && <span className="badge badge-domain">{m.projectCode}</span>}
                  </div>
                  {m.kind === 'project-end' && <i className="fa-solid fa-building-flag mgmt-row-kind" title="Project end date"></i>}
                </div>
              ))
            )}
          </div>
        </div>

        {/* (c) Top risks & issues */}
        <div className="mgmt-card">
          <div className="mgmt-card-header">
            <i className="fa-solid fa-triangle-exclamation mgmt-card-icon risk"></i>
            <span>Top Risks &amp; Issues</span>
            <span className="mgmt-card-count">{topRisks.length} flagged</span>
          </div>
          <div className="mgmt-card-body">
            {topRisks.length === 0 ? (
              <div className="mgmt-empty">No at-risk or delayed deliverables. All clear.</div>
            ) : (
              topRisks.map((w) => (
                <div key={w.id} className="briefing-row">
                  <span className={`badge badge-${w.status.toLowerCase().replace('_', '-')}`}>
                    {w.status.replace('_', ' ')}
                  </span>
                  <div className="briefing-row-main">
                    <span className="briefing-row-name" title={w.name}>{w.name}</span>
                    <span className="briefing-row-sub">{projById[w.project_id]?.code || '—'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* (d) Critical dependencies */}
        <div className="mgmt-card">
          <div className="mgmt-card-header">
            <i className="fa-solid fa-arrows-turn-right mgmt-card-icon"></i>
            <span>Critical Dependencies</span>
            <span className="mgmt-card-count">{criticalDependencies.length} links</span>
          </div>
          <div className="mgmt-card-body">
            {criticalDependencies.length === 0 ? (
              <div className="mgmt-empty">No cross-project dependency links recorded.</div>
            ) : (
              criticalDependencies.map((d) => (
                <div key={d.id} className="dep-row">
                  <div className="dep-row-main">
                    <span className="briefing-row-name" title={`${d.predName} → ${d.succName}`}>
                      {d.predName} <i className="fa-solid fa-arrow-right-long dep-arrow"></i> {d.succName}
                    </span>
                    <span className="briefing-row-sub">
                      {d.predTeam || 'Unassigned'} → {d.succTeam || 'Unassigned'}
                    </span>
                  </div>
                  <span className={`dep-squad-tag ${d.crossSquad ? 'cross' : 'same'}`}>
                    {d.crossSquad ? 'Cross-squad' : 'Intra-squad'}
                  </span>
                  <span className="dep-type-tag">{d.type}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* (e) Resursläge — resource situation summary */}
      <div className="mgmt-card full">
        <div className="mgmt-card-header">
          <i className="fa-solid fa-users-gear mgmt-card-icon"></i>
          <span>Resursläge — Resource Situation</span>
          <span className="mgmt-card-count">
            {strainedCount} strained · {availableCount} available
          </span>
        </div>
        <div className="mgmt-card-body mgmt-card-body-table">
          <table className="squad-table">
            <thead>
              <tr>
                <th>Squad</th>
                <th>Available Capacity</th>
                <th>Planned Demand</th>
                <th>Avg Utilization</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {squadSituation.map((s) => {
                const cls = utilizationClass(s.utilizationPct);
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="squad-cell">
                        <span className="badge badge-team">{s.code}</span>
                        <span>{s.name}</span>
                      </div>
                    </td>
                    <td className="squad-num">{s.capacity.toLocaleString()} h</td>
                    <td className="squad-num">{s.demand.toLocaleString()} h</td>
                    <td className="squad-num">{s.utilizationPct}%</td>
                    <td>
                      <span className={`util-chip ${cls}`}>
                        {cls === 'overbooked' ? 'Overbooked' : cls === 'high' ? 'High' : 'Available'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* (f) Business Decision Log */}
      <div className="mgmt-card full">
        <div className="mgmt-card-header">
          <i className="fa-solid fa-scroll mgmt-card-icon"></i>
          <span>Business Decision Log</span>
          <span className="mgmt-card-count">{decisions.length} decisions</span>
        </div>
        <div className="mgmt-card-body mgmt-card-body-table">
          <table className="decision-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Decision</th>
                <th>Project</th>
                <th>Person Responsible</th>
                <th>Impact / Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {decisions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="mgmt-empty">No business decisions recorded yet.</td>
                </tr>
              ) : (
                decisions.map((d) => (
                  <tr key={d.id}>
                    <td className="decision-date">{formatShortDate(d.date)}</td>
                    <td>
                      <div className="decision-main">{d.title}</div>
                      {d.decision_summary && (
                        <div className="decision-summary" title={d.decision_summary}>{d.decision_summary}</div>
                      )}
                    </td>
                    <td>
                      <div className="squad-cell">
                        {d.project_code && <span className="badge badge-domain">{d.project_code}</span>}
                        <span>{d.project_name || '—'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="squad-cell">
                        <span className="avatar">{d.person_avatar || '—'}</span>
                        <span>{d.person_name || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`impact-chip impact-${(d.impact_status || 'NEUTRAL').toLowerCase()}`}>
                        {(d.impact_status || 'NEUTRAL').charAt(0) + (d.impact_status || 'NEUTRAL').slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          title="Edit decision"
                          onClick={() => setDecisionModal({ mode: 'edit', decision: d })}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          type="button"
                          className="btn-icon"
                          title="Delete decision"
                          onClick={() => handleDeleteDecision(d)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DecisionModal
        isOpen={Boolean(decisionModal)}
        onClose={() => setDecisionModal(null)}
        initialDecision={decisionModal?.mode === 'edit' ? decisionModal.decision : null}
      />
    </div>
  );
}

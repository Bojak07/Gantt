import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { MONTH_NAMES } from '../../utils/dateUtils.js';
import { api } from '../../services/api.js';

export default function ResourcesView() {
  const { capacityData, hierarchyData, refreshAll, addToast } = useApp();
  const [viewMode, setViewMode] = useState('people'); // 'people', 'squads', 'chart'
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedTribe, setSelectedTribe] = useState('ALL');
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quarterFocus, setQuarterFocus] = useState('ALL'); // 'ALL', 'Q1', 'Q2', 'Q3', 'Q4'

  // Expandable row states
  const [expandedPersonId, setExpandedPersonId] = useState(null);

  // Capacity override modal state
  const [editingCapacity, setEditingCapacity] = useState(null);
  const [overrideHours, setOverrideHours] = useState(170);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [savingCap, setSavingCap] = useState(false);

  // Filtered tribes based on selected domain
  const availableTribes = useMemo(() => {
    if (selectedDomain === 'ALL') return hierarchyData.tribes;
    return hierarchyData.tribes.filter((t) => t.domain_id === selectedDomain);
  }, [hierarchyData.tribes, selectedDomain]);

  // Filtered teams based on selected tribe
  const availableTeams = useMemo(() => {
    if (selectedTribe === 'ALL') {
      if (selectedDomain === 'ALL') return hierarchyData.teams;
      const tribeIds = availableTribes.map((t) => t.id);
      return hierarchyData.teams.filter((tm) => tribeIds.includes(tm.tribe_id));
    }
    return hierarchyData.teams.filter((tm) => tm.tribe_id === selectedTribe);
  }, [hierarchyData.teams, selectedTribe, selectedDomain, availableTribes]);

  // Months to display based on quarter focus
  const visibleMonths = useMemo(() => {
    if (!capacityData?.months) return [];
    switch (quarterFocus) {
      case 'Q1': return capacityData.months.slice(0, 3);
      case 'Q2': return capacityData.months.slice(3, 6);
      case 'Q3': return capacityData.months.slice(6, 9);
      case 'Q4': return capacityData.months.slice(9, 12);
      case 'ALL':
      default:
        return capacityData.months;
    }
  }, [capacityData?.months, quarterFocus]);

  // Filtered people metrics
  const filteredPeople = useMemo(() => {
    if (!capacityData || !capacityData.peopleMetrics) return [];
    return capacityData.peopleMetrics.filter((pm) => {
      const p = pm.person;
      if (selectedDomain !== 'ALL' && p.domain_id !== selectedDomain) return false;
      if (selectedTribe !== 'ALL' && p.tribe_id !== selectedTribe) return false;
      if (selectedTeam !== 'ALL' && p.team_id !== selectedTeam) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(query);
        const matchRole = p.role.toLowerCase().includes(query);
        const matchTeam = p.team_name?.toLowerCase().includes(query);
        if (!matchName && !matchRole && !matchTeam) return false;
      }
      return true;
    });
  }, [capacityData, selectedDomain, selectedTribe, selectedTeam, searchQuery]);

  // Summary Metrics for currently filtered set
  const summaryMetrics = useMemo(() => {
    let totalCap = 0;
    let totalDem = 0;
    let overbookedCount = 0;

    filteredPeople.forEach((pm) => {
      totalCap += pm.annualSummary.totalCapacity;
      totalDem += pm.annualSummary.totalDemand;
      
      const hasOverbookedMonth = Object.values(pm.monthlyData).some((m) => m.status === 'OVERBOOKED');
      if (hasOverbookedMonth) overbookedCount++;
    });

    const avgUtil = totalCap > 0 ? Math.round((totalDem / totalCap) * 100) : 0;

    return {
      totalCapacityHours: totalCap,
      totalDemandHours: Math.round(totalDem),
      avgUtilizationPct: avgUtil,
      overbookedPeopleCount: overbookedCount,
      headcount: filteredPeople.length
    };
  }, [filteredPeople]);

  const handleOpenCapEditor = (person, month, currentHours, e) => {
    e.stopPropagation();
    setEditingCapacity({
      personId: person.id,
      personName: person.name,
      month,
      currentHours
    });
    setOverrideHours(currentHours);
    setOverrideNotes('');
  };

  const handleSaveCapOverride = async (e) => {
    e.preventDefault();
    if (!editingCapacity) return;
    setSavingCap(true);
    try {
      await api.updateCapacityRecord({
        person_id: editingCapacity.personId,
        year_month: editingCapacity.month,
        capacity_hours: Number(overrideHours),
        notes: overrideNotes
      });
      addToast(`Updated capacity for ${editingCapacity.personName} (${editingCapacity.month})`, 'success');
      await refreshAll();
      setEditingCapacity(null);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingCap(false);
    }
  };

  const togglePersonExpand = (id) => {
    setExpandedPersonId((prev) => (prev === id ? null : id));
  };

  if (!capacityData) {
    return <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading resource capacity analytics...</div>;
  }

    // NEW: current year from the data, and one shared scale for the org chart
  const year = capacityData.months[0]?.slice(0, 4);
  const chartMax = Math.max(
    ...capacityData.months.map((m) => {
      const d = capacityData.portfolioAggregate?.monthlyData[m];
      return d ? Math.max(d.capacity, d.demand) : 0;
    }),
    1
  );

  return (
    <div className="resources-view-container">
      {/* Top KPI Summary Cards */}
      <div className="resource-kpi-grid">
        <div className="kpi-card optimal">
          <div className="kpi-header">
            <span>Total Available Capacity</span>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.totalCapacityHours.toLocaleString()} hrs</div>
          <div className="kpi-subtitle">Across {summaryMetrics.headcount} active professionals</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span>Planned Task Demand</span>
            <i className="fa-solid fa-list-check"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.totalDemandHours.toLocaleString()} hrs</div>
          <div className="kpi-subtitle">Allocated across active projects</div>
        </div>

        <div className={`kpi-card ${summaryMetrics.avgUtilizationPct > 100 ? 'overbooked' : 'optimal'}`}>
          <div className="kpi-header">
            <span>Average Utilization</span>
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.avgUtilizationPct}%</div>
          <div className="kpi-subtitle">Target healthy threshold: 70% – 100%</div>
        </div>

        <div className={`kpi-card ${summaryMetrics.overbookedPeopleCount > 0 ? 'overbooked' : 'optimal'}`}>
          <div className="kpi-header">
            <span>Overbooked Specialists</span>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.overbookedPeopleCount}</div>
          <div className="kpi-subtitle">People with &gt;100% allocation in at least 1 month</div>
        </div>
      </div>

      {/* Filter Bar: Domain -> Tribe -> Team -> Person + View Switcher */}
      <div className="resource-filter-bar">
        <div className="resource-view-mode-tabs">
          <button
            type="button"
            className={`view-mode-pill ${viewMode === 'people' ? 'active' : ''}`}
            onClick={() => setViewMode('people')}
          >
            <i className="fa-solid fa-user"></i>
            <span>Specialists ({filteredPeople.length})</span>
          </button>
          <button
            type="button"
            className={`view-mode-pill ${viewMode === 'squads' ? 'active' : ''}`}
            onClick={() => setViewMode('squads')}
          >
            <i className="fa-solid fa-people-group"></i>
            <span>Squads & Tribes</span>
          </button>
          <button
            type="button"
            className={`view-mode-pill ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
          >
            <i className="fa-solid fa-chart-simple"></i>
            <span>Monthly Chart</span>
          </button>
        </div>

        <div className="filter-group">
          <span className="filter-label">Domain:</span>
          <select
            className="filter-select"
            value={selectedDomain}
            onChange={(e) => {
              setSelectedDomain(e.target.value);
              setSelectedTribe('ALL');
              setSelectedTeam('ALL');
            }}
          >
            <option value="ALL">All Domains ({hierarchyData.domains.length})</option>
            {hierarchyData.domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Tribe:</span>
          <select
            className="filter-select"
            value={selectedTribe}
            onChange={(e) => {
              setSelectedTribe(e.target.value);
              setSelectedTeam('ALL');
            }}
          >
            <option value="ALL">All Tribes ({availableTribes.length})</option>
            {availableTribes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <span className="filter-label">Squad:</span>
          <select
            className="filter-select"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
          >
            <option value="ALL">All Squads ({availableTeams.length})</option>
            {availableTeams.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group" style={{ marginLeft: 'auto' }}>
          <div className="search-input-wrapper" style={{ width: '200px' }}>
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search person or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 1. People Matrix View */}
      {viewMode === 'people' && (
        <div className="matrix-container">
          <div className="matrix-header-title">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fa-solid fa-calendar-week" style={{ color: 'var(--primary)' }}></i>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{year} Resource Utilization Heatmap</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                (Click any person to view task details • Click any cell to adjust capacity)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="zoom-switcher">
                {['ALL', 'Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                  <button
                    key={q}
                    type="button"
                    className={`zoom-btn ${quarterFocus === q ? 'active' : ''}`}
                    onClick={() => setQuarterFocus(q)}
                  >
                    {q === 'ALL' ? 'Full Year' : q}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}>Specialist & Squad</th>
                  {visibleMonths.map((m) => {
                    const monthIdx = parseInt(m.split('-')[1], 10) - 1;
                    return (
                      <th key={m} style={{ textAlign: 'center', minWidth: '85px' }}>
                        {MONTH_NAMES[monthIdx]}
                      </th>
                    );
                  })}
                  <th style={{ textAlign: 'center', minWidth: '95px' }}>Annual Avg</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((pm) => {
                  const p = pm.person;
                  const isExpanded = expandedPersonId === p.id;
                  
                  // Collect all assigned tasks across months
                  const allTasks = [];
                  const seenTaskIds = new Set();
                  Object.values(pm.monthlyData).forEach((m) => {
                    m.tasks.forEach((t) => {
                      if (!seenTaskIds.has(t.work_item_id)) {
                        seenTaskIds.add(t.work_item_id);
                        allTasks.push(t);
                      }
                    });
                  });

                  return (
                    <React.Fragment key={p.id}>
                      <tr onClick={() => togglePersonExpand(p.id)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div className="matrix-person-cell">
                            <i
                              className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'}`}
                              style={{ fontSize: '11px', color: 'var(--text-muted)', width: '12px' }}
                            ></i>
                            <span className="avatar">{p.avatar_initials || 'P'}</span>
                            <div className="person-name-box">
                              <span className="person-name-text">{p.name}</span>
                              <span className="person-role-text">
                                {p.role} • <span style={{ color: 'var(--primary)' }}>{p.team_name || 'No Squad'}</span>
                              </span>
                            </div>
                          </div>
                        </td>

                        {visibleMonths.map((m) => {
                          const mData = pm.monthlyData[m];
                          const statusClass =
                            mData.status === 'OVERBOOKED'
                              ? 'overbooked'
                              : mData.status === 'OPTIMAL'
                              ? 'optimal'
                              : 'underbooked';

                          const taskSummary = mData.tasks.map((t) => `• ${t.work_item_name} (${t.monthlyDemandHours}h)`).join('\n');
                          const tooltip = `${p.name} — ${m}\nDemand: ${mData.demandHours}h / Capacity: ${mData.capacityHours}h (${mData.utilizationPct}%)\n${
                            taskSummary ? `\nAssigned Tasks:\n${taskSummary}` : '\nNo active task assignments'
                          }\n\n[Click cell to adjust capacity]`;

                          return (
                            <td key={m} className="util-cell">
                              <div
                                className={`util-badge-box ${statusClass}`}
                                title={tooltip}
                                onClick={(e) => handleOpenCapEditor(p, m, mData.capacityHours, e)}
                              >
                                <span>{mData.utilizationPct}%</span>
                                <span className="util-hours-sub">
                                  {Math.round(mData.demandHours)}/{mData.capacityHours}h
                                </span>
                              </div>
                            </td>
                          );
                        })}

                        <td className="util-cell" style={{ fontWeight: 800 }}>
                          <div
                            className={`util-badge-box ${
                              pm.annualSummary.avgUtilization > 100
                                ? 'overbooked'
                                : pm.annualSummary.avgUtilization >= 70
                                ? 'optimal'
                                : 'underbooked'
                            }`}
                          >
                            <span>{pm.annualSummary.avgUtilization}%</span>
                            <span className="util-hours-sub">
                              {Math.round(pm.annualSummary.totalDemand)}/{pm.annualSummary.totalCapacity}h
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Drawer for Person's Tasks */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={visibleMonths.length + 2} style={{ padding: 0 }}>
                            <div className="person-expanded-drawer">
                              <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '8px', color: 'var(--text-primary)' }}>
                                <i className="fa-solid fa-list-check" style={{ marginRight: '6px', color: 'var(--primary)' }}></i>
                                Active Deliverables & Project Allocations for {p.name} ({allTasks.length} tasks):
                              </div>
                              {allTasks.length === 0 ? (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No tasks currently assigned.</div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '8px' }}>
                                  {allTasks.map((t) => (
                                    <div key={t.work_item_id} className="expanded-task-item">
                                      <div>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{t.work_item_name}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Project: {t.project_name}</div>
                                      </div>
                                      <span className="badge badge-team">{t.allocated_hours}h total</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. Squads & Tribes Aggregate View */}
      {viewMode === 'squads' && (
        <div className="matrix-container">
          <div className="matrix-header-title">
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Squad & Tribe Utilization Aggregates</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Consolidated demand vs capacity by squad</span>
          </div>

          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '240px' }}>Squad / Team</th>
                  {visibleMonths.map((m) => {
                    const monthIdx = parseInt(m.split('-')[1], 10) - 1;
                    return (
                      <th key={m} style={{ textAlign: 'center', minWidth: '85px' }}>
                        {MONTH_NAMES[monthIdx]}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.values(capacityData.teamAggregates || {}).map((tm) => (
                  <tr key={tm.id}>
                    <td>
                      <div className="matrix-person-cell">
                        <span className="badge badge-team" style={{ width: '32px', textAlign: 'center' }}>
                          {tm.code}
                        </span>
                        <div className="person-name-box">
                          <span className="person-name-text">{tm.name}</span>
                        </div>
                      </div>
                    </td>

                    {visibleMonths.map((m) => {
                      const mData = tm.monthlyData[m] || { capacity: 0, demand: 0, utilizationPct: 0, status: 'OPTIMAL' };
                      return (
                        <td key={m} className="util-cell">
                          <div className={`util-badge-box ${mData.status === 'OVERBOOKED' ? 'overbooked' : mData.status === 'OPTIMAL' ? 'optimal' : 'underbooked'}`}>
                            <span>{mData.utilizationPct}%</span>
                            <span className="util-hours-sub">
                              {Math.round(mData.demand)}/{mData.capacity}h
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Monthly Chart Overview */}
      {viewMode === 'chart' && (
        <div className="matrix-container chart-container">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {year} Organization Monthly Demand vs Available Capacity
          </h3>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', marginBottom: '8px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'linear-gradient(90deg, #38bdf8, #3b82f6)', borderRadius: '2px' }}></span>
              Allocated Demand Hours
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', background: 'rgba(148, 163, 184, 0.3)', borderRadius: '2px' }}></span>
              Available Capacity Hours
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {capacityData.months.map((m, idx) => {
              const pData = capacityData.portfolioAggregate?.monthlyData[m];
              if (!pData) return null;
              const maxVal = chartMax;
              const demWidth = `${(pData.demand / maxVal) * 100}%`;
              const capWidth = `${(pData.capacity / maxVal) * 100}%`;

              return (
                <div key={m} className="chart-bar-row">
                  <div className="chart-month-label">{MONTH_NAMES[idx]} {year}</div>
                  <div className="chart-bars-wrapper">
                    <div className="chart-bar chart-bar-demand" style={{ width: demWidth }} title={`Demand: ${pData.demand}h`}></div>
                    <div className="chart-bar chart-bar-capacity" style={{ width: capWidth }} title={`Capacity: ${pData.capacity}h`}></div>
                  </div>
                  <div style={{ width: '90px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700 }}>
                    {pData.utilizationPct}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity Override Modal */}
      {editingCapacity && (
        <div className="modal-overlay" onClick={() => setEditingCapacity(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fa-solid fa-clock-rotate-left" style={{ marginRight: '8px', color: 'var(--primary)' }}></i>
                Adjust Monthly Capacity
              </h3>
              <button className="btn-icon" onClick={() => setEditingCapacity(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveCapOverride}>
              <div className="modal-body">
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Updating capacity for <strong>{editingCapacity.personName}</strong> in <strong>{editingCapacity.month}</strong>.
                </div>

                <div className="form-group">
                  <label className="form-label">Available Capacity Hours *</label>
                  <input
                    type="number"
                    min="0"
                    max="300"
                    className="form-input"
                    value={overrideHours}
                    onChange={(e) => setOverrideHours(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Baseline = weekly hours × working days in month (40 h/week ≈ 160–184 h). Enter total hours available this month.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Adjustment Reason / Notes</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Approved 2-week PTO, Public Holidays, Ramp-up"
                    value={overrideNotes}
                    onChange={(e) => setOverrideNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCapacity(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingCap}>
                  <i className="fa-solid fa-check"></i>
                  <span>{savingCap ? 'Saving...' : 'Update Capacity'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { MONTH_NAMES } from '../../utils/dateUtils.js';
import { api } from '../../services/api.js';

/**
 * Day-based monthly capacity math — pure client-side replica of the
 * authoritative server implementation in server/services/calculations.js.
 * Capacity = (weeklyHours / 5) * workingDays (Mon–Fri only), NOT a flat 160h.
 */
function getWorkingDaysInMonth(year, month) {
  // month is 1-indexed (1 = Jan)
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) workingDays++;
  }
  return workingDays;
}

function getDynamicMonthlyCapacity(year, month, weeklyHours = 40) {
  const workingDays = getWorkingDaysInMonth(year, month);
  return Math.round((weeklyHours / 5) * workingDays * 10) / 10;
}

/**
 * R/G/Y utilization rules (exact):
 * >100% overbooked, 90%–100% high, <90% optimal.
 */
function utilizationClass(pct) {
  const v = Number(pct) || 0;
  if (v > 100) return 'overbooked';
  if (v >= 90) return 'high';
  return 'optimal';
}

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

  // Specialist (person) CRUD modal state
  const [personModal, setPersonModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', person }
  const [personForm, setPersonForm] = useState({ name: '', email: '', role: '', team_id: '', default_weekly_hours: 40 });
  const [savingPerson, setSavingPerson] = useState(false);

  // Squad (team) CRUD modal state
  const [teamModal, setTeamModal] = useState(null); // null | { mode: 'create' } | { mode: 'edit', team }
  const [teamForm, setTeamForm] = useState({ name: '', code: '', tribe_id: '', focus_area: '' });
  const [savingTeam, setSavingTeam] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: 'person' | 'team', id, name }
  const [deleting, setDeleting] = useState(false);

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

  // Day-based capacity context for the visible year/month range (40 h/week baseline)
  const monthCapacityContext = useMemo(() => {
    return visibleMonths.map((m) => {
      const [yy, mm] = m.split('-').map(Number);
      return {
        month: m,
        label: MONTH_NAMES[mm - 1],
        workingDays: getWorkingDaysInMonth(yy, mm),
        baseline40: getDynamicMonthlyCapacity(yy, mm, 40)
      };
    });
  }, [visibleMonths]);

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

  // Day-based capacity for a person's weekly hours in a given YYYY-MM month
  const capacityFor = (weeklyHours, yearMonth) => {
    const [yy, mm] = yearMonth.split('-').map(Number);
    return getDynamicMonthlyCapacity(yy, mm, weeklyHours ?? 40);
  };

  const teamMemberCount = (teamId) =>
    hierarchyData.people.filter((p) => p.team_id === teamId).length;

  // ---- Capacity override (existing record flow, now with day-based formula) ----

  const handleOpenCapEditor = (person, month, currentHours, e) => {
    e.stopPropagation();
    setEditingCapacity({
      personId: person.id,
      personName: person.name,
      month,
      currentHours,
      weeklyHours: person.default_weekly_hours ?? 40
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

  // ---- Specialist (person) CRUD ----

  const openPersonModal = (mode, person) => {
    if (mode === 'edit' && person) {
      setPersonForm({
        name: person.name || '',
        email: person.email || '',
        role: person.role || '',
        team_id: person.team_id || '',
        default_weekly_hours: person.default_weekly_hours ?? 40
      });
    } else {
      setPersonForm({
        name: '',
        email: '',
        role: '',
        team_id: selectedTeam !== 'ALL' ? selectedTeam : '',
        default_weekly_hours: 40
      });
    }
    setPersonModal({ mode, person: person || null });
  };

  const closePersonModal = () => setPersonModal(null);

  const handleSavePerson = async (e) => {
    e.preventDefault();
    if (!personModal) return;
    setSavingPerson(true);
    const payload = {
      name: personForm.name.trim(),
      email: personForm.email.trim(),
      role: personForm.role.trim(),
      team_id: personForm.team_id || null,
      default_weekly_hours: Number(personForm.default_weekly_hours) || 40
    };
    try {
      if (personModal.mode === 'create') {
        await api.createPerson(payload);
        addToast(`Added specialist ${payload.name}`, 'success');
      } else {
        await api.updatePerson(personModal.person.id, payload);
        addToast(`Updated specialist ${payload.name}`, 'success');
      }
      await refreshAll();
      closePersonModal();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingPerson(false);
    }
  };

  // ---- Squad (team) CRUD ----

  const openTeamModal = (mode, team) => {
    if (mode === 'edit' && team) {
      setTeamForm({
        name: team.name || '',
        code: team.code || '',
        tribe_id: team.tribe_id || '',
        focus_area: team.focus_area || ''
      });
    } else {
      setTeamForm({
        name: '',
        code: '',
        tribe_id: selectedTribe !== 'ALL' ? selectedTribe : '',
        focus_area: ''
      });
    }
    setTeamModal({ mode, team: team || null });
  };

  const closeTeamModal = () => setTeamModal(null);

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    if (!teamModal) return;
    setSavingTeam(true);
    const payload = {
      name: teamForm.name.trim(),
      code: teamForm.code.trim(),
      tribe_id: teamForm.tribe_id,
      focus_area: teamForm.focus_area.trim()
    };
    try {
      if (teamModal.mode === 'create') {
        await api.createTeam(payload);
        addToast(`Added squad ${payload.name} (${payload.code.toUpperCase()})`, 'success');
      } else {
        await api.updateTeam(teamModal.team.id, payload);
        addToast(`Updated squad ${payload.name}`, 'success');
      }
      await refreshAll();
      closeTeamModal();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSavingTeam(false);
    }
  };

  // ---- Delete (person / team) with confirmation ----

  const requestDeletePerson = (person) => setDeleteTarget({ kind: 'person', id: person.id, name: person.name });
  const requestDeleteTeam = (team) => setDeleteTarget({ kind: 'team', id: team.id, name: team.name });

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'person') {
        await api.deletePerson(deleteTarget.id);
      } else {
        await api.deleteTeam(deleteTarget.id);
      }
      addToast(`${deleteTarget.name} deleted`, 'success');
      await refreshAll();
      setDeleteTarget(null);
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setDeleting(false);
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

  // Day-based formula values for the capacity override modal
  const capModalYear = editingCapacity ? Number(editingCapacity.month.split('-')[0]) : null;
  const capModalMonth = editingCapacity ? Number(editingCapacity.month.split('-')[1]) : null;
  const capModalWorkingDays = editingCapacity ? getWorkingDaysInMonth(capModalYear, capModalMonth) : 0;
  const capModalBaseline = editingCapacity
    ? getDynamicMonthlyCapacity(capModalYear, capModalMonth, editingCapacity.weeklyHours)
    : 0;

  return (
    <div className="resources-view-container">
      {/* Page Header with direct Add actions (Decentralized CRUD: People & Teams live here) */}
      <div className="resource-page-header">
        <div>
          <h2 className="resource-page-title">Resources &amp; Capacity</h2>
          <span className="resource-page-subtitle">
            Specialists, squads &amp; day-based monthly capacity for {year} — (weekly hours ÷ 5) × working days
          </span>
        </div>
        <div className="resource-add-actions">
          <button type="button" className="btn btn-add" onClick={() => openPersonModal('create')}>
            <i className="fa-solid fa-user-plus"></i>
            <span>Add Specialist</span>
          </button>
          <button type="button" className="btn btn-add" onClick={() => openTeamModal('create')}>
            <i className="fa-solid fa-people-group"></i>
            <span>Add Squad</span>
          </button>
        </div>
      </div>

      {/* Top KPI Summary Cards */}
      <div className="resource-kpi-grid">
        <div className="kpi-card">
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

        <div className={`kpi-card ${utilizationClass(summaryMetrics.avgUtilizationPct)}`}>
          <div className="kpi-header">
            <span>Average Utilization</span>
            <i className="fa-solid fa-chart-line"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.avgUtilizationPct}%</div>
          <div className="kpi-subtitle">R/G/Y: {'<90%'} optimal · 90–100% high · {'>100%'} overbooked</div>
        </div>

        <div className={`kpi-card ${summaryMetrics.overbookedPeopleCount > 0 ? 'overbooked' : 'optimal'}`}>
          <div className="kpi-header">
            <span>Overbooked Specialists</span>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="kpi-value">{summaryMetrics.overbookedPeopleCount}</div>
          <div className="kpi-subtitle">People with {'>100%'} allocation in at least 1 month</div>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div className="util-legend">
                <span className="util-legend-item">
                  <span style={{ background: 'var(--util-overbooked)' }}></span>{'>100%'}
                </span>
                <span className="util-legend-item">
                  <span style={{ background: 'var(--util-high)' }}></span>90–100%
                </span>
                <span className="util-legend-item">
                  <span style={{ background: 'var(--util-optimal)' }}></span>{'<90%'}
                </span>
              </div>
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

          {/* Day-based working days & capacity context for the visible months */}
          <div className="working-days-strip">
            <span className="working-days-label">
              <i className="fa-solid fa-calendar-day"></i>
              Working days &amp; 40 h/wk baseline
            </span>
            {monthCapacityContext.map((mc) => (
              <span
                key={mc.month}
                className="working-days-chip"
                title={`${mc.label} ${year}: ${mc.workingDays} working days · ${mc.baseline40.toFixed(1)} h at 40 h/week`}
              >
                <strong>{mc.label}</strong> {mc.workingDays} wd · {mc.baseline40.toFixed(1)} h
              </span>
            ))}
          </div>

          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '260px' }}>Specialist & Squad</th>
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
                  const weeklyHours = p.default_weekly_hours ?? 40;

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
                            <span className="weekly-hours-chip" title="Default weekly hours — prorated per working day">
                              {weeklyHours} h/wk
                            </span>
                            <div className="row-actions">
                              <button
                                type="button"
                                className="row-action-btn"
                                title={`Edit ${p.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPersonModal('edit', p);
                                }}
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn danger"
                                title={`Delete ${p.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeletePerson(p);
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          </div>
                        </td>

                        {visibleMonths.map((m) => {
                          const mData = pm.monthlyData[m];
                          const statusClass = utilizationClass(mData.utilizationPct);

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
                          <div className={`util-badge-box ${utilizationClass(pm.annualSummary.avgUtilization)}`}>
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
                                Active Deliverables &amp; Project Allocations for {p.name} ({allTasks.length} tasks):
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

                              {/* Day-based capacity formula for this person */}
                              <div className="drawer-section">
                                <span className="drawer-section-title">
                                  <i className="fa-solid fa-calculator"></i>
                                  Day-based monthly capacity for {p.name} @ {weeklyHours} h/wk — ({weeklyHours} ÷ 5) × working days:
                                </span>
                                <div className="working-days-strip">
                                  {monthCapacityContext.map((mc) => (
                                    <span
                                      key={mc.month}
                                      className="working-days-chip"
                                      title={`${mc.label}: ${mc.workingDays} working days`}
                                    >
                                      <strong>{mc.label}</strong> {mc.workingDays} wd · {capacityFor(weeklyHours, mc.month).toFixed(1)} h
                                    </span>
                                  ))}
                                </div>
                              </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Squad &amp; Tribe Utilization Aggregates</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Consolidated demand vs capacity by squad</span>
            </div>
            <div className="util-legend">
              <span className="util-legend-item">
                <span style={{ background: 'var(--util-overbooked)' }}></span>{'>100%'}
              </span>
              <span className="util-legend-item">
                <span style={{ background: 'var(--util-high)' }}></span>90–100%
              </span>
              <span className="util-legend-item">
                <span style={{ background: 'var(--util-optimal)' }}></span>{'<90%'}
              </span>
            </div>
          </div>

          {/* Day-based working days & capacity context for the visible months */}
          <div className="working-days-strip">
            <span className="working-days-label">
              <i className="fa-solid fa-calendar-day"></i>
              Working days &amp; 40 h/wk baseline
            </span>
            {monthCapacityContext.map((mc) => (
              <span
                key={mc.month}
                className="working-days-chip"
                title={`${mc.label} ${year}: ${mc.workingDays} working days · ${mc.baseline40.toFixed(1)} h at 40 h/week`}
              >
                <strong>{mc.label}</strong> {mc.workingDays} wd · {mc.baseline40.toFixed(1)} h
              </span>
            ))}
          </div>

          <div className="matrix-table-wrapper">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th style={{ minWidth: '260px' }}>Squad / Team</th>
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
                {Object.values(capacityData.teamAggregates || {}).map((tm) => {
                  const isPseudoRow = tm.id === 'unassigned-team';
                  return (
                    <tr key={tm.id}>
                      <td>
                        <div className="matrix-person-cell">
                          <span className="badge badge-team" style={{ width: '32px', textAlign: 'center' }}>
                            {tm.code}
                          </span>
                          <div className="person-name-box">
                            <span className="person-name-text">{tm.name}</span>
                            <span className="person-role-text">{teamMemberCount(tm.id)} specialist(s)</span>
                          </div>
                          {!isPseudoRow && (
                            <div className="row-actions">
                              <button
                                type="button"
                                className="row-action-btn"
                                title={`Edit ${tm.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTeamModal('edit', tm);
                                }}
                              >
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button
                                type="button"
                                className="row-action-btn danger"
                                title={`Delete ${tm.name}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteTeam(tm);
                                }}
                              >
                                <i className="fa-solid fa-trash"></i>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {visibleMonths.map((m) => {
                        const mData = tm.monthlyData[m] || { capacity: 0, demand: 0, utilizationPct: 0, status: 'OPTIMAL' };
                        return (
                          <td key={m} className="util-cell">
                            <div className={`util-badge-box ${utilizationClass(mData.utilizationPct)}`}>
                              <span>{mData.utilizationPct}%</span>
                              <span className="util-hours-sub">
                                {Math.round(mData.demand)}/{mData.capacity}h
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
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
          <div className="chart-legend">
            <span className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: 'var(--util-overbooked)' }}></span>
              Overbooked ({'>100%'})
            </span>
            <span className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: 'var(--util-high)' }}></span>
              High (90–100%)
            </span>
            <span className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: 'var(--util-optimal)' }}></span>
              Optimal ({'<90%'})
            </span>
            <span className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: 'rgba(148, 163, 184, 0.3)' }}></span>
              Available Capacity (track)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {capacityData.months.map((m, idx) => {
              const pData = capacityData.portfolioAggregate?.monthlyData[m];
              if (!pData) return null;
              const maxVal = chartMax;
              const demWidth = `${(pData.demand / maxVal) * 100}%`;
              const capWidth = `${(pData.capacity / maxVal) * 100}%`;
              const [yy, mm] = m.split('-').map(Number);
              const statusClass = utilizationClass(pData.utilizationPct);

              return (
                <div key={m} className="chart-bar-row">
                  <div className="chart-month-label">
                    <span>{MONTH_NAMES[idx]} {year}</span>
                    <span className="chart-month-sub">
                      {getWorkingDaysInMonth(yy, mm)} wd · {pData.capacity}h cap
                    </span>
                  </div>
                  <div className="chart-bars-wrapper">
                    <div
                      className={`chart-bar chart-bar-demand ${statusClass}`}
                      style={{ width: demWidth }}
                      title={`Demand: ${pData.demand}h / ${pData.capacity}h capacity (${pData.utilizationPct}%)`}
                    ></div>
                    <div className="chart-bar chart-bar-capacity" style={{ width: capWidth }} title={`Capacity: ${pData.capacity}h`}></div>
                  </div>
                  <span className={`util-chip ${statusClass}`}>{pData.utilizationPct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Capacity Override Modal (existing record flow + day-based formula) */}
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

                <div className="capacity-formula-box">
                  <i className="fa-solid fa-calculator"></i>
                  <span>
                    Day-based baseline: <strong>{capModalWorkingDays} working days</strong> × (
                    <strong>{editingCapacity.weeklyHours} h/wk ÷ 5</strong>) = <strong>{capModalBaseline.toFixed(1)} h</strong>
                  </span>
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
                  <span className="form-hint">
                    Baseline = (weekly hours ÷ 5) × working days in month — e.g. 40 h/wk · 21 working days → 168.0 h. Enter total hours available this month.
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

      {/* Add / Edit Specialist Modal */}
      {personModal && (
        <div className="modal-overlay" onClick={closePersonModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i
                  className={`fa-solid ${personModal.mode === 'create' ? 'fa-user-plus' : 'fa-pen'}`}
                  style={{ marginRight: '8px', color: 'var(--primary)' }}
                ></i>
                {personModal.mode === 'create' ? 'Add Specialist' : `Edit Specialist — ${personModal.person.name}`}
              </h3>
              <button className="btn-icon" onClick={closePersonModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSavePerson}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Ada Lovelace"
                      value={personForm.name}
                      onChange={(e) => setPersonForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role / Title *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Senior Backend Engineer"
                      value={personForm.role}
                      onChange={(e) => setPersonForm((f) => ({ ...f, role: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={personForm.email}
                    onChange={(e) => setPersonForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Squad (Team)</label>
                    <select
                      className="form-select"
                      value={personForm.team_id}
                      onChange={(e) => setPersonForm((f) => ({ ...f, team_id: e.target.value }))}
                    >
                      <option value="">No Squad (unassigned)</option>
                      {hierarchyData.tribes.map((tribe) => {
                        const tribeTeams = hierarchyData.teams.filter((t) => t.tribe_id === tribe.id);
                        if (tribeTeams.length === 0) return null;
                        return (
                          <optgroup key={tribe.id} label={tribe.name}>
                            {tribeTeams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ({t.code})
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Default Weekly Hours</label>
                    <input
                      type="number"
                      min="1"
                      max="80"
                      step="1"
                      className="form-input"
                      value={personForm.default_weekly_hours}
                      onChange={(e) => setPersonForm((f) => ({ ...f, default_weekly_hours: e.target.value }))}
                    />
                  </div>
                </div>

                <span className="form-hint">
                  Monthly capacity is derived day-based: (weekly hours ÷ 5) × working days in month — e.g. 40 h/wk → 21 working days · 168.0 h.
                </span>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closePersonModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPerson}>
                  <i className="fa-solid fa-check"></i>
                  <span>{savingPerson ? 'Saving...' : personModal.mode === 'create' ? 'Add Specialist' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Squad Modal */}
      {teamModal && (
        <div className="modal-overlay" onClick={closeTeamModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i
                  className={`fa-solid ${teamModal.mode === 'create' ? 'fa-people-group' : 'fa-pen'}`}
                  style={{ marginRight: '8px', color: 'var(--primary)' }}
                ></i>
                {teamModal.mode === 'create' ? 'Add Squad' : `Edit Squad — ${teamModal.team.name}`}
              </h3>
              <button className="btn-icon" onClick={closeTeamModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleSaveTeam}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Squad Name *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Payments Platform"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm((f) => ({ ...f, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Code *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. PAY"
                      maxLength={6}
                      value={teamForm.code}
                      onChange={(e) => setTeamForm((f) => ({ ...f, code: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Tribe *</label>
                    <select
                      className="form-select"
                      value={teamForm.tribe_id}
                      onChange={(e) => setTeamForm((f) => ({ ...f, tribe_id: e.target.value }))}
                      required
                    >
                      <option value="">Select a tribe...</option>
                      {hierarchyData.tribes.map((tr) => (
                        <option key={tr.id} value={tr.id}>
                          {tr.name} ({tr.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Focus Area</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. ISO 20022 migration"
                      value={teamForm.focus_area}
                      onChange={(e) => setTeamForm((f) => ({ ...f, focus_area: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeTeamModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingTeam}>
                  <i className="fa-solid fa-check"></i>
                  <span>{savingTeam ? 'Saving...' : teamModal.mode === 'create' ? 'Add Squad' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-card modal-card-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '8px', color: 'var(--util-overbooked)' }}></i>
                Delete {deleteTarget.kind === 'person' ? 'Specialist' : 'Squad'}
              </h3>
              <button className="btn-icon" onClick={() => setDeleteTarget(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="modal-body">
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.
              </span>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" disabled={deleting} onClick={handleConfirmDelete}>
                <i className="fa-solid fa-trash"></i>
                <span>{deleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

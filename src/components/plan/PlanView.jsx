import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../services/api.js';
import {
  getTimelineViewport,
  calculateFitCoordinates,
  formatShortDate,
  CURRENT_YEAR
} from '../../utils/dateUtils.js';
import WorkItemModal from './WorkItemModal.jsx';
import PhaseModal from './PhaseModal.jsx';
import DependencyModal from './DependencyModal.jsx';

export default function PlanView() {
  const { projectsData, refreshAll, addToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState('YEAR'); // '1M', '3M', '6M', '12M', 'YEAR'
  const [offsetIndex, setOffsetIndex] = useState(0); // For 1M (0..11), 3M (0..3), 6M (0..1)
  const [year, setYear] = useState(CURRENT_YEAR); // Dynamic year navigation, anchored to current year
  const [levelFilter, setLevelFilter] = useState('ALL'); // 'ALL', 'PROJECTS', 'PHASES', 'TASKS'
  const [projectFilter, setProjectFilter] = useState('ALL'); // 'ALL' or a single project id
  const [containerWidth, setContainerWidth] = useState(0); // Measured timeline panel width (Fit Year + zoom overflow)
  const [phaseModalOpen, setPhaseModalOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState(null);
  const [defaultProjectId, setDefaultProjectId] = useState(null);
  const [depModalOpen, setDepModalOpen] = useState(false);

  const [expandedProjects, setExpandedProjects] = useState({
    'proj-1': true,
    'proj-2': true,
    'proj-3': true,
    'proj-4': true
  });
  const [expandedPhases, setExpandedPhases] = useState({
    'ph-1-1': true,
    'ph-1-2': true,
    'ph-1-3': true,
    'ph-2-1': true,
    'ph-2-2': true,
    'ph-3-1': true,
    'ph-3-2': true,
    'ph-4-1': true,
    'ph-4-2': true
  });

  const [selectedItemId, setSelectedItemId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState(null);

  const treePanelRef = useRef(null);
  const timelinePanelRef = useRef(null);

  // Measure the timeline panel so Fit Year matches the viewport exactly and zoomed modes can overflow
  useEffect(() => {
    const el = timelinePanelRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Synchronized vertical scroll
  const handleTreeScroll = (e) => {
    if (timelinePanelRef.current) {
      timelinePanelRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const handleTimelineScroll = (e) => {
    if (treePanelRef.current) {
      treePanelRef.current.scrollTop = e.target.scrollTop;
    }
  };

  const toggleProject = (id) => {
    setExpandedProjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const togglePhase = (id) => {
    setExpandedPhases((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allProj = {};
    const allPh = {};
    projectsData.projects.forEach((p) => {
      allProj[p.id] = true;
      p.phases.forEach((ph) => {
        allPh[ph.id] = true;
      });
    });
    setExpandedProjects(allProj);
    setExpandedPhases(allPh);
  };

  const collapseAll = () => {
    setExpandedProjects({});
    setExpandedPhases({});
  };

  // Map a (level, offset) window to the corresponding window at another zoom level
  const offsetForZoom = (fromLevel, fromOffset, toLevel) => {
    const startMonth = { '1M': fromOffset, '3M': fromOffset * 3, '6M': fromOffset * 6, '12M': 0, 'YEAR': 0 }[fromLevel] ?? 0;
    const step = { '1M': 1, '3M': 3, '6M': 6, '12M': 12, 'YEAR': 12 }[toLevel] ?? 12;
    const maxIdx = toLevel === '1M' ? 11 : toLevel === '3M' ? 3 : toLevel === '6M' ? 1 : 0;
    return Math.max(0, Math.min(maxIdx, Math.floor(startMonth / step)));
  };

  // Mouse wheel zoom: step through zoom levels while preserving the visible date context
  const zoomLevelRef = useRef(zoomLevel);
  const offsetIndexRef = useRef(offsetIndex);
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
    offsetIndexRef.current = offsetIndex;
  }, [zoomLevel, offsetIndex]);

  useEffect(() => {
    const el = timelinePanelRef.current;
    if (!el) return;
    const ORDER = ['1M', '3M', '6M', '12M', 'YEAR'];
    const onWheel = (e) => {
      e.preventDefault();
      const idx = ORDER.indexOf(zoomLevelRef.current);
      const next = e.deltaY > 0 ? Math.min(ORDER.length - 1, idx + 1) : Math.max(0, idx - 1);
      if (ORDER[next] !== zoomLevelRef.current) {
        setZoomLevel(ORDER[next]);
        setOffsetIndex(offsetForZoom(zoomLevelRef.current, offsetIndexRef.current, ORDER[next]));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Switch zoom level, preserving the currently visible date context
  const handleZoomChange = (mode) => {
    setZoomLevel(mode);
    setOffsetIndex(offsetForZoom(zoomLevel, offsetIndex, mode));
  };

  const handlePrevWindow = () => {
    setOffsetIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextWindow = () => {
    const maxIdx = zoomLevel === '1M' ? 11 : zoomLevel === '3M' ? 3 : zoomLevel === '6M' ? 1 : 0;
    setOffsetIndex((prev) => Math.min(maxIdx, prev + 1));
  };

  // Get current active timeline viewport window for the selected year
  const viewport = useMemo(() => {
    return getTimelineViewport(zoomLevel, offsetIndex, year);
  }, [zoomLevel, offsetIndex, year]);

  // Timeline content width: Fit Year matches the container exactly;
  // granular zooms render wider than the container for natural horizontal scrolling.
  const isGranular = zoomLevel !== 'YEAR';
  const PX_PER_DAY = { '1M': 48, '3M': 16, '6M': 8, '12M': 4 };
  const innerWidthPx = isGranular
    ? Math.max(viewport.totalDays * (PX_PER_DAY[zoomLevel] || 4), containerWidth + 60)
    : containerWidth;

  // Flatten visible rows (respecting Level and Project filters)
  const visibleRows = useMemo(() => {
    const rows = [];
    const filteredProjects = projectFilter === 'ALL'
      ? projectsData.projects
      : projectsData.projects.filter((p) => p.id === projectFilter);

    filteredProjects.forEach((project) => {
      const projExpanded = levelFilter === 'TASKS' ? true : Boolean(expandedProjects[project.id]);
      const showPhases = levelFilter !== 'PROJECTS';
      const showItems = levelFilter === 'ALL' || levelFilter === 'TASKS';

      rows.push({
        type: 'project',
        id: project.id,
        data: project,
        isExpanded: projExpanded,
        level: 1
      });

      if (projExpanded && showPhases) {
        project.phases.forEach((phase) => {
          const phaseExpanded = levelFilter === 'TASKS' ? true : Boolean(expandedPhases[phase.id]);

          rows.push({
            type: 'phase',
            id: phase.id,
            projectId: project.id,
            data: phase,
            isExpanded: phaseExpanded,
            level: 2
          });

          if (phaseExpanded && showItems) {
            phase.workItems.forEach((item) => {
              const itemSearchMatch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.description?.toLowerCase().includes(searchQuery.toLowerCase());
              const itemStatusMatch = statusFilter === 'ALL' || item.status === statusFilter;

              if (itemSearchMatch && itemStatusMatch) {
                rows.push({
                  type: 'item',
                  id: item.id,
                  phaseId: phase.id,
                  projectId: project.id,
                  data: item,
                  level: 3
                });
              }
            });
          }
        });
      }
    });

    return rows;
  }, [projectsData.projects, expandedProjects, expandedPhases, searchQuery, statusFilter, levelFilter, projectFilter]);

  // Dependency coordinate map for SVG arrows inside current viewport
  const dependencyLines = useMemo(() => {
    const rowPositions = {};
    visibleRows.forEach((row, index) => {
      rowPositions[row.id] = index;
    });

    const lines = [];
    const ROW_H = 46; // px

    projectsData.dependencies.forEach((dep) => {
      const predRowIdx = rowPositions[dep.predecessor_id];
      const succRowIdx = rowPositions[dep.successor_id];

      if (predRowIdx !== undefined && succRowIdx !== undefined) {
        const predItem = projectsData.flatWorkItems.find((i) => i.id === dep.predecessor_id);
        const succItem = projectsData.flatWorkItems.find((i) => i.id === dep.successor_id);

        if (predItem && succItem) {
          const predCoords = calculateFitCoordinates(predItem.start_date, predItem.end_date, viewport.startDate, viewport.totalDays);
          const succCoords = calculateFitCoordinates(succItem.start_date, succItem.end_date, viewport.startDate, viewport.totalDays);

          if ((predCoords.isVisible || succCoords.isVisible) && innerWidthPx > 0) {
            // Pixel coordinates (SVG path data does not support percentages)
            const startX = (Math.max(0, Math.min(100, predCoords.leftPct + predCoords.widthPct)) / 100) * innerWidthPx;
            const startY = predRowIdx * ROW_H + ROW_H / 2;
            const endX = (Math.max(0, Math.min(100, succCoords.leftPct)) / 100) * innerWidthPx;
            const endY = succRowIdx * ROW_H + ROW_H / 2;

            lines.push({
              id: dep.id,
              startX,
              startY,
              endX,
              endY,
              type: dep.type
            });
          }
        }
      }
    });

    return lines;
  }, [visibleRows, projectsData.dependencies, projectsData.flatWorkItems, viewport, innerWidthPx]);

  // Today marker: always the real current date (only visible when the viewport contains it)
  const todayStr = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);

  const todayCoords = useMemo(() => {
    return calculateFitCoordinates(todayStr, todayStr, viewport.startDate, viewport.totalDays);
  }, [viewport, todayStr]);

  const handleEditItem = (item, e) => {
    e.stopPropagation();
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleAddNew = (phaseId = null) => {
    setEditingItem(null);
    setSelectedPhaseId(phaseId);
    setModalOpen(true);
  };

  const handleEditPhase = (phase, projectId, e) => {
    e.stopPropagation();
    setEditingPhase(phase);
    setDefaultProjectId(projectId);
    setPhaseModalOpen(true);
  };

  const handleAddPhase = (projectId = null) => {
    setEditingPhase(null);
    setDefaultProjectId(projectId || (projectFilter !== 'ALL' ? projectFilter : projectsData.projects[0]?.id || null));
    setPhaseModalOpen(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await api.deleteWorkItem(item.id);
      addToast('Work item deleted.', 'success');
      await refreshAll();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    const norm = (status || 'NOT_STARTED').toLowerCase().replace('_', '-');
    const label = (status || 'NOT_STARTED').replace('_', ' ');
    return <span className={`badge badge-${norm}`}>{label}</span>;
  };

  const getStatusBarClass = (status) => {
    const norm = (status || 'NOT_STARTED').toLowerCase().replace('_', '-');
    return `gantt-bar-${norm}`;
  };

  const getMilestoneClass = (status) => {
    const norm = (status || 'NOT_STARTED').toLowerCase().replace('_', '-');
    return `milestone-${norm}`;
  };

  const isZoomWindowed = zoomLevel === '1M' || zoomLevel === '3M' || zoomLevel === '6M';
  const maxOffset = zoomLevel === '1M' ? 11 : zoomLevel === '3M' ? 3 : zoomLevel === '6M' ? 1 : 0;

  return (
    <div className="gantt-view-container">
      {/* Gantt Toolbar */}
      <div className="gantt-toolbar">
        <div className="toolbar-left">
          <div className="search-input-wrapper">
            <i className="fa-solid fa-magnifying-glass"></i>
            <input
              type="text"
              className="search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: '130px', padding: '5px 8px', fontSize: '12px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="DELAYED">Delayed</option>
            <option value="COMPLETED">Completed</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>

          <select
            className="form-select"
            style={{ width: '130px', padding: '5px 8px', fontSize: '12px' }}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="ALL">All Levels</option>
            <option value="PROJECTS">Projects Only</option>
            <option value="PHASES">Phases Only</option>
            <option value="TASKS">Tasks Only</option>
          </select>

          <select
            className="form-select"
            style={{ width: '150px', padding: '5px 8px', fontSize: '12px' }}
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value="ALL">All Projects</option>
            {projectsData.projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '11px' }} onClick={expandAll} title="Expand All">
            <i className="fa-solid fa-angles-down"></i>
          </button>

          <button className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '11px' }} onClick={collapseAll} title="Collapse All">
            <i className="fa-solid fa-angles-up"></i>
          </button>
        </div>

        <div className="toolbar-right">
          {/* Year navigation, anchored to current year */}
          <div className="timeline-nav-pills">
            <button
              type="button"
              className="timeline-nav-btn"
              onClick={() => setYear((y) => y - 1)}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <span className="timeline-nav-label">{year}</span>
            <button
              type="button"
              className="timeline-nav-btn"
              onClick={() => setYear((y) => y + 1)}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* Window Navigation (for 1M / 3M / 6M) */}
          {isZoomWindowed && (
            <div className="timeline-nav-pills">
              <button
                type="button"
                className="timeline-nav-btn"
                onClick={handlePrevWindow}
                disabled={offsetIndex === 0}
                style={{ opacity: offsetIndex === 0 ? 0.3 : 1 }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <span className="timeline-nav-label">{viewport.label}</span>
              <button
                type="button"
                className="timeline-nav-btn"
                onClick={handleNextWindow}
                disabled={offsetIndex === maxOffset}
                style={{ opacity: offsetIndex === maxOffset ? 0.3 : 1 }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          )}

          {/* Zoom switcher */}
          <div className="zoom-switcher">
            {['1M', '3M', '6M', '12M', 'YEAR'].map((mode) => (
              <button
                key={mode}
                type="button"
                className={`zoom-btn ${zoomLevel === mode ? 'active' : ''}`}
                onClick={() => handleZoomChange(mode)}
              >
                {mode === 'YEAR' ? 'Fit Year' : mode}
              </button>
            ))}
          </div>

          <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleAddPhase()}>
            <i className="fa-solid fa-layer-group"></i>
            <span>Phase</span>
          </button>

          <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleAddNew()}>
            <i className="fa-solid fa-plus"></i>
            <span>Task</span>
          </button>

          <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setDepModalOpen(true)}>
            <i className="fa-solid fa-arrow-right-long"></i>
            <span>Dependency</span>
          </button>
        </div>
      </div>

      {/* Main Split Pane */}
      <div className="gantt-split-pane">
        {/* Left Hierarchy Tree Panel */}
        <div className="gantt-tree-panel">
          <div className="tree-header-row">
            <span className="tree-header-col-name">Project / Phase / Task</span>
            <span className="tree-header-col-state">State</span>
            <span className="tree-header-col-dates">Dates</span>
            <span className="tree-header-col-progress">Done</span>
            <span className="tree-header-col-assignee">Lead</span>
          </div>

          <div className="tree-body" ref={treePanelRef} onScroll={handleTreeScroll}>
            {visibleRows.map((row) => {
              const isSelected = selectedItemId === row.id;

              if (row.type === 'project') {
                const p = row.data;
                return (
                  <div
                    key={row.id}
                    className={`tree-row tree-row-project ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedItemId(row.id)}
                  >
                    <div className="tree-indent">
                      <span className="tree-expander" onClick={(e) => { e.stopPropagation(); toggleProject(p.id); }}>
                        <i className={`fa-solid fa-chevron-${row.isExpanded ? 'down' : 'right'}`}></i>
                      </span>
                    </div>
                    <div className="tree-name-wrapper">
                      <i className="fa-solid fa-folder-tree tree-icon-project"></i>
                      <span title={p.name}>{p.name}</span>
                    </div>
                    <div className="tree-meta-state">{getStatusBadge(p.status)}</div>
                    <div className="tree-meta-dates">
                      {formatShortDate(p.computedStartDate || p.start_date)} - {formatShortDate(p.computedEndDate || p.end_date)}
                    </div>
                    <div className="tree-meta-progress">{p.computedProgress || 0}%</div>
                    <div className="tree-meta-assignee">
                      <span className="avatar" title={p.owner_name || 'Executive Owner'}>
                        {p.owner_avatar || 'EX'}
                      </span>
                    </div>
                  </div>
                );
              }

              if (row.type === 'phase') {
                const ph = row.data;
                return (
                  <div
                    key={row.id}
                    className={`tree-row tree-row-phase ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedItemId(row.id)}
                    onDoubleClick={(e) => handleEditPhase(ph, row.projectId, e)}
                  >
                    <div className="tree-indent" style={{ paddingLeft: '14px' }}>
                      <span className="tree-expander" onClick={(e) => { e.stopPropagation(); togglePhase(ph.id); }}>
                        <i className={`fa-solid fa-chevron-${row.isExpanded ? 'down' : 'right'}`}></i>
                      </span>
                    </div>
                    <div className="tree-name-wrapper">
                      <i className="fa-solid fa-diagram-next tree-icon-phase"></i>
                      <span title={ph.name}>{ph.name}</span>
                    </div>
                    <div className="tree-meta-state">{getStatusBadge(ph.status)}</div>
                    <div className="tree-meta-dates">
                      {formatShortDate(ph.computedStartDate || ph.start_date)} - {formatShortDate(ph.computedEndDate || ph.end_date)}
                    </div>
                    <div className="tree-meta-progress">{ph.computedProgress || 0}%</div>
                    <div className="tree-meta-assignee">
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ph.workItemsCount}t</span>
                    </div>
                  </div>
                );
              }

              // Work Item
              const item = row.data;
              return (
                <div
                  key={row.id}
                  className={`tree-row tree-row-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedItemId(row.id)}
                  onDoubleClick={(e) => handleEditItem(item, e)}
                >
                  <div className="tree-indent" style={{ paddingLeft: '28px' }}></div>
                  <div className="tree-name-wrapper">
                    <i
                      className={`fa-solid ${
                        item.is_milestone ? 'fa-diamond tree-icon-milestone' : 'fa-check-circle tree-icon-item'
                      }`}
                    ></i>
                    <span title={item.name}>{item.name}</span>
                  </div>
                  <div className="tree-meta-state">{getStatusBadge(item.status)}</div>
                  <div className="tree-meta-dates">
                    {formatShortDate(item.start_date)}
                    {!item.is_milestone && ` - ${formatShortDate(item.end_date)}`}
                  </div>
                  <div className="tree-meta-progress">{item.progress}%</div>
                  <div className="tree-meta-assignee">
                    <span className="avatar" title={item.primaryAssignee}>
                      {item.avatar || 'UN'}
                    </span>
                  </div>
                  <span
                    className="tree-row-action"
                    title="Delete task"
                    onClick={(e) => { e.stopPropagation(); handleDeleteItem(item); }}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </span>
                </div>
              );
            })}
          </div>

          {isGranular && <div className="tree-scrollbar-gutter"></div>}
        </div>

        {/* Right Timeline Canvas Panel - horizontal scrolling when zoomed into granular modes */}
        <div className="gantt-timeline-panel" ref={timelinePanelRef} onScroll={handleTimelineScroll}>
          <div className="timeline-inner-container" style={{ width: innerWidthPx ? `${innerWidthPx}px` : '100%' }}>
            {/* Dynamic Header based on active Zoom Level */}
            <div className="timeline-header">
              <div className="timeline-header-top">
                {viewport.topHeader.map((th, idx) => (
                  <div key={idx} className="timeline-header-top-cell" style={{ flex: th.flex }}>
                    {th.name}
                  </div>
                ))}
              </div>
              <div className="timeline-header-bottom">
                {viewport.bottomHeader.map((bh, idx) => (
                  <div key={idx} className="timeline-header-bottom-cell" style={{ flex: bh.flex }}>
                    <span>{bh.name}</span>
                    {bh.sub && <span style={{ fontSize: '8px', opacity: 0.7 }}>{bh.sub}</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Background Grid Lines & Today Marker */}
            <div className="timeline-grid-lines">
              {viewport.bottomHeader.map((_, idx) => (
                <div key={idx} className="grid-column-cell" style={{ flex: 1 }}></div>
              ))}
              {todayCoords.isVisible && (
                <div className="today-marker" style={{ left: `${todayCoords.leftPct}%` }}></div>
              )}
            </div>

            {/* SVG Dependency Lines */}
            <svg className="gantt-svg-overlay">
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#38bdf8" />
                </marker>
              </defs>
              {dependencyLines.map((line) => {
                const pathD = `M ${line.startX} ${line.startY} C ${line.startX + 24} ${line.startY}, ${
                  line.endX - 24
                } ${line.endY}, ${line.endX} ${line.endY}`;
                return (
                  <path
                    key={line.id}
                    d={pathD}
                    className="dependency-line"
                    markerEnd="url(#arrow)"
                  />
                );
              })}
            </svg>

            {/* Timeline Rows */}
            <div className="timeline-rows-container">
              {visibleRows.map((row) => {
                if (row.type === 'project') {
                  const p = row.data;
                  const coords = calculateFitCoordinates(
                    p.computedStartDate || p.start_date,
                    p.computedEndDate || p.end_date,
                    viewport.startDate,
                    viewport.totalDays
                  );

                  if (!coords.isVisible) {
                    return <div key={row.id} className="timeline-row"></div>;
                  }

                  return (
                    <div key={row.id} className="timeline-row">
                      <div
                        className="gantt-bracket-project"
                        style={{
                          left: `${coords.leftPct}%`,
                          width: `${coords.widthPct}%`,
                          top: '17px'
                        }}
                        title={`${p.name}\nState: ${p.status}\nProgress: ${p.computedProgress || 0}%`}
                      ></div>
                    </div>
                  );
                }

                if (row.type === 'phase') {
                  const ph = row.data;
                  const coords = calculateFitCoordinates(
                    ph.computedStartDate || ph.start_date,
                    ph.computedEndDate || ph.end_date,
                    viewport.startDate,
                    viewport.totalDays
                  );

                  if (!coords.isVisible) {
                    return <div key={row.id} className="timeline-row"></div>;
                  }

                  return (
                    <div key={row.id} className="timeline-row">
                      <div
                        className="gantt-bracket-phase"
                        style={{
                          left: `${coords.leftPct}%`,
                          width: `${coords.widthPct}%`,
                          top: '19px'
                        }}
                        title={`${ph.name}\nState: ${ph.status}\nProgress: ${ph.computedProgress || 0}%`}
                      ></div>
                    </div>
                  );
                }

                // Work item bar or milestone diamond
                const item = row.data;
                const coords = calculateFitCoordinates(
                  item.start_date,
                  item.end_date,
                  viewport.startDate,
                  viewport.totalDays
                );

                if (!coords.isVisible) {
                  return <div key={row.id} className="timeline-row"></div>;
                }

                if (item.is_milestone) {
                  return (
                    <div key={row.id} className="timeline-row">
                      <div
                        className={`gantt-milestone-diamond ${getMilestoneClass(item.status)}`}
                        style={{
                          left: `calc(${coords.leftPct}% - 8px)`,
                          top: '15px'
                        }}
                        title={`Milestone: ${item.name}\nState: ${item.status}\nDate: ${formatShortDate(item.start_date)}`}
                        onClick={(e) => handleEditItem(item, e)}
                      ></div>
                    </div>
                  );
                }

                return (
                  <div key={row.id} className="timeline-row">
                    <div
                      className={`gantt-bar-item ${getStatusBarClass(item.status)}`}
                      style={{
                        left: `${coords.leftPct}%`,
                        width: `${coords.widthPct}%`,
                        top: '12px'
                      }}
                      title={`${item.name}\nState: ${item.status}\nDates: ${item.start_date} to ${item.end_date}\nProgress: ${item.progress}%\nAssignee: ${item.primaryAssignee}`}
                      onClick={(e) => handleEditItem(item, e)}
                    >
                      <div className="gantt-bar-progress" style={{ width: `${item.progress}%` }}></div>
                      <span className="gantt-bar-label">{item.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <WorkItemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialItem={editingItem}
        defaultPhaseId={selectedPhaseId}
      />

      <PhaseModal
        isOpen={phaseModalOpen}
        onClose={() => setPhaseModalOpen(false)}
        initialPhase={editingPhase}
        defaultProjectId={defaultProjectId}
      />

      <DependencyModal
        isOpen={depModalOpen}
        onClose={() => setDepModalOpen(false)}
      />
    </div>
  );
}

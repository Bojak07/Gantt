import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import {
  getTimelineViewport,
  calculateFitCoordinates,
  formatShortDate
} from '../../utils/dateUtils.js';
import WorkItemModal from './WorkItemModal.jsx';

export default function PlanView() {
  const { projectsData } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [zoomLevel, setZoomLevel] = useState('YEAR'); // '1M', '3M', '6M', '12M', 'YEAR'
  const [offsetIndex, setOffsetIndex] = useState(0); // For 1M (0..11), 3M (0..3), 6M (0..1)

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

  // Switch zoom level & reset/clamp offset index
  const handleZoomChange = (mode) => {
    setZoomLevel(mode);
    setOffsetIndex(0);
  };

  const handlePrevWindow = () => {
    setOffsetIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextWindow = () => {
    const maxIdx = zoomLevel === '1M' ? 11 : zoomLevel === '3M' ? 3 : zoomLevel === '6M' ? 1 : 0;
    setOffsetIndex((prev) => Math.min(maxIdx, prev + 1));
  };

  // Get current active timeline viewport window (Fit-to-view across 100% width)
  const viewport = useMemo(() => {
    return getTimelineViewport(zoomLevel, offsetIndex);
  }, [zoomLevel, offsetIndex]);

  // Flatten visible rows
  const visibleRows = useMemo(() => {
    const rows = [];

    projectsData.projects.forEach((project) => {
      rows.push({
        type: 'project',
        id: project.id,
        data: project,
        isExpanded: Boolean(expandedProjects[project.id]),
        level: 1
      });

      if (expandedProjects[project.id]) {
        project.phases.forEach((phase) => {
          rows.push({
            type: 'phase',
            id: phase.id,
            projectId: project.id,
            data: phase,
            isExpanded: Boolean(expandedPhases[phase.id]),
            level: 2
          });

          if (expandedPhases[phase.id]) {
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
  }, [projectsData.projects, expandedProjects, expandedPhases, searchQuery, statusFilter]);

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

          if (predCoords.isVisible || succCoords.isVisible) {
            const startX = Math.max(0, Math.min(100, predCoords.leftPct + predCoords.widthPct));
            const startY = predRowIdx * ROW_H + ROW_H / 2;
            const endX = Math.max(0, Math.min(100, succCoords.leftPct));
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
  }, [visibleRows, projectsData.dependencies, projectsData.flatWorkItems, viewport]);

  // Today marker coordinates in current viewport
  const todayCoords = useMemo(() => {
    return calculateFitCoordinates('2025-03-23', '2025-03-23', viewport.startDate, viewport.totalDays);
  }, [viewport]);

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

          <button className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '11px' }} onClick={expandAll} title="Expand All">
            <i className="fa-solid fa-angles-down"></i>
          </button>

          <button className="btn btn-secondary" style={{ padding: '5px 8px', fontSize: '11px' }} onClick={collapseAll} title="Collapse All">
            <i className="fa-solid fa-angles-up"></i>
          </button>
        </div>

        <div className="toolbar-right">
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

          <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleAddNew()}>
            <i className="fa-solid fa-plus"></i>
            <span>Task</span>
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
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Timeline Canvas Panel - 100% Fit-to-View Without Horizontal Scroll */}
        <div className="gantt-timeline-panel" ref={timelinePanelRef} onScroll={handleTimelineScroll}>
          <div className="timeline-inner-container">
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
                const pathD = `M ${line.startX}% ${line.startY}px C ${line.startX + 2}% ${line.startY}px, ${
                  line.endX - 2
                }% ${line.endY}px, ${line.endX}% ${line.endY}px`;
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
    </div>
  );
}

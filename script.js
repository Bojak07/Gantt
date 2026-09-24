/**
 * ZupaViz - Strategic Banking Gantt Roadmap & Resource Hierarchy
 * Application Logic & Timeline Engine
 * Fit-to-View Scale (No Horizontal Scroll) & Connected Tree Hierarchy
 */

(function () {
  'use strict';

  // ==========================================================================
  // Initial Dataset: 4-Level Enterprise Banking Hierarchy
  // ==========================================================================
  const INITIAL_DATA = [
    // --- PORTFOLIO 1 (Level 1) ---
    {
      id: 'port-1',
      parentId: null,
      level: 1,
      name: 'Global Digital Transformation (DX-2025)',
      wbs: '1.0',
      startDate: '2025-01-15',
      endDate: '2025-11-30',
      progress: 68,
      status: 'ON_TRACK',
      assignee: 'Executive Steering Group',
      role: 'Portfolio Owner',
      avatar: 'DX',
      isMilestone: false,
      dependencies: [],
    },
    // Program 1.1 (Level 2)
    {
      id: 'prog-1-1',
      parentId: 'port-1',
      level: 2,
      name: 'Customer Experience 360 Suite',
      wbs: '1.1',
      startDate: '2025-01-15',
      endDate: '2025-07-31',
      progress: 75,
      status: 'ON_TRACK',
      assignee: 'Marcus Vance',
      role: 'VP Product',
      avatar: 'MV',
      isMilestone: false,
      dependencies: [],
    },
    // Project 1.1.1 (Level 3)
    {
      id: 'proj-1-1-1',
      parentId: 'prog-1-1',
      level: 3,
      name: 'NextGen Mobile Banking App v4',
      wbs: '1.1.1',
      startDate: '2025-01-15',
      endDate: '2025-05-15',
      progress: 82,
      status: 'ON_TRACK',
      assignee: 'Elena Rostova',
      role: 'Lead Architect',
      avatar: 'ER',
      isMilestone: false,
      dependencies: [],
    },
    // Tasks (Level 4)
    {
      id: 'task-1-1-1-1',
      parentId: 'proj-1-1-1',
      level: 4,
      name: 'Design System & Figma Prototypes',
      wbs: '1.1.1.1',
      startDate: '2025-01-15',
      endDate: '2025-02-28',
      progress: 100,
      status: 'COMPLETED',
      assignee: 'Liam Chen',
      role: 'UI/UX Lead',
      avatar: 'LC',
      isMilestone: false,
      dependencies: []
    },
    {
      id: 'task-1-1-1-2',
      parentId: 'proj-1-1-1',
      level: 4,
      name: 'Biometric Auth & Core Security Framework',
      wbs: '1.1.1.2',
      startDate: '2025-02-15',
      endDate: '2025-03-31',
      progress: 100,
      status: 'COMPLETED',
      assignee: 'Sara Connor',
      role: 'SecOps',
      avatar: 'SC',
      isMilestone: false,
      dependencies: ['task-1-1-1-1']
    },
    {
      id: 'task-1-1-1-3',
      parentId: 'proj-1-1-1',
      level: 4,
      name: 'Cross-Platform Flutter Client Build',
      wbs: '1.1.1.3',
      startDate: '2025-03-15',
      endDate: '2025-04-30',
      progress: 65,
      status: 'ON_TRACK',
      assignee: 'Dev Team Alpha',
      role: 'Mobile Devs',
      avatar: 'DA',
      isMilestone: false,
      dependencies: ['task-1-1-1-2']
    },
    {
      id: 'task-1-1-1-4',
      parentId: 'proj-1-1-1',
      level: 4,
      name: 'Mobile App Beta Launch',
      wbs: '1.1.1.4',
      startDate: '2025-05-15',
      endDate: '2025-05-15',
      progress: 0,
      status: 'ON_TRACK',
      assignee: 'Elena Rostova',
      role: 'Lead Architect',
      avatar: 'ER',
      isMilestone: true,
      dependencies: ['task-1-1-1-3']
    },

    // Project 1.1.2 (Level 3)
    {
      id: 'proj-1-1-2',
      parentId: 'prog-1-1',
      level: 3,
      name: 'AI Smart Assistant & Chatbot Engine',
      wbs: '1.1.2',
      startDate: '2025-03-01',
      endDate: '2025-07-31',
      progress: 60,
      status: 'AT_RISK',
      assignee: 'Dr. Aris Thorne',
      role: 'AI Research Lead',
      avatar: 'AT',
      isMilestone: false,
      dependencies: ['task-1-1-1-1'],
    },
    {
      id: 'task-1-1-2-1',
      parentId: 'proj-1-1-2',
      level: 4,
      name: 'LLM Fine-Tuning & Customer Corpus',
      wbs: '1.1.2.1',
      startDate: '2025-03-01',
      endDate: '2025-04-20',
      progress: 90,
      status: 'ON_TRACK',
      assignee: 'Dr. Aris Thorne',
      role: 'AI Lead',
      avatar: 'AT',
      isMilestone: false,
      dependencies: []
    },
    {
      id: 'task-1-1-2-2',
      parentId: 'proj-1-1-2',
      level: 4,
      name: 'Latency Optimization & Edge Deployment',
      wbs: '1.1.2.2',
      startDate: '2025-04-20',
      endDate: '2025-06-15',
      progress: 40,
      status: 'AT_RISK',
      assignee: 'Kavita Patel',
      role: 'ML Engineer',
      avatar: 'KP',
      isMilestone: false,
      dependencies: ['task-1-1-2-1']
    },
    {
      id: 'task-1-1-2-3',
      parentId: 'proj-1-1-2',
      level: 4,
      name: 'AI Agent Production Rollout',
      wbs: '1.1.2.3',
      startDate: '2025-07-31',
      endDate: '2025-07-31',
      progress: 0,
      status: 'ON_TRACK',
      assignee: 'Marcus Vance',
      role: 'VP Product',
      avatar: 'MV',
      isMilestone: true,
      dependencies: ['task-1-1-2-2']
    },

    // Program 1.2 (Level 2)
    {
      id: 'prog-1-2',
      parentId: 'port-1',
      level: 2,
      name: 'Omnichannel Commerce & API Hub',
      wbs: '1.2',
      startDate: '2025-04-01',
      endDate: '2025-11-30',
      progress: 55,
      status: 'ON_TRACK',
      assignee: 'Julian Hayes',
      role: 'Head of Integrations',
      avatar: 'JH',
      isMilestone: false,
      dependencies: [],
    },
    // Project 1.2.1 (Level 3)
    {
      id: 'proj-1-2-1',
      parentId: 'prog-1-2',
      level: 3,
      name: 'Real-Time Payment Gateway v2',
      wbs: '1.2.1',
      startDate: '2025-04-01',
      endDate: '2025-08-31',
      progress: 50,
      status: 'DELAYED',
      assignee: 'Nadia Solis',
      role: 'Principal Engineer',
      avatar: 'NS',
      isMilestone: false,
      dependencies: ['proj-1-1-1'],
    },
    {
      id: 'task-1-2-1-1',
      parentId: 'proj-1-2-1',
      level: 4,
      name: 'ISO 20022 Financial Messaging Engine',
      wbs: '1.2.1.1',
      startDate: '2025-04-01',
      endDate: '2025-05-30',
      progress: 75,
      status: 'ON_TRACK',
      assignee: 'Nadia Solis',
      role: 'Principal Engineer',
      avatar: 'NS',
      isMilestone: false,
      dependencies: []
    },
    {
      id: 'task-1-2-1-2',
      parentId: 'proj-1-2-1',
      level: 4,
      name: 'Banking Partner Sandbox Integration',
      wbs: '1.2.1.2',
      startDate: '2025-06-01',
      endDate: '2025-07-25',
      progress: 30,
      status: 'DELAYED',
      assignee: 'Carlos Mendez',
      role: 'QA / Integration',
      avatar: 'CM',
      isMilestone: false,
      dependencies: ['task-1-2-1-1']
    },
    {
      id: 'task-1-2-1-3',
      parentId: 'proj-1-2-1',
      level: 4,
      name: 'Payment Gateway General Availability',
      wbs: '1.2.1.3',
      startDate: '2025-08-31',
      endDate: '2025-08-31',
      progress: 0,
      status: 'ON_TRACK',
      assignee: 'Julian Hayes',
      role: 'Head of Integrations',
      avatar: 'JH',
      isMilestone: true,
      dependencies: ['task-1-2-1-2']
    },

    // --- PORTFOLIO 2 (Level 1) ---
    {
      id: 'port-2',
      parentId: null,
      level: 1,
      name: 'Cloud Modernization & Cyber Resilience',
      wbs: '2.0',
      startDate: '2025-02-01',
      endDate: '2025-12-15',
      progress: 60,
      status: 'ON_TRACK',
      assignee: 'Chief Information Officer',
      role: 'Executive Sponsor',
      avatar: 'CIO',
      isMilestone: false,
      dependencies: [],
    },
    // Program 2.1 (Level 2)
    {
      id: 'prog-2-1',
      parentId: 'port-2',
      level: 2,
      name: 'Hybrid Multi-Cloud Migration',
      wbs: '2.1',
      startDate: '2025-02-01',
      endDate: '2025-09-30',
      progress: 70,
      status: 'ON_TRACK',
      assignee: 'Victor Sterling',
      role: 'Cloud Operations Lead',
      avatar: 'VS',
      isMilestone: false,
      dependencies: [],
    },
    // Project 2.1.1 (Level 3)
    {
      id: 'proj-2-1-1',
      parentId: 'prog-2-1',
      level: 3,
      name: 'Kubernetes Microservices Mesh',
      wbs: '2.1.1',
      startDate: '2025-02-01',
      endDate: '2025-06-30',
      progress: 85,
      status: 'ON_TRACK',
      assignee: 'Rachel Gomez',
      role: 'DevOps Architect',
      avatar: 'RG',
      isMilestone: false,
      dependencies: [],
    },
    {
      id: 'task-2-1-1-1',
      parentId: 'proj-2-1-1',
      level: 4,
      name: 'Terraform Infrastructure-as-Code Setup',
      wbs: '2.1.1.1',
      startDate: '2025-02-01',
      endDate: '2025-03-15',
      progress: 100,
      status: 'COMPLETED',
      assignee: 'Rachel Gomez',
      role: 'DevOps Architect',
      avatar: 'RG',
      isMilestone: false,
      dependencies: []
    },
    {
      id: 'task-2-1-1-2',
      parentId: 'proj-2-1-1',
      level: 4,
      name: 'Service Mesh Istio & Traffic Routing',
      wbs: '2.1.1.2',
      startDate: '2025-03-15',
      endDate: '2025-05-15',
      progress: 80,
      status: 'ON_TRACK',
      assignee: 'DevOps Pod 3',
      role: 'Infrastructure',
      avatar: 'DP',
      isMilestone: false,
      dependencies: ['task-2-1-1-1']
    },
    {
      id: 'task-2-1-1-3',
      parentId: 'proj-2-1-1',
      level: 4,
      name: 'Legacy Monolith Deprecation',
      wbs: '2.1.1.3',
      startDate: '2025-06-30',
      endDate: '2025-06-30',
      progress: 0,
      status: 'ON_TRACK',
      assignee: 'Victor Sterling',
      role: 'Cloud Ops Lead',
      avatar: 'VS',
      isMilestone: true,
      dependencies: ['task-2-1-1-2']
    },

    // Program 2.2 (Level 2)
    {
      id: 'prog-2-2',
      parentId: 'port-2',
      level: 2,
      name: 'Zero Trust Security & Governance',
      wbs: '2.2',
      startDate: '2025-05-01',
      endDate: '2025-12-15',
      progress: 45,
      status: 'ON_TRACK',
      assignee: 'Dmitri Ivanov',
      role: 'CISO / Security Director',
      avatar: 'DI',
      isMilestone: false,
      dependencies: ['prog-2-1'],
    },
    // Project 2.2.1 (Level 3)
    {
      id: 'proj-2-2-1',
      parentId: 'prog-2-2',
      level: 3,
      name: 'Enterprise Identity & Access Governance',
      wbs: '2.2.1',
      startDate: '2025-05-01',
      endDate: '2025-10-15',
      progress: 40,
      status: 'ON_TRACK',
      assignee: 'Hannah Lee',
      role: 'Security Specialist',
      avatar: 'HL',
      isMilestone: false,
      dependencies: [],
    },
    {
      id: 'task-2-2-1-1',
      parentId: 'proj-2-2-1',
      level: 4,
      name: 'Okta SSO & Contextual MFA Policy Rollout',
      wbs: '2.2.1.1',
      startDate: '2025-05-01',
      endDate: '2025-07-15',
      progress: 60,
      status: 'ON_TRACK',
      assignee: 'Hannah Lee',
      role: 'Security Specialist',
      avatar: 'HL',
      isMilestone: false,
      dependencies: []
    },
    {
      id: 'task-2-2-1-2',
      parentId: 'proj-2-2-1',
      level: 4,
      name: 'SOC2 Type II Annual Security Audit',
      wbs: '2.2.1.2',
      startDate: '2025-10-15',
      endDate: '2025-10-15',
      progress: 0,
      status: 'ON_TRACK',
      assignee: 'Dmitri Ivanov',
      role: 'CISO',
      avatar: 'DI',
      isMilestone: true,
      dependencies: ['task-2-2-1-1']
    }
  ];

  INITIAL_DATA.forEach(item => {
    const start = new Date(`${item.startDate}T00:00:00`);
    const end = new Date(`${item.endDate}T00:00:00`);
    const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const levelHours = { 1: 24, 2: 16, 3: 12, 4: 8 };
    item.plannedHours = item.isMilestone ? 8 : Math.max(8, durationDays * (levelHours[item.level] || 8));
  });

  // ==========================================================================
  // Application State
  // ==========================================================================
  let appState = {
    items: JSON.parse(JSON.stringify(INITIAL_DATA)),
    currentTab: 'gantt', // 'gantt' | 'resources'
    zoom: '6M',          // '1M' | '3M' | '6M' | '12M' | 'YEAR'
    collapsedNodes: new Set(),
    activeLevels: new Set([1, 2, 3, 4]),
    statusFilter: 'ALL',
    searchQuery: '',
    showDependencies: true,
    isPresentationMode: false,
    selectedItemId: null,
    changeHistory: [],
    resourceSearchQuery: '',
    resourceStatusFilter: 'ALL'
  };

  const TODAY_DATE = new Date('2025-04-15T00:00:00');

  // DOM Elements Cache
  const el = {
    tabGantt: document.getElementById('tab-gantt'),
    tabResources: document.getElementById('tab-resources'),
    viewGantt: document.getElementById('view-gantt-container'),
    viewResources: document.getElementById('view-resources-container'),
    presentationHeader: document.getElementById('presentation-exec-header'),
    presentationOverviewGrid: document.getElementById('presentation-overview-grid'),
    presStatHealth: document.getElementById('pres-stat-health'),
    presStatMilestones: document.getElementById('pres-stat-milestones'),
    // Gantt elements
    treeBody: document.getElementById('tree-table-body'),
    timelineTierTop: document.getElementById('timeline-tier-top'),
    timelineTierBottom: document.getElementById('timeline-tier-bottom'),
    timelineGridBg: document.getElementById('timeline-grid-bg'),
    timelineBarsContainer: document.getElementById('timeline-bars-container'),
    timelineViewport: document.getElementById('timeline-body-viewport'),
    timelineSvg: document.getElementById('timeline-dependencies-svg'),
    todayMarker: document.getElementById('today-marker-line'),
    todayDateText: document.getElementById('today-date-text'),
    visibleCountBadge: document.getElementById('visible-items-count'),
    currentZoomLabel: document.getElementById('current-zoom-label'),
    dateRangeDisplay: document.getElementById('date-range-display'),
    zoomControlGroup: document.getElementById('zoom-control-group'),
    searchInput: document.getElementById('input-search'),
    clearSearchBtn: document.getElementById('btn-clear-search'),
    statusFilterSelect: document.getElementById('select-status-filter'),
    splitter: document.getElementById('gantt-splitter'),
    treePanel: document.getElementById('gantt-tree-panel'),
    tooltip: document.getElementById('gantt-tooltip'),
    // Resource Tab Table
    resourceTableTbody: document.getElementById('resource-table-tbody'),
    historyList: document.getElementById('change-history-list'),
    historyCount: document.getElementById('history-count'),
    resourceSearchInput: document.getElementById('resource-search-input'),
    resourceStatusFilter: document.getElementById('resource-status-filter'),
    btnResourceAdd: document.getElementById('btn-resource-add'),
    // Modals & Controls
    itemModal: document.getElementById('item-modal'),
    itemForm: document.getElementById('item-form'),
    modalTitle: document.getElementById('modal-title'),
    modalLevelBadge: document.getElementById('modal-level-badge'),
    btnDeleteItem: document.getElementById('btn-delete-item'),
    formProgress: document.getElementById('form-progress'),
    formProgressVal: document.getElementById('form-progress-val'),
    formParentSelect: document.getElementById('form-parent'),
    btnPresentationMode: document.getElementById('btn-presentation-mode'),
    btnExitPresentation: document.getElementById('btn-exit-presentation'),
    presentationExitControl: document.getElementById('presentation-exit-control'),
    btnExportPdf: document.getElementById('btn-export-pdf'),
    printDialog: document.getElementById('print-dialog-overlay'),
    btnTriggerPrint: document.getElementById('btn-trigger-system-print'),
    btnClosePrint: document.getElementById('btn-close-print-preview'),
    btnCancelPrint: document.getElementById('btn-cancel-print')
  };

  // Zoom Scale Ranges
  const ZOOM_RANGES = {
    '1M': {
      label: '1 Month View (Daily)',
      startDate: new Date('2025-04-01T00:00:00'),
      endDate: new Date('2025-04-30T23:59:59'),
      type: 'DAILY'
    },
    '3M': {
      label: '3 Months View (Weekly)',
      startDate: new Date('2025-03-01T00:00:00'),
      endDate: new Date('2025-05-31T23:59:59'),
      type: 'WEEKLY'
    },
    '6M': {
      label: '6 Months Multi-Quarter',
      startDate: new Date('2025-01-01T00:00:00'),
      endDate: new Date('2025-06-30T23:59:59'),
      type: 'MONTHLY'
    },
    '12M': {
      label: '12 Months Annual Roadmap',
      startDate: new Date('2025-01-01T00:00:00'),
      endDate: new Date('2025-12-31T23:59:59'),
      type: 'ANNUAL'
    },
    'YEAR': {
      label: 'Multi-Year Plan (2025-2027)',
      startDate: new Date('2025-01-01T00:00:00'),
      endDate: new Date('2027-06-30T23:59:59'),
      type: 'MULTI_YEAR'
    }
  };

  // ==========================================================================
  // Data Rollup Helpers
  // ==========================================================================
  function formatManhours(value) {
    return `${Math.round(value || 0).toLocaleString()}h`;
  }

  function getPortfolioSummary() {
    const allItems = appState.items;
    const milestoneItems = allItems.filter(item => item.isMilestone);
    const atRiskItems = allItems.filter(item => item.status === 'AT_RISK' || item.status === 'DELAYED');
    const onTrackItems = allItems.filter(item => item.status === 'ON_TRACK' || item.status === 'COMPLETED');
    const totalManhours = allItems.reduce((sum, item) => sum + (item.plannedHours || 0), 0);
    const averageProgress = allItems.length > 0
      ? Math.round(allItems.reduce((sum, item) => sum + (item.progress || 0), 0) / allItems.length)
      : 0;
    const dependencyCount = allItems.reduce((sum, item) => sum + (item.dependencies || []).length, 0);
    const ownerMap = new Map();

    allItems.forEach(item => {
      const owner = item.assignee || 'Unassigned';
      ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
    });

    const topOwners = [...ownerMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    const upcomingMilestones = [...milestoneItems]
      .sort((a, b) => new Date(a.endDate) - new Date(b.endDate))
      .slice(0, 5);

    const statusSummary = {
      onTrack: onTrackItems.length,
      atRisk: atRiskItems.length,
      delayed: allItems.filter(item => item.status === 'DELAYED').length,
      completed: allItems.filter(item => item.status === 'COMPLETED').length
    };

    return {
      totalManhours,
      totalItems: allItems.length,
      plannedItems: allItems.filter(item => item.plannedHours > 0).length,
      averageProgress,
      dependencyCount,
      ownerCount: [...ownerMap.keys()].filter(owner => owner !== 'Unassigned').length,
      milestoneCount: milestoneItems.length,
      completedMilestones: milestoneItems.filter(item => item.status === 'COMPLETED').length,
      healthRate: allItems.length > 0 ? Math.round((onTrackItems.length / allItems.length) * 100) : 100,
      statusSummary,
      topOwners,
      upcomingMilestones,
      risks: atRiskItems.slice(0, 3),
      criticalTasks: allItems.filter(item => item.dependencies && item.dependencies.length > 0).slice(0, 3)
    };
  }

  function renderPresentationOverview() {
    if (!el.presentationOverviewGrid) return;

    const summary = getPortfolioSummary();
    const riskText = summary.risks.length
      ? summary.risks.map(item => item.name).join(' • ')
      : 'No significant delivery risk identified.';

    const milestoneList = summary.upcomingMilestones.length
      ? summary.upcomingMilestones.map(item => `
          <li>
            <span class="pres-mini-bullet"></span>
            <div>
              <strong>${item.name}</strong>
              <small>${formatDisplayDate(item.endDate)} · ${item.assignee || 'Unassigned'} · ${item.progress || 0}% complete</small>
            </div>
            <span class="pres-status-pill status-${item.status.toLowerCase().replace('_', '-')}">${item.status.replace('_', ' ')}</span>
          </li>
        `).join('')
      : '<li class="empty-state">No milestone events in the current window.</li>';

    const ownerList = summary.topOwners.length
      ? summary.topOwners.map(owner => `
          <li>
            <span class="pres-owner-pill">${owner.name.substring(0, 2).toUpperCase()}</span>
            <div>
              <strong>${owner.name}</strong>
              <small>${owner.count} assigned items</small>
            </div>
          </li>
        `).join('')
      : '<li class="empty-state">No active assignee data.</li>';

    const criticalList = summary.criticalTasks.length
      ? summary.criticalTasks.map(item => `
          <li>
            <span class="pres-mini-bullet alert"></span>
            <div>
              <strong>${item.name}</strong>
              <small>${item.dependencies.length} dependency links</small>
            </div>
          </li>
        `).join('')
      : '<li class="empty-state">No critical dependency path requires attention.</li>';

    el.presentationOverviewGrid.innerHTML = `
      <div class="pres-summary-card emphasis">
        <span class="pres-card-label">Portfolio health</span>
        <strong class="pres-card-value">${summary.healthRate}%</strong>
        <p>${summary.statusSummary.onTrack} on track · ${summary.statusSummary.completed} complete · ${summary.statusSummary.atRisk} at risk</p>
      </div>

      <div class="pres-summary-card">
        <span class="pres-card-label">Planned effort</span>
        <strong class="pres-card-value">${formatManhours(summary.totalManhours)}</strong>
        <p>${summary.plannedItems} roadmap items with planned delivery effort</p>
      </div>

      <div class="pres-summary-card">
        <span class="pres-card-label">Critical watchlist</span>
        <strong class="pres-card-value">${summary.statusSummary.delayed}</strong>
        <p>${summary.statusSummary.atRisk} items at risk or delayed · ${summary.dependencyCount} dependency links to monitor</p>
      </div>

      <div class="pres-summary-card">
        <span class="pres-card-label">Roadmap delivery</span>
        <strong class="pres-card-value">${summary.averageProgress}%</strong>
        <p>Average completion across ${summary.totalItems} roadmap items</p>
      </div>

      <div class="pres-summary-card">
        <span class="pres-card-label">Milestone outlook</span>
        <strong class="pres-card-value">${summary.milestoneCount}</strong>
        <p>${summary.completedMilestones} completed · ${summary.milestoneCount - summary.completedMilestones} remaining key milestones</p>
      </div>

      <div class="pres-summary-card">
        <span class="pres-card-label">Delivery assignees</span>
        <strong class="pres-card-value">${summary.ownerCount}</strong>
        <p>Active assignees across ${summary.totalItems} work breakdown items</p>
      </div>

      <div class="pres-summary-card wide">
        <span class="pres-card-label">Key milestones</span>
        <ul class="pres-list">${milestoneList}</ul>
      </div>

      <div class="pres-summary-card wide">
        <span class="pres-card-label">Key risks & blockers</span>
        <ul class="pres-list">${criticalList}</ul>
      </div>

      <div class="pres-summary-card wide">
        <span class="pres-card-label">Lead assignees</span>
        <ul class="pres-list">${ownerList}</ul>
      </div>
    `;

    if (el.presStatHealth) el.presStatHealth.textContent = `${summary.healthRate}%`;
    if (el.presentationHeader && !el.presentationHeader.classList.contains('hidden')) {
      el.presentationHeader.setAttribute('data-status', summary.statusSummary.delayed > 0 ? 'watchlist' : 'healthy');
    }
  }

  function rollupHierarchyData() {
    const itemsMap = new Map();
    appState.items.forEach(it => itemsMap.set(it.id, it));

    const childrenMap = new Map();
    appState.items.forEach(it => {
      if (it.parentId) {
        if (!childrenMap.has(it.parentId)) childrenMap.set(it.parentId, []);
        childrenMap.get(it.parentId).push(it);
      }
    });

    function aggregateNode(nodeId) {
      const children = childrenMap.get(nodeId);
      if (!children || children.length === 0) return;

      children.forEach(c => aggregateNode(c.id));

      const node = itemsMap.get(nodeId);
      if (!node) return;

      let minStart = null;
      let maxEnd = null;
      let totalProgress = 0;

      children.forEach(c => {
        const cStart = new Date(c.startDate).getTime();
        const cEnd = new Date(c.endDate).getTime();
        if (minStart === null || cStart < minStart) minStart = cStart;
        if (maxEnd === null || cEnd > maxEnd) maxEnd = cEnd;
        totalProgress += (c.progress || 0);
      });

      if (minStart && maxEnd) {
        node.startDate = formatDateIso(new Date(minStart));
        node.endDate = formatDateIso(new Date(maxEnd));
        node.progress = Math.round(totalProgress / children.length);
      }
    }

    appState.items.filter(it => it.level === 1).forEach(root => aggregateNode(root.id));
    renderPresentationOverview();
  }

  function getVisibleItems() {
    const isParentCollapsed = (node) => {
      let curr = node;
      while (curr && curr.parentId) {
        if (appState.collapsedNodes.has(curr.parentId)) return true;
        curr = appState.items.find(i => i.id === curr.parentId);
      }
      return false;
    };

    return appState.items.filter(item => {
      if (!appState.activeLevels.has(item.level)) return false;
      if (isParentCollapsed(item)) return false;

      if (appState.statusFilter !== 'ALL' && item.status !== appState.statusFilter) return false;

      if (appState.searchQuery.trim() !== '') {
        const query = appState.searchQuery.toLowerCase();
        const match = item.name.toLowerCase().includes(query) ||
                      (item.assignee && item.assignee.toLowerCase().includes(query)) ||
                      (item.wbs && item.wbs.toLowerCase().includes(query));
        if (!match) return false;
      }

      return true;
    });
  }

  /**
   * Calculates the timeline configuration dynamically to fit the exact viewport width,
   * eliminating the need for horizontal scrolling in the Gantt chart.
   */
  function getTimelineConfig() {
    const raw = ZOOM_RANGES[appState.zoom] || ZOOM_RANGES['6M'];
    const cfg = {
      label: raw.label,
      startDate: new Date(raw.startDate),
      endDate: new Date(formatDateIso(raw.endDate)),
      type: raw.type
    };

    const msPerDay = 1000 * 60 * 60 * 24;
    const totalDays = Math.max(1, Math.round((cfg.endDate.getTime() - cfg.startDate.getTime()) / msPerDay) + 1);

    // Dynamic dayWidth so 100% of the timeline fits the view with zero horizontal scroll
    const viewportWidth = el.timelineViewport ? (el.timelineViewport.clientWidth || 800) : 800;
    cfg.dayWidth = viewportWidth / totalDays;
    cfg.totalDays = totalDays;
    cfg.totalWidthPx = viewportWidth;

    return cfg;
  }

  function dateToPixel(date, config) {
    const d = new Date(date).getTime();
    const start = config.startDate.getTime();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysOffset = (d - start) / msPerDay;
    return daysOffset * config.dayWidth;
  }

  function formatDateIso(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatDisplayDate(dateStr) {
    const d = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}`;
  }

  function getDaysLeft(item) {
    if (item.status === 'COMPLETED' || item.progress >= 100 || getMilestoneStage(item) === 'COMPLETED') {
      return { value: null, label: 'Completed', className: 'days-completed' };
    }

    const endDate = new Date(`${item.endDate}T00:00:00`);
    const today = new Date(`${formatDateIso(TODAY_DATE)}T00:00:00`);
    const value = Math.round((endDate - today) / (1000 * 60 * 60 * 24));

    return {
      value,
      label: value < 0 ? `${Math.abs(value)} days overdue` : `${value} days`,
      className: value < 0 ? 'days-overdue' : value <= 7 ? 'days-soon' : 'days-remaining'
    };
  }

  function renderDaysLeft(item) {
    const daysLeft = getDaysLeft(item);
    return `<span class="days-left ${daysLeft.className}">${daysLeft.label}</span>`;
  }

  function getMilestoneStage(item) {
    if (item.milestoneStage) return item.milestoneStage;
    if (item.status === 'COMPLETED' || item.progress >= 100) return 'COMPLETED';
    if (item.status === 'DELAYED') return 'DELAYED';
    if (item.progress > 0) return 'IN_PROGRESS';
    return 'PLANNED';
  }

  function formatMilestoneStage(stage) {
    return {
      PLANNED: 'Planned',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      DELAYED: 'Delayed'
    }[stage] || 'Planned';
  }

  function renderMilestoneStage(item) {
    const stage = getMilestoneStage(item);
    return `<span class="milestone-stage stage-${stage.toLowerCase().replace('_', '-')}">${formatMilestoneStage(stage)}</span>`;
  }

  // ==========================================================================
  // Render Connected Hierarchy Tree Table (Left Panel)
  // ==========================================================================
  function renderTreeTable(visibleItems) {
    el.treeBody.innerHTML = '';
    el.visibleCountBadge.textContent = `${visibleItems.length} Items`;

    const hasChildrenMap = new Set();
    appState.items.forEach(it => {
      if (it.parentId) hasChildrenMap.add(it.parentId);
    });

    const levelLabels = ['', 'L1 Portfolio', 'L2 Program', 'L3 Project', 'L4 Task'];

    visibleItems.forEach((item) => {
      const row = document.createElement('div');
      row.className = `tree-row lvl-${item.level}-row`;
      row.dataset.id = item.id;
      if (item.id === appState.selectedItemId) row.classList.add('selected');

      const isCollapsed = appState.collapsedNodes.has(item.id);
      const hasChildren = hasChildrenMap.has(item.id);
      const indentPx = (item.level - 1) * 16;

      const statusDotClass = `dot-${item.status.toLowerCase().replace('_', '-')}`;
      const badgeText = item.isMilestone ? '💎 Milestone' : `${item.wbs || `L${item.level}`} ${['Portfolio', 'Program', 'Project', 'Task'][item.level - 1]}`;
      const badgeClass = item.isMilestone ? 'b-lvl-milestone' : `b-lvl-${item.level}`;
      const statusClass = `status-${item.status.toLowerCase().replace('_', '-')}`;

      row.innerHTML = `
        <div class="tree-col-name-compact" style="padding-left: ${indentPx}px">
          ${item.level > 1 ? '<span class="tree-indent-guide">├─</span>' : ''}
          ${hasChildren ? `
            <button class="tree-toggle-btn ${isCollapsed ? 'collapsed' : ''}" data-toggle-id="${item.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
              <i class="fa-solid fa-chevron-down"></i>
            </button>
          ` : `
            <span class="tree-toggle-btn leaf-placeholder"></span>
          `}
          <span class="lvl-badge ${badgeClass}">${badgeText}</span>
          <span class="tree-title-text" title="${item.name}">${item.name}</span>
        </div>
        <div class="tree-row-meta">
          <span class="tree-avatar-pill" title="Assignee: ${item.assignee || 'Unassigned'}">${item.avatar || (item.assignee ? item.assignee.substring(0, 2).toUpperCase() : 'NA')}</span>
          <span class="status-dot-mini ${statusDotClass}" title="Status: ${item.status}"></span>
        </div>
      `;

      // Synchronized Hover & Select
      row.addEventListener('mouseenter', () => {
        highlightRow(item.id, true);
      });

      row.addEventListener('mouseleave', () => {
        highlightRow(item.id, false);
      });

      row.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('.tree-toggle-btn');
        if (toggleBtn && toggleBtn.dataset.toggleId) {
          const tId = toggleBtn.dataset.toggleId;
          if (appState.collapsedNodes.has(tId)) {
            appState.collapsedNodes.delete(tId);
          } else {
            appState.collapsedNodes.add(tId);
          }
          renderGantt();
          return;
        }

        appState.selectedItemId = item.id;
        document.querySelectorAll('.tree-row').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');
      });

      row.addEventListener('dblclick', () => {
        openEditModal(item.id);
      });

      el.treeBody.appendChild(row);
    });
  }

  // Synchronized Row Highlight across Tree & Timeline
  function highlightRow(itemId, isHovered) {
    const treeRow = el.treeBody.querySelector(`.tree-row[data-id="${itemId}"]`);
    const timelineLane = el.timelineBarsContainer.querySelector(`.timeline-row-lane[data-id="${itemId}"]`);

    if (treeRow) treeRow.classList.toggle('highlighted-row', isHovered);
    if (timelineLane) timelineLane.classList.toggle('highlighted-row', isHovered);
  }

  // ==========================================================================
  // Render Timeline Header Scales & High-Visibility Grid (Fit to View)
  // ==========================================================================
  function renderTimelineHeader(config, visibleItems) {
    el.timelineTierTop.innerHTML = '';
    el.timelineTierBottom.innerHTML = '';
    el.timelineGridBg.innerHTML = '';

    if (el.todayMarker) {
      el.todayMarker.style.display = 'none';
    }

    const start = config.startDate;
    const end = config.endDate;
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalWidthPx = config.totalWidthPx;
    const totalHeightPx = Math.max(visibleItems.length * 40, el.timelineViewport.clientHeight || 400);

    el.timelineBarsContainer.style.width = '100%';
    el.timelineBarsContainer.style.minHeight = `${totalHeightPx}px`;
    el.timelineGridBg.style.width = '100%';
    el.timelineGridBg.style.height = `${totalHeightPx}px`;

    // Set SVG size explicitly to fit the container
    el.timelineSvg.setAttribute('width', totalWidthPx);
    el.timelineSvg.setAttribute('height', totalHeightPx);
    el.timelineSvg.style.width = '100%';
    el.timelineSvg.style.height = `${totalHeightPx}px`;
    el.timelineSvg.style.display = appState.showDependencies ? 'block' : 'none';

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let curr = new Date(start);

    // Top tier
    if (config.type === 'DAILY' || config.type === 'WEEKLY') {
      while (curr <= end) {
        const monthStart = new Date(curr.getFullYear(), curr.getMonth(), 1);
        const monthEnd = new Date(curr.getFullYear(), curr.getMonth() + 1, 0, 23, 59, 59);

        const visibleMonthStart = monthStart < start ? start : monthStart;
        const visibleMonthEnd = monthEnd > end ? end : monthEnd;
        const daysInPeriod = ((visibleMonthEnd.getTime() - visibleMonthStart.getTime()) / msPerDay) + 1;
        const cellWidthPct = (daysInPeriod / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = `tier-cell ${config.type === 'MONTHLY' || config.type === 'ANNUAL' ? 'compact-month-header' : ''}`;
        cell.style.width = `${cellWidthPct}%`;
        cell.textContent = `${monthNames[curr.getMonth()]} ${curr.getFullYear()}`;
        el.timelineTierTop.appendChild(cell);

        curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
      }
    } else {
      while (curr <= end) {
        const year = curr.getFullYear();
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31, 23, 59, 59);

        const visibleYearStart = yearStart < start ? start : yearStart;
        const visibleYearEnd = yearEnd > end ? end : yearEnd;
        const daysInYear = ((visibleYearEnd.getTime() - visibleYearStart.getTime()) / msPerDay) + 1;
        const cellWidthPct = (daysInYear / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = 'tier-cell year-header';
        cell.style.width = `${cellWidthPct}%`;
        cell.textContent = `${year}`;
        el.timelineTierTop.appendChild(cell);

        curr = new Date(year + 1, 0, 1);
      }
    }

    // Bottom tier & Grid Columns
    curr = new Date(start);

    if (config.type === 'DAILY') {
      while (curr <= end) {
        const isWeekend = curr.getDay() === 0 || curr.getDay() === 6;
        const isToday = formatDateIso(curr) === formatDateIso(TODAY_DATE);
        const dayPct = (1 / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = `tier-cell ${isWeekend ? 'weekend-header' : ''} ${isToday ? 'current-period' : ''}`;
        cell.style.width = `${dayPct}%`;
        cell.textContent = `${curr.getDate()}`;
        el.timelineTierBottom.appendChild(cell);

        const gridCol = document.createElement('div');
        gridCol.className = `grid-col ${isWeekend ? 'weekend-col' : ''}`;
        gridCol.style.width = `${dayPct}%`;
        el.timelineGridBg.appendChild(gridCol);

        curr.setDate(curr.getDate() + 1);
      }
    } else if (config.type === 'WEEKLY') {
      let weekNum = 1;
      while (curr <= end) {
        const daysLeft = Math.min(7, Math.round((end.getTime() - curr.getTime()) / msPerDay) + 1);
        const weekPct = (daysLeft / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = 'tier-cell compact-month-header';
        cell.style.width = `${weekPct}%`;
        cell.textContent = `W${weekNum}`;
        el.timelineTierBottom.appendChild(cell);

        const gridCol = document.createElement('div');
        gridCol.className = 'grid-col major-col';
        gridCol.style.width = `${weekPct}%`;
        el.timelineGridBg.appendChild(gridCol);

        curr.setDate(curr.getDate() + daysLeft);
        weekNum++;
      }
    } else if (config.type === 'MONTHLY' || config.type === 'ANNUAL') {
      while (curr <= end) {
        const monthStart = new Date(curr.getFullYear(), curr.getMonth(), 1);
        const monthEnd = new Date(curr.getFullYear(), curr.getMonth() + 1, 0, 23, 59, 59);

        const visibleStart = monthStart < start ? start : monthStart;
        const visibleEnd = monthEnd > end ? end : monthEnd;
        const daysInMonth = ((visibleEnd.getTime() - visibleStart.getTime()) / msPerDay) + 1;
        const monthPct = (daysInMonth / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = 'tier-cell';
        cell.style.width = `${monthPct}%`;
        cell.textContent = monthNames[curr.getMonth()];
        el.timelineTierBottom.appendChild(cell);

        const gridCol = document.createElement('div');
        gridCol.className = 'grid-col major-col';
        gridCol.style.width = `${monthPct}%`;
        el.timelineGridBg.appendChild(gridCol);

        curr = new Date(curr.getFullYear(), curr.getMonth() + 1, 1);
      }
    } else if (config.type === 'MULTI_YEAR') {
      while (curr <= end) {
        const q = Math.floor(curr.getMonth() / 3) + 1;
        const qStart = new Date(curr.getFullYear(), (q - 1) * 3, 1);
        const qEnd = new Date(curr.getFullYear(), q * 3, 0, 23, 59, 59);

        const visibleStart = qStart < start ? start : qStart;
        const visibleEnd = qEnd > end ? end : qEnd;
        const daysInQ = ((visibleEnd.getTime() - visibleStart.getTime()) / msPerDay) + 1;
        const qPct = (daysInQ / config.totalDays) * 100;

        const cell = document.createElement('div');
        cell.className = 'tier-cell';
        cell.style.width = `${qPct}%`;
        cell.textContent = `Q${q} '${String(curr.getFullYear()).slice(-2)}`;
        el.timelineTierBottom.appendChild(cell);

        const gridCol = document.createElement('div');
        gridCol.className = 'grid-col major-col';
        gridCol.style.width = `${qPct}%`;
        el.timelineGridBg.appendChild(gridCol);

        curr = new Date(curr.getFullYear(), q * 3, 1);
      }
    }

    // Unbroken Today Marker Calculation
    if (el.todayMarker) {
      const todayOffset = dateToPixel(TODAY_DATE, config);
      const isTodayVisible = TODAY_DATE >= start && TODAY_DATE <= end;
      el.todayMarker.style.left = `${todayOffset}px`;
      el.todayMarker.style.display = isTodayVisible ? 'block' : 'none';
      el.todayMarker.style.height = `${totalHeightPx}px`;
      el.todayMarker.innerHTML = '<span class="today-marker-label">Today · Apr 15</span>';
    }
  }

  // ==========================================================================
  // Render Gantt Bars & Dependency SVG Links
  // ==========================================================================
  function renderGanttBars(visibleItems, config) {
    el.timelineBarsContainer.innerHTML = '';
    el.timelineSvg.innerHTML = `
      <defs>
        <marker id="arrowhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" fill="#2563eb" />
        </marker>
        <marker id="arrowhead-crit" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 9 3.5, 0 7" fill="#dc2626" />
        </marker>
      </defs>
    `;

    const rowPositions = new Map();
    const ROW_HEIGHT = 40;

    visibleItems.forEach((item, rowIndex) => {
      const lane = document.createElement('div');
      lane.className = 'timeline-row-lane';
      lane.dataset.id = item.id;
      const statusClass = `status-${item.status.toLowerCase().replace('_', '-')}`;

      const startPx = Math.max(0, dateToPixel(item.startDate, config));
      const endPx = Math.min(config.totalWidthPx, dateToPixel(item.endDate, config));
      const widthPx = Math.max(endPx - startPx, 8);
      const yCenter = (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);

      lane.addEventListener('mouseenter', () => highlightRow(item.id, true));
      lane.addEventListener('mouseleave', () => highlightRow(item.id, false));

      if (item.isMilestone) {
        // Milestone Diamond: clean diamond marker without text across canvas
        rowPositions.set(item.id, {
          yCenter: yCenter,
          xStart: startPx - 10,
          xEnd: startPx + 10,
          item: item
        });

        const marker = document.createElement('div');
        marker.className = 'gantt-milestone-marker';
        marker.style.left = `${startPx - 10}px`;
        marker.style.top = `10px`;

        attachTooltip(marker, item);
        lane.appendChild(marker);
      } else {
        rowPositions.set(item.id, {
          yCenter: yCenter,
          xStart: startPx,
          xEnd: startPx + widthPx,
          item: item
        });

        if (item.level === 1 || item.level === 2) {
          // Parent Summary Rollup Bar with downward bracket endcaps
          const bar = document.createElement('div');
          bar.className = `gantt-bar-item bar-summary ${item.level === 2 ? 'lvl-2-summary' : ''} ${statusClass}`;
          bar.style.left = `${startPx}px`;
          bar.style.width = `${widthPx}px`;

          attachTooltip(bar, item);
          lane.appendChild(bar);
        } else {
          // Level 3 & 4 Task Bar
          const bar = document.createElement('div');
          bar.className = `gantt-bar-item bar-lvl-${item.level} ${statusClass}`;
          bar.style.left = `${startPx}px`;
          bar.style.width = `${widthPx}px`;

          if (item.progress > 0) {
            const fill = document.createElement('div');
            fill.className = 'bar-progress-fill';
            fill.style.width = `${item.progress}%`;
            bar.appendChild(fill);
          }

          const label = document.createElement('span');
          label.className = 'bar-label-text';
          label.textContent = item.name;
          bar.appendChild(label);

          attachTooltip(bar, item);
          lane.appendChild(bar);
        }
      }

      lane.addEventListener('dblclick', () => {
        openEditModal(item.id);
      });

      el.timelineBarsContainer.appendChild(lane);
    });

    // Update full height for Today line and Grid container
    const totalHeight = Math.max(visibleItems.length * ROW_HEIGHT, el.timelineViewport.clientHeight || 400);
    el.todayMarker.style.height = `${totalHeight}px`;
    el.timelineGridBg.style.height = `${totalHeight}px`;
    el.timelineSvg.setAttribute('height', totalHeight);
    el.timelineSvg.style.height = `${totalHeight}px`;

    // Draw SVG Dependencies
    if (appState.showDependencies) {
      visibleItems.forEach(item => {
        if (item.dependencies && item.dependencies.length > 0) {
          const targetPos = rowPositions.get(item.id);
          if (!targetPos) return;

          item.dependencies.forEach(predId => {
            const srcPos = rowPositions.get(predId);
            if (!srcPos) return;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const isDelayed = item.status === 'DELAYED' || srcPos.item.status === 'DELAYED';
            path.setAttribute('class', `dep-link-line ${isDelayed ? 'crit-path' : ''}`);
            path.setAttribute('marker-end', isDelayed ? 'url(#arrowhead-crit)' : 'url(#arrowhead)');

            const x1 = srcPos.xEnd;
            const y1 = srcPos.yCenter;
            const x2 = targetPos.xStart;
            const y2 = targetPos.yCenter;

            let d;
            if (x2 >= x1 + 8) {
              const dx = (x2 - x1) / 2;
              d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            } else {
              // Backward or overlapping link: curved detour
              const detourX = Math.max(x1 + 16, x1 + 12);
              const detourX2 = x2 - 16;
              const midY = y1 + (y2 - y1) / 2;
              d = `M ${x1} ${y1} C ${detourX} ${y1}, ${detourX} ${midY}, ${(x1 + x2) / 2} ${midY} C ${detourX2} ${midY}, ${detourX2} ${y2}, ${x2} ${y2}`;
            }
            path.setAttribute('d', d);

            el.timelineSvg.appendChild(path);
          });
        }
      });
    }
  }

  // ==========================================================================
  // Render Work Breakdown & Resources Table
  // ==========================================================================
  function renderChangeHistory() {
    if (!el.historyList || !el.historyCount) return;

    const entries = appState.changeHistory;
    el.historyCount.textContent = `${entries.length} change${entries.length === 1 ? '' : 's'}`;
    el.historyList.innerHTML = entries.length
      ? entries.map(entry => `
          <article class="history-entry history-${entry.type}">
            <span class="history-icon"><i class="fa-solid ${entry.type === 'delete' ? 'fa-trash-can' : entry.type === 'add' ? 'fa-plus' : 'fa-pen'}"></i></span>
            <div class="history-entry-content">
              <strong>${entry.action}</strong>
              <span>${entry.details}</span>
            </div>
            <time>${entry.time}</time>
          </article>
        `).join('')
      : '<p class="history-empty">No changes yet. Edit a roadmap item to start the audit trail.</p>';
  }

  function renderResourcesTable() {
    el.resourceTableTbody.innerHTML = '';

    const query = appState.resourceSearchQuery.trim().toLowerCase();
    const filteredItems = appState.items.filter(item => {
      if (appState.resourceStatusFilter !== 'ALL' && item.status !== appState.resourceStatusFilter) return false;
      if (!query) return true;

      return [item.name, item.assignee, item.role, item.wbs]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query));
    });

    filteredItems.forEach(item => {
      const tr = document.createElement('tr');

      const indentPx = (item.level - 1) * 16;
      const statusClass = `status-${item.status.toLowerCase().replace('_', '-')}`;
      const statusLabel = item.status.replace('_', ' ');

      tr.innerHTML = `
        <td>
          <div class="res-name-cell" style="padding-left: ${indentPx}px">
            <span class="lvl-badge b-lvl-${item.level}">L${item.level}</span>
            ${item.isMilestone ? '<i class="fa-solid fa-diamond" style="color:var(--color-milestone); font-size:0.7rem;"></i>' : ''}
            <strong>${item.name}</strong>
          </div>
        </td>
        <td>
          <div class="res-owner-cell">
            <span class="avatar-pill">${item.avatar || (item.assignee ? item.assignee.substring(0, 2).toUpperCase() : 'NA')}</span>
            <span>${item.assignee || 'Unassigned'}</span>
          </div>
        </td>
        <td><span style="color:var(--text-muted); font-weight:500;">${item.role || '—'}</span></td>
        <td><span style="font-family:var(--font-mono); font-size:0.75rem;">${item.startDate} &rarr; ${item.endDate}</span></td>
        <td><strong class="manhours-value">${formatManhours(item.plannedHours)}</strong></td>
        <td>${item.isMilestone ? renderMilestoneStage(item) : `
          <div class="res-progress-wrap">
            <div class="res-progress-bar">
              <div class="res-progress-fill ${statusClass}" style="width: ${item.progress}%"></div>
            </div>
            <span style="font-weight:700; font-size:0.75rem; width:28px;">${item.progress}%</span>
          </div>
        `}</td>
        <td>${renderDaysLeft(item)}</td>
        <td><span class="status-badge-chip ${statusClass}">${statusLabel}</span></td>
        <td style="text-align:center;">
          <button class="table-action-btn" data-edit-id="${item.id}" title="Edit Item"><i class="fa-solid fa-pen-to-square"></i></button>
        </td>
      `;

      tr.querySelector('.table-action-btn').addEventListener('click', () => {
        openEditModal(item.id);
      });

      el.resourceTableTbody.appendChild(tr);
    });

    if (filteredItems.length === 0) {
      el.resourceTableTbody.innerHTML = '<tr><td class="resource-empty-state" colspan="9">No matching roadmap items.</td></tr>';
    }

    renderChangeHistory();
  }

  // ==========================================================================
  // Tooltip Helper
  // ==========================================================================
  function attachTooltip(element, item) {
    element.addEventListener('mouseenter', () => {
      const levelLabels = ['', 'Portfolio (L1)', 'Program (L2)', 'Project (L3)', 'Deliverable (L4)'];
      const statusLabels = {
        'ON_TRACK': '🟢 On Track',
        'AT_RISK': '🟡 At Risk',
        'DELAYED': '🔴 Delayed',
        'COMPLETED': '🔵 Completed'
      };

      const daysDuration = Math.round((new Date(item.endDate) - new Date(item.startDate)) / (1000 * 60 * 60 * 24)) + 1;

      el.tooltip.innerHTML = `
        <div class="tooltip-header">${item.name}</div>
        <div class="tooltip-row"><span>Type:</span> <span class="tooltip-val">${item.isMilestone ? '💎 Milestone' : levelLabels[item.level]}</span></div>
        <div class="tooltip-row"><span>Assignee:</span> <span class="tooltip-val">${item.assignee || 'Unassigned'}</span></div>
        <div class="tooltip-row"><span>Schedule:</span> <span class="tooltip-val">${item.startDate} &rarr; ${item.endDate} (${daysDuration}d)</span></div>
        <div class="tooltip-row"><span>Status:</span> <span class="tooltip-val">${statusLabels[item.status] || item.status}</span></div>
        <div class="tooltip-row"><span>${item.isMilestone ? 'Stage:' : 'Progress:'}</span> <span class="tooltip-val">${item.isMilestone ? formatMilestoneStage(getMilestoneStage(item)) : `${item.progress}%`}</span></div>
        <div class="tooltip-row"><span>Planned time:</span> <span class="tooltip-val">${formatManhours(item.plannedHours)}</span></div>
        <div class="tooltip-row"><span>Days left:</span> <span class="tooltip-val">${getDaysLeft(item).label}</span></div>
        ${item.dependencies && item.dependencies.length > 0 ? `<div class="tooltip-row"><span>Dependencies:</span> <span class="tooltip-val">${item.dependencies.join(', ')}</span></div>` : ''}
      `;
      el.tooltip.classList.remove('hidden');
    });

    element.addEventListener('mousemove', (e) => {
      const x = e.clientX + 14;
      const y = e.clientY + 14;
      el.tooltip.style.left = `${Math.min(x, window.innerWidth - 320)}px`;
      el.tooltip.style.top = `${Math.min(y, window.innerHeight - 180)}px`;
    });

    element.addEventListener('mouseleave', () => {
      el.tooltip.classList.add('hidden');
    });
  }

  // ==========================================================================
  // Master Render Cycle
  // ==========================================================================
  function renderGantt() {
    rollupHierarchyData();

    if (appState.isPresentationMode) {
      // In presentation mode, render both Gantt and Resources
      const config = getTimelineConfig();
      const visibleItems = getVisibleItems();
      el.currentZoomLabel.textContent = `Zoom: ${config.label}`;
      el.dateRangeDisplay.textContent = `${formatDateIso(config.startDate)} – ${formatDateIso(config.endDate)}`;
      renderTreeTable(visibleItems);
      renderTimelineHeader(config, visibleItems);
      renderGanttBars(visibleItems, config);
      renderResourcesTable();
      return;
    }

    if (appState.currentTab === 'resources') {
      renderResourcesTable();
      return;
    }

    const config = getTimelineConfig();
    const visibleItems = getVisibleItems();

    el.currentZoomLabel.textContent = `Zoom: ${config.label}`;
    el.dateRangeDisplay.textContent = `${formatDateIso(config.startDate)} – ${formatDateIso(config.endDate)}`;

    renderTreeTable(visibleItems);
    renderTimelineHeader(config, visibleItems);
    renderGanttBars(visibleItems, config);
  }

  // ==========================================================================
  // Navigation Tabs Handlers
  // ==========================================================================
  function setupTabs() {
    el.tabGantt.addEventListener('click', () => {
      if (appState.isPresentationMode) return;
      appState.currentTab = 'gantt';
      el.tabGantt.classList.add('active');
      el.tabResources.classList.remove('active');
      el.viewGantt.classList.add('active-view');
      el.viewResources.classList.remove('active-view');
      renderGantt();
    });

    el.tabResources.addEventListener('click', () => {
      if (appState.isPresentationMode) return;
      appState.currentTab = 'resources';
      el.tabResources.classList.add('active');
      el.tabGantt.classList.remove('active');
      el.viewResources.classList.add('active-view');
      el.viewGantt.classList.remove('active-view');
      renderResourcesTable();
    });

    if (el.btnResourceAdd) {
      el.btnResourceAdd.addEventListener('click', openAddModal);
    }

    el.resourceSearchInput.addEventListener('input', (event) => {
      appState.resourceSearchQuery = event.target.value;
      renderResourcesTable();
    });

    el.resourceStatusFilter.addEventListener('change', (event) => {
      appState.resourceStatusFilter = event.target.value;
      renderResourcesTable();
    });
  }

  // ==========================================================================
  // Synchronized Vertical Scroll & Splitter
  // ==========================================================================
  function setupScrollAndSplitter() {
    let isSyncingLeft = false;
    let isSyncingRight = false;

    el.treeBody.addEventListener('scroll', () => {
      if (!isSyncingLeft) {
        isSyncingRight = true;
        el.timelineViewport.scrollTop = el.treeBody.scrollTop;
      }
      isSyncingLeft = false;
    });

    el.timelineViewport.addEventListener('scroll', () => {
      if (!isSyncingRight) {
        isSyncingLeft = true;
        el.treeBody.scrollTop = el.timelineViewport.scrollTop;
      }
      isSyncingRight = false;
    });

    let isDragging = false;
    el.splitter.addEventListener('mousedown', () => {
      isDragging = true;
      el.splitter.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const newWidth = Math.max(260, Math.min(e.clientX, window.innerWidth - 380));
      el.treePanel.style.width = `${newWidth}px`;
      renderGantt();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        el.splitter.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        renderGantt();
      }
    });

    // Window Resize Handler (Recalibrates Fit-to-View Scale automatically)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderGantt();
      }, 80);
    });
  }

  // ==========================================================================
  // Toolbar Controls Setup
  // ==========================================================================
  function setupToolbarControls() {
    el.zoomControlGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.zoom-btn');
      if (!btn || !btn.dataset.zoom) return;

      document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      appState.zoom = btn.dataset.zoom;
      renderGantt();
    });

    const jumpTodayBtn = document.getElementById('btn-jump-today');
    if (jumpTodayBtn) {
      jumpTodayBtn.addEventListener('click', () => {
        if (el.todayMarker) {
          el.todayMarker.style.boxShadow = '0 0 14px rgba(220, 38, 38, 0.8)';
          setTimeout(() => {
            el.todayMarker.style.boxShadow = 'none';
          }, 1200);
        }
      });
    }

    const depBtn = document.getElementById('btn-toggle-dependencies');
    depBtn.addEventListener('click', () => {
      appState.showDependencies = !appState.showDependencies;
      depBtn.classList.toggle('active', appState.showDependencies);
      renderGantt();
    });

    document.querySelectorAll('.level-pill-badge').forEach(badge => {
      badge.addEventListener('click', () => {
        const lvl = parseInt(badge.dataset.filterLevel, 10);
        if (appState.activeLevels.has(lvl)) {
          if (appState.activeLevels.size > 1) {
            appState.activeLevels.delete(lvl);
            badge.classList.remove('active');
          }
        } else {
          appState.activeLevels.add(lvl);
          badge.classList.add('active');
        }
        renderGantt();
      });
    });

    el.statusFilterSelect.addEventListener('change', (e) => {
      appState.statusFilter = e.target.value;
      renderGantt();
    });

    el.searchInput.addEventListener('input', (e) => {
      appState.searchQuery = e.target.value;
      el.clearSearchBtn.classList.toggle('hidden', e.target.value === '');
      renderGantt();
    });

    el.clearSearchBtn.addEventListener('click', () => {
      el.searchInput.value = '';
      appState.searchQuery = '';
      el.clearSearchBtn.classList.add('hidden');
      renderGantt();
    });
  }

  // ==========================================================================
  // Executive Presentation Mode & PDF Handlers
  // ==========================================================================
  function setupPresentationAndPDF() {
    function togglePresentation() {
      appState.isPresentationMode = !appState.isPresentationMode;
      document.body.classList.toggle('presentation-mode', appState.isPresentationMode);
      el.presentationExitControl.classList.toggle('hidden', !appState.isPresentationMode);
      el.presentationHeader.classList.toggle('hidden', !appState.isPresentationMode);

      if (appState.isPresentationMode) {
        // Expand all for executive presentation
        appState.collapsedNodes.clear();
      }

      if (appState.isPresentationMode && document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!appState.isPresentationMode && document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      renderGantt();
    }

    el.btnPresentationMode.addEventListener('click', togglePresentation);
    el.btnExitPresentation.addEventListener('click', togglePresentation);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && appState.isPresentationMode) {
        togglePresentation();
      }
    });

    // PDF Dialog
    el.btnExportPdf.addEventListener('click', () => {
      el.printDialog.classList.remove('hidden');
    });

    el.btnClosePrint.addEventListener('click', () => el.printDialog.classList.add('hidden'));
    el.btnCancelPrint.addEventListener('click', () => el.printDialog.classList.add('hidden'));

    el.btnTriggerPrint.addEventListener('click', () => {
      el.printDialog.classList.add('hidden');
      appState.collapsedNodes.clear();
      renderGantt();
      setTimeout(() => { window.print(); }, 250);
    });
  }

  // ==========================================================================
  // Item Modal Handlers
  // ==========================================================================
  function populateParentDropdown(selectedParentId, excludeId) {
    el.formParentSelect.innerHTML = '<option value="">None (Top Level Root)</option>';
    appState.items.forEach(it => {
      if (it.id === excludeId || it.level === 4) return;
      const opt = document.createElement('option');
      opt.value = it.id;
      opt.textContent = `${'—'.repeat(it.level - 1)} [L${it.level}] ${it.name}`;
      if (it.id === selectedParentId) opt.selected = true;
      el.formParentSelect.appendChild(opt);
    });
  }

  function recordChange(type, action, details) {
    appState.changeHistory.unshift({
      type,
      action,
      details,
      time: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    });
    appState.changeHistory = appState.changeHistory.slice(0, 30);
  }

  function openEditModal(itemId) {
    const item = appState.items.find(i => i.id === itemId);
    if (!item) return;

    el.modalTitle.textContent = `Edit: ${item.name}`;
    el.modalLevelBadge.textContent = `LEVEL ${item.level}: ${['PORTFOLIO', 'PROGRAM', 'PROJECT', 'TASK'][item.level - 1]}`;
    document.getElementById('modal-item-id').value = item.id;
    document.getElementById('form-name').value = item.name;
    document.getElementById('form-level').value = item.level;
    document.getElementById('form-start-date').value = item.startDate;
    document.getElementById('form-end-date').value = item.endDate;
    document.getElementById('form-assignee').value = item.assignee || '';
    document.getElementById('form-status').value = item.status || 'ON_TRACK';
    el.formProgress.value = item.progress || 0;
    el.formProgressVal.textContent = item.progress || 0;
    document.getElementById('form-is-milestone').checked = !!item.isMilestone;
    document.getElementById('form-milestone-stage').value = getMilestoneStage(item);
    document.getElementById('milestone-stage-group').classList.toggle('hidden', !item.isMilestone);
    document.getElementById('form-progress').closest('.form-group').classList.toggle('hidden', item.isMilestone);
    document.getElementById('form-planned-hours').value = item.plannedHours || 0;
    document.getElementById('form-dependencies').value = (item.dependencies || []).join(', ');

    populateParentDropdown(item.parentId, item.id);
    el.btnDeleteItem.classList.remove('hidden');
    el.itemModal.classList.remove('hidden');
  }

  function openAddModal() {
    el.modalTitle.textContent = 'Add Roadmap Item';
    el.modalLevelBadge.textContent = 'NEW ITEM';
    document.getElementById('modal-item-id').value = '';
    document.getElementById('form-name').value = '';
    document.getElementById('form-level').value = '4';
    document.getElementById('form-start-date').value = '2025-04-01';
    document.getElementById('form-end-date').value = '2025-05-30';
    document.getElementById('form-assignee').value = '';
    document.getElementById('form-status').value = 'ON_TRACK';
    el.formProgress.value = 0;
    el.formProgressVal.textContent = '0';
    document.getElementById('form-is-milestone').checked = false;
    document.getElementById('form-milestone-stage').value = 'PLANNED';
    document.getElementById('milestone-stage-group').classList.add('hidden');
    document.getElementById('form-progress').closest('.form-group').classList.remove('hidden');
    document.getElementById('form-planned-hours').value = '40';
    document.getElementById('form-dependencies').value = '';

    populateParentDropdown(null, null);
    el.btnDeleteItem.classList.add('hidden');
    el.itemModal.classList.remove('hidden');
  }

  function setupModalEvents() {
    document.getElementById('btn-open-add-modal').addEventListener('click', openAddModal);

    document.getElementById('btn-close-modal').addEventListener('click', () => el.itemModal.classList.add('hidden'));
    document.getElementById('btn-cancel-modal').addEventListener('click', () => el.itemModal.classList.add('hidden'));

    el.formProgress.addEventListener('input', (e) => {
      el.formProgressVal.textContent = e.target.value;
    });

    document.getElementById('form-is-milestone').addEventListener('change', (e) => {
      document.getElementById('milestone-stage-group').classList.toggle('hidden', !e.target.checked);
      el.formProgress.closest('.form-group').classList.toggle('hidden', e.target.checked);
    });

    el.itemForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const itemId = document.getElementById('modal-item-id').value;
      const name = document.getElementById('form-name').value;
      const level = parseInt(document.getElementById('form-level').value, 10);
      const parentId = document.getElementById('form-parent').value || null;
      const startDate = document.getElementById('form-start-date').value;
      const endDate = document.getElementById('form-end-date').value;
      const assignee = document.getElementById('form-assignee').value;
      const status = document.getElementById('form-status').value;
      const progress = parseInt(el.formProgress.value, 10);
      const isMilestone = document.getElementById('form-is-milestone').checked;
      const milestoneStage = document.getElementById('form-milestone-stage').value;
      const plannedHours = Math.max(0, parseInt(document.getElementById('form-planned-hours').value, 10) || 0);
      const rawDeps = document.getElementById('form-dependencies').value;
      const dependencies = rawDeps ? rawDeps.split(',').map(s => s.trim()).filter(Boolean) : [];

      if (itemId) {
        const item = appState.items.find(i => i.id === itemId);
        if (item) {
          const previousName = item.name;
          const previousStart = item.startDate;
          const previousEnd = item.endDate;
          item.name = name;
          item.level = level;
          item.parentId = parentId;
          item.startDate = startDate;
          item.endDate = endDate;
          item.assignee = assignee;
          item.status = status;
          item.progress = progress;
          item.isMilestone = isMilestone;
          item.milestoneStage = isMilestone ? milestoneStage : null;
          item.plannedHours = plannedHours;
          item.dependencies = dependencies;
          const scheduleChanged = previousStart !== startDate || previousEnd !== endDate;
          const changeLabel = scheduleChanged ? 'Schedule updated' : 'Roadmap item updated';
          const nameLabel = previousName !== name ? `${previousName} -> ${name}` : name;
          recordChange('edit', changeLabel, `${nameLabel}${scheduleChanged ? ` (${startDate} -> ${endDate})` : ''}`);
        }
      } else {
        const newId = `item-${Date.now()}`;
        appState.items.push({
          id: newId,
          parentId: parentId,
          level: level,
          name: name,
          wbs: `${level}.0`,
          startDate: startDate,
          endDate: endDate,
          progress: progress,
          status: status,
          assignee: assignee,
          role: 'Contributor',
          avatar: assignee ? assignee.substring(0, 2).toUpperCase() : 'NW',
          isMilestone: isMilestone,
          milestoneStage: isMilestone ? milestoneStage : null,
          plannedHours: plannedHours,
          dependencies: dependencies
        });
        recordChange('add', 'Roadmap item added', `${name} (${formatManhours(plannedHours)} planned)`);
      }

      el.itemModal.classList.add('hidden');
      renderGantt();
      if (appState.currentTab === 'resources' || appState.isPresentationMode) renderResourcesTable();
    });

    el.btnDeleteItem.addEventListener('click', () => {
      const itemId = document.getElementById('modal-item-id').value;
      if (itemId && confirm('Are you sure you want to delete this item?')) {
        const toDelete = new Set([itemId]);
        let changed = true;
        while (changed) {
          changed = false;
          appState.items.forEach(it => {
            if (it.parentId && toDelete.has(it.parentId) && !toDelete.has(it.id)) {
              toDelete.add(it.id);
              changed = true;
            }
          });
        }

        appState.items = appState.items.filter(it => !toDelete.has(it.id));
        recordChange('delete', 'Roadmap item deleted', `${toDelete.size} item${toDelete.size === 1 ? '' : 's'} removed from the Gantt map`);
        el.itemModal.classList.add('hidden');
        renderGantt();
        if (appState.currentTab === 'resources' || appState.isPresentationMode) renderResourcesTable();
      }
    });
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    setupTabs();
    setupScrollAndSplitter();
    setupToolbarControls();
    setupPresentationAndPDF();
    setupModalEvents();

    renderGantt();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();

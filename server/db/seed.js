import { getDatabase } from './database.js';
import { logChange } from '../services/audit.js';

const CURRENT_YEAR = new Date().getFullYear();

function d(monthOffset, day) {
  // Returns YYYY-MM-DD relative to CURRENT_YEAR
  const month = Math.max(1, Math.min(12, monthOffset));
  const maxDay = new Date(CURRENT_YEAR, month, 0).getDate();
  const safeDay = Math.min(day, maxDay);
  return `${CURRENT_YEAR}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

export function seedDatabase(db = getDatabase()) {
  db.exec('PRAGMA foreign_keys = OFF;');

  // Clean existing tables
  const tables = [
    'decision_log',
    'assignments',
    'dependencies',
    'capacity_records',
    'work_items',
    'phases',
    'projects',
    'people',
    'teams',
    'tribes',
    'domains',
    'change_history'
  ];

  tables.forEach((t) => {
    try { db.exec(`DELETE FROM ${t};`); } catch(e) { /* table may not exist yet */ }
  });

  // Ensure decision_log table exists
  db.exec(`CREATE TABLE IF NOT EXISTS decision_log (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    project_id TEXT,
    date TEXT NOT NULL,
    person_id TEXT,
    decision_summary TEXT,
    impact_status TEXT DEFAULT 'NEUTRAL',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL
  );`);

  db.exec('PRAGMA foreign_keys = ON;');

  // 1. Domains
  const insertDomain = db.prepare(`
    INSERT INTO domains (id, name, code, description)
    VALUES (?, ?, ?, ?)
  `);

  const domainsData = [
    ['dom-1', 'Digital Banking & Channels', 'DBC', 'Omnichannel customer touchpoints, web portals, mobile banking apps, and self-service experiences.'],
    ['dom-2', 'Core Banking & Cloud Platform', 'CBCP', 'Mission-critical core ledgers, real-time payments engine, cloud infrastructure, and partner API integrations.'],
    ['dom-3', 'Security, Risk & Compliance', 'SRC', 'Zero Trust identity, biometric security, AML transaction monitoring, fraud detection, and regulatory governance.']
  ];
  domainsData.forEach((row) => insertDomain.run(...row));

  // 2. Tribes
  const insertTribe = db.prepare(`
    INSERT INTO tribes (id, domain_id, name, code, lead_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tribesData = [
    ['trb-1-1', 'dom-1', 'Customer Experience Tribe', 'CX-TRB', 'Marcus Vance'],
    ['trb-1-2', 'dom-1', 'Open Banking & Partner APIs Tribe', 'API-TRB', 'Elena Rostova'],
    ['trb-2-1', 'dom-2', 'NextGen Cloud Infrastructure Tribe', 'CLOUD-TRB', 'Sophia Lin'],
    ['trb-2-2', 'dom-2', 'Payments Modernization Tribe', 'PAY-TRB', 'David Sterling'],
    ['trb-3-1', 'dom-3', 'Cyber Defense & Identity Tribe', 'SEC-TRB', 'Vikram Patel'],
    ['trb-3-2', 'dom-3', 'Regulatory & AML Compliance Tribe', 'REG-TRB', 'Rachel Green']
  ];
  tribesData.forEach((row) => insertTribe.run(...row));

  // 3. Teams
  const insertTeam = db.prepare(`
    INSERT INTO teams (id, tribe_id, name, code, focus_area)
    VALUES (?, ?, ?, ?, ?)
  `);

  const teamsData = [
    ['team-1-1-1', 'trb-1-1', 'Mobile Core Squad', 'MOB-SQD', 'Flutter, Native iOS/Android, and Mobile UI/UX'],
    ['team-1-1-2', 'trb-1-1', 'Web Experience Squad', 'WEB-SQD', 'React 19, Design System, and Executive Portals'],
    ['team-1-2-1', 'trb-1-2', 'API Gateway Squad', 'GW-SQD', 'OAuth2, Rate Limiting, Open Banking specs'],
    ['team-2-1-1', 'trb-2-1', 'Cloud & DevOps Squad', 'OPS-SQD', 'AWS/Azure Landing Zones, Terraform & K8s'],
    ['team-2-2-1', 'trb-2-2', 'Real-Time Payments Squad', 'RTP-SQD', 'ISO 20022, FedNow & High-speed Settlement'],
    ['team-3-1-1', 'trb-3-1', 'Identity & Biometrics Squad', 'BIO-SQD', 'FIDO2, Biometric Enclaves & Passkeys'],
    ['team-3-2-1', 'trb-3-2', 'Fraud & AML Analytics Squad', 'AML-SQD', 'Real-time ML scoring & Anomaly Detection']
  ];
  teamsData.forEach((row) => insertTeam.run(...row));

  // 4. People
  const insertPerson = db.prepare(`
  INSERT INTO people (id, team_id, name, email, role, avatar_initials, default_weekly_hours)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const peopleData = [
    ['pers-1', 'team-1-1-1', 'Marcus Vance', 'marcus.vance@bank.com', 'VP Product & Channels', 'MV', 40],
    ['pers-2', 'team-1-1-1', 'Liam Chen', 'liam.chen@bank.com', 'Principal UI/UX Designer', 'LC', 40],
    ['pers-3', 'team-1-1-1', 'Elena Rostova', 'elena.rostova@bank.com', 'Chief Architect', 'ER', 40],
    ['pers-4', 'team-1-1-1', 'Sara Connor', 'sara.connor@bank.com', 'Senior Mobile Engineer', 'SC', 40],
    ['pers-5', 'team-1-1-2', 'Maya Lin', 'maya.lin@bank.com', 'Lead Frontend Engineer', 'ML', 40],
    ['pers-6', 'team-1-1-2', 'Alex Mercer', 'alex.mercer@bank.com', 'Fullstack React Engineer', 'AM', 40],
    ['pers-7', 'team-1-2-1', 'Kavita Rao', 'kavita.rao@bank.com', 'API Platform Lead', 'KR', 40],
    ['pers-8', 'team-1-2-1', 'Thomas Burke', 'thomas.burke@bank.com', 'Integration Specialist', 'TB', 40],
    ['pers-9', 'team-2-1-1', 'Sophia Lin', 'sophia.lin@bank.com', 'DevOps & Cloud Architect', 'SL', 40],
    ['pers-10', 'team-2-1-1', 'Jordan Hayes', 'jordan.hayes@bank.com', 'Kubernetes SRE', 'JH', 40],
    ['pers-11', 'team-2-2-1', 'David Sterling', 'david.sterling@bank.com', 'Payments Solutions Lead', 'DS', 40],
    ['pers-12', 'team-2-2-1', 'Chloe Bennett', 'chloe.bennett@bank.com', 'ISO 20022 Specialist', 'CB', 40],
    ['pers-13', 'team-3-1-1', 'Vikram Patel', 'vikram.patel@bank.com', 'Head of Cyber Defense', 'VP', 40],
    ['pers-14', 'team-3-1-1', 'Dr. Aris Thorne', 'aris.thorne@bank.com', 'Security Research Director', 'AT', 40],
    ['pers-15', 'team-3-2-1', 'Rachel Green', 'rachel.green@bank.com', 'Head of Compliance', 'RG', 40],
    ['pers-16', 'team-3-2-1', 'Tariq Mansoor', 'tariq.mansoor@bank.com', 'Machine Learning Engineer', 'TM', 160]
  ];
  peopleData.forEach((row) => insertPerson.run(...row));

  // 5. Projects — dates relative to CURRENT_YEAR
  const insertProject = db.prepare(`
    INSERT INTO projects (id, name, code, description, status, health, start_date, end_date, owner_id, budget)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const projectsArr = [
    ['proj-1', 'Global Digital Transformation', 'DX-MAIN', 'Omnichannel banking overhaul including mobile app v4, zero trust security, and open banking microservices.', 'ON_TRACK', 'HEALTHY', d(1, 15), d(11, 30), 'pers-1', 3500000.00],
    ['proj-2', 'ISO 20022 Real-Time Payments', 'RTP-CORE', 'Modernize interbank settlement pipelines for FedNow and SEPA instant transactions.', 'ON_TRACK', 'HEALTHY', d(2, 1), d(9, 30), 'pers-11', 2200000.00],
    ['proj-3', 'AI-Powered AML & Fraud Analytics', 'AML-AI', 'Real-time transaction scoring model and automated suspicious activity report generator.', 'AT_RISK', 'WARNING', d(3, 1), d(10, 31), 'pers-14', 1800000.00],
    ['proj-4', 'Cloud Landing Zone & Migration', 'CLOUD-MIG', 'Multi-region AWS/Azure infrastructure with automated FinOps and zero trust compliance.', 'ON_TRACK', 'HEALTHY', d(1, 10), d(8, 31), 'pers-9', 1950000.00]
  ];
  projectsArr.forEach((row) => insertProject.run(...row));

  // 6. Phases
  const insertPhase = db.prepare(`
    INSERT INTO phases (id, project_id, name, sort_order, start_date, end_date, status, progress)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const phasesData = [
    ['ph-1-1', 'proj-1', 'Architecture & Design System', 1, d(1, 15), d(3, 31), 'COMPLETED', 100],
    ['ph-1-2', 'proj-1', 'Core Client & API Build', 2, d(3, 1), d(6, 30), 'ON_TRACK', 75],
    ['ph-1-3', 'proj-1', 'Security & Biometric Integration', 3, d(5, 15), d(8, 31), 'ON_TRACK', 40],
    ['ph-1-4', 'proj-1', 'Pilot & Global Rollout', 4, d(8, 1), d(11, 30), 'NOT_STARTED', 0],

    ['ph-2-1', 'proj-2', 'ISO 20022 Schema Mapping', 1, d(2, 1), d(4, 15), 'COMPLETED', 100],
    ['ph-2-2', 'proj-2', 'Real-Time Engine & Clearing APIs', 2, d(4, 1), d(7, 31), 'ON_TRACK', 60],
    ['ph-2-3', 'proj-2', 'Certification & Live Pilot', 3, d(7, 15), d(9, 30), 'NOT_STARTED', 0],

    ['ph-3-1', 'proj-3', 'Data Pipeline & Anomaly Models', 1, d(3, 1), d(5, 31), 'ON_TRACK', 80],
    ['ph-3-2', 'proj-3', 'Real-Time Scoring Integration', 2, d(5, 1), d(8, 31), 'AT_RISK', 35],
    ['ph-3-3', 'proj-3', 'Regulatory Validation & Audit', 3, d(8, 15), d(10, 31), 'NOT_STARTED', 0],

    ['ph-4-1', 'proj-4', 'Landing Zone & Security Baseline', 1, d(1, 10), d(3, 31), 'COMPLETED', 100],
    ['ph-4-2', 'proj-4', 'Database & Kubernetes Clusters', 2, d(3, 15), d(6, 15), 'ON_TRACK', 70],
    ['ph-4-3', 'proj-4', 'Legacy Workload Cutover', 3, d(6, 1), d(8, 31), 'NOT_STARTED', 10]
  ];
  phasesData.forEach((row) => insertPhase.run(...row));

  // 7. Work Items
  const insertWorkItem = db.prepare(`
    INSERT INTO work_items (id, phase_id, name, description, start_date, end_date, progress, status, is_milestone, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const workItemsData = [
    ['item-1-1-1', 'ph-1-1', 'Design System & Figma Component Library', 'Tokens, high-contrast colors, accessibility audit', d(1, 15), d(2, 28), 100, 'COMPLETED', 0, 'HIGH'],
    ['item-1-1-2', 'ph-1-1', 'Enterprise Cloud Architecture Baseline', 'VPC topology, security enclaves, key management', d(1, 20), d(3, 15), 100, 'COMPLETED', 0, 'CRITICAL'],
    ['item-1-1-3', 'ph-1-1', 'Architecture Sign-Off', 'Executive architectural review and governance approval', d(3, 31), d(3, 31), 100, 'COMPLETED', 1, 'CRITICAL'],

    ['item-1-2-1', 'ph-1-2', 'Cross-Platform Flutter Mobile Client', 'Core account balances, card controls, transactions', d(3, 1), d(5, 15), 85, 'ON_TRACK', 0, 'HIGH'],
    ['item-1-2-2', 'ph-1-2', 'Open Banking Account Aggregation API', 'OAuth2 consent flow and AISP endpoint implementation', d(3, 15), d(5, 31), 70, 'ON_TRACK', 0, 'HIGH'],
    ['item-1-2-3', 'ph-1-2', 'Executive Web Portal v2', 'Corporate treasury dashboard and multi-signatory approvals', d(4, 1), d(6, 30), 60, 'ON_TRACK', 0, 'MEDIUM'],

    ['item-1-3-1', 'ph-1-3', 'FIDO2 Biometric Auth & Enclave Security', 'Passkeys, FaceID integration, cryptographic key attestation', d(5, 15), d(7, 15), 50, 'ON_TRACK', 0, 'CRITICAL'],
    ['item-1-3-2', 'ph-1-3', 'External Penetration Testing & Threat Model', 'Third-party whitebox audit and red team exercise', d(7, 1), d(8, 15), 20, 'ON_TRACK', 0, 'HIGH'],
    ['item-1-3-3', 'ph-1-3', 'Mobile Beta Launch & User Sandbox', 'Closed pilot for 5,000 corporate testers', d(8, 31), d(8, 31), 0, 'NOT_STARTED', 1, 'CRITICAL'],

    ['item-1-4-1', 'ph-1-4', 'Regional Bank Cutover Wave 1', 'North America and EMEA digital banking migration', d(8, 1), d(10, 15), 0, 'NOT_STARTED', 0, 'HIGH'],
    ['item-1-4-2', 'ph-1-4', 'APAC Regional Migration Wave 2', 'Asia-Pacific multi-currency accounts rollout', d(9, 15), d(11, 15), 0, 'NOT_STARTED', 0, 'MEDIUM'],
    ['item-1-4-3', 'ph-1-4', 'Global Production Go-Live', 'Full customer cutover and legacy portal decommission', d(11, 30), d(11, 30), 0, 'NOT_STARTED', 1, 'CRITICAL'],

    ['item-2-1-1', 'ph-2-1', 'ISO 20022 Pacs.008 & Pain.001 Mapping', 'XML message validator and schema parsers', d(2, 1), d(3, 31), 100, 'COMPLETED', 0, 'HIGH'],
    ['item-2-1-2', 'ph-2-1', 'Schema Gateway Validation Milestone', 'Clearing house testbed schema sign-off', d(4, 15), d(4, 15), 100, 'COMPLETED', 1, 'HIGH'],
    ['item-2-2-1', 'ph-2-2', 'Sub-Second Settlement Pipeline Core', 'Distributed messaging and ledger integration', d(4, 1), d(6, 30), 65, 'ON_TRACK', 0, 'CRITICAL'],
    ['item-2-2-2', 'ph-2-2', 'Clearing House Connectors (FedNow / SEPA)', 'High-throughput secure communication channels', d(5, 1), d(7, 31), 50, 'ON_TRACK', 0, 'HIGH'],
    ['item-2-3-1', 'ph-2-3', 'End-to-End Clearing Certification', 'Regulatory compliance and automated stress tests', d(7, 15), d(9, 15), 0, 'NOT_STARTED', 0, 'CRITICAL'],
    ['item-2-3-2', 'ph-2-3', 'Instant Payments Live Launch', 'Official live clearing activation', d(9, 30), d(9, 30), 0, 'NOT_STARTED', 1, 'CRITICAL'],

    ['item-3-1-1', 'ph-3-1', 'High-Frequency Feature Store Pipeline', 'Kafka streaming feature generation engine', d(3, 1), d(4, 30), 90, 'ON_TRACK', 0, 'HIGH'],
    ['item-3-1-2', 'ph-3-1', 'Graph Neural Network Anomaly Model', 'Model training on 50M historical transaction graphs', d(4, 1), d(5, 31), 70, 'ON_TRACK', 0, 'HIGH'],
    ['item-3-2-1', 'ph-3-2', 'Low-Latency Real-Time Scoring Gateway', 'Sub-10ms inference microservice behind API gateway', d(5, 1), d(7, 31), 35, 'AT_RISK', 0, 'CRITICAL'],
    ['item-3-2-2', 'ph-3-2', 'Automated SAR Filing Dashboard', 'Compliance officer case management review tool', d(6, 15), d(8, 31), 30, 'AT_RISK', 0, 'MEDIUM'],
    ['item-3-3-1', 'ph-3-3', 'Regulatory Compliance Audit & Backtesting', 'Third-party model validation against FINRA rules', d(8, 15), d(10, 31), 0, 'NOT_STARTED', 0, 'CRITICAL'],

    ['item-4-1-1', 'ph-4-1', 'Multi-Region Terraform Landing Zone', 'Automated AWS/Azure infrastructure provisioning', d(1, 10), d(3, 15), 100, 'COMPLETED', 0, 'HIGH'],
    ['item-4-1-2', 'ph-4-1', 'Infrastructure Security Baseline Approved', 'SOC2 / ISO 27001 readiness review', d(3, 31), d(3, 31), 100, 'COMPLETED', 1, 'HIGH'],
    ['item-4-2-1', 'ph-4-2', 'Managed PostgreSQL & Redis Clusters', 'High-availability cross-zone database replication', d(3, 15), d(5, 31), 80, 'ON_TRACK', 0, 'HIGH'],
    ['item-4-2-2', 'ph-4-2', 'Kubernetes GitOps & ArgoCD Pipeline', 'Canary deployments, auto-scaling, and telemetry', d(4, 1), d(6, 15), 60, 'ON_TRACK', 0, 'MEDIUM'],
    ['item-4-3-1', 'ph-4-3', 'Mainframe Legacy Batch Offloading', 'Event-driven sync pipeline and shadow testing', d(6, 1), d(8, 31), 10, 'NOT_STARTED', 0, 'CRITICAL']
  ];
  workItemsData.forEach((row) => insertWorkItem.run(...row));

  // 8. Assignments
  const insertAssignment = db.prepare(`
    INSERT INTO assignments (id, work_item_id, person_id, team_id, allocated_hours, allocation_pct, role_in_task)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const assignmentsData = [
    ['asgn-1', 'item-1-1-1', 'pers-2', 'team-1-1-1', 180, 100, 'Lead UX Designer'],
    ['asgn-2', 'item-1-1-1', 'pers-5', 'team-1-1-2', 120, 75, 'Frontend Component Architect'],
    ['asgn-3', 'item-1-1-2', 'pers-3', 'team-1-1-1', 160, 100, 'Chief Architect'],
    ['asgn-4', 'item-1-1-2', 'pers-9', 'team-2-1-1', 160, 100, 'Cloud Infrastructure Architect'],
    ['asgn-5', 'item-1-1-3', 'pers-1', 'team-1-1-1', 40, 50, 'Portfolio Sponsor'],
    ['asgn-6', 'item-1-1-3', 'pers-3', 'team-1-1-1', 40, 50, 'Chief Architect'],

    ['asgn-7', 'item-1-2-1', 'pers-4', 'team-1-1-1', 320, 100, 'Lead Mobile Engineer'],
    ['asgn-8', 'item-1-2-1', 'pers-2', 'team-1-1-1', 140, 50, 'UI Designer'],
    ['asgn-9', 'item-1-2-2', 'pers-7', 'team-1-2-1', 280, 100, 'API Architect'],
    ['asgn-10', 'item-1-2-2', 'pers-8', 'team-1-2-1', 240, 100, 'Integration Engineer'],
    ['asgn-11', 'item-1-2-3', 'pers-5', 'team-1-1-2', 260, 100, 'Lead Web Engineer'],
    ['asgn-12', 'item-1-2-3', 'pers-6', 'team-1-1-2', 260, 100, 'Fullstack React Engineer'],

    ['asgn-13', 'item-1-3-1', 'pers-13', 'team-3-1-1', 220, 100, 'Cyber Defense Lead'],
    ['asgn-14', 'item-1-3-1', 'pers-14', 'team-3-1-1', 180, 100, 'Security Research Director'],
    ['asgn-15', 'item-1-3-2', 'pers-13', 'team-3-1-1', 160, 100, 'Penetration Test Lead'],
    ['asgn-16', 'item-1-3-3', 'pers-1', 'team-1-1-1', 40, 50, 'Beta Launch Lead'],

    ['asgn-17', 'item-1-4-1', 'pers-3', 'team-1-1-1', 200, 80, 'Chief Architect'],
    ['asgn-18', 'item-1-4-1', 'pers-9', 'team-2-1-1', 180, 80, 'Cloud Operations Lead'],
    ['asgn-19', 'item-1-4-2', 'pers-4', 'team-1-1-1', 180, 80, 'Senior Mobile Engineer'],
    ['asgn-20', 'item-1-4-3', 'pers-1', 'team-1-1-1', 40, 100, 'Executive Sign-Off'],

    ['asgn-21', 'item-2-1-1', 'pers-11', 'team-2-2-1', 240, 100, 'Payments Solution Lead'],
    ['asgn-22', 'item-2-1-1', 'pers-12', 'team-2-2-1', 240, 100, 'ISO 20022 Specialist'],
    ['asgn-23', 'item-2-1-2', 'pers-11', 'team-2-2-1', 40, 50, 'Payments Solution Lead'],
    ['asgn-24', 'item-2-2-1', 'pers-11', 'team-2-2-1', 320, 100, 'Lead Payments Engineer'],
    ['asgn-25', 'item-2-2-1', 'pers-10', 'team-2-1-1', 200, 70, 'SRE / Performance Tuning'],
    ['asgn-26', 'item-2-2-2', 'pers-12', 'team-2-2-1', 300, 100, 'Clearing Connector Specialist'],
    ['asgn-27', 'item-2-3-1', 'pers-15', 'team-3-2-1', 180, 80, 'Compliance Auditor'],
    ['asgn-28', 'item-2-3-2', 'pers-11', 'team-2-2-1', 40, 100, 'Settlement Launch Lead'],

    ['asgn-29', 'item-3-1-1', 'pers-16', 'team-3-2-1', 280, 100, 'ML Engineer'],
    ['asgn-30', 'item-3-1-2', 'pers-16', 'team-3-2-1', 260, 100, 'ML Engineer'],
    ['asgn-31', 'item-3-1-2', 'pers-14', 'team-3-1-1', 160, 60, 'Security Advisor'],
    ['asgn-32', 'item-3-2-1', 'pers-7', 'team-1-2-1', 200, 70, 'API Performance Engineer'],
    ['asgn-33', 'item-3-2-1', 'pers-16', 'team-3-2-1', 240, 100, 'ML Engineer'],
    ['asgn-34', 'item-3-2-2', 'pers-6', 'team-1-1-2', 200, 70, 'React Dashboard Engineer'],
    ['asgn-35', 'item-3-2-2', 'pers-15', 'team-3-2-1', 160, 80, 'AML Policy Lead'],
    ['asgn-36', 'item-3-3-1', 'pers-15', 'team-3-2-1', 220, 100, 'Regulatory Officer'],

    ['asgn-37', 'item-4-1-1', 'pers-9', 'team-2-1-1', 260, 100, 'Cloud Architect'],
    ['asgn-38', 'item-4-1-1', 'pers-10', 'team-2-1-1', 260, 100, 'Kubernetes SRE'],
    ['asgn-39', 'item-4-1-2', 'pers-13', 'team-3-1-1', 40, 50, 'Security Reviewer'],
    ['asgn-40', 'item-4-2-1', 'pers-9', 'team-2-1-1', 240, 80, 'DBA / Cloud Infra'],
    ['asgn-41', 'item-4-2-2', 'pers-10', 'team-2-1-1', 280, 100, 'GitOps Specialist'],
    ['asgn-42', 'item-4-3-1', 'pers-3', 'team-1-1-1', 180, 60, 'Chief Architect'],
    ['asgn-43', 'item-4-3-1', 'pers-8', 'team-1-2-1', 240, 90, 'Integration Specialist']
  ];
  assignmentsData.forEach((row) => insertAssignment.run(...row));

  // 9. Dependencies
  const insertDependency = db.prepare(`
    INSERT INTO dependencies (id, predecessor_id, successor_id, type)
    VALUES (?, ?, ?, ?)
  `);

  const dependenciesData = [
    ['dep-1', 'item-1-1-1', 'item-1-2-1', 'FS'],
    ['dep-2', 'item-1-1-1', 'item-1-2-3', 'FS'],
    ['dep-3', 'item-1-1-2', 'item-1-1-3', 'FS'],
    ['dep-4', 'item-1-1-3', 'item-1-2-1', 'FS'],
    ['dep-5', 'item-1-1-3', 'item-1-2-2', 'FS'],
    ['dep-6', 'item-1-2-1', 'item-1-3-1', 'FS'],
    ['dep-7', 'item-1-2-2', 'item-1-3-1', 'FS'],
    ['dep-8', 'item-1-3-1', 'item-1-3-2', 'FS'],
    ['dep-9', 'item-1-3-2', 'item-1-3-3', 'FS'],
    ['dep-10', 'item-1-3-3', 'item-1-4-1', 'FS'],
    ['dep-11', 'item-1-4-1', 'item-1-4-2', 'FS'],
    ['dep-12', 'item-1-4-2', 'item-1-4-3', 'FS'],

    ['dep-13', 'item-2-1-1', 'item-2-1-2', 'FS'],
    ['dep-14', 'item-2-1-2', 'item-2-2-1', 'FS'],
    ['dep-15', 'item-2-2-1', 'item-2-2-2', 'SS'],
    ['dep-16', 'item-2-2-2', 'item-2-3-1', 'FS'],
    ['dep-17', 'item-2-3-1', 'item-2-3-2', 'FS'],

    ['dep-18', 'item-3-1-1', 'item-3-1-2', 'FS'],
    ['dep-19', 'item-3-1-2', 'item-3-2-1', 'FS'],
    ['dep-20', 'item-3-2-1', 'item-3-2-2', 'SS'],
    ['dep-21', 'item-3-2-2', 'item-3-3-1', 'FS'],

    ['dep-22', 'item-4-1-1', 'item-4-1-2', 'FS'],
    ['dep-23', 'item-4-1-2', 'item-4-2-1', 'FS'],
    ['dep-24', 'item-4-2-1', 'item-4-2-2', 'SS'],
    ['dep-25', 'item-4-2-2', 'item-4-3-1', 'FS']
  ];
  dependenciesData.forEach((row) => insertDependency.run(...row));

  // 10. Capacity Records — dynamic year
  const insertCapacity = db.prepare(`
    INSERT INTO capacity_records (id, person_id, year_month, capacity_hours, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  const ym = (m) => `${CURRENT_YEAR}-${String(m).padStart(2, '0')}`;
  peopleData.forEach(([pId]) => {
    insertCapacity.run(`cap-${pId}-${ym(8)}`,  pId, ym(8),  140, 'Summer bank holiday & PTO allowance');
    insertCapacity.run(`cap-${pId}-${ym(12)}`, pId, ym(12), 120, 'Year-end holiday shutdown');
  });

  // 11. Decision Log — seed with sample strategic decisions
  const insertDecision = db.prepare(`
    INSERT INTO decision_log (id, title, project_id, date, person_id, decision_summary, impact_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const decisionsData = [
    ['dec-1', 'Adopt Flutter for cross-platform mobile', 'proj-1', d(1, 22), 'pers-1', 'Approved Flutter as the unified mobile framework to reduce dual-platform maintenance costs by 40%.', 'POSITIVE'],
    ['dec-2', 'Accelerate ISO 20022 migration timeline', 'proj-2', d(2, 10), 'pers-11', 'Board approved moving the FedNow launch target from Q4 to Q3 to capture early-mover advantage.', 'POSITIVE'],
    ['dec-3', 'Escalate AML model accuracy concerns', 'proj-3', d(4, 5), 'pers-14', 'Model precision below 92% threshold. Additional training data and feature engineering sprint approved.', 'NEGATIVE'],
    ['dec-4', 'Select AWS as primary cloud provider', 'proj-4', d(1, 15), 'pers-9', 'AWS chosen over Azure for primary region due to superior FinOps tooling and existing enterprise agreement.', 'POSITIVE'],
    ['dec-5', 'Defer APAC rollout to next fiscal year', 'proj-1', d(5, 20), 'pers-1', 'APAC regulatory review requires additional 3 months. Deferred to next FY Q1 to maintain quality bar.', 'NEUTRAL']
  ];
  decisionsData.forEach((row) => insertDecision.run(...row));

  // Log initial change
  logChange(db, 'SYSTEM', 'ALL', 'RESET', 'Database restored to initial enterprise demo state.');

  return { success: true, message: 'Database successfully seeded.' };
}

-- ZupaViz Database Schema for SQLite
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tribes (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  lead_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  tribe_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  focus_area TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tribe_id) REFERENCES tribes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  team_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  avatar_initials TEXT,
  default_weekly_hours INTEGER DEFAULT 40,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'ON_TRACK',
  health TEXT NOT NULL DEFAULT 'HEALTHY',
  start_date TEXT,
  end_date TEXT,
  owner_id TEXT,
  budget REAL DEFAULT 0.0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (owner_id) REFERENCES people(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 1,
  start_date TEXT,
  end_date TEXT,
  status TEXT NOT NULL DEFAULT 'ON_TRACK',
  progress INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS work_items (
  id TEXT PRIMARY KEY,
  phase_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  is_milestone INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'MEDIUM',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (phase_id) REFERENCES phases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  work_item_id TEXT NOT NULL,
  person_id TEXT,
  team_id TEXT,
  allocated_hours REAL DEFAULT 0.0,
  allocation_pct REAL DEFAULT 100.0,
  role_in_task TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (work_item_id) REFERENCES work_items(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dependencies (
  id TEXT PRIMARY KEY,
  predecessor_id TEXT NOT NULL,
  successor_id TEXT NOT NULL,
  type TEXT DEFAULT 'FS',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (predecessor_id) REFERENCES work_items(id) ON DELETE CASCADE,
  FOREIGN KEY (successor_id) REFERENCES work_items(id) ON DELETE CASCADE,
  UNIQUE(predecessor_id, successor_id)
);

CREATE TABLE IF NOT EXISTS capacity_records (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL,
  year_month TEXT NOT NULL, -- e.g. '2025-03'
  capacity_hours REAL NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(person_id, year_month)
);

CREATE TABLE IF NOT EXISTS change_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL, -- CREATE, UPDATE, DELETE, RESET
  details TEXT,
  timestamp TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS decision_log (
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
);

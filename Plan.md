# Implementation Plan: Monday.com-Inspired Realignment & Leadership Platform

Realign the platform to match enterprise Monday.com-inspired light design, dynamic relative dates, localized CRUD where data lives, an executive Leadership Management View with a Business Decision Log, R/G/Y capacity utilization, and day-based monthly capacity proration.

---

## User Review Required

> [!IMPORTANT]
> 1. **Default Theme**: Switched to a clean, modern **Monday.com-inspired Light Theme** with crisp whites, slate borders, and vibrant status chips.
> 2. **Relative Year & Dynamic Dates**: Removed all hardcoded `2025` references. The platform anchors dynamically to the current year (`new Date().getFullYear()`) with seamless year-by-year navigation (`< 2026 >`) and seeds tasks relative to current date.
> 3. **Gantt Zoom & Scroll**: The timeline canvas supports natural horizontal scrolling when zoomed into granular modes (`1M`, `3M`, `6M`, `12M`), while `Fit Year` fits the whole year. Added mouse wheel zoom switching and a tree panel shadow divider. Added Level filters (`All`, `Projects`, `Phases`, `Tasks`).
> 4. **Decentralized CRUD**:
>    - **Create & Edit Projects**: Located directly in **Portfolio**.
>    - **Create & Edit Phases/Tasks/Dependencies**: Located in **Plan (Gantt)**.
>    - **Create & Edit People/Teams & Capacity**: Located in **Resources**.
> 5. **Management View = Leadership Executive Briefing**:
>    - **Delivery Status Overview** (Active project health distribution).
>    - **Upcoming Key Milestones** (Next critical cross-project deadlines).
>    - **Top Risks & Issues** (Flagged `AT_RISK` and `DELAYED` deliverables).
>    - **Critical Dependencies** (Cross-squad dependency map).
>    - **Resursläge (Resource Situation Summary)**: Strained vs. available squad capacity.
>    - **Business Decision Log**: Replaced system audit logs with a strategic decision record (`Decision`, `Project`, `Date`, `Person Responsible`, `Impact/Status`).
> 6. **R/G/Y Utilization Rules**:
>    - 🔴 **Overbooked (>100%)**: Red warning.
>    - 🟡 **High Utilization (90%–100%)**: Amber/Yellow.
>    - 🟢 **Optimal / Available (<90%)**: Green/Neutral.
> 7. **Day-Based Monthly Capacity Math**:
>    - Capacity is calculated from standard 40h/week prorated by exact calendar working weekdays per month (5-day week: ~168h–184h/month) rather than a rigid 160h flat assumption.

---

## Proposed Changes

### 1. Database & Calculation Services (`server/`)

#### [MODIFY] [server/services/calculations.js](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/server/services/calculations.js)
- Implement `getWorkingDaysInMonth(year, month)` to accurately count business days (Monday–Friday).
- Compute dynamic monthly capacity: `(defaultWeeklyHours / 5) * workingDays`.
- Implement dynamic relative date math supporting any current year.

#### [MODIFY] [server/db/schema.sql](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/server/db/schema.sql) & [server/db/seed.js](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/server/db/seed.js)
- Add `decision_log` table: `id`, `title`, `project_id`, `date`, `person_id`, `decision_summary`, `impact_status`, `created_at`.
- Seed dynamically relative to the current year (`const CURRENT_YEAR = new Date().getFullYear()`).

#### [NEW] [server/routes/decisions.js](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/server/routes/decisions.js)
- Endpoints for `GET /api/decisions`, `POST /api/decisions`, `PUT /api/decisions/:id`, `DELETE /api/decisions/:id`.

---

### 2. Design System & Styling (`src/styles/`)

#### [MODIFY] [src/styles/tokens.css](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/styles/tokens.css) & [src/styles/main.css](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/styles/main.css)
- Make **Light Theme** the default with Monday.com visual hierarchy: clean white surfaces, subtle slate borders (`#e2e8f0`), rounded cards, vibrant status chips, clean shadows.
- Update utilization color tokens:
  - `--util-overbooked`: `#e11d48` (Rose/Red)
  - `--util-high`: `#d97706` (Amber/Yellow for 90-100%)
  - `--util-optimal`: `#10b981` (Emerald/Green for healthy/available capacity)

#### [MODIFY] [src/styles/gantt.css](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/styles/gantt.css)
- Add shadow divider (`box-shadow: 4px 0 10px rgba(0, 0, 0, 0.08)`) to `.gantt-tree-panel`.
- Enable horizontal scrolling when zoomed into `1M`, `3M`, `6M`, and `12M` while maintaining `Fit Year` full view.

---

### 3. Frontend Views & Components (`src/components/`)

#### [MODIFY] [src/components/portfolio/PortfolioView.jsx](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/components/portfolio/PortfolioView.jsx)
- Remove artificial KPI boxes.
- Build clean Monday.com-style Portfolio dashboard: project list table + summary cards with direct "+ New Project" creation modal.

#### [MODIFY] [src/components/plan/PlanView.jsx](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/components/plan/PlanView.jsx)
- Add Level filter dropdown (`All Levels`, `Projects Only`, `Phases Only`, `Tasks Only`).
- Add Project filter dropdown (`All Projects`, or focus single project).
- Support dynamic year navigation (`< 2026 >`).
- Add mouse wheel/gesture zoom level stepping (`1M` ↔ `3M` ↔ `6M` ↔ `12M` ↔ `Fit Year`).

#### [MODIFY] [src/components/resources/ResourcesView.jsx](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/components/resources/ResourcesView.jsx)
- Apply R/G/Y utilization coloring (Red: >100%, Yellow: 90-100%, Green: <90%).
- Show dynamic working days and day-based capacity formulas.
- Include direct "+ Add Specialist / Squad" actions.

#### [MODIFY] [src/components/management/ManagementView.jsx](file:///c:/Users/jakob.ternstrom/Desktop/Gantt/src/components/management/ManagementView.jsx)
- Redesigned as the **Leadership Executive Briefing**:
  1. **Delivery Status & Project Health**: Status breakdown of all active initiatives.
  2. **Next Key Milestones**: Chronological timeline of upcoming major deliverables.
  3. **Top Risks & Issues**: Immediate visibility into blocked/at-risk deliverables.
  4. **Critical Dependencies**: Cross-squad handoff bottlenecks.
  5. **Resursläge (Resource Situation)**: Overbooked squads vs. capacity availability.
  6. **Strategic Decision Log**: Business records of decisions made, dates, and accountable owners.

---

## Verification Plan

### Automated Tests
- Calculation unit tests for day-based capacity (`(hoursPerWeek / 5) * workingDays`).
- Decision log CRUD tests.
- Date relative anchors and rollup tests:
  ```powershell
  npm.cmd test
  ```

### Manual & Interactive Verification
- Verify Monday.com light theme aesthetics across Portfolio, Plan, Resources, Management, and Presentation.
- Test zoom transitions (`1M` → `3M` → `6M` → `12M` → `Fit Year`) and horizontal scrolling.
- Test Level and Project filtering in the Gantt plan view.
- Test creating a project in Portfolio, adding a person in Resources, and adding a task in Plan.
- Verify the Leadership Management view with the Decision Log.

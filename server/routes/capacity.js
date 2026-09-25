import { Router } from 'express';
import { getDatabase } from '../db/database.js';
import { logChange } from '../services/audit.js';
import { calculateMonthlyDemandForAssignment, getDynamicMonthlyCapacity, getWorkingDaysInMonth } from '../services/calculations.js';

const router = Router();

const CURRENT_YEAR = new Date().getFullYear();
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  `${CURRENT_YEAR}-${String(i + 1).padStart(2, '0')}`
);

// GET full capacity & utilization matrix
router.get('/matrix', (req, res) => {
  try {
    const db = getDatabase();

    const people = db.prepare(`
      SELECT p.*, t.name as team_name, t.code as team_code, tr.id as tribe_id, tr.name as tribe_name, tr.code as tribe_code, d.id as domain_id, d.name as domain_name, d.code as domain_code
      FROM people p
      LEFT JOIN teams t ON p.team_id = t.id
      LEFT JOIN tribes tr ON t.tribe_id = tr.id
      LEFT JOIN domains d ON tr.domain_id = d.id
      ORDER BY d.name, tr.name, t.name, p.name
    `).all();

    const capacityRecords = db.prepare('SELECT * FROM capacity_records').all();
    const capacityMap = {};
    capacityRecords.forEach((c) => {
      capacityMap[`${c.person_id}-${c.year_month}`] = c.capacity_hours;
    });

    const assignments = db.prepare(`
      SELECT a.*, w.start_date, w.end_date, w.name as work_item_name, ph.name as phase_name, pr.name as project_name
      FROM assignments a
      JOIN work_items w ON a.work_item_id = w.id
      JOIN phases ph ON w.phase_id = ph.id
      JOIN projects pr ON ph.project_id = pr.id
    `).all();

    // Compute month-by-month demand and capacity per person
    const peopleMetrics = people.map((person) => {
      const personAssignments = assignments.filter((a) => a.person_id === person.id);
      
      const monthlyData = {};
      let totalAnnualDemand = 0;
      let totalAnnualCapacity = 0;

      MONTHS.forEach((month) => {
        const [yy, mm] = month.split('-').map(Number);
        const capacity = Math.round(
          capacityMap[`${person.id}-${month}`] ?? getDynamicMonthlyCapacity(yy, mm, person.default_weekly_hours ?? 40)
        );        
        let monthDemand = 0;
        const matchingTasks = [];

        personAssignments.forEach((asgn) => {
          const demand = calculateMonthlyDemandForAssignment(
            asgn.start_date,
            asgn.end_date,
            asgn.allocated_hours,
            month
          );
          if (demand > 0) {
            monthDemand += demand;
            matchingTasks.push({
              work_item_id: asgn.work_item_id,
              work_item_name: asgn.work_item_name,
              project_name: asgn.project_name,
              allocated_hours: asgn.allocated_hours,
              monthlyDemandHours: demand
            });
          }
        });

        monthDemand = Math.round(monthDemand * 10) / 10;
        const utilizationPct = capacity > 0 ? Math.round((monthDemand / capacity) * 100) : 0;
        
        // R/G/Y utilization rules: >100% overbooked, 90-100% high, <90% optimal
        let status = 'OPTIMAL';
        if (utilizationPct > 100) status = 'OVERBOOKED';
        else if (utilizationPct >= 90) status = 'HIGH';

        monthlyData[month] = {
          capacityHours: capacity,
          demandHours: monthDemand,
          utilizationPct,
          status,
          workingDays: getWorkingDaysInMonth(yy, mm),
          tasks: matchingTasks
        };

        totalAnnualDemand += monthDemand;
        totalAnnualCapacity += capacity;
      });

      const avgUtilization = totalAnnualCapacity > 0 ? Math.round((totalAnnualDemand / totalAnnualCapacity) * 100) : 0;

      return {
        person,
        monthlyData,
        annualSummary: {
          totalCapacity: totalAnnualCapacity,
          totalDemand: Math.round(totalAnnualDemand * 10) / 10,
          avgUtilization
        }
      };
    });

    // Rollup monthly aggregates for Teams, Tribes, Domains, and Organization
    const teamAggregates = {};
    const tribeAggregates = {};
    const domainAggregates = {};
    const portfolioAggregate = {
      monthlyData: {},
      totalCapacity: 0,
      totalDemand: 0,
      avgUtilization: 0
    };

    MONTHS.forEach((m) => {
      portfolioAggregate.monthlyData[m] = { capacity: 0, demand: 0, utilizationPct: 0 };
    });

    peopleMetrics.forEach((pm) => {
      const p = pm.person;
      const teamKey = p.team_id || 'unassigned-team';
      const tribeKey = p.tribe_id || 'unassigned-tribe';
      const domainKey = p.domain_id || 'unassigned-domain';

      if (!teamAggregates[teamKey]) {
        teamAggregates[teamKey] = {
          id: teamKey,
          name: p.team_name || 'No Team',
          code: p.team_code || 'N/A',
          tribe_id: p.tribe_id,
          monthlyData: {}
        };
        MONTHS.forEach((m) => {
          const [yy, mm] = m.split('-').map(Number);
          teamAggregates[teamKey].monthlyData[m] = { capacity: 0, demand: 0, utilizationPct: 0, workingDays: getWorkingDaysInMonth(yy, mm) };
        });
      }

      if (!tribeAggregates[tribeKey]) {
        tribeAggregates[tribeKey] = {
          id: tribeKey,
          name: p.tribe_name || 'No Tribe',
          code: p.tribe_code || 'N/A',
          domain_id: p.domain_id,
          monthlyData: {}
        };
        MONTHS.forEach((m) => {
          const [yy, mm] = m.split('-').map(Number);
          tribeAggregates[tribeKey].monthlyData[m] = { capacity: 0, demand: 0, utilizationPct: 0, workingDays: getWorkingDaysInMonth(yy, mm) };
        });
      }

      if (!domainAggregates[domainKey]) {
        domainAggregates[domainKey] = {
          id: domainKey,
          name: p.domain_name || 'No Domain',
          code: p.domain_code || 'N/A',
          monthlyData: {}
        };
        MONTHS.forEach((m) => {
          const [yy, mm] = m.split('-').map(Number);
          domainAggregates[domainKey].monthlyData[m] = { capacity: 0, demand: 0, utilizationPct: 0, workingDays: getWorkingDaysInMonth(yy, mm) };
        });
      }

      MONTHS.forEach((m) => {
        const mData = pm.monthlyData[m];
        teamAggregates[teamKey].monthlyData[m].capacity += mData.capacityHours;
        teamAggregates[teamKey].monthlyData[m].demand += mData.demandHours;

        tribeAggregates[tribeKey].monthlyData[m].capacity += mData.capacityHours;
        tribeAggregates[tribeKey].monthlyData[m].demand += mData.demandHours;

        domainAggregates[domainKey].monthlyData[m].capacity += mData.capacityHours;
        domainAggregates[domainKey].monthlyData[m].demand += mData.demandHours;

        portfolioAggregate.monthlyData[m].capacity += mData.capacityHours;
        portfolioAggregate.monthlyData[m].demand += mData.demandHours;
      });
    });

    // Compute utilization percentages for aggregates
    const finalizeAggregate = (agg) => {
      Object.values(agg).forEach((node) => {
        MONTHS.forEach((m) => {
          const cap = node.monthlyData[m].capacity;
          const dem = Math.round(node.monthlyData[m].demand * 10) / 10;
          node.monthlyData[m].demand = dem;
          node.monthlyData[m].utilizationPct = cap > 0 ? Math.round((dem / cap) * 100) : 0;
          let status = 'OPTIMAL';
          if (node.monthlyData[m].utilizationPct > 100) status = 'OVERBOOKED';
          else if (node.monthlyData[m].utilizationPct >= 90) status = 'HIGH';
          node.monthlyData[m].status = status;
        });
      });
    };

    finalizeAggregate(teamAggregates);
    finalizeAggregate(tribeAggregates);
    finalizeAggregate(domainAggregates);

    MONTHS.forEach((m) => {
      const cap = portfolioAggregate.monthlyData[m].capacity;
      const dem = Math.round(portfolioAggregate.monthlyData[m].demand * 10) / 10;
      portfolioAggregate.monthlyData[m].demand = dem;
      portfolioAggregate.monthlyData[m].utilizationPct = cap > 0 ? Math.round((dem / cap) * 100) : 0;
      portfolioAggregate.totalCapacity += cap;
      portfolioAggregate.totalDemand += dem;
    });
    portfolioAggregate.avgUtilization = portfolioAggregate.totalCapacity > 0
      ? Math.round((portfolioAggregate.totalDemand / portfolioAggregate.totalCapacity) * 100)
      : 0;

    res.json({
      months: MONTHS,
      peopleMetrics,
      teamAggregates,
      tribeAggregates,
      domainAggregates,
      portfolioAggregate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all capacity records
router.get('/records', (req, res) => {
  try {
    const db = getDatabase();
    const records = db.prepare('SELECT * FROM capacity_records ORDER BY year_month ASC').all();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upsert capacity record
router.post('/records', (req, res) => {
  try {
    const { person_id, year_month, capacity_hours, notes } = req.body;
    if (!person_id || !year_month || capacity_hours === undefined) {
      return res.status(400).json({ error: 'person_id, year_month, and capacity_hours are required.' });
    }

    const db = getDatabase();
    const id = `cap-${person_id}-${year_month}`;
    db.prepare(`
      INSERT INTO capacity_records (id, person_id, year_month, capacity_hours, notes)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(person_id, year_month) DO UPDATE SET
        capacity_hours = excluded.capacity_hours,
        notes = excluded.notes
    `).run(id, person_id, year_month, capacity_hours, notes || '');

    logChange(db, 'CAPACITY', id, 'UPDATE', `Updated capacity for person ${person_id} (${year_month}): ${capacity_hours}h`);
    res.json({ success: true, id, person_id, year_month, capacity_hours, notes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

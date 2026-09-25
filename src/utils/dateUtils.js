/**
 * Timeline date mathematics, viewport windowing, and fit-to-view coordinate calculations.
 * All timeline math anchors to the current year by default (new Date().getFullYear())
 * and every function accepts an explicit `year` for year-by-year navigation.
 */

export const CURRENT_YEAR = new Date().getFullYear();

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Builds quarter descriptors for a given year.
 */
export function getQuarters(year) {
  return [
    { name: `Q1 ${year}`, months: ['Jan', 'Feb', 'Mar'], startMonth: 0, endMonth: 2 },
    { name: `Q2 ${year}`, months: ['Apr', 'May', 'Jun'], startMonth: 3, endMonth: 5 },
    { name: `Q3 ${year}`, months: ['Jul', 'Aug', 'Sep'], startMonth: 6, endMonth: 8 },
    { name: `Q4 ${year}`, months: ['Oct', 'Nov', 'Dec'], startMonth: 9, endMonth: 11 }
  ];
}

export const QUARTERS = getQuarters(CURRENT_YEAR);

/**
 * Returns the UTC start (Jan 1 00:00:00) of a calendar year.
 */
export function getYearStartUTC(year = CURRENT_YEAR) {
  return new Date(Date.UTC(year, 0, 1));
}

export const YEAR_START_DATE = getYearStartUTC();

/**
 * Parses YYYY-MM-DD to UTC Date object.
 */
export function parseDateUTC(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Returns total days between two UTC dates inclusive.
 */
export function getDaysBetweenUTC(startDate, endDate) {
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
}

/**
 * Total days in a calendar year (leap-year safe: 365 or 366).
 */
export function getTotalYearDays(year = CURRENT_YEAR) {
  return getDaysBetweenUTC(getYearStartUTC(year), new Date(Date.UTC(year, 11, 31)));
}

export const TOTAL_YEAR_DAYS = getTotalYearDays();

/**
 * Returns date window and header ticks for a given zoom level, offset index, and year.
 */
export function getTimelineViewport(zoomLevel = 'YEAR', offsetIndex = 0, year = CURRENT_YEAR) {
  let startDate, endDate, topHeader = [], bottomHeader = [], label = '';
  const quarters = getQuarters(year);

  switch (zoomLevel) {
    case '1M': {
      // 1 Month view (offsetIndex 0..11)
      const mIdx = Math.max(0, Math.min(11, offsetIndex));
      startDate = new Date(Date.UTC(year, mIdx, 1));
      endDate = new Date(Date.UTC(year, mIdx + 1, 0, 23, 59, 59));
      const totalDays = endDate.getUTCDate();
      label = `${MONTH_NAMES[mIdx]} ${year}`;

      topHeader = [{ name: `${MONTH_NAMES[mIdx]} ${year}`, flex: 1 }];
      bottomHeader = [];
      for (let d = 1; d <= totalDays; d++) {
        const dateObj = new Date(Date.UTC(year, mIdx, d));
        const dayOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dateObj.getUTCDay()];
        bottomHeader.push({
          name: `${d}`,
          sub: dayOfWeek,
          flex: 1
        });
      }
      break;
    }

    case '3M': {
      // 3 Months / Quarter view (offsetIndex 0..3)
      const qIdx = Math.max(0, Math.min(3, offsetIndex));
      const q = quarters[qIdx];
      startDate = new Date(Date.UTC(year, q.startMonth, 1));
      endDate = new Date(Date.UTC(year, q.endMonth + 1, 0, 23, 59, 59));
      label = q.name;

      topHeader = q.months.map((m) => ({ name: `${m} ${year}`, flex: 1 }));
      bottomHeader = [];
      for (let w = 1; w <= 13; w++) {
        bottomHeader.push({ name: `W${w}`, flex: 1 });
      }
      break;
    }

    case '6M': {
      // 6 Months / Half-Year view (offsetIndex 0..1)
      const hIdx = Math.max(0, Math.min(1, offsetIndex));
      const startM = hIdx * 6;
      const endM = startM + 5;
      startDate = new Date(Date.UTC(year, startM, 1));
      endDate = new Date(Date.UTC(year, endM + 1, 0, 23, 59, 59));
      label = hIdx === 0 ? `H1 ${year} (Jan – Jun)` : `H2 ${year} (Jul – Dec)`;

      topHeader = (hIdx === 0 ? [quarters[0], quarters[1]] : [quarters[2], quarters[3]]).map((q) => ({ name: q.name, flex: 1 }));
      bottomHeader = MONTH_NAMES.slice(startM, endM + 1).map((m) => ({ name: m, flex: 1 }));
      break;
    }

    case '12M':
    case 'YEAR':
    default: {
      startDate = getYearStartUTC(year);
      endDate = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
      label = `Full Year ${year}`;

      topHeader = quarters.map((q) => ({ name: q.name, flex: 1 }));
      bottomHeader = MONTH_NAMES.map((m) => ({ name: m, flex: 1 }));
      break;
    }
  }

  const totalDays = getDaysBetweenUTC(startDate, endDate);

  return {
    startDate,
    endDate,
    totalDays,
    topHeader,
    bottomHeader,
    label
  };
}

/**
 * Calculates bar coordinates (% left and % width) fitting perfectly inside the current viewport window.
 */
export function calculateFitCoordinates(startStr, endStr, viewportStartDate, totalViewportDays) {
  if (!startStr || !endStr || !viewportStartDate || !totalViewportDays) {
    return { leftPct: 0, widthPct: 0, isVisible: false };
  }

  const taskStart = parseDateUTC(startStr);
  const taskEnd = parseDateUTC(endStr);
  const vpStart = viewportStartDate;

  const diffStartMs = taskStart.getTime() - vpStart.getTime();
  const startDayOffset = diffStartMs / (1000 * 60 * 60 * 24);

  const durationDays = Math.max(1, getDaysBetweenUTC(taskStart, taskEnd));

  const leftPct = (startDayOffset / totalViewportDays) * 100;
  const widthPct = (durationDays / totalViewportDays) * 100;

  const isVisible = leftPct + widthPct > 0 && leftPct < 100;

  const clampedLeft = Math.max(0, Math.min(100, leftPct));
  const rightEdge = Math.min(100, leftPct + widthPct);
  const clampedWidth = Math.max(0.6, rightEdge - clampedLeft);

  return {
    leftPct: clampedLeft,
    widthPct: clampedWidth,
    rawLeft: leftPct,
    rawWidth: widthPct,
    isVisible
  };
}

/**
 * Calculates bar coordinates spanning the full calendar year (current year by default).
 */
export function calculateBarCoordinates(startStr, endStr, year = CURRENT_YEAR) {
  return calculateFitCoordinates(startStr, endStr, getYearStartUTC(year), getTotalYearDays(year));
}

/**
 * Formats YYYY-MM-DD into readable MMM DD.
 */
export function formatShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = MONTH_NAMES[parseInt(parts[1], 10) - 1];
  return `${month} ${parseInt(parts[2], 10)}`;
}

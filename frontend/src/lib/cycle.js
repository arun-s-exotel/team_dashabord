import { format, setDate, addMonths, subMonths, startOfDay, min as dateMin } from 'date-fns';

export const CYCLE_DAY = 20;

export function cycleForDate(date = new Date()) {
  const d = startOfDay(date);
  const start = d.getDate() >= CYCLE_DAY
    ? setDate(d, CYCLE_DAY)
    : setDate(subMonths(d, 1), CYCLE_DAY);
  const end = setDate(addMonths(start, 1), CYCLE_DAY - 1);
  return { start, end };
}

export function cycleLabel({ start, end }) {
  const sameYear = start.getFullYear() === end.getFullYear();
  return sameYear
    ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    : `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

export function cycleKey({ start }) {
  return format(start, 'yyyy-MM-dd');
}

export function recentCycles(count = 12, now = new Date()) {
  const out = [];
  let { start, end } = cycleForDate(now);
  for (let i = 0; i < count; i++) {
    out.push({ start, end });
    start = subMonths(start, 1);
    end = subMonths(end, 1);
  }
  return out;
}

export function clampCycleToToday(cycle, today = new Date()) {
  return { start: cycle.start, end: dateMin([cycle.end, startOfDay(today)]) };
}

export function fmtDate(d) {
  return format(d, 'yyyy-MM-dd');
}

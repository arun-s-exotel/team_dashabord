import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, addDays } from 'date-fns';
import { users, schedules, shifts, reports } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NIGHT_SHIFT_ALLOWANCE } from '../lib/constants';
import { cycleForDate, cycleLabel, clampCycleToToday, fmtDate } from '../lib/cycle';

export default function Dashboard() {
  const { user, isEffectiveAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [todaysSchedules, setTodaysSchedules] = useState([]);
  const [myUpcomingRange, setMyUpcomingRange] = useState([]);
  const [todayAllSchedules, setTodayAllSchedules] = useState([]);
  const [cycleNightCount, setCycleNightCount] = useState(0);
  const [cycleTeamNightDays, setCycleTeamNightDays] = useState(0);

  const today = new Date();
  const cycle = cycleForDate(today);
  const cycleSoFar = clampCycleToToday(cycle, today);
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEffectiveAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      const todayStr = fmtDate(today);
      const cycleStartStr = fmtDate(cycle.start);
      const cycleSoFarEndStr = fmtDate(cycleSoFar.end);

      if (isEffectiveAdmin) {
        const [uRes, sRes, todayRes, rptRes] = await Promise.all([
          users.getAll(),
          shifts.getAll(),
          schedules.getAll({ startDate: todayStr, endDate: todayStr }),
          reports.nightShift({ startDate: cycleStartStr, endDate: cycleSoFarEndStr })
            .catch(() => ({ data: { rows: [], totals: {} } })),
        ]);
        setAllUsers(uRes.data);
        setAllShifts(sRes.data);
        setTodaysSchedules(todayRes.data);
        setCycleTeamNightDays(rptRes.data.totals?.totalNightShiftDays || 0);
      } else {
        const [sRes, rangeRes, todayAllRes, rptRes] = await Promise.all([
          shifts.getAll(),
          schedules.getAll({
            startDate: fmtDate(weekStart),
            endDate: fmtDate(addDays(today, 30)),
            userId: user.id,
          }),
          schedules.getAll({ startDate: todayStr, endDate: todayStr }),
          reports.nightShift({ startDate: cycleStartStr, endDate: cycleSoFarEndStr })
            .catch(() => ({ data: { rows: [], totals: {} } })),
        ]);
        setAllShifts(sRes.data);
        setMyUpcomingRange(rangeRes.data);
        setTodayAllSchedules(todayAllRes.data);
        const myRow = rptRes.data.rows.find(r => r.user.id === user.id);
        setCycleNightCount(myRow?.nightShiftDays || 0);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {isEffectiveAdmin
        ? <AdminView
            today={today}
            cycle={cycle}
            cycleSoFar={cycleSoFar}
            allUsers={allUsers}
            allShifts={allShifts}
            todaysSchedules={todaysSchedules}
            cycleTeamNightDays={cycleTeamNightDays}
          />
        : <EmployeeView
            user={user}
            today={today}
            cycle={cycle}
            cycleSoFar={cycleSoFar}
            cycleNightCount={cycleNightCount}
            myUpcomingRange={myUpcomingRange}
            todayAllSchedules={todayAllSchedules}
            weekDays={weekDays}
          />
      }
    </div>
  );
}

function AdminView({ today, cycle, cycleSoFar, allUsers, allShifts, todaysSchedules, cycleTeamNightDays }) {
  const activeShifts = allShifts.filter(s => s.isActive);
  const nightShiftToday = todaysSchedules.some(s => s.shift.isNightShift);
  const cycleAllowance = cycleTeamNightDays * NIGHT_SHIFT_ALLOWANCE;

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Team Size" value={allUsers.length} tone="slate" />
        <StatCard
          label="Active Shifts"
          value={activeShifts.length}
          tone="blue"
          subline={`${activeShifts.filter(s => s.isNightShift).length} marked as night`}
        />
        <StatCard
          label="Night Shift Today?"
          value={nightShiftToday ? 'Yes' : 'No'}
          tone={nightShiftToday ? 'indigo' : 'slate'}
          subline={nightShiftToday
            ? `${todaysSchedules.filter(s => s.shift.isNightShift).length} on duty`
            : 'No one assigned tonight'}
        />
        <StatCard
          label="Team Allowance (cycle so far)"
          value={`₹${cycleAllowance.toLocaleString('en-IN')}`}
          tone="emerald"
          subline={`${cycleTeamNightDays} night ${cycleTeamNightDays === 1 ? 'shift' : 'shifts'} • ${cycleLabel(cycle)}`}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Today's Shifts</h2>
            <p className="text-sm text-slate-500">{format(today, 'EEEE, MMM d')}</p>
          </div>
          <Link to="/assign" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Assign shifts →
          </Link>
        </div>

        {activeShifts.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">No active shifts. Create one on the Shifts page.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeShifts.map(shift => {
              const assignees = todaysSchedules
                .filter(s => s.shiftId === shift.id)
                .map(s => s.user)
                .filter(Boolean);
              return <ShiftTodayCard key={shift.id} shift={shift} assignees={assignees} />;
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickLink to="/assign" label="Assign Schedules" />
        <QuickLink to="/shifts" label="Manage Shifts" />
        <QuickLink to="/reports" label="Night Shift Report" />
      </div>
    </>
  );
}

function ShiftTodayCard({ shift, assignees }) {
  const isNight = shift.isNightShift;
  return (
    <div className={`rounded-xl p-4 border ${
      isNight ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-slate-900">{shift.name}</p>
          <p className="text-xs text-slate-500">{shift.startTime} – {shift.endTime}</p>
        </div>
        {isNight && (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-purple-600 text-white uppercase tracking-wider">
            Night
          </span>
        )}
      </div>
      {assignees.length === 0 ? (
        <p className="text-xs text-slate-400 italic mt-3">No one assigned</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {assignees.map(a => (
            <li key={a.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {a.name?.charAt(0)?.toUpperCase()}
              </span>
              <span className="truncate">{a.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-slate-400 mt-3">{assignees.length} on duty</p>
    </div>
  );
}

function QuickLink({ to, label }) {
  return (
    <Link to={to} className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md hover:border-blue-300 transition-all">
      <span className="text-sm font-medium text-slate-700">{label} →</span>
    </Link>
  );
}

function EmployeeView({ user, today, cycle, cycleSoFar, cycleNightCount, myUpcomingRange, todayAllSchedules, weekDays }) {
  const allowance = cycleNightCount * NIGHT_SHIFT_ALLOWANCE;
  const todayStr = fmtDate(today);
  const todays = myUpcomingRange.find(s => s.date.slice(0, 10) === todayStr);
  const upcoming = myUpcomingRange
    .filter(s => s.date.slice(0, 10) >= todayStr)
    .slice(0, 5);
  const scheduleOnDay = (day) => {
    const ds = fmtDate(day);
    return myUpcomingRange.find(s => s.date.slice(0, 10) === ds);
  };
  const sameShiftToday = todays
    ? todayAllSchedules.filter(s => s.shiftId === todays.shiftId).length
    : 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="On my shift today"
          value={todays ? sameShiftToday : '—'}
          tone="blue"
          subline={todays ? todays.shift.name : 'No shift today'}
        />
        <StatCard
          label="My Night Shifts (cycle so far)"
          value={cycleNightCount}
          tone="indigo"
          subline={`× ₹${NIGHT_SHIFT_ALLOWANCE} per night`}
        />
        <StatCard
          label="Allowance (cycle so far)"
          value={`₹${allowance.toLocaleString('en-IN')}`}
          tone="emerald"
          subline={cycleLabel(cycle)}
        />
        <StatCard
          label="Today"
          value={format(today, 'd MMM')}
          tone="slate"
          subline={format(today, 'EEEE')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-5">This Week</h2>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const mine = scheduleOnDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 rounded-xl text-center transition-all ${
                    isCurrentDay
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'bg-slate-50'
                  }`}
                >
                  <p className={`text-xs font-medium ${isCurrentDay ? 'text-blue-100' : 'text-slate-500'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-lg font-bold mt-1 ${isCurrentDay ? 'text-white' : 'text-slate-900'}`}>
                    {format(day, 'd')}
                  </p>
                  <div className="mt-3 min-h-[24px]">
                    {mine ? (
                      <div className={`text-xs font-medium px-2 py-0.5 rounded-full truncate ${
                        isCurrentDay ? 'bg-white/20 text-white' :
                        mine.shift.isNightShift ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`} title={mine.shift.name}>
                        {mine.shift.name}
                      </div>
                    ) : (
                      <span className={`text-xs ${isCurrentDay ? 'text-blue-100' : 'text-slate-400'}`}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Today's Shift</h3>
            {todays?.shift ? (
              <div className={`p-4 rounded-xl ${
                todays.shift.isNightShift
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
              }`}>
                <p className="text-lg font-bold">{todays.shift.name}</p>
                <p className="text-sm opacity-90 mt-1">{todays.shift.startTime} – {todays.shift.endTime}</p>
                {todays.shift.isNightShift && (
                  <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium bg-white/20 rounded-full">
                    Night shift
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-3">No shift assigned for today.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">My Upcoming Shifts</h3>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing on the schedule.</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">{format(new Date(s.date.slice(0, 10)), 'EEE, MMM d')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.shift.isNightShift ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.shift.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({ label, value, tone = 'slate', subline }) {
  const tones = {
    slate: 'text-slate-700',
    blue: 'text-blue-700',
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${tones[tone]}`}>{value}</p>
      {subline && <p className="text-xs text-slate-500 mt-1">{subline}</p>}
    </div>
  );
}

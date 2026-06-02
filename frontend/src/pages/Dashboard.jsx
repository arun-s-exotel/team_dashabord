import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday, startOfMonth, endOfMonth } from 'date-fns';
import { users, schedules, shifts, reports } from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtDate(d) {
  return format(d, 'yyyy-MM-dd');
}

export default function Dashboard() {
  const { user, isEffectiveAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [weekSchedules, setWeekSchedules] = useState([]);
  const [myShiftToday, setMyShiftToday] = useState(null);
  const [myUpcomingShifts, setMyUpcomingShifts] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [myMonthlyNightCount, setMyMonthlyNightCount] = useState(0);
  const [teamMonthlyNightTotal, setTeamMonthlyNightTotal] = useState(0);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, [isEffectiveAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);

      const [usersRes, shiftsRes, weekSchedRes, myWeekSchedRes, reportRes] = await Promise.all([
        users.getAll(),
        shifts.getAll(),
        schedules.getAll({ startDate: fmtDate(weekStart), endDate: fmtDate(weekEnd) }),
        schedules.getAll({
          startDate: fmtDate(today),
          endDate: fmtDate(endOfMonth(today)),
          userId: user.id
        }),
        reports.nightShift({
          startDate: fmtDate(monthStart),
          endDate: fmtDate(monthEnd)
        }).catch(() => ({ data: { rows: [], totals: {} } }))
      ]);

      setAllUsers(usersRes.data);
      setAllShifts(shiftsRes.data);
      setWeekSchedules(weekSchedRes.data);

      const todayStr = fmtDate(today);
      const todays = myWeekSchedRes.data.find(s => s.date.slice(0, 10) === todayStr);
      setMyShiftToday(todays?.shift || null);

      const upcoming = myWeekSchedRes.data
        .filter(s => s.date.slice(0, 10) >= todayStr)
        .slice(0, 5);
      setMyUpcomingShifts(upcoming);

      const myRow = reportRes.data.rows.find(r => r.user.id === user.id);
      setMyMonthlyNightCount(myRow?.nightShiftDays || 0);
      setTeamMonthlyNightTotal(reportRes.data.totals?.totalNightShiftDays || 0);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const schedulesByDay = (day) => {
    const dayStr = fmtDate(day);
    return weekSchedules.filter(s => s.date.slice(0, 10) === dayStr);
  };

  const myScheduleOnDay = (day) => {
    const dayStr = fmtDate(day);
    return weekSchedules.find(s => s.userId === user.id && s.date.slice(0, 10) === dayStr);
  };

  const nightShiftCount = allShifts.filter(s => s.isNightShift).length;

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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Team Size" value={allUsers.length} tone="slate" />
        <StatCard label="Active Shifts" value={allShifts.length} tone="blue" subline={`${nightShiftCount} marked as night`} />
        <StatCard label={isEffectiveAdmin ? 'Team Night Shifts (this month)' : 'My Night Shifts (this month)'} value={isEffectiveAdmin ? teamMonthlyNightTotal : myMonthlyNightCount} tone="indigo" />
        <StatCard label="Today" value={format(today, 'd MMM')} tone="emerald" subline={format(today, 'EEEE')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">This Week</h2>
            <Link to="/calendar" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View full calendar →
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const daySchedules = schedulesByDay(day);
              const mine = myScheduleOnDay(day);
              const isCurrentDay = isToday(day);
              const nightCount = daySchedules.filter(s => s.shift.isNightShift).length;

              return (
                <div
                  key={day.toISOString()}
                  className={`p-3 rounded-xl text-center transition-all ${
                    isCurrentDay
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg'
                      : 'bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <p className={`text-xs font-medium ${isCurrentDay ? 'text-blue-100' : 'text-slate-500'}`}>
                    {format(day, 'EEE')}
                  </p>
                  <p className={`text-lg font-bold mt-1 ${isCurrentDay ? 'text-white' : 'text-slate-900'}`}>
                    {format(day, 'd')}
                  </p>
                  <div className={`mt-2 text-xs ${isCurrentDay ? 'text-blue-100' : 'text-slate-500'}`}>
                    {daySchedules.length} assigned
                    {nightCount > 0 && <span className={`block ${isCurrentDay ? 'text-amber-200' : 'text-amber-600'} font-medium`}>{nightCount} night</span>}
                  </div>
                  {mine && (
                    <div className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full truncate ${
                      isCurrentDay ? 'bg-white/20 text-white' :
                      mine.shift.isNightShift ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`} title={mine.shift.name}>
                      {mine.shift.name}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Today's Shift</h3>
            {myShiftToday ? (
              <div className={`p-4 rounded-xl ${
                myShiftToday.isNightShift
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
              }`}>
                <p className="text-lg font-bold">{myShiftToday.name}</p>
                <p className="text-sm opacity-90 mt-1">{myShiftToday.startTime} – {myShiftToday.endTime}</p>
                {myShiftToday.isNightShift && (
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
            {myUpcomingShifts.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing on the schedule.</p>
            ) : (
              <ul className="space-y-2">
                {myUpcomingShifts.map(s => (
                  <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-slate-700">{format(new Date(s.date.slice(0, 10)), 'EEE, MMM d')}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.shift.isNightShift ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.shift.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isEffectiveAdmin && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick Links</h3>
              <div className="space-y-2">
                <Link to="/assign" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700">
                  Assign Schedules
                </Link>
                <Link to="/shifts" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700">
                  Manage Shifts
                </Link>
                <Link to="/reports" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors text-sm text-slate-700">
                  Night Shift Report
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, tone = 'slate', subline }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    blue: 'bg-blue-100 text-blue-700',
    indigo: 'bg-indigo-100 text-indigo-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700'
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${tones[tone].split(' ')[1]}`}>{value}</p>
      {subline && <p className="text-xs text-slate-500 mt-1">{subline}</p>}
    </div>
  );
}

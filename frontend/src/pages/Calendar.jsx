import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { schedules, users, shifts } from '../api/client';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(date, 1));
      const end = endOfMonth(addMonths(date, 1));

      const [usersRes, shiftsRes, schedulesRes] = await Promise.all([
        users.getAll(),
        shifts.getAll(),
        schedules.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        })
      ]);

      setAllUsers(usersRes.data);
      setAllShifts(shiftsRes.data);

      const scheduleEvents = schedulesRes.data.map(s => ({
        id: `sched-${s.id}`,
        title: `${s.user.name} – ${s.shift.name}`,
        start: new Date(s.date.slice(0, 10)),
        end: new Date(s.date.slice(0, 10)),
        allDay: true,
        userId: s.userId,
        shiftId: s.shiftId,
        isNightShift: s.shift.isNightShift
      }));

      setEvents(scheduleEvents);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (selectedUser !== 'all' && e.userId !== selectedUser) return false;
      if (shiftFilter === 'night' && !e.isNightShift) return false;
      if (shiftFilter !== 'all' && shiftFilter !== 'night' && e.shiftId !== shiftFilter) return false;
      return true;
    });
  }, [events, selectedUser, shiftFilter]);

  const eventStyleGetter = useCallback((event) => {
    const backgroundColor = event.isNightShift ? '#7c3aed' : '#3b82f6';
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        color: 'white',
        border: 'none',
        fontSize: '11px',
        padding: '2px 6px'
      }
    };
  }, []);

  const handleNavigate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Calendar</h1>
          <p className="text-slate-500 mt-1">Shift assignments across the team</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600">Regular shift</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-600"></div>
              <span className="text-sm text-slate-600">Night shift</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">All Members</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            >
              <option value="all">All Shifts</option>
              <option value="night">Night shifts only</option>
              {allShifts.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="flex rounded-xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => setView('month')}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  view === 'month'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-4 py-2 text-sm font-medium transition-all border-l border-slate-200 ${
                  view === 'week'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="text-slate-500">Loading calendar...</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6" style={{ height: 650 }}>
          <BigCalendar
            localizer={localizer}
            events={filteredEvents}
            view={view}
            onView={setView}
            date={date}
            onNavigate={handleNavigate}
            eventPropGetter={eventStyleGetter}
            views={['month', 'week']}
            popup
            selectable={false}
          />
        </div>
      )}
    </div>
  );
}

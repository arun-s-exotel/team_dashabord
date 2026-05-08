import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { workStatus, schedules, users } from '../api/client';

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
  const [selectedUser, setSelectedUser] = useState('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startOfMonth(subMonths(date, 1));
      const end = endOfMonth(addMonths(date, 1));
      
      const [usersRes, statusRes, schedulesRes] = await Promise.all([
        users.getAll(),
        workStatus.getAll({ 
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        }),
        schedules.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd')
        })
      ]);

      setAllUsers(usersRes.data);

      const statusEvents = statusRes.data.map(status => ({
        id: `status-${status.id}`,
        title: `${status.user.name} - ${status.status === 'leave' 
          ? `Leave (${status.leaveType === 'full' ? 'Full' : status.leaveType === 'first_half' ? '1st Half' : '2nd Half'})` 
          : status.status === 'office' ? 'Office' : 'WFH'}`,
        start: new Date(status.date),
        end: new Date(status.date),
        allDay: true,
        type: status.status,
        userId: status.userId,
        userName: status.user.name
      }));

      setEvents(statusEvents);
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
    if (selectedUser === 'all') return events;
    return events.filter(e => e.userId === selectedUser);
  }, [events, selectedUser]);

  const eventStyleGetter = useCallback((event) => {
    let backgroundColor = '#6b7280';
    
    if (event.type === 'office') {
      backgroundColor = '#10b981';
    } else if (event.type === 'home') {
      backgroundColor = '#3b82f6';
    } else if (event.type === 'leave') {
      backgroundColor = '#f87171';
    }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Calendar</h1>
          <p className="text-slate-500 mt-1">View your team's work status and schedules</p>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-slate-600">Office</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-slate-600">Work from Home</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <span className="text-sm text-slate-600">Leave</span>
            </div>
          </div>

          {/* Controls */}
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

      {/* Calendar Card */}
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

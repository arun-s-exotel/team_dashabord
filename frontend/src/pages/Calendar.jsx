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
        borderRadius: '4px',
        color: 'white',
        border: 'none',
        fontSize: '12px'
      }
    };
  }, []);

  const handleNavigate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Employees</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'month' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors border-l border-gray-300 ${
                  view === 'week' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Week
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-emerald-500"></div>
          <span className="text-sm text-gray-600">Office</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span className="text-sm text-gray-600">Work from Home</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-400"></div>
          <span className="text-sm text-gray-600">Leave</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg shadow">
          <div className="text-gray-500">Loading calendar...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-4" style={{ height: 700 }}>
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

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, isToday, addDays } from 'date-fns';
import { workStatus, users, schedules } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, office: 0, wfh: 0, leave: 0 });
  const [todayStatuses, setTodayStatuses] = useState([]);
  const [weekStatuses, setWeekStatuses] = useState([]);
  const [myStatus, setMyStatus] = useState(null);
  const [myShift, setMyShift] = useState(null);
  const [upcomingLeaves, setUpcomingLeaves] = useState([]);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const todayStr = format(today, 'yyyy-MM-dd');
      const weekEndStr = format(addDays(today, 7), 'yyyy-MM-dd');

      const [usersRes, statusRes, schedulesRes] = await Promise.all([
        users.getAll(),
        workStatus.getAll({ 
          startDate: format(weekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd')
        }),
        schedules.getAll({
          startDate: todayStr,
          endDate: todayStr,
          userId: user.id
        })
      ]);

      const allUsers = usersRes.data;
      const allStatuses = statusRes.data;

      // Today's stats
      const todayData = allStatuses.filter(s => s.date === todayStr);
      setTodayStatuses(todayData);
      setWeekStatuses(allStatuses);

      const officeCount = todayData.filter(s => s.status === 'office').length;
      const wfhCount = todayData.filter(s => s.status === 'home').length;
      const leaveCount = todayData.filter(s => s.status === 'leave').length;

      setStats({
        total: allUsers.length,
        office: officeCount,
        wfh: wfhCount,
        leave: leaveCount
      });

      // My status for today
      const myTodayStatus = todayData.find(s => s.userId === user.id);
      setMyStatus(myTodayStatus || null);

      // My shift for today
      if (schedulesRes.data.length > 0) {
        setMyShift(schedulesRes.data[0].shift);
      }

      // Upcoming leaves this week
      const leaves = allStatuses
        .filter(s => s.status === 'leave' && new Date(s.date) >= today)
        .slice(0, 5);
      setUpcomingLeaves(leaves);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setTodayStatus = async (status) => {
    setSaving(true);
    try {
      await workStatus.update({
        date: format(today, 'yyyy-MM-dd'),
        status,
        leaveType: status === 'leave' ? 'full' : null,
        notes: null
      });
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const getStatusForDay = (day) => {
    return weekStatuses.filter(s => isSameDay(parseISO(s.date), day));
  };

  const getMyStatusForDay = (day) => {
    return weekStatuses.find(s => s.userId === user.id && isSameDay(parseISO(s.date), day));
  };

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Team Size</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">In Office</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.office}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">Work from Home</p>
              <p className="text-2xl font-bold text-blue-600">{stats.wfh}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-slate-500">On Leave</p>
              <p className="text-2xl font-bold text-amber-600">{stats.leave}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Week Overview - Takes 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">This Week</h2>
            <Link to="/calendar" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View full calendar →
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const dayStatuses = getStatusForDay(day);
              const myDayStatus = getMyStatusForDay(day);
              const isCurrentDay = isToday(day);

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
                  
                  {/* Status indicators */}
                  <div className="flex justify-center gap-1 mt-2">
                    {dayStatuses.length > 0 ? (
                      <>
                        {dayStatuses.filter(s => s.status === 'office').length > 0 && (
                          <div className={`w-2 h-2 rounded-full ${isCurrentDay ? 'bg-emerald-300' : 'bg-emerald-500'}`} />
                        )}
                        {dayStatuses.filter(s => s.status === 'home').length > 0 && (
                          <div className={`w-2 h-2 rounded-full ${isCurrentDay ? 'bg-blue-300' : 'bg-blue-500'}`} />
                        )}
                        {dayStatuses.filter(s => s.status === 'leave').length > 0 && (
                          <div className={`w-2 h-2 rounded-full ${isCurrentDay ? 'bg-amber-300' : 'bg-amber-500'}`} />
                        )}
                      </>
                    ) : (
                      <div className={`w-2 h-2 rounded-full ${isCurrentDay ? 'bg-white/30' : 'bg-slate-300'}`} />
                    )}
                  </div>

                  {/* My status badge */}
                  {myDayStatus && (
                    <div className={`mt-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      isCurrentDay ? 'bg-white/20 text-white' : 
                      myDayStatus.status === 'office' ? 'bg-emerald-100 text-emerald-700' :
                      myDayStatus.status === 'home' ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {myDayStatus.status === 'office' ? 'Office' : myDayStatus.status === 'home' ? 'WFH' : 'Leave'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-600">Office</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm text-slate-600">WFH</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-slate-600">Leave</span>
            </div>
          </div>
        </div>

        {/* Quick Actions - Takes 1 column */}
        <div className="space-y-4">
          {/* Set Today's Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Today's Status</h3>
            
            {myStatus ? (
              <div className={`p-4 rounded-xl text-center ${
                myStatus.status === 'office' ? 'bg-emerald-50 border-2 border-emerald-200' :
                myStatus.status === 'home' ? 'bg-blue-50 border-2 border-blue-200' :
                'bg-amber-50 border-2 border-amber-200'
              }`}>
                <span className="text-2xl">
                  {myStatus.status === 'office' ? '🏢' : myStatus.status === 'home' ? '🏠' : '🌴'}
                </span>
                <p className={`mt-2 font-semibold ${
                  myStatus.status === 'office' ? 'text-emerald-700' :
                  myStatus.status === 'home' ? 'text-blue-700' :
                  'text-amber-700'
                }`}>
                  {myStatus.status === 'office' ? 'In Office' : myStatus.status === 'home' ? 'Working from Home' : 'On Leave'}
                </p>
                <Link to="/my-status" className="text-xs text-slate-500 hover:text-slate-700 mt-2 inline-block">
                  Change status →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 mb-3">Set your status for today:</p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTodayStatus('office')}
                    disabled={saving}
                    className="p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border-2 border-transparent hover:border-emerald-300 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <span className="text-xl">🏢</span>
                    <span className="text-xs font-medium text-emerald-700">Office</span>
                  </button>
                  <button
                    onClick={() => setTodayStatus('home')}
                    disabled={saving}
                    className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 border-2 border-transparent hover:border-blue-300 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <span className="text-xl">🏠</span>
                    <span className="text-xs font-medium text-blue-700">WFH</span>
                  </button>
                  <button
                    onClick={() => setTodayStatus('leave')}
                    disabled={saving}
                    className="p-3 rounded-xl bg-amber-50 hover:bg-amber-100 border-2 border-transparent hover:border-amber-300 transition-all flex flex-col items-center gap-1 disabled:opacity-50"
                  >
                    <span className="text-xl">🌴</span>
                    <span className="text-xs font-medium text-amber-700">Leave</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* My Shift Today */}
          {myShift && (
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white">
              <h3 className="text-sm font-medium text-indigo-100 mb-2">Today's Shift</h3>
              <p className="text-lg font-bold">{myShift.name}</p>
              <p className="text-indigo-100 mt-1">{myShift.startTime} - {myShift.endTime}</p>
            </div>
          )}

          {/* Upcoming Leaves */}
          {upcomingLeaves.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Upcoming Leaves</h3>
              <div className="space-y-3">
                {upcomingLeaves.map(leave => (
                  <div key={leave.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-semibold text-xs">
                      {leave.user?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{leave.user?.name}</p>
                      <p className="text-xs text-slate-500">{format(parseISO(leave.date), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link to="/my-status" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-sm text-slate-700">Update My Status</span>
              </Link>
              <Link to="/calendar" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm text-slate-700">View Calendar</span>
              </Link>
              <Link to="/reports" className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm text-slate-700">View Reports</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, addDays, startOfWeek, endOfWeek, isWeekend } from 'date-fns';
import { workStatus, schedules, users } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MyStatus() {
  const { user, isAdmin } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statuses, setStatuses] = useState([]);
  const [mySchedules, setMySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  
  // Target user for admin impersonation
  const [targetUserId, setTargetUserId] = useState(user.id);
  const targetUser = allUsers.find(u => u.id === targetUserId) || user;
  
  // Form state
  const [selectedStatus, setSelectedStatus] = useState('office');
  const [dateMode, setDateMode] = useState('today');
  const [customStartDate, setCustomStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [leaveType, setLeaveType] = useState('full');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isAdmin) {
      users.getAll().then(res => {
        setAllUsers(res.data);
      }).catch(console.error);
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const userId = isAdmin ? targetUserId : user.id;
      
      const [statusRes, scheduleRes] = await Promise.all([
        workStatus.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
          userId
        }),
        schedules.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
          userId
        })
      ]);

      setStatuses(statusRes.data);
      setMySchedules(scheduleRes.data);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentMonth, targetUserId]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getStatusForDate = (date) => {
    return statuses.find(s => isSameDay(parseISO(s.date), date));
  };

  const getDatesFromMode = () => {
    const today = new Date();
    
    switch (dateMode) {
      case 'today':
        return [format(today, 'yyyy-MM-dd')];
      case 'tomorrow':
        return [format(addDays(today, 1), 'yyyy-MM-dd')];
      case 'week': {
        const weekStart = startOfWeek(today, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
        const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
        return weekDays
          .filter(d => !isWeekend(d) && d >= today)
          .map(d => format(d, 'yyyy-MM-dd'));
      }
      case 'custom': {
        const start = parseISO(customStartDate);
        const end = parseISO(customEndDate);
        if (end < start) return [];
        const customDays = eachDayOfInterval({ start, end });
        return customDays.map(d => format(d, 'yyyy-MM-dd'));
      }
      default:
        return [];
    }
  };

  const getDateModeLabel = () => {
    const dates = getDatesFromMode();
    if (dates.length === 0) return 'No dates selected';
    if (dates.length === 1) return format(parseISO(dates[0]), 'EEE, MMM d');
    return `${dates.length} days (${format(parseISO(dates[0]), 'MMM d')} - ${format(parseISO(dates[dates.length - 1]), 'MMM d')})`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dates = getDatesFromMode();
    
    if (dates.length === 0) {
      alert('Please select at least one date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dates,
        status: selectedStatus,
        leaveType: selectedStatus === 'leave' ? leaveType : null,
        notes: notes || null
      };
      
      if (isAdmin && targetUserId !== user.id) {
        payload.userId = targetUserId;
      }
      
      await workStatus.bulkUpdate(payload);
      
      setNotes('');
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const navigateMonth = (delta) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const getStatusColor = (status) => {
    switch (status?.status) {
      case 'office': return 'bg-emerald-500';
      case 'home': return 'bg-blue-500';
      case 'leave': return 'bg-amber-500';
      default: return 'bg-slate-200';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.status) {
      case 'office': return 'bg-emerald-50 border-emerald-200';
      case 'home': return 'bg-blue-50 border-blue-200';
      case 'leave': return 'bg-amber-50 border-amber-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfMonth).fill(null);
  const isManagingOther = isAdmin && targetUserId !== user.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isManagingOther ? 'Manage Status' : 'My Status'}
        </h1>
        <p className="text-slate-500 mt-1">
          {isManagingOther 
            ? `Setting status for ${targetUser.name}`
            : 'Set your daily work status'
          }
        </p>
      </div>

      {/* Admin: Employee Selector */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200 p-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-purple-600 uppercase tracking-wider mb-1">
                Admin: Manage status for
              </label>
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-slate-900 font-medium"
              >
                <option value={user.id}>Myself ({user.name})</option>
                {allUsers.filter(u => u.id !== user.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Set Status Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-slate-900">Set Status</h2>
          {isManagingOther && (
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
              For: {targetUser.name}
            </span>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">What's the status?</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'office', label: 'Office', icon: '🏢', color: 'emerald' },
                { value: 'home', label: 'Work from Home', icon: '🏠', color: 'blue' },
                { value: 'leave', label: 'Leave', icon: '🌴', color: 'amber' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    selectedStatus === option.value
                      ? option.color === 'emerald' 
                        ? 'border-emerald-500 bg-emerald-50'
                        : option.color === 'blue'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <span className={`text-sm font-medium ${
                    selectedStatus === option.value ? 'text-slate-900' : 'text-slate-600'
                  }`}>
                    {option.label}
                  </span>
                  {selectedStatus === option.value && (
                    <svg className={`w-5 h-5 ${
                      option.color === 'emerald' ? 'text-emerald-500' :
                      option.color === 'blue' ? 'text-blue-500' : 'text-amber-500'
                    }`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">When?</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'week', label: 'This Week' },
                { value: 'custom', label: 'Custom Range' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDateMode(option.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    dateMode === option.value
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {dateMode === 'custom' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={customStartDate}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                  />
                </div>
              </div>
            )}

            <p className="text-sm text-slate-500 mt-2">
              Selected: <span className="font-medium text-slate-700">{getDateModeLabel()}</span>
            </p>
          </div>

          {/* Leave Type */}
          {selectedStatus === 'leave' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Leave Type</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 'full', label: 'Full Day' },
                  { value: 'first_half', label: 'First Half' },
                  { value: 'second_half', label: 'Second Half' }
                ].map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setLeaveType(option.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      leaveType === option.value
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              placeholder="Add any notes..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || getDatesFromMode().length === 0}
            className={`w-full py-3 text-white rounded-xl transition-all font-semibold disabled:opacity-50 shadow-lg ${
              isManagingOther 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/25'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
            }`}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : (
              <>
                {isManagingOther ? `Save for ${targetUser.name?.split(' ')[0]}` : 'Save Status'}
                {getDatesFromMode().length > 1 ? ` (${getDatesFromMode().length} days)` : ''}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Calendar Overview */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Status Overview</h2>
            {isManagingOther && (
              <p className="text-sm text-slate-500">Showing {targetUser.name}'s status</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700 min-w-[120px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => navigateMonth(1)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-semibold text-slate-400 uppercase tracking-wider py-2">
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {paddingDays.map((_, i) => (
              <div key={`pad-${i}`} className="aspect-square" />
            ))}
            {days.map(day => {
              const status = getStatusForDate(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square p-1.5 rounded-xl border ${getStatusBg(status)} ${
                    isCurrentDay ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                  }`}
                >
                  <div className="h-full flex flex-col items-center justify-center gap-1">
                    <span className={`text-sm font-medium ${
                      isCurrentDay ? 'text-blue-600' : status ? 'text-slate-700' : 'text-slate-400'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {status && (
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100">
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
    </div>
  );
}

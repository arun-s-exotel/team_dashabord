import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, isPast, isFuture } from 'date-fns';
import { workStatus, schedules } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function MyStatus() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [statuses, setStatuses] = useState([]);
  const [mySchedules, setMySchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [formData, setFormData] = useState({ status: 'office', leaveType: '', notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      
      const [statusRes, scheduleRes] = await Promise.all([
        workStatus.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
          userId: user.id
        }),
        schedules.getAll({
          startDate: format(start, 'yyyy-MM-dd'),
          endDate: format(end, 'yyyy-MM-dd'),
          userId: user.id
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
  }, [currentMonth, user.id]);

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const getStatusForDate = (date) => {
    return statuses.find(s => isSameDay(parseISO(s.date), date));
  };

  const getScheduleForDate = (date) => {
    return mySchedules.find(s => isSameDay(parseISO(s.date), date));
  };

  const handleDayClick = (date) => {
    const existing = getStatusForDate(date);
    setSelectedDate(date);
    if (existing) {
      setFormData({
        status: existing.status,
        leaveType: existing.leaveType || '',
        notes: existing.notes || ''
      });
    } else {
      setFormData({ status: 'office', leaveType: '', notes: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;

    setSaving(true);
    try {
      await workStatus.update({
        date: format(selectedDate, 'yyyy-MM-dd'),
        status: formData.status,
        leaveType: formData.status === 'leave' ? formData.leaveType : null,
        notes: formData.notes || null
      });
      setSelectedDate(null);
      loadData();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedDate) return;
    if (!window.confirm('Clear status for this day?')) return;

    setSaving(true);
    try {
      await workStatus.delete(format(selectedDate, 'yyyy-MM-dd'));
      setSelectedDate(null);
      loadData();
    } catch (error) {
      console.error('Failed to clear status:', error);
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
      case 'leave': return 'bg-red-400';
      default: return 'bg-gray-200';
    }
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfMonth).fill(null);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Status</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Loading...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {paddingDays.map((_, i) => (
                  <div key={`pad-${i}`} className="aspect-square" />
                ))}
                {days.map(day => {
                  const status = getStatusForDate(day);
                  const schedule = getScheduleForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square p-1 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-transparent hover:border-gray-300'
                      } ${isToday(day) ? 'bg-yellow-50' : ''}`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-sm ${isToday(day) ? 'font-bold text-blue-600' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="flex-1 flex items-center justify-center">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                        </div>
                        {schedule && (
                          <div className="text-xs text-gray-500 truncate">
                            {schedule.shift.name.split(' ')[0]}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-600">Office</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-600">WFH</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm text-gray-600">Leave</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-200" />
                <span className="text-sm text-gray-600">Not set</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          {selectedDate ? (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </h3>

              {getScheduleForDate(selectedDate) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-500">Assigned Shift</div>
                  <div className="font-medium">
                    {getScheduleForDate(selectedDate).shift.name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {getScheduleForDate(selectedDate).shift.startTime} - {getScheduleForDate(selectedDate).shift.endTime}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="status"
                        value="office"
                        checked={formData.status === 'office'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value, leaveType: '' })}
                        className="w-4 h-4 text-emerald-600"
                      />
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <span>Office</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="status"
                        value="home"
                        checked={formData.status === 'home'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value, leaveType: '' })}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span>Work from Home</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="status"
                        value="leave"
                        checked={formData.status === 'leave'}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-4 h-4 text-red-600"
                      />
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <span>Leave</span>
                    </label>
                  </div>
                </div>

                {formData.status === 'leave' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Leave Type</label>
                    <select
                      value={formData.leaveType}
                      onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select type</option>
                      <option value="full">Full Day</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  {getStatusForDate(selectedDate) && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={saving}
                      className="py-2 px-4 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              <p>Click on a day to set your status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

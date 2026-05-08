import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns';
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
      default: return 'bg-slate-200';
    }
  };

  const getStatusBg = (status) => {
    switch (status?.status) {
      case 'office': return 'bg-emerald-50 border-emerald-200';
      case 'home': return 'bg-blue-50 border-blue-200';
      case 'leave': return 'bg-red-50 border-red-200';
      default: return 'bg-white border-slate-200';
    }
  };

  const firstDayOfMonth = startOfMonth(currentMonth).getDay();
  const paddingDays = Array(firstDayOfMonth).fill(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Status</h1>
        <p className="text-slate-500 mt-1">Set your daily work status</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
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
                  const schedule = getScheduleForDate(day);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => handleDayClick(day)}
                      className={`aspect-square p-1.5 rounded-xl border-2 transition-all ${getStatusBg(status)} ${
                        isSelected
                          ? 'ring-2 ring-blue-500 ring-offset-2 border-blue-500'
                          : 'hover:border-slate-300'
                      } ${isToday(day) ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                    >
                      <div className="h-full flex flex-col items-center justify-center gap-1">
                        <span className={`text-sm font-medium ${
                          isToday(day) ? 'text-amber-600' : status ? 'text-slate-700' : 'text-slate-500'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {status && (
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                        )}
                      </div>
                    </button>
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
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm text-slate-600">Leave</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Form */}
        <div>
          {selectedDate ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                {format(selectedDate, 'EEEE')}
              </h3>
              <p className="text-slate-500 text-sm mb-6">
                {format(selectedDate, 'MMMM d, yyyy')}
              </p>

              {getScheduleForDate(selectedDate) && (
                <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="text-xs font-medium text-indigo-600 uppercase tracking-wider mb-1">Assigned Shift</div>
                  <div className="font-semibold text-slate-900">
                    {getScheduleForDate(selectedDate).shift.name}
                  </div>
                  <div className="text-sm text-slate-600">
                    {getScheduleForDate(selectedDate).shift.startTime} - {getScheduleForDate(selectedDate).shift.endTime}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Status</label>
                  <div className="space-y-2">
                    {[
                      { value: 'office', label: 'Office', color: 'emerald', icon: '🏢' },
                      { value: 'home', label: 'Work from Home', color: 'blue', icon: '🏠' },
                      { value: 'leave', label: 'Leave', color: 'red', icon: '🌴' }
                    ].map(option => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.status === option.value
                            ? `border-${option.color}-500 bg-${option.color}-50`
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="status"
                          value={option.value}
                          checked={formData.status === option.value}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value, leaveType: '' })}
                          className="sr-only"
                        />
                        <span className="text-xl">{option.icon}</span>
                        <span className={`font-medium ${formData.status === option.value ? 'text-slate-900' : 'text-slate-600'}`}>
                          {option.label}
                        </span>
                        {formData.status === option.value && (
                          <svg className={`w-5 h-5 ml-auto text-${option.color}-500`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                {formData.status === 'leave' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Leave Type</label>
                    <select
                      value={formData.leaveType}
                      onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    >
                      <option value="">Select type</option>
                      <option value="full">Full Day</option>
                      <option value="first_half">First Half</option>
                      <option value="second_half">Second Half</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    placeholder="Add any notes..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50 shadow-lg shadow-blue-500/25"
                  >
                    {saving ? 'Saving...' : 'Save Status'}
                  </button>
                  {getStatusForDate(selectedDate) && (
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={saving}
                      className="py-3 px-4 text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors font-semibold disabled:opacity-50"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-200 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">Select a date</p>
              <p className="text-slate-400 text-sm mt-1">Click on any day to set your status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

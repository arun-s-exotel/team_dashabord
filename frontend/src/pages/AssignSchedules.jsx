import { useState, useEffect, useMemo } from 'react';
import { format, eachDayOfInterval, parseISO } from 'date-fns';
import { users, shifts, schedules } from '../api/client';
import { useFeedback } from '../context/FeedbackContext';

export default function AssignSchedules() {
  const { success, error: toastError } = useFeedback();
  const [allUsers, setAllUsers] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentSchedules, setCurrentSchedules] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [usersRes, shiftsRes] = await Promise.all([
          users.getAll(),
          shifts.getAll()
        ]);
        setAllUsers(usersRes.data);
        setAllShifts(shiftsRes.data);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const loadSchedules = async () => {
    if (!startDate || !endDate) return;
    if (new Date(startDate) > new Date(endDate)) return;
    setLoadingSchedules(true);
    try {
      const res = await schedules.getAll({ startDate, endDate });
      setCurrentSchedules(res.data);
    } catch (error) {
      console.error('Failed to load current schedules:', error);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [startDate, endDate]);

  const dateRange = useMemo(() => {
    if (!startDate || !endDate) return [];
    try {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      if (start > end) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [startDate, endDate]);

  const isMultiDay = dateRange.length > 1;
  const datesToShow = expandedView ? dateRange : dateRange.slice(0, 1);

  const groupByShiftForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const daySchedules = currentSchedules.filter(s => s.date.slice(0, 10) === dateKey);
    const assignedUserIds = new Set(daySchedules.map(s => s.userId));

    const shiftGroups = allShifts.map(shift => ({
      shift,
      users: daySchedules
        .filter(s => s.shiftId === shift.id)
        .map(s => s.user)
        .sort((a, b) => a.name.localeCompare(b.name))
    }));

    const unassigned = allUsers
      .filter(u => !assignedUserIds.has(u.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { shiftGroups, unassigned };
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === allUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(allUsers.map(u => u.id));
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      toastError('Please select at least one employee');
      return;
    }

    if (!selectedShift) {
      toastError('Please select a shift');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toastError('Start date must be before end date');
      return;
    }

    setSaving(true);

    try {
      const res = await schedules.bulkAssign({
        userIds: selectedUsers,
        shiftId: selectedShift,
        startDate,
        endDate
      });
      success(res.data.message);
      setSelectedUsers([]);
      setSelectedShift('');
      await loadSchedules();
    } catch (err) {
      toastError(err.response?.data?.error || 'Failed to assign schedules');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assign Schedules</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">1. Select Employees</h2>
          
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.length === allUsers.length && allUsers.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Select All</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allUsers.map(user => (
              <label 
                key={user.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedUsers.includes(user.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleUserToggle(user.id)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{user.name}</div>
                  <div className="text-sm text-gray-500 truncate">{user.email}</div>
                </div>
              </label>
            ))}
          </div>

          <p className="mt-4 text-sm text-gray-500">
            {selectedUsers.length} employee{selectedUsers.length !== 1 ? 's' : ''} selected
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">2. Select Shift</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {allShifts.map(shift => (
              <label
                key={shift.id}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedShift === shift.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="shift"
                  checked={selectedShift === shift.id}
                  onChange={() => setSelectedShift(shift.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="font-medium text-gray-900">{shift.name}</div>
                  <div className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</div>
                </div>
              </label>
            ))}
          </div>

          {allShifts.length === 0 && (
            <p className="text-gray-500">No shifts available. Please create shifts first.</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">3. Select Date Range</h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  const next = e.target.value;
                  setStartDate(next);
                  if (next && endDate && next > endDate) setEndDate(next);
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Current Assignments</h2>
              <p className="text-sm text-gray-500">Who is on which shift for the selected range</p>
            </div>
            {isMultiDay && (
              <button
                type="button"
                onClick={() => setExpandedView(v => !v)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {expandedView ? 'Show start date only' : `Show all ${dateRange.length} days`}
              </button>
            )}
          </div>

          {loadingSchedules ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : datesToShow.length === 0 ? (
            <div className="text-sm text-gray-500">Pick a valid date range to see assignments.</div>
          ) : (
            <div className="space-y-6">
              {datesToShow.map(date => {
                const { shiftGroups, unassigned } = groupByShiftForDate(date);
                return (
                  <div key={date.toISOString()}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      {format(date, 'EEE, MMM d, yyyy')}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {shiftGroups.map(({ shift, users: usrs }) => (
                        <div key={shift.id} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-baseline justify-between">
                            <div className="font-medium text-gray-900 text-sm">{shift.name}</div>
                            <div className="text-xs text-gray-500">{usrs.length}</div>
                          </div>
                          <div className="text-xs text-gray-500 mb-2">
                            {shift.startTime} – {shift.endTime}
                          </div>
                          {usrs.length === 0 ? (
                            <div className="text-xs text-gray-400 italic">No one assigned</div>
                          ) : (
                            <ul className="space-y-1">
                              {usrs.map(u => (
                                <li key={u.id} className="text-sm text-gray-700 truncate" title={u.name}>
                                  {u.name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                      {unassigned.length > 0 && (
                        <div className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                          <div className="flex items-baseline justify-between">
                            <div className="font-medium text-amber-900 text-sm">Unassigned</div>
                            <div className="text-xs text-amber-700">{unassigned.length}</div>
                          </div>
                          <div className="text-xs text-amber-700 mb-2">No shift this day</div>
                          <ul className="space-y-1">
                            {unassigned.map(u => (
                              <li key={u.id} className="text-sm text-amber-900 truncate" title={u.name}>
                                {u.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Assigning...' : 'Assign Schedules'}
          </button>
        </div>
      </form>
    </div>
  );
}

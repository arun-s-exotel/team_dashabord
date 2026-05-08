import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { users, shifts, schedules } from '../api/client';

export default function AssignSchedules() {
  const [allUsers, setAllUsers] = useState([]);
  const [allShifts, setAllShifts] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedShift, setSelectedShift] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    setMessage({ type: '', text: '' });

    if (selectedUsers.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one employee' });
      return;
    }

    if (!selectedShift) {
      setMessage({ type: 'error', text: 'Please select a shift' });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage({ type: 'error', text: 'Start date must be before end date' });
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
      setMessage({ type: 'success', text: res.data.message });
      setSelectedUsers([]);
      setSelectedShift('');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to assign schedules' });
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

      {message.text && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

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
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
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

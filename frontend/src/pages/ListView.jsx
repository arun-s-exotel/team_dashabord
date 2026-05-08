import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { workStatus, schedules, users } from '../api/client';

export default function ListView() {
  const [data, setData] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allSchedules, setAllSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedUser, setSelectedUser] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, statusRes, schedulesRes] = await Promise.all([
        users.getAll(),
        workStatus.getAll({ startDate, endDate }),
        schedules.getAll({ startDate, endDate })
      ]);

      setAllUsers(usersRes.data);
      setAllSchedules(schedulesRes.data);

      const statusMap = {};
      statusRes.data.forEach(s => {
        const key = `${s.userId}-${format(new Date(s.date), 'yyyy-MM-dd')}`;
        statusMap[key] = s;
      });

      const scheduleMap = {};
      schedulesRes.data.forEach(s => {
        const key = `${s.userId}-${format(new Date(s.date), 'yyyy-MM-dd')}`;
        scheduleMap[key] = s;
      });

      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate)
      });

      const rows = [];
      usersRes.data.forEach(user => {
        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const key = `${user.id}-${dateStr}`;
          const status = statusMap[key];
          const schedule = scheduleMap[key];

          rows.push({
            id: key,
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            date: day,
            dateStr,
            status: status?.status || null,
            leaveType: status?.leaveType || null,
            notes: status?.notes || null,
            shift: schedule?.shift || null
          });
        });
      });

      setData(rows);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const filteredData = data.filter(row => {
    if (selectedUser !== 'all' && row.userId !== selectedUser) return false;
    if (statusFilter !== 'all' && row.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status, leaveType) => {
    if (!status) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Not set</span>;
    }
    if (status === 'office') {
      return <span className="px-2 py-1 text-xs rounded-full bg-emerald-100 text-emerald-700">Office</span>;
    }
    if (status === 'home') {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">WFH</span>;
    }
    if (status === 'leave') {
      const leaveLabel = leaveType === 'full' ? 'Full Day' : leaveType === 'first_half' ? '1st Half' : '2nd Half';
      return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700">Leave ({leaveLabel})</span>;
    }
    return null;
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule List</h1>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Employees</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="office">Office</option>
              <option value="home">Work from Home</option>
              <option value="leave">Leave</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow">
          <div className="text-gray-500">Loading...</div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shift</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No data found for the selected filters
                    </td>
                  </tr>
                ) : (
                  filteredData.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {format(row.date, 'EEE, MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{row.userName}</div>
                        <div className="text-sm text-gray-500">{row.userEmail}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(row.status, row.leaveType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {row.shift ? (
                          <div>
                            <div className="font-medium">{row.shift.name}</div>
                            <div className="text-gray-500">{row.shift.startTime} - {row.shift.endTime}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {row.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
            Showing {filteredData.length} entries
          </div>
        </div>
      )}
    </div>
  );
}

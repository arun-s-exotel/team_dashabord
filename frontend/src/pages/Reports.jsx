import { useState, useEffect } from 'react';
import { format, subMonths } from 'date-fns';
import { reports } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';

function monthKey(d) {
  return format(d, 'yyyy-MM');
}

function monthOptions() {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    out.push({ value: monthKey(d), label: format(d, 'MMMM yyyy') });
  }
  return out;
}

export default function Reports() {
  const { isEffectiveAdmin } = useAuth();
  const { success, error: toastError } = useFeedback();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const options = monthOptions();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reports.nightShift({ month });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const handleExport = async () => {
    try {
      const res = await reports.nightShiftExport({ month });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `night-shift-allowance-${month}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      success('CSV downloaded');
    } catch (err) {
      toastError('Failed to export CSV');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Night Shift Report</h1>
          <p className="text-slate-500 mt-1">
            {isEffectiveAdmin
              ? 'Night-shift days per team member for allowance calculation.'
              : 'Your night-shift days this month.'}
          </p>
        </div>
        {isEffectiveAdmin && (
          <button
            onClick={handleExport}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors font-semibold shadow-lg shadow-blue-500/25"
          >
            Export CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Month</label>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {data?.note && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-sm">
          {data.note}
        </div>
      )}

      {!loading && data && data.nightShifts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Shifts counted as night ({data.nightShifts.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.nightShifts.map(s => (
              <span key={s.id} className="inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                {s.name} ({s.startTime}–{s.endTime})
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 flex items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : data && data.rows.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{data.totals.totalNightShiftDays}</span> total night-shift days across
              <span className="font-semibold text-slate-900"> {data.totals.totalEmployeesWithNightShifts}</span> {data.totals.totalEmployeesWithNightShifts === 1 ? 'person' : 'people'}
            </p>
            <p className="text-sm text-slate-500">{data.period.startDate} → {data.period.endDate}</p>
          </div>
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Night Shifts</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.rows.map(row => (
                <tr key={row.user.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-semibold">
                        {row.user.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-slate-900">{row.user.name}</div>
                        <div className="text-xs text-slate-500">{row.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold ${row.nightShiftDays > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                      {row.nightShiftDays}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {Object.keys(row.byShift).length === 0 ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(row.byShift).map(([name, count]) => (
                          <span key={name} className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {name}: {count}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-sm text-slate-500">
          No night-shift assignments in this month.
        </div>
      )}
    </div>
  );
}

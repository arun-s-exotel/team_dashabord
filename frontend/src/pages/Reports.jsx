import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { reports } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useFeedback } from '../context/FeedbackContext';
import { NIGHT_SHIFT_ALLOWANCE } from '../lib/constants';
import { recentCycles, cycleLabel, cycleKey, fmtDate } from '../lib/cycle';

export default function Reports() {
  const { isEffectiveAdmin } = useAuth();
  const { success, error: toastError } = useFeedback();
  const cycles = recentCycles(12);
  const [selectedKey, setSelectedKey] = useState(cycleKey(cycles[0]));
  const selectedCycle = cycles.find(c => cycleKey(c) === selectedKey) || cycles[0];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reports.nightShift({
        startDate: fmtDate(selectedCycle.start),
        endDate: fmtDate(selectedCycle.end),
      });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [selectedKey]);

  const handleExport = async () => {
    try {
      const res = await reports.nightShiftExport({
        startDate: fmtDate(selectedCycle.start),
        endDate: fmtDate(selectedCycle.end),
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `night-shift-allowance-${fmtDate(selectedCycle.start)}-to-${fmtDate(selectedCycle.end)}.csv`;
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
              ? `Night-shift days per team member. Allowance cycles run 20th–19th.`
              : 'Your night-shift days for the selected cycle.'}
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
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Allowance cycle</label>
        <select
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          {cycles.map((c, i) => (
            <option key={cycleKey(c)} value={cycleKey(c)}>
              {cycleLabel(c)}{i === 0 ? ' (current)' : ''}
            </option>
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

      {isEffectiveAdmin && !loading && data && data.nightShifts.length > 0 && (
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
      ) : !isEffectiveAdmin && data ? (
        <EmployeeReport data={data} />
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
          No night-shift assignments in this cycle.
        </div>
      )}
    </div>
  );
}

function EmployeeReport({ data }) {
  const row = data.rows[0];
  const count = row?.nightShiftDays || 0;
  const allowance = count * NIGHT_SHIFT_ALLOWANCE;
  const dates = row?.dates || [];

  if (count === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
        <p className="text-sm text-slate-500">No night shifts worked in this cycle.</p>
        <p className="text-xs text-slate-400 mt-2">{data.period.startDate} → {data.period.endDate}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-sm p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Allowance this cycle</p>
        <p className="text-4xl font-bold mt-2">₹{allowance.toLocaleString('en-IN')}</p>
        <p className="text-sm opacity-90 mt-2">
          {count} night {count === 1 ? 'shift' : 'shifts'} × ₹{NIGHT_SHIFT_ALLOWANCE}
        </p>
        <p className="text-xs opacity-75 mt-3">{data.period.startDate} → {data.period.endDate}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-900">Dates worked</h2>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Allowance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dates.map((d, i) => (
              <tr key={`${d.date}-${i}`} className="hover:bg-slate-50">
                <td className="px-6 py-3 text-sm text-slate-900">
                  {format(new Date(d.date), 'EEE, MMM d, yyyy')}
                </td>
                <td className="px-6 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                    {d.shiftName}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm font-medium text-slate-900 text-right">
                  ₹{NIGHT_SHIFT_ALLOWANCE.toLocaleString('en-IN')}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-6 py-3 text-sm text-slate-900" colSpan={2}>Total</td>
              <td className="px-6 py-3 text-sm text-slate-900 text-right">
                ₹{allowance.toLocaleString('en-IN')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

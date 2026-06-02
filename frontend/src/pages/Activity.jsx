import { useState, useEffect } from 'react';
import { auditLogs } from '../api/client';

const ACTION_LABELS = {
  bulk_assign_schedules: 'Bulk assign schedules',
  delete_schedule: 'Delete schedule',
  deactivate_user: 'Deactivate user',
  reactivate_user: 'Reactivate user',
  change_user_role: 'Change user role',
  create_shift: 'Create shift',
  update_shift: 'Update shift',
  deactivate_shift: 'Deactivate shift',
  add_allowed_email: 'Add allowed email',
  remove_allowed_email: 'Remove allowed email',
  update_allowed_email_role: 'Update allowed-email role'
};

const ACTION_TONES = {
  bulk_assign_schedules: 'amber',
  delete_schedule: 'red',
  deactivate_user: 'red',
  reactivate_user: 'green',
  change_user_role: 'purple',
  create_shift: 'green',
  update_shift: 'blue',
  deactivate_shift: 'red',
  add_allowed_email: 'green',
  remove_allowed_email: 'red',
  update_allowed_email_role: 'purple'
};

const TONE_CLASSES = {
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-green-50 text-green-700 border-green-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  slate: 'bg-slate-50 text-slate-700 border-slate-200'
};

const PAGE_SIZE = 50;

function formatActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function formatTimestamp(iso) {
  const d = new Date(iso);
  return d.toLocaleString();
}

function EntitySummary({ entry }) {
  const m = entry.metadata || {};
  switch (entry.action) {
    case 'bulk_assign_schedules': {
      const overwritten = m.overwrittenSchedules?.length ?? 0;
      return `${m.userIds?.length ?? 0} users × ${m.startDate} → ${m.endDate}, shift "${m.shiftName}", ${m.operationsWritten} writes${overwritten ? `, ${overwritten} overwritten` : ''}`;
    }
    case 'delete_schedule':
      return `${m.userEmail} on ${m.date?.slice(0, 10)} (shift "${m.shiftName}")`;
    case 'deactivate_user':
    case 'reactivate_user':
      return m.targetEmail;
    case 'change_user_role':
      return `${m.targetEmail}: ${m.previousRole} → ${m.newRole}`;
    case 'create_shift':
    case 'deactivate_shift':
      return `${m.name} (${m.startTime} – ${m.endTime})`;
    case 'update_shift':
      return `${m.current?.name} (${m.current?.startTime} – ${m.current?.endTime})`;
    case 'add_allowed_email':
    case 'remove_allowed_email':
      return `${m.email}${m.role ? ` (${m.role})` : ''}`;
    case 'update_allowed_email_role':
      return `${m.email}: ${m.previousRole} → ${m.newRole}`;
    default:
      return entry.entityType ? `${entry.entityType}${entry.entityId ? ' ' + entry.entityId.slice(0, 8) : ''}` : '';
  }
}

export default function Activity() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    actorEmail: '',
    startDate: '',
    endDate: ''
  });
  const [offset, setOffset] = useState(0);
  const [actionOptions, setActionOptions] = useState([]);
  const [expanded, setExpanded] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset };
      if (filters.action) params.action = filters.action;
      if (filters.actorEmail) params.actorEmail = filters.actorEmail;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const res = await auditLogs.list(params);
      setEntries(res.data.items);
      setTotal(res.data.total);
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [offset, filters]);

  useEffect(() => {
    auditLogs.actions()
      .then(res => setActionOptions(res.data))
      .catch(() => {});
  }, []);

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setOffset(0);
  };

  const clearFilters = () => {
    setFilters({ action: '', actorEmail: '', startDate: '', endDate: '' });
    setOffset(0);
  };

  const toggleExpanded = (id) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasFilters = filters.action || filters.actorEmail || filters.startDate || filters.endDate;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
        <p className="text-slate-500 mt-1">Audit trail of every destructive or admin action on the data.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Action</label>
            <select
              value={filters.action}
              onChange={(e) => updateFilter('action', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All actions</option>
              {actionOptions.map(a => (
                <option key={a} value={a}>{formatActionLabel(a)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actor email</label>
            <input
              type="text"
              value={filters.actorEmail}
              onChange={(e) => updateFilter('actorEmail', e.target.value)}
              placeholder="name@exotel.com"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">From</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => updateFilter('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">To</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => updateFilter('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{total}</span> total entries
            {loading && <span className="ml-2 text-slate-400">Loading...</span>}
          </p>
        </div>

        {entries.length === 0 && !loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            No audit entries match the current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {entries.map(entry => {
              const tone = ACTION_TONES[entry.action] || 'slate';
              const isOpen = expanded.has(entry.id);
              return (
                <div key={entry.id} className="px-6 py-4 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${TONE_CLASSES[tone]}`}>
                          {formatActionLabel(entry.action)}
                        </span>
                        <span className="text-sm text-slate-600 truncate">
                          {entry.actorEmail}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-700 truncate">
                        <EntitySummary entry={entry} />
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        {formatTimestamp(entry.createdAt)}
                      </div>
                    </div>
                    {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                      <button
                        onClick={() => toggleExpanded(entry.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex-shrink-0"
                      >
                        {isOpen ? 'Hide' : 'Details'}
                      </button>
                    )}
                  </div>
                  {isOpen && entry.metadata && (
                    <pre className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {total > PAGE_SIZE && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setOffset(o => Math.max(0, o - PAGE_SIZE))}
              disabled={offset === 0}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <p className="text-sm text-slate-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </p>
            <button
              onClick={() => setOffset(o => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= total}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

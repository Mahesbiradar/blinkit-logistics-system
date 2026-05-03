import { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useFastagActions, useFastagDetail, useFastagRecords } from '../../hooks/useExpenses';
import { useVehicles } from '../../hooks/useVehicles';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

// ── Create form ───────────────────────────────────────────────────────────────

const CreateForm = ({ vehicles, defaultMonth, onSubmit, isSaving, onCancel }) => {
  const [form, setForm] = useState({
    vehicle_id: '',
    month_year: monthToDate(defaultMonth),
    opening_balance: '0',
  });
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Create Fastag Record</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle</span>
          <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Month</span>
          <input
            type="month"
            required
            value={form.month_year.slice(0, 7)}
            onChange={(e) => set('month_year', monthToDate(e.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Opening Balance</span>
          <input
            type="number"
            step="0.01"
            value={form.opening_balance}
            onChange={(e) => set('opening_balance', e.target.value)}
            className={fieldClass}
          />
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
          {isSaving ? 'Creating...' : 'Create'}
        </button>
      </div>
    </form>
  );
};

// ── Detail drawer ─────────────────────────────────────────────────────────────

const DetailDrawer = ({ recordId, onClose }) => {
  const { data, isLoading } = useFastagDetail(recordId);
  const detail = data?.data?.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {detail ? `${detail.vehicle_number} — ${new Date(detail.month_year + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}` : 'Fastag Details'}
          </h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : detail ? (
          <div className="p-5 space-y-5">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">Previous Remaining</span>
                <strong className="text-gray-900">₹ {fmt(detail.previous_remaining)}</strong>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Recharges This Month</h3>
              {detail.recharge_breakdown?.length > 0 ? (
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                        <th className="px-3 py-2 text-left">Paid To</th>
                        <th className="px-3 py-2 text-left">Mode</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.recharge_breakdown.map((r) => (
                        <tr key={r.id}>
                          <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.expense_date)}</td>
                          <td className="px-3 py-2 text-right font-medium">₹ {fmt(r.amount)}</td>
                          <td className="px-3 py-2 text-gray-500">{r.paid_to_name || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 capitalize">{r.payment_mode}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No recharge expenses recorded.</p>
              )}
              <div className="mt-2 flex justify-between text-sm font-semibold">
                <span>Total Recharged</span>
                <span>₹ {fmt(detail.recharge_amount)}</span>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Used (statement)</span>
                <span className="font-medium">₹ {fmt(detail.used_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold">
                <span>Remaining</span>
                <span className={Number(detail.remaining) >= 0 ? 'text-green-700' : 'text-red-600'}>
                  ₹ {fmt(detail.remaining)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5 text-gray-500">No data available.</div>
        )}
      </div>
    </div>
  );
};

// ── Inline USED cell ──────────────────────────────────────────────────────────

const UsedCell = ({ record, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(record.used_amount || '');

  const commit = () => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0 && num !== Number(record.used_amount)) {
      onSave(num);
    }
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        className="w-28 rounded border border-blue-400 px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200"
      />
    );
  }

  const hasValue = Number(record.used_amount) > 0;
  return (
    <button
      onClick={() => { setValue(record.used_amount || ''); setEditing(true); }}
      className="flex items-center gap-1.5 text-sm"
      title="Click to edit"
    >
      {hasValue ? (
        <>
          <span className="font-medium text-gray-900">₹ {fmt(record.used_amount)}</span>
          <span className="text-green-600 text-xs">✓</span>
        </>
      ) : (
        <span className="text-gray-400 italic">Enter amount ✏️</span>
      )}
    </button>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const FastagManagement = () => {
  const [filters, setFilters] = useState({ vehicle_id: '', month: currentMonth() });
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);

  const params = {
    ...(filters.vehicle_id ? { vehicle_id: filters.vehicle_id } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
  };

  const { data, isLoading } = useFastagRecords(params);
  const actions = useFastagActions();
  const { vehicles } = useVehicles({ is_active: true });
  const records = data?.data?.data || [];

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {detailId && <DetailDrawer recordId={detailId} onClose={() => setDetailId(null)} />}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fastag Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">Monthly Fastag balances per vehicle, independent from settlements.</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {showCreate ? 'Close' : 'Add Record'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <select
          value={filters.vehicle_id}
          onChange={(e) => setFilters((f) => ({ ...f, vehicle_id: e.target.value }))}
          className={fieldClass}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
        </select>
        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          className={fieldClass}
        />
      </div>

      {showCreate && (
        <CreateForm
          vehicles={vehicles}
          defaultMonth={filters.month}
          isSaving={actions.isCreatingFastag}
          onCancel={() => setShowCreate(false)}
          onSubmit={(form) => actions.createFastagRecord(form, { onSuccess: () => setShowCreate(false) })}
        />
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>
                {['Vehicle', 'Month', 'Recharge', 'Used', 'Remaining', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400">
                    No Fastag records found.
                  </td>
                </tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.vehicle_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(record.month_year + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-gray-900">₹ {fmt(record.recharge_amount)}</span>
                      <button
                        onClick={() => actions.refreshFastagRecharge(record.id)}
                        className="rounded p-0.5 text-gray-400 hover:text-indigo-600"
                        title="Refresh recharge from expenses"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <UsedCell
                      record={record}
                      onSave={(val) =>
                        actions.updateFastagRecord({ id: record.id, data: { used_amount: val } })
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`font-semibold ${Number(record.remaining) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      ₹ {fmt(record.remaining)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailId(record.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FastagManagement;

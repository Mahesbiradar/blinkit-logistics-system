import { useMemo, useState } from 'react';
import { Calculator, CheckCircle, CreditCard, RefreshCw, RotateCcw, Truck } from 'lucide-react';
import { useExpenseBreakdown } from '../../hooks/useExpenses';
import { usePaymentActions, usePayments } from '../../hooks/usePayments';
import { useVehicles } from '../../hooks/useVehicles';
import { PAYMENT_MODES } from '../../services/expenseService';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

const statusClass = {
  draft: 'bg-gray-100 text-gray-700',
  finalized: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

// ── Create form ───────────────────────────────────────────────────────────────

const initialCreateForm = {
  vehicle_id: '',
  month_year: monthToDate(currentMonth()),
  total_days: '',
  working_days: '',
  total_km: '',
  base_amount: '',
  absent_penalty_days: '',
  absent_penalty_amount: '',
  extra_km_amount: '',
  remarks: '',
};

const CreateForm = ({ vehicles, onSubmit, isSaving, onCancel }) => {
  const [form, setForm] = useState(initialCreateForm);
  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Create Draft Settlement</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        {[
          ['base_amount', 'Base Amount'],
          ['working_days', 'Working Days'],
          ['total_days', 'Total Days'],
          ['total_km', 'Total KM'],
          ['absent_penalty_days', 'Absent Penalty Days'],
          ['absent_penalty_amount', 'Absent Penalty Amount'],
          ['extra_km_amount', 'Extra KM Amount'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
            <input
              type="number"
              min="0"
              step={field.includes('days') ? '1' : '0.01'}
              value={form[field]}
              onChange={(e) => set(field, e.target.value)}
              className={fieldClass}
            />
          </label>
        ))}
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</span>
          <input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
          {isSaving ? 'Saving...' : 'Create Settlement'}
        </button>
      </div>
    </form>
  );
};

// ── Recalculate modal ─────────────────────────────────────────────────────────

const RecalcModal = ({ onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-gray-900">Recalculate from Trips?</h2>
      <p className="mt-2 text-sm text-gray-600">
        This will reset Working Days and Total KM from approved trip data.
        Any manual overrides will be cleared. Continue?
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={isLoading} className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
          {isLoading ? 'Recalculating...' : 'Confirm'}
        </button>
      </div>
    </div>
  </div>
);

// ── Detail panel ──────────────────────────────────────────────────────────────

const DetailPanel = ({ settlement, actions, queryClient }) => {
  const locked = settlement.status !== 'draft';
  const [editForm, setEditForm] = useState(null);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [payForm, setPayForm] = useState({ paid_amount: '', payment_mode: 'cash', transaction_reference: '' });

  const breakdownParams = {
    vehicle_id: settlement.vehicle,
    month_year: settlement.month_year,
  };
  const { data: breakdownRes, refetch: refetchBreakdown } = useExpenseBreakdown(breakdownParams);
  const breakdown = breakdownRes?.data?.data;

  const startEdit = () =>
    setEditForm({
      working_days: settlement.working_days,
      working_days_manual: settlement.working_days_manual,
      total_km: settlement.total_km,
      total_km_manual: settlement.total_km_manual,
      base_amount: settlement.base_amount,
      absent_penalty_days: settlement.absent_penalty_days,
      absent_penalty_amount: settlement.absent_penalty_amount,
      extra_km_amount: settlement.extra_km_amount,
      remarks: settlement.remarks,
    });

  const handleEditChange = (field, value) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'working_days') next.working_days_manual = true;
      if (field === 'total_km') next.total_km_manual = true;
      return next;
    });
  };

  const handleSaveEdit = () => {
    actions.updateSettlement(
      { id: settlement.id, data: editForm },
      { onSuccess: () => setEditForm(null) },
    );
  };

  const handleRecalc = () => {
    actions.recalculateFromTrips(settlement.id, {
      onSuccess: () => setShowRecalcModal(false),
    });
  };

  const grossPreview = editForm
    ? Number(editForm.base_amount || 0) - Number(editForm.absent_penalty_amount || 0) + Number(editForm.extra_km_amount || 0)
    : Number(settlement.gross_amount || 0);

  return (
    <div className="space-y-5">
      {showRecalcModal && (
        <RecalcModal
          isLoading={actions.isRecalculating}
          onConfirm={handleRecalc}
          onCancel={() => setShowRecalcModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {settlement.vehicle_number} — {new Date(settlement.month_year + 'T00:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
          </h2>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[settlement.status] || 'bg-gray-100 text-gray-700'}`}>
            {settlement.status}
          </span>
        </div>
        {locked && (
          <button
            onClick={() => actions.reopenSettlement(settlement.id)}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
          >
            <RotateCcw className="h-4 w-4" />Re-open
          </button>
        )}
      </div>

      {/* Section 1 — Trip Summary */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Trip Summary</h3>
          {!locked && (
            <button
              onClick={() => setShowRecalcModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />Recalculate from Trips
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs uppercase text-gray-500">Total Days</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{settlement.total_days} <span className="text-xs font-normal text-gray-400">(auto)</span></div>
          </div>

          {editForm ? (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Working Days {editForm.working_days_manual && <span className="text-orange-500">(manual)</span>}</span>
                <input type="number" min="0" step="1" value={editForm.working_days} onChange={(e) => handleEditChange('working_days', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Total KM {editForm.total_km_manual && <span className="text-orange-500">(manual)</span>}</span>
                <input type="number" min="0" step="0.01" value={editForm.total_km} onChange={(e) => handleEditChange('total_km', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Base Amount</span>
                <input type="number" min="0" step="0.01" value={editForm.base_amount} onChange={(e) => handleEditChange('base_amount', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Absent Penalty Days</span>
                <input type="number" min="0" step="1" value={editForm.absent_penalty_days} onChange={(e) => handleEditChange('absent_penalty_days', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Absent Penalty Amount</span>
                <input type="number" min="0" step="0.01" value={editForm.absent_penalty_amount} onChange={(e) => handleEditChange('absent_penalty_amount', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Extra KM Amount</span>
                <input type="number" min="0" step="0.01" value={editForm.extra_km_amount} onChange={(e) => handleEditChange('extra_km_amount', e.target.value)} className={fieldClass} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium text-gray-500 uppercase">Remarks</span>
                <input value={editForm.remarks} onChange={(e) => handleEditChange('remarks', e.target.value)} className={fieldClass} />
              </label>
            </>
          ) : (
            <>
              {[
                ['Working Days', settlement.working_days, settlement.working_days_manual],
                ['Total KM', settlement.total_km, settlement.total_km_manual],
                ['Base Amount', `₹ ${fmt(settlement.base_amount)}`, false],
                ['Absent Penalty Days', settlement.absent_penalty_days, false],
                ['Absent Penalty Amount', `₹ ${fmt(settlement.absent_penalty_amount)}`, false],
                ['Extra KM Amount', `₹ ${fmt(settlement.extra_km_amount)}`, false],
              ].map(([label, val, manual]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs uppercase text-gray-500">{label} {manual && <span className="text-orange-500">(manual)</span>}</div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">{val}</div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
          <span className="text-sm font-medium text-gray-600">Gross Amount</span>
          <span className="text-lg font-bold text-gray-900">₹ {fmt(settlement.gross_amount || grossPreview)}</span>
        </div>

        {!locked && (
          <div className="mt-4 flex gap-3">
            {editForm ? (
              <>
                <button onClick={() => setEditForm(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
                <button onClick={handleSaveEdit} disabled={actions.isUpdating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
                  {actions.isUpdating ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Edit</button>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Expenses This Month */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Expenses This Month</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => refetchBreakdown()} className="rounded p-1 text-gray-400 hover:text-indigo-600" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <a
              href={`/admin/expenses?vehicle_id=${settlement.vehicle}&month_year=${settlement.month_year}`}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Expense Details →
            </a>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {breakdown?.breakdown?.length > 0 ? (
            breakdown.breakdown.map((row) => (
              <div key={row.expense_type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{row.label}</span>
                <span className="text-sm font-medium text-gray-900">₹ {fmt(row.amount)}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-400">No expenses recorded yet.</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm font-semibold text-gray-700">Total Paid</span>
          <span className="text-base font-bold text-gray-900">₹ {fmt(breakdown?.total_paid ?? settlement.total_expenses)}</span>
        </div>
      </div>

      {/* Section 3 — Final Settlement */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-gray-700 uppercase tracking-wide text-xs">Final Settlement</h3>

        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Gross Amount</span><span>₹ {fmt(settlement.gross_amount)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">− Total Paid</span><span>₹ {fmt(settlement.total_expenses)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-gray-600">+ Carry Forward</span><span>₹ {fmt(settlement.carry_forward_from_previous)}</span></div>
        </div>

        <div className={`mt-4 rounded-xl p-4 text-center ${Number(settlement.balance_payable) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Balance Payable</div>
          <div className={`mt-1 text-3xl font-bold ${Number(settlement.balance_payable) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            ₹ {fmt(settlement.balance_payable)}
          </div>
        </div>

        {settlement.status === 'paid' && (
          <div className="mt-3 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Paid ₹ {fmt(settlement.paid_amount)} · {settlement.payment_mode}
            {settlement.transaction_reference && ` · Ref: ${settlement.transaction_reference}`}
          </div>
        )}

        {settlement.status === 'draft' && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => actions.calculateSettlement(settlement.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <Calculator className="h-4 w-4" />Calculate
            </button>
            <button
              onClick={() => window.confirm('Finalize this settlement?') && actions.finalizeSettlement(settlement.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              <CheckCircle className="h-4 w-4" />Finalize
            </button>
          </div>
        )}

        {settlement.status === 'finalized' && (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Paid Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payForm.paid_amount}
                onChange={(e) => setPayForm((p) => ({ ...p, paid_amount: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Payment Mode</span>
              <select value={payForm.payment_mode} onChange={(e) => setPayForm((p) => ({ ...p, payment_mode: e.target.value }))} className={fieldClass}>
                {[...PAYMENT_MODES, { value: 'bank_transfer', label: 'Bank Transfer' }].map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Reference</span>
              <input
                value={payForm.transaction_reference}
                onChange={(e) => setPayForm((p) => ({ ...p, transaction_reference: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <button
              onClick={() => actions.markPaid({ id: settlement.id, ...payForm })}
              disabled={!payForm.paid_amount || actions.isMarkingPaid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              <CreditCard className="h-4 w-4" />Mark as Paid
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

const VehicleSettlements = () => {
  const [filters, setFilters] = useState({ vehicle_id: '', month: currentMonth(), status: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const params = {
    ...(filters.vehicle_id ? { vehicle_id: filters.vehicle_id } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data, isLoading } = usePayments(params);
  const actions = usePaymentActions();
  const { vehicles } = useVehicles({ is_active: true });

  const settlements = data?.data?.data || [];
  const selected = useMemo(
    () => settlements.find((s) => s.id === selectedId) || settlements[0],
    [settlements, selectedId],
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Settlements</h1>
          <p className="mt-1 text-sm text-gray-500">Monthly vehicle closing documents.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? 'Close form' : 'Create Settlement'}
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
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={fieldClass}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="finalized">Finalized</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {showForm && (
        <CreateForm
          vehicles={vehicles}
          isSaving={actions.isCreating}
          onCancel={() => setShowForm(false)}
          onSubmit={(form) => actions.createSettlement(form, { onSuccess: () => setShowForm(false) })}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,1fr)]">
        {/* List */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  {['Vehicle', 'Month', 'Gross', 'Expenses', 'Balance', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settlements.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No settlements found</td></tr>
                ) : settlements.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer hover:bg-gray-50 ${selected?.id === s.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      <Truck className="mr-1.5 inline h-4 w-4 text-gray-400" />{s.vehicle_number}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(s.month_year + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm">₹ {fmt(s.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm">₹ {fmt(s.total_expenses)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">₹ {fmt(s.balance_payable)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass[s.status] || 'bg-gray-100 text-gray-700'}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <DetailPanel key={selected.id} settlement={selected} actions={actions} />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            Select a settlement to view details.
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleSettlements;

import { useMemo, useState } from 'react';
import { useQuery } from 'react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle, Calculator, CheckCircle, CreditCard, RefreshCw,
  RotateCcw, Trash2, Truck, X,
} from 'lucide-react';
import { useExpenseBreakdown } from '../../hooks/useExpenses';
import { useDeleteSettlement, usePaymentActions, usePayments } from '../../hooks/usePayments';
import { useVehicles } from '../../hooks/useVehicles';
import expenseService, { EXPENSE_TYPES, PAYMENT_MODES } from '../../services/expenseService';
import { getErrorMessage } from '../../utils/apiError';

// ── Helpers ───────────────────────────────────────────────────────────────────

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

function toMonthYear(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-01$/.test(value)) return value;
  if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  const d = new Date(value);
  if (!isNaN(d)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`;
  }
  return value;
}

const fmt = (value) =>
  Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtLabel = (monthYear) => {
  if (!monthYear) return '';
  return new Date(monthYear + 'T00:00:00').toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  });
};

// ── Constants ─────────────────────────────────────────────────────────────────

const fieldClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

const statusClass = {
  draft: 'bg-gray-100 text-gray-700',
  finalized: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

const paymentStatusClass = {
  partial: 'bg-orange-100 text-orange-700',
  overpaid: 'bg-blue-100 text-blue-700',
  full: 'bg-green-100 text-green-700',
};

const ALL_PAYMENT_MODES = [
  ...PAYMENT_MODES,
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

// ── Create form ───────────────────────────────────────────────────────────────

const initialCreateForm = {
  vehicle_id: '',
  month_year: toMonthYear(currentMonth()),
  billing_mode: 'full_month',
  total_days: '',
  working_days: '',
  total_km: '',
  base_amount: '',
  absent_penalty_days: '',
  absent_penalty_amount: '',
  km_slab: '',
  extra_km_units: '',
  extra_km_rate: '',
  pending_prev_month: '',
  overpaid_prev_month: '',
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
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle *</span>
          <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
            <option value="">Select vehicle</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Month *</span>
          <input
            type="month"
            required
            value={form.month_year.slice(0, 7)}
            onChange={(e) => set('month_year', toMonthYear(e.target.value))}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Billing Mode</span>
          <select value={form.billing_mode} onChange={(e) => set('billing_mode', e.target.value)} className={fieldClass}>
            <option value="full_month">Full Month Rate</option>
            <option value="daily_rate">Daily Rate</option>
          </select>
        </label>
        {[
          ['base_amount', 'Base Amount *'],
          ['total_days', 'Total Days'],
          ['working_days', 'Working Days'],
          ['total_km', 'Total KM'],
          ['absent_penalty_days', 'Absent Penalty Days'],
          ['absent_penalty_amount', 'Absent Penalty Amount'],
          ['km_slab', 'KM Slab'],
          ['extra_km_units', 'Extra KM Units'],
          ['extra_km_rate', 'Extra KM Rate (₹/km)'],
          ['pending_prev_month', 'Prev Month Pending'],
          ['overpaid_prev_month', 'Prev Month Overpaid'],
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

// ── Recalculate confirmation modal ────────────────────────────────────────────

const RecalcModal = ({ onConfirm, onCancel, isLoading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
      <h2 className="text-lg font-semibold text-gray-900">Recalculate from Trips?</h2>
      <p className="mt-2 text-sm text-gray-600">
        This will reset Working Days and Total KM from approved trip data.
        Manual overrides will be cleared. Continue?
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

// ── Expense detail modal ──────────────────────────────────────────────────────

const ExpenseDetailModal = ({ vehicleId, monthYear, vehicleNumber, onClose }) => {
  const { data, isLoading } = useQuery(
    ['expense-list-modal', vehicleId, monthYear],
    () => expenseService.getExpenses({ vehicle_id: vehicleId, month_year: monthYear }),
    { enabled: Boolean(vehicleId && monthYear) },
  );
  const expenses = data?.data?.data?.expenses || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Expenses — {vehicleNumber}</h2>
            <p className="text-sm text-gray-500">{fmtLabel(monthYear)}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : expenses.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No expenses recorded for this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {['Date', 'Type', 'Amount', 'Paid To', 'Mode', 'Remarks'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.map((e) => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{e.expense_date}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs capitalize">
                          {EXPENSE_TYPES.find((t) => t.value === e.expense_type)?.label || e.expense_type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-semibold text-gray-900">₹ {fmt(e.amount)}</td>
                      <td className="px-3 py-2 text-gray-600">{e.paid_to_name || '—'}</td>
                      <td className="px-3 py-2 capitalize text-gray-500">{e.payment_mode || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-[200px] truncate">{e.remarks || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 border-t pt-3 text-right text-sm font-semibold text-gray-900">
                Total: ₹ {fmt(expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Detail panel ──────────────────────────────────────────────────────────────

const DetailPanel = ({ settlement, actions, onDelete }) => {
  const [editForm, setEditForm] = useState(null);
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [payForm, setPayForm] = useState({
    paid_amount: '',
    payment_mode: 'phonepay',
    transaction_reference: '',
  });

  const breakdownParams = {
    vehicle_id: settlement.vehicle,
    month_year: settlement.month_year,
  };
  const { data: breakdownRes, refetch: refetchBreakdown, isLoading: isBreakdownLoading } = useExpenseBreakdown(breakdownParams);
  const breakdown = breakdownRes?.data?.data;

  const startEdit = () =>
    setEditForm({
      total_days: settlement.total_days,
      working_days: settlement.working_days,
      working_days_manual: settlement.working_days_manual,
      total_km: settlement.total_km,
      total_km_manual: settlement.total_km_manual,
      base_amount: settlement.base_amount,
      absent_penalty_days: settlement.absent_penalty_days,
      absent_penalty_amount: settlement.absent_penalty_amount,
      billing_mode: settlement.billing_mode || 'full_month',
      km_slab: settlement.km_slab,
      extra_km_units: settlement.extra_km_units,
      extra_km_rate: settlement.extra_km_rate,
      pending_prev_month: settlement.pending_prev_month,
      overpaid_prev_month: settlement.overpaid_prev_month,
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

  const handleMarkPaid = () => {
    if (!payForm.paid_amount || Number(payForm.paid_amount) <= 0) {
      toast.error('Enter a valid paid amount');
      return;
    }
    actions.markPaid(
      { id: settlement.id, ...payForm },
      {
        onSuccess: (res) => {
          const s = res?.data?.data;
          if (!s) return;
          const ps = s.payment_status;
          const bal = s.balance_payable;
          const paid = s.paid_amount;
          if (ps === 'full') toast.success(`Fully settled — ₹${fmt(paid)} paid`);
          else if (ps === 'partial') toast.success(`Partial payment — ₹${fmt(paid)} paid. ₹${fmt(Math.abs(bal - paid))} carries to next month`);
          else if (ps === 'overpaid') toast.success(`Overpaid by ₹${fmt(Math.abs(Number(paid) - Number(s.balance_payable)))} — credit carries to next month`);
        },
      },
    );
  };

  // Live preview calculations for edit mode
  const editedDailyRate = editForm && editForm.total_days > 0
    ? (Number(editForm.base_amount || 0) / Number(editForm.total_days || 1)).toFixed(2)
    : '0.00';
  const editedRentTotal = editForm
    ? editForm.billing_mode === 'full_month'
      ? Number(editForm.base_amount || 0)
      : Number(editForm.working_days || 0) * Number(editedDailyRate)
    : 0;
  const editedExtraKmAmt = editForm
    ? Number(editForm.extra_km_units || 0) * Number(editForm.extra_km_rate || 0)
    : 0;
  const editedGross = editedRentTotal + editedExtraKmAmt;

  const hasPendingPrev = Number(settlement.pending_prev_month || 0) > 0;
  const hasOverpaidPrev = Number(settlement.overpaid_prev_month || 0) > 0;

  return (
    <div className="space-y-5">
      {showRecalcModal && (
        <RecalcModal
          isLoading={actions.isRecalculating}
          onConfirm={handleRecalc}
          onCancel={() => setShowRecalcModal(false)}
        />
      )}
      {showExpenseModal && (
        <ExpenseDetailModal
          vehicleId={settlement.vehicle}
          monthYear={settlement.month_year}
          vehicleNumber={settlement.vehicle_number}
          onClose={() => setShowExpenseModal(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {settlement.vehicle_number} — {fmtLabel(settlement.month_year)}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[settlement.status] || 'bg-gray-100 text-gray-700'}`}>
              {settlement.status}
            </span>
            {settlement.payment_status && settlement.payment_status !== 'unpaid' && (
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${paymentStatusClass[settlement.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                {settlement.payment_status}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {settlement.status === 'finalized' && (
            <button
              onClick={() => actions.reopenSettlement(settlement.id)}
              disabled={actions.isReopening}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
            >
              <RotateCcw className="h-4 w-4" />Re-open
            </button>
          )}
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" />Delete
          </button>
        </div>
      </div>

      {/* ── Section 1: Trip Summary ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Trip Summary</h3>
          <button
            onClick={() => setShowRecalcModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />Recalculate from Trips
          </button>
        </div>

        {editForm ? (
          <div className="mt-4 space-y-4">
            {/* Billing mode radio */}
            <div>
              <span className="mb-2 block text-xs font-medium uppercase text-gray-500">Billing Mode</span>
              <div className="flex gap-4">
                {[['full_month', 'Full Month Rate'], ['daily_rate', 'Daily Rate']].map(([val, lbl]) => (
                  <label key={val} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="billing_mode"
                      value={val}
                      checked={editForm.billing_mode === val}
                      onChange={() => handleEditChange('billing_mode', val)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Total Days (auto)</span>
                <input type="number" min="0" step="1" value={editForm.total_days} onChange={(e) => handleEditChange('total_days', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Working Days {editForm.working_days_manual && <span className="text-orange-500">(manual)</span>}
                </span>
                <input type="number" min="0" step="1" value={editForm.working_days} onChange={(e) => handleEditChange('working_days', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">
                  Total KM {editForm.total_km_manual && <span className="text-orange-500">(manual)</span>}
                </span>
                <input type="number" min="0" step="0.01" value={editForm.total_km} onChange={(e) => handleEditChange('total_km', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Base Amount *</span>
                <input type="number" min="0" step="0.01" value={editForm.base_amount} onChange={(e) => handleEditChange('base_amount', e.target.value)} className={fieldClass} />
              </label>
              {editForm.billing_mode === 'daily_rate' && (
                <div className="rounded-lg bg-blue-50 p-3 md:col-span-2">
                  <div className="text-xs font-medium uppercase text-blue-500">Daily Rate (computed)</div>
                  <div className="mt-1 text-base font-semibold text-blue-800">
                    ₹ {editedDailyRate}
                    <span className="ml-2 text-xs font-normal text-blue-500">= {editForm.base_amount || 0} ÷ {editForm.total_days || 1} days</span>
                  </div>
                </div>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">KM Slab</span>
                <input type="number" min="0" step="0.01" value={editForm.km_slab} onChange={(e) => handleEditChange('km_slab', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Extra KM Units</span>
                <input type="number" min="0" step="0.01" value={editForm.extra_km_units} onChange={(e) => handleEditChange('extra_km_units', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">KM Rate (₹/km)</span>
                <input type="number" min="0" step="0.01" value={editForm.extra_km_rate} onChange={(e) => handleEditChange('extra_km_rate', e.target.value)} className={fieldClass} />
              </label>
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs uppercase text-gray-500">Extra KM Amount (computed)</div>
                <div className="mt-1 text-base font-semibold text-gray-900">₹ {fmt(editedExtraKmAmt)}</div>
              </div>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Absent Penalty Days</span>
                <input type="number" min="0" step="1" value={editForm.absent_penalty_days} onChange={(e) => handleEditChange('absent_penalty_days', e.target.value)} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Absent Penalty Amount</span>
                <input type="number" min="0" step="0.01" value={editForm.absent_penalty_amount} onChange={(e) => handleEditChange('absent_penalty_amount', e.target.value)} className={fieldClass} />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-xs font-medium uppercase text-gray-500">Remarks</span>
                <input value={editForm.remarks} onChange={(e) => handleEditChange('remarks', e.target.value)} className={fieldClass} />
              </label>
            </div>

            {/* Gross preview */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Rent Total</span>
                <span className="font-semibold text-blue-800">₹ {fmt(editedRentTotal)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-blue-600">Extra KM Amount</span>
                <span className="font-semibold text-blue-800">₹ {fmt(editedExtraKmAmt)}</span>
              </div>
              <div className="mt-2 border-t border-blue-200 pt-2 flex justify-between">
                <span className="font-semibold text-blue-700">Gross Amount (preview)</span>
                <span className="text-lg font-bold text-blue-900">₹ {fmt(editedGross)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setEditForm(null)} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={handleSaveEdit} disabled={actions.isUpdating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">
                {actions.isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Billing mode display */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">Billing Mode:</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${settlement.billing_mode === 'daily_rate' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'}`}>
                {settlement.billing_mode === 'daily_rate' ? 'Daily Rate' : 'Full Month Rate'}
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {[
                ['Total Days', settlement.total_days, false, '(auto)'],
                ['Working Days', settlement.working_days, settlement.working_days_manual, null],
                ['Total KM', settlement.total_km, settlement.total_km_manual, null],
                ['Base Amount', `₹ ${fmt(settlement.base_amount)}`, false, null],
              ].map(([label, val, manual, note]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs uppercase text-gray-500">
                    {label} {manual && <span className="text-orange-500">(manual)</span>}
                    {note && <span className="text-gray-400"> {note}</span>}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-gray-900">{val}</div>
                </div>
              ))}

              {settlement.billing_mode === 'daily_rate' && (
                <div className="rounded-lg bg-blue-50 p-3 md:col-span-2">
                  <div className="text-xs uppercase text-blue-500">Daily Rate (computed)</div>
                  <div className="mt-1 text-base font-semibold text-blue-800">₹ {fmt(settlement.daily_rate)}</div>
                </div>
              )}

              {[
                ['KM Slab', settlement.km_slab],
                ['Extra KM Units', settlement.extra_km_units],
                ['KM Rate (₹/km)', settlement.extra_km_rate],
                ['Extra KM Amount', `₹ ${fmt(settlement.extra_km_amount)}`],
                ['Absent Penalty Days', settlement.absent_penalty_days],
                ['Absent Penalty Amount', `₹ ${fmt(settlement.absent_penalty_amount)}`],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg bg-gray-50 p-3">
                  <div className="text-xs uppercase text-gray-500">{label}</div>
                  <div className="mt-1 text-base font-semibold text-gray-900">{val}</div>
                </div>
              ))}
            </div>

            {/* Gross summary */}
            <div className="space-y-1 rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Rent Total</span>
                <span>₹ {fmt(settlement.rent_total)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Extra KM Amount</span>
                <span>₹ {fmt(settlement.extra_km_amount)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold text-blue-700">
                <span>Gross Amount</span>
                <span className="text-lg">₹ {fmt(settlement.gross_amount)}</span>
              </div>
            </div>

            <button onClick={startEdit} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
              Edit
            </button>
          </div>
        )}
      </div>

      {/* ── Section 2: Expenses This Month ─────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Expenses This Month</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => refetchBreakdown()} className="rounded p-1 text-gray-400 hover:text-indigo-600" title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              View Details →
            </button>
          </div>
        </div>

        <div className="mt-4">
          {isBreakdownLoading ? (
            <div className="flex h-16 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : breakdown?.breakdown?.length > 0 ? (
            <div className="space-y-1">
              {breakdown.breakdown.map((row) => (
                <div key={row.expense_type} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{row.label}</span>
                  <span className="text-sm font-medium text-gray-900">₹ {fmt(row.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No expenses logged yet.</p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm font-semibold text-gray-700">Total Paid</span>
          <span className="text-base font-bold text-gray-900">₹ {fmt(breakdown?.total_paid ?? settlement.total_expenses)}</span>
        </div>
      </div>

      {/* ── Section 3: Carry Forward ────────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Carry Forward</h3>

        {!hasPendingPrev && !hasOverpaidPrev ? (
          <p className="mt-3 text-sm text-gray-400">No carry-forward from previous month.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {hasPendingPrev && (
              <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-green-600">Prev Month Pending</div>
                  <div className="text-xs text-green-500">JJR still owes from previous month</div>
                </div>
                <span className="text-base font-bold text-green-700">+ ₹ {fmt(settlement.pending_prev_month)}</span>
              </div>
            )}
            {hasOverpaidPrev && (
              <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-amber-600">Prev Month Overpaid</div>
                  <div className="text-xs text-amber-500">JJR overpaid — reduces current balance</div>
                </div>
                <span className="text-base font-bold text-amber-700">− ₹ {fmt(settlement.overpaid_prev_month)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Section 4: Final Settlement ─────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700">Final Settlement</h3>

        {/* Formula breakdown */}
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Gross Amount</span>
            <span>₹ {fmt(settlement.gross_amount)}</span>
          </div>
          {hasPendingPrev && (
            <div className="flex justify-between text-sm text-green-600">
              <span>+ Prev Month Pending</span>
              <span>₹ {fmt(settlement.pending_prev_month)}</span>
            </div>
          )}
          {hasOverpaidPrev && (
            <div className="flex justify-between text-sm text-amber-600">
              <span>− Prev Month Overpaid</span>
              <span>₹ {fmt(settlement.overpaid_prev_month)}</span>
            </div>
          )}
          {Number(settlement.absent_penalty_amount || 0) > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>− Absent Penalty</span>
              <span>₹ {fmt(settlement.absent_penalty_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm text-red-500">
            <span>− Total Expenses</span>
            <span>₹ {fmt(settlement.total_expenses)}</span>
          </div>
        </div>

        {/* Formula string */}
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400 font-mono">
          = {fmt(settlement.gross_amount)}
          {hasPendingPrev ? ` + ${fmt(settlement.pending_prev_month)}` : ''}
          {hasOverpaidPrev ? ` − ${fmt(settlement.overpaid_prev_month)}` : ''}
          {Number(settlement.absent_penalty_amount || 0) > 0 ? ` − ${fmt(settlement.absent_penalty_amount)}` : ''}
          {` − ${fmt(settlement.total_expenses)}`}
        </div>

        {/* Balance payable */}
        <div className={`mt-4 rounded-xl p-4 text-center ${Number(settlement.balance_payable) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Balance Payable</div>
          <div className={`mt-1 text-3xl font-bold ${Number(settlement.balance_payable) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            ₹ {fmt(settlement.balance_payable)}
          </div>
        </div>

        {/* Payment result banner (paid state) */}
        {settlement.status === 'paid' && (
          <div className={`mt-3 rounded-lg px-4 py-3 text-sm ${
            settlement.payment_status === 'full' ? 'bg-green-50 text-green-700' :
            settlement.payment_status === 'partial' ? 'bg-orange-50 text-orange-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {settlement.payment_status === 'full' && (
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Fully settled — ₹{fmt(settlement.paid_amount)} paid</span>
            )}
            {settlement.payment_status === 'partial' && (
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Partial payment — ₹{fmt(settlement.paid_amount)} paid. Remaining carries to next month.</span>
            )}
            {settlement.payment_status === 'overpaid' && (
              <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" />Overpaid — ₹{fmt(settlement.paid_amount)} paid. Credit carries to next month.</span>
            )}
            {settlement.payment_mode && (
              <div className="mt-1 text-xs opacity-75 capitalize">
                {settlement.payment_mode}
                {settlement.transaction_reference && ` · Ref: ${settlement.transaction_reference}`}
              </div>
            )}
          </div>
        )}

        {/* Action buttons — always shown (CRUD enabled) */}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => actions.calculateSettlement(settlement.id)}
            disabled={actions.isCalculating}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
          >
            <Calculator className="h-4 w-4" />{actions.isCalculating ? 'Calculating...' : 'Calculate'}
          </button>
          <button
            onClick={() => window.confirm('Finalize this settlement? base_amount must be > 0.') && actions.finalizeSettlement(settlement.id)}
            disabled={actions.isFinalizing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300"
          >
            <CheckCircle className="h-4 w-4" />{actions.isFinalizing ? 'Finalizing...' : 'Finalize'}
          </button>
        </div>

        {/* Mark paid form — only when finalized */}
        {settlement.status === 'finalized' && (
          <div className="mt-5 space-y-3 border-t pt-5">
            <div className="text-sm font-semibold text-gray-700">Mark as Paid</div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Payment Amount</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder={fmt(settlement.balance_payable)}
                value={payForm.paid_amount}
                onChange={(e) => setPayForm((p) => ({ ...p, paid_amount: e.target.value }))}
                className={fieldClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Payment Mode</span>
              <select value={payForm.payment_mode} onChange={(e) => setPayForm((p) => ({ ...p, payment_mode: e.target.value }))} className={fieldClass}>
                {ALL_PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700">Reference (UPI/TXN)</span>
              <input
                value={payForm.transaction_reference}
                onChange={(e) => setPayForm((p) => ({ ...p, transaction_reference: e.target.value }))}
                className={fieldClass}
                placeholder="Optional"
              />
            </label>
            <button
              onClick={handleMarkPaid}
              disabled={!payForm.paid_amount || actions.isMarkingPaid}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300"
            >
              <CreditCard className="h-4 w-4" />{actions.isMarkingPaid ? 'Processing...' : 'Mark as Paid'}
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
    ...(filters.month ? { month_year: toMonthYear(filters.month) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data, isLoading } = usePayments(params);
  const actions = usePaymentActions();
  const { mutate: deleteSettlement, isLoading: isDeleting } = useDeleteSettlement();
  const { vehicles } = useVehicles({ is_active: true });

  const handleDelete = (settlement) => {
    if (!window.confirm(`Delete settlement for ${settlement.vehicle_number} (${fmtLabel(settlement.month_year)})? This cannot be undone.`)) return;
    deleteSettlement(settlement.id, {
      onSuccess: () => {
        toast.success('Settlement deleted');
        if (selectedId === settlement.id) setSelectedId(null);
      },
    });
  };

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
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
        </select>
        <input
          type="month"
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          className={fieldClass}
          style={{ width: 'auto' }}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className={fieldClass}
          style={{ width: 'auto', minWidth: 140 }}
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
          onSubmit={(form) => {
            const payload = {
              vehicle_id: form.vehicle_id,
              month_year: toMonthYear(form.month_year),
              billing_mode: form.billing_mode,
            };
            const numFields = ['total_days', 'working_days', 'total_km', 'base_amount',
              'absent_penalty_days', 'absent_penalty_amount', 'km_slab',
              'extra_km_units', 'extra_km_rate', 'pending_prev_month', 'overpaid_prev_month'];
            numFields.forEach((f) => { if (form[f] !== '') payload[f] = form[f]; });
            if (form.remarks) payload.remarks = form.remarks;
            actions.createSettlement(payload, { onSuccess: () => setShowForm(false) });
          }}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,1fr)]">
        {/* Settlement list */}
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  {['Vehicle', 'Month', 'Gross', 'Expenses', 'Balance', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {settlements.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No settlements found</td></tr>
                ) : settlements.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer hover:bg-gray-50 ${selected?.id === s.id ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-4 w-4 text-gray-400" />
                        {s.vehicle_number}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.payment_status === 'partial' && (
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">Partial</span>
                        )}
                        {s.payment_status === 'overpaid' && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">Overpaid</span>
                        )}
                        {Number(s.pending_prev_month || 0) > 0 && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                            Owes ₹{fmt(s.pending_prev_month)}
                          </span>
                        )}
                        {Number(s.overpaid_prev_month || 0) > 0 && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-600">
                            Credit ₹{fmt(s.overpaid_prev_month)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{fmtLabel(s.month_year)}</td>
                    <td className="px-4 py-3 text-sm">₹ {fmt(s.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm">₹ {fmt(s.total_expenses)}</td>
                    <td className={`px-4 py-3 text-sm font-semibold ${Number(s.balance_payable) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ₹ {fmt(s.balance_payable)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass[s.status] || 'bg-gray-100 text-gray-700'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(s)}
                        disabled={isDeleting}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        title="Delete settlement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {selected ? (
          <DetailPanel key={selected.id} settlement={selected} actions={actions} onDelete={() => handleDelete(selected)} />
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

import { useMemo, useState } from 'react';
import { Calculator, CheckCircle, CreditCard, RotateCcw, Truck } from 'lucide-react';
import { PAYMENT_MODES } from '../../services/expenseService';
import { usePaymentActions, usePayments } from '../../hooks/usePayments';
import { useVehicles } from '../../hooks/useVehicles';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN');
const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const initialForm = {
  vehicle_id: '',
  month_year: `${currentMonth()}-01`,
  total_days: '',
  working_days: '',
  total_km: '',
  base_amount: '',
  absent_penalty_days: '',
  absent_penalty_amount: '',
  extra_km_amount: '',
  remarks: '',
};

const statusClass = {
  draft: 'bg-gray-100 text-gray-700',
  finalized: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
};

const SettlementForm = ({ vehicles, onSubmit, isSaving, onCancel }) => {
  const [form, setForm] = useState(initialForm);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">Create Draft Settlement</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle</span>
          <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Month</span>
          <input type="month" required value={form.month_year.slice(0, 7)} onChange={(e) => set('month_year', `${e.target.value}-01`)} className={fieldClass} />
        </label>
        {[
          ['base_amount', 'Base amount'],
          ['working_days', 'Working days'],
          ['total_days', 'Total days'],
          ['total_km', 'Total KM'],
          ['absent_penalty_days', 'Absent penalty days'],
          ['absent_penalty_amount', 'Absent penalty amount'],
          ['extra_km_amount', 'Extra KM amount'],
        ].map(([field, label]) => (
          <label key={field} className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
            <input type="number" min="0" step={field.includes('days') ? '1' : '0.01'} value={form[field]} onChange={(e) => set(field, e.target.value)} className={fieldClass} />
          </label>
        ))}
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</span>
          <input value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={fieldClass} />
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">{isSaving ? 'Saving...' : 'Create Settlement'}</button>
      </div>
    </form>
  );
};

const PaymentModal = ({ settlement, onClose, onSubmit, isSaving }) => {
  const [form, setForm] = useState({
    paid_amount: settlement.balance_payable || '',
    payment_mode: 'cash',
    transaction_reference: '',
  });
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Mark as Paid</h2>
        <p className="mt-1 text-sm text-gray-500">{settlement.vehicle_number} - Rs. {fmt(settlement.balance_payable)}</p>
        <div className="mt-4 space-y-3">
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Paid amount</span><input required type="number" min="0.01" step="0.01" value={form.paid_amount} onChange={(e) => set('paid_amount', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Payment mode</span><select required value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>{[...PAYMENT_MODES, { value: 'bank_transfer', label: 'Bank Transfer' }].map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
          <label className="block"><span className="mb-1 block text-sm font-medium text-gray-700">Reference</span><input value={form.transaction_reference} onChange={(e) => set('transaction_reference', e.target.value)} className={fieldClass} /></label>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" disabled={isSaving} className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Mark Paid</button>
        </div>
      </form>
    </div>
  );
};

const DetailPanel = ({ settlement, actions, setPaymentSettlement }) => {
  const grossPreview = Number(settlement.base_amount || 0) - Number(settlement.absent_penalty_amount || 0) + Number(settlement.extra_km_amount || 0);

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{settlement.vehicle_number} - {new Date(settlement.month_year).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[settlement.status] || 'bg-gray-100 text-gray-700'}`}>{settlement.status}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {[
          ['working_days', 'Working Days'],
          ['total_days', 'Total Days'],
          ['total_km', 'Total KM'],
          ['base_amount', 'Base Amount'],
          ['absent_penalty_days', 'Absent Penalty Days'],
          ['absent_penalty_amount', 'Penalty Amount'],
          ['extra_km_amount', 'Extra KM Amount'],
        ].map(([field, label]) => (
          <div key={field} className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs uppercase text-gray-500">{label}</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">{field.includes('amount') || field === 'base_amount' ? `Rs. ${fmt(settlement[field])}` : settlement[field]}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-3 rounded-xl border border-gray-100 p-4">
        <div className="flex justify-between"><span>Gross Amount</span><strong>Rs. {fmt(settlement.gross_amount || grossPreview)}</strong></div>
        <div className="flex justify-between"><span>Total Expenses</span><strong>Rs. {fmt(settlement.total_expenses)}</strong></div>
        <div className="flex justify-between"><span>Carry Forward</span><strong>Rs. {fmt(settlement.carry_forward_from_previous)}</strong></div>
        <div className="flex justify-between border-t pt-3 text-lg"><span>Balance Payable</span><strong>Rs. {fmt(settlement.balance_payable)}</strong></div>
        {settlement.status === 'paid' && <div className="flex justify-between text-green-700"><span>Paid Amount</span><strong>Rs. {fmt(settlement.paid_amount)}</strong></div>}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {settlement.status !== 'paid' && <button onClick={() => actions.calculateSettlement(settlement.id)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"><Calculator className="h-4 w-4" />Calculate</button>}
        {settlement.status === 'draft' && <button onClick={() => window.confirm('Finalize this settlement?') && actions.finalizeSettlement(settlement.id)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><CheckCircle className="h-4 w-4" />Finalize</button>}
        {settlement.status === 'finalized' && <button onClick={() => setPaymentSettlement(settlement)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white"><CreditCard className="h-4 w-4" />Mark as Paid</button>}
        {settlement.status === 'finalized' && <button onClick={() => actions.reopenSettlement(settlement.id)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"><RotateCcw className="h-4 w-4" />Re-open</button>}
      </div>
    </div>
  );
};

const VehicleSettlements = () => {
  const [filters, setFilters] = useState({ vehicle_id: '', month: currentMonth(), status: '' });
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [paymentSettlement, setPaymentSettlement] = useState(null);
  const params = {
    ...(filters.vehicle_id ? { vehicle_id: filters.vehicle_id } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data, isLoading } = usePayments(params);
  const actions = usePaymentActions();
  const { vehicles } = useVehicles({ is_active: true });
  const settlements = data?.data?.data || [];
  const selected = useMemo(() => settlements.find((item) => item.id === selectedId) || settlements[0], [settlements, selectedId]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {paymentSettlement && <PaymentModal settlement={paymentSettlement} isSaving={actions.isMarkingPaid} onClose={() => setPaymentSettlement(null)} onSubmit={(form) => actions.markPaid({ id: paymentSettlement.id, ...form }, { onSuccess: () => setPaymentSettlement(null) })} />}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Settlements</h1>
          <p className="mt-1 text-sm text-gray-500">Monthly vehicle closing documents replacing the old payments workflow.</p>
        </div>
        <button onClick={() => setShowForm((value) => !value)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{showForm ? 'Close form' : 'Create Settlement'}</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <select value={filters.vehicle_id} onChange={(e) => setFilters((current) => ({ ...current, vehicle_id: e.target.value }))} className={fieldClass}><option value="">All vehicles</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}</select>
        <input type="month" value={filters.month} onChange={(e) => setFilters((current) => ({ ...current, month: e.target.value }))} className={fieldClass} />
        <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} className={fieldClass}><option value="">All statuses</option><option value="draft">Draft</option><option value="finalized">Finalized</option><option value="paid">Paid</option></select>
      </div>

      {showForm && <SettlementForm vehicles={vehicles} isSaving={actions.isCreating} onCancel={() => setShowForm(false)} onSubmit={(form) => actions.createSettlement(form, { onSuccess: () => setShowForm(false) })} />}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-gray-50"><tr>{['Vehicle', 'Month', 'Gross', 'Expenses', 'Balance', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {settlements.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No settlements found</td></tr> : settlements.map((settlement) => (
                  <tr key={settlement.id} onClick={() => setSelectedId(settlement.id)} className={`cursor-pointer hover:bg-gray-50 ${selected?.id === settlement.id ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium"><Truck className="mr-1.5 inline h-4 w-4 text-gray-400" />{settlement.vehicle_number}</td>
                    <td className="px-4 py-3 text-sm">{new Date(settlement.month_year).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-sm">Rs. {fmt(settlement.gross_amount)}</td>
                    <td className="px-4 py-3 text-sm">Rs. {fmt(settlement.total_expenses)}</td>
                    <td className="px-4 py-3 text-sm font-semibold">Rs. {fmt(settlement.balance_payable)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${statusClass[settlement.status] || 'bg-gray-100 text-gray-700'}`}>{settlement.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {selected ? <DetailPanel settlement={selected} actions={actions} setPaymentSettlement={setPaymentSettlement} /> : <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">Select a settlement to view details.</div>}
      </div>
    </div>
  );
};

export default VehicleSettlements;

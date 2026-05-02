import { useState } from 'react';
import { RefreshCw, RotateCcw, Truck } from 'lucide-react';
import { useFastagActions, useFastagRecords } from '../../hooks/useExpenses';
import { useVehicles } from '../../hooks/useVehicles';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const statusClass = {
  open: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-blue-100 text-blue-700',
  closed: 'bg-green-100 text-green-700',
};

const StatementModal = ({ record, onClose, onSubmit, isSaving }) => {
  const [form, setForm] = useState({ fastag_debited_amount: record.fastag_debited_amount || '', statement_image: null });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Enter Statement Amount</h2>
        <p className="mt-1 text-sm text-gray-500">{record.vehicle_number}</p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Fastag debited amount</span>
            <input required type="number" min="0" step="0.01" value={form.fastag_debited_amount} onChange={(e) => setForm((current) => ({ ...current, fastag_debited_amount: e.target.value }))} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Statement image</span>
            <input type="file" accept="image/*" onChange={(e) => setForm((current) => ({ ...current, statement_image: e.target.files?.[0] || null }))} className={fieldClass} />
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" disabled={isSaving} className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Save</button>
        </div>
      </form>
    </div>
  );
};

const CreateRecordForm = ({ vehicles, onSubmit, isSaving, onCancel, defaultMonth }) => {
  const [form, setForm] = useState({ vehicle_id: '', month_year: monthToDate(defaultMonth), opening_balance: '0' });
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Create Fastag Record</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle</span><select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}><option value="">Select vehicle</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}</select></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Month</span><input type="month" required value={form.month_year.slice(0, 7)} onChange={(e) => set('month_year', `${e.target.value}-01`)} className={fieldClass} /></label>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Opening balance</span><input type="number" step="0.01" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} className={fieldClass} /></label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Create</button>
      </div>
    </form>
  );
};

const FastagManagement = () => {
  const [filters, setFilters] = useState({ vehicle_id: '', month: currentMonth(), status: '' });
  const [showCreate, setShowCreate] = useState(false);
  const [statementRecord, setStatementRecord] = useState(null);
  const params = {
    ...(filters.vehicle_id ? { vehicle_id: filters.vehicle_id } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data, isLoading } = useFastagRecords(params);
  const actions = useFastagActions();
  const { vehicles } = useVehicles({ is_active: true });
  const records = data?.data?.data || [];

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {statementRecord && (
        <StatementModal
          record={statementRecord}
          isSaving={actions.isUpdatingFastag}
          onClose={() => setStatementRecord(null)}
          onSubmit={(form) => actions.updateFastagRecord({ id: statementRecord.id, data: form }, { onSuccess: () => setStatementRecord(null) })}
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fastag Ledger</h1>
          <p className="mt-1 text-sm text-gray-500">Monthly Fastag balance cards, independent from settlements.</p>
        </div>
        <button onClick={() => setShowCreate((value) => !value)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{showCreate ? 'Close form' : 'Create Record'}</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <select value={filters.vehicle_id} onChange={(e) => setFilters((current) => ({ ...current, vehicle_id: e.target.value }))} className={fieldClass}><option value="">All vehicles</option>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}</select>
        <input type="month" value={filters.month} onChange={(e) => setFilters((current) => ({ ...current, month: e.target.value }))} className={fieldClass} />
        <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))} className={fieldClass}><option value="">All statuses</option><option value="open">Open</option><option value="submitted">Submitted</option><option value="closed">Closed</option></select>
      </div>

      {showCreate && <CreateRecordForm vehicles={vehicles} defaultMonth={filters.month} isSaving={actions.isCreatingFastag} onCancel={() => setShowCreate(false)} onSubmit={(form) => actions.createFastagRecord(form, { onSuccess: () => setShowCreate(false) })} />}

      <div className="grid gap-4 xl:grid-cols-2">
        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500 xl:col-span-2">No Fastag records found.</div>
        ) : records.map((record) => (
          <div key={record.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900"><Truck className="mr-2 inline h-5 w-5 text-gray-400" />{record.vehicle_number} - {new Date(record.month_year).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass[record.status] || 'bg-gray-100 text-gray-700'}`}>{record.status}</span>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span>Opening Balance</span><strong>Rs. {fmt(record.opening_balance)}</strong></div>
              <div className="flex justify-between"><span>+ Recharged</span><strong>Rs. {fmt(record.fastag_recharged_amount)}</strong></div>
              <div className="flex justify-between"><span>- Debited (stmt)</span><strong>Rs. {fmt(record.fastag_debited_amount)}</strong></div>
              <div className="flex justify-between border-t pt-3 text-base"><span>Closing Balance</span><strong>Rs. {fmt(record.closing_balance)}</strong></div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              {record.status !== 'closed' && <button onClick={() => actions.refreshFastagRecharge(record.id)} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><RefreshCw className="h-4 w-4" />Refresh Recharge</button>}
              {record.status !== 'closed' && <button onClick={() => setStatementRecord(record)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white">Enter Statement Amount</button>}
              {record.status === 'submitted' && <button onClick={() => window.confirm('Mark this Fastag month closed?') && actions.markFastagClosed(record.id)} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white">Mark Closed</button>}
              {record.status === 'submitted' && <button onClick={() => actions.reopenFastag(record.id)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"><RotateCcw className="h-4 w-4" />Reopen</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FastagManagement;

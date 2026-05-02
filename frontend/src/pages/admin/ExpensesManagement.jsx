import { useMemo, useState } from 'react';
import { Calendar, Pencil, PlusCircle, Trash2, Truck, Wallet } from 'lucide-react';
import { EXPENSE_TYPES, PAYMENT_MODES } from '../../services/expenseService';
import { useExpenseActions, useExpenseSummary, useExpenses } from '../../hooks/useExpenses';
import { useVehicles } from '../../hooks/useVehicles';

const today = new Date().toISOString().split('T')[0];
const monthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN');
const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const initialForm = {
  vehicle_id: '',
  expense_type: 'diesel',
  amount: '',
  expense_date: today,
  expense_time: '',
  payment_mode: 'cash',
  paid_to_name: '',
  paid_to_number: '',
  remarks: '',
  receipt_image: null,
};

const ExpenseForm = ({ title, vehicles, initial = initialForm, onCancel, onSubmit, isSaving }) => {
  const [form, setForm] = useState(initial);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Vehicle</span>
          <select required value={form.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} className={fieldClass}>
            <option value="">Select vehicle</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Expense type</span>
          <select value={form.expense_type} onChange={(e) => set('expense_type', e.target.value)} className={fieldClass}>
            {EXPENSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Amount</span>
          <input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Expense date</span>
          <input required type="date" max={today} value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Expense time</span>
          <input type="time" value={form.expense_time || ''} onChange={(e) => set('expense_time', e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Payment mode</span>
          <select required value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>
            {PAYMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Paid to name</span>
          <input value={form.paid_to_name} onChange={(e) => set('paid_to_name', e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Paid to number</span>
          <input value={form.paid_to_number} onChange={(e) => set('paid_to_number', e.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Receipt image</span>
          <input type="file" accept="image/*" onChange={(e) => set('receipt_image', e.target.files?.[0] || null)} className={fieldClass} />
        </label>
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</span>
          <textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} />
        </label>
      </div>
      <div className="mt-5 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
          {isSaving ? 'Saving...' : 'Save Expense'}
        </button>
      </div>
    </form>
  );
};

const ExpensesManagement = () => {
  const currentMonth = monthValue(new Date());
  const [filters, setFilters] = useState({ vehicle_id: '', month: currentMonth, expense_type: '' });
  const [showForm, setShowForm] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const queryParams = {
    ...(filters.vehicle_id ? { vehicle_id: filters.vehicle_id } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
    ...(filters.expense_type ? { expense_type: filters.expense_type } : {}),
  };

  const { data, isLoading, isError, error, refetch } = useExpenses(queryParams);
  const { data: summaryData } = useExpenseSummary(queryParams);
  const { createExpense, isCreating, updateExpense, isUpdating, deleteExpense, isDeleting } = useExpenseActions();
  const { vehicles } = useVehicles({ is_active: true });

  const expenses = data?.data?.data?.expenses || [];
  const summary = summaryData?.data?.data || {};
  const topTypes = useMemo(() => Object.entries(summary.by_type || {}).filter(([, amount]) => amount > 0).slice(0, 3), [summary]);

  const buildPayload = (form) => ({
    vehicle_id: form.vehicle_id,
    expense_type: form.expense_type,
    amount: form.amount,
    expense_date: form.expense_date,
    expense_time: form.expense_time || undefined,
    payment_mode: form.payment_mode,
    paid_to_name: form.paid_to_name.trim(),
    paid_to_number: form.paid_to_number.trim(),
    remarks: form.remarks.trim(),
    receipt_image: form.receipt_image || undefined,
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900">Unable to load expenses</h1>
        <p className="mt-2 text-sm text-red-700">{error?.response?.data?.message || error?.message}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editExpense && (
        <ExpenseForm
          title="Edit Expense"
          vehicles={vehicles}
          initial={{
            vehicle_id: editExpense.vehicle || '',
            expense_type: editExpense.expense_type || 'diesel',
            amount: editExpense.amount || '',
            expense_date: editExpense.expense_date || today,
            expense_time: editExpense.expense_time || '',
            payment_mode: editExpense.payment_mode || 'cash',
            paid_to_name: editExpense.paid_to_name || '',
            paid_to_number: editExpense.paid_to_number || '',
            remarks: editExpense.remarks || '',
            receipt_image: null,
          }}
          onCancel={() => setEditExpense(null)}
          onSubmit={(form) => updateExpense({ expenseId: editExpense.id, data: buildPayload(form) }, { onSuccess: () => setEditExpense(null) })}
          isSaving={isUpdating}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete expense?</h3>
            <p className="mt-2 text-sm text-gray-500">Rs. {fmt(confirmDelete.amount)} for {confirmDelete.vehicle_number} will be deleted.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg bg-gray-100 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={() => deleteExpense(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })} disabled={isDeleting} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Track vehicle-level expense ledger entries used in settlements.</p>
        </div>
        <button onClick={() => setShowForm((current) => !current)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add Expense'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <select value={filters.vehicle_id} onChange={(e) => setFilters((current) => ({ ...current, vehicle_id: e.target.value }))} className={fieldClass}>
          <option value="">All vehicles</option>
          {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.vehicle_number}</option>)}
        </select>
        <input type="month" value={filters.month} onChange={(e) => setFilters((current) => ({ ...current, month: e.target.value }))} className={fieldClass} />
        <select value={filters.expense_type} onChange={(e) => setFilters((current) => ({ ...current, expense_type: e.target.value }))} className={fieldClass}>
          <option value="">All types</option>
          {EXPENSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
        </select>
      </div>

      {showForm && (
        <ExpenseForm
          title="Add Expense"
          vehicles={vehicles}
          onCancel={() => setShowForm(false)}
          onSubmit={(form) => createExpense(buildPayload(form), { onSuccess: () => setShowForm(false) })}
          isSaving={isCreating}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total expenses</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {fmt(summary.total)}</div>
        </div>
        {topTypes.map(([type, amount]) => (
          <div key={type} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{EXPENSE_TYPES.find((item) => item.value === type)?.label || type}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {fmt(amount)}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50">
              <tr>{['Date', 'Vehicle', 'Type', 'Paid to', 'Mode', 'Remarks', 'Amount', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No expenses found</td></tr>
              ) : expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 text-sm"><Calendar className="mr-1.5 inline h-4 w-4 text-gray-400" />{new Date(expense.expense_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm"><Truck className="mr-1.5 inline h-4 w-4 text-gray-400" />{expense.vehicle_number}</td>
                  <td className="px-4 py-3 text-sm">{expense.expense_type_display || EXPENSE_TYPES.find((item) => item.value === expense.expense_type)?.label || expense.expense_type}</td>
                  <td className="px-4 py-3 text-sm">{expense.paid_to_name || '-'}<div className="text-xs text-gray-400">{expense.paid_to_number}</div></td>
                  <td className="px-4 py-3 text-sm">{expense.payment_mode_display || expense.payment_mode}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{expense.remarks || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold"><Wallet className="mr-1.5 inline h-4 w-4 text-gray-400" />Rs. {fmt(expense.amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => setEditExpense(expense)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmDelete(expense)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
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

export default ExpensesManagement;

import { useMemo, useState } from 'react';
import { Calendar, Pencil, PlusCircle, Trash2, Truck, User, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useExpenseActions, useExpenses } from '../../hooks/useExpenses';
import { useVehicles } from '../../hooks/useVehicles';

const initialForm = {
  driver_id: '', vehicle_id: '', trip_id: '',
  expense_type: 'fuel', amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  description: '', payment_mode: 'cash', receipt_image: null,
};

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const EditModal = ({ expense, onClose, onSave, isSaving }) => {
  const [form, setForm] = useState({
    amount: expense.amount || '',
    expense_date: expense.expense_date || new Date().toISOString().split('T')[0],
    expense_type: expense.expense_type || 'fuel',
    description: expense.description || '',
    payment_mode: expense.payment_mode || 'cash',
  });
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-gray-900">Edit Expense</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form); }} className="p-5 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Expense type</span>
            <select value={form.expense_type} onChange={(e) => set('expense_type', e.target.value)} className={fieldClass}>
              <option value="fuel">Fuel</option>
              <option value="toll">Toll</option>
              <option value="advance">Advance</option>
              <option value="allowance">Allowance</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
              <option value="company_management">Company / Management</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Amount (Rs.)</span>
            <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Date</span>
            <input type="date" required value={form.expense_date} max={new Date().toISOString().split('T')[0]} onChange={(e) => set('expense_date', e.target.value)} className={fieldClass} />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
            <select value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>
              <option value="cash">Cash</option>
              <option value="phonepay">PhonePe</option>
              <option value="gpay">Google Pay</option>
              <option value="paytm">Paytm</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Description</span>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} className={`${fieldClass} resize-none`} />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isSaving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ExpensesManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editExpense, setEditExpense] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const { data, isLoading, isError, error, refetch } = useExpenses();
  const { createExpense, isCreating, updateExpense, isUpdating, deleteExpense, isDeleting } = useExpenseActions();
  const { drivers } = useDrivers({ is_active: true });
  const { vehicles } = useVehicles({ is_active: true });

  const payload = data?.data?.data || {};
  const expenses = payload.expenses || [];
  const summary = payload.summary || { by_type: {} };
  const stats = useMemo(() => Object.entries(summary.by_type || {}).slice(0, 3), [summary.by_type]);

  const resetForm = () => { setForm(initialForm); setShowForm(false); };

  const handleSubmit = (event) => {
    event.preventDefault();
    const isCompany = form.expense_type === 'company_management';
    createExpense(
      {
        ...(isCompany ? {} : { driver_id: form.driver_id, vehicle_id: form.vehicle_id }),
        trip_id: form.trip_id || undefined,
        expense_type: form.expense_type,
        amount: form.amount,
        expense_date: form.expense_date,
        description: form.description.trim(),
        payment_mode: form.payment_mode,
        receipt_image: form.receipt_image || undefined,
      },
      { onSuccess: () => resetForm() }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-900">Unable to load expenses</h1>
        <p className="mt-2 text-sm text-red-700">{error?.response?.data?.message || error?.message}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editExpense && (
        <EditModal expense={editExpense} onClose={() => setEditExpense(null)}
          onSave={(updated) => updateExpense({ expenseId: editExpense.id, data: updated }, { onSuccess: () => setEditExpense(null) })}
          isSaving={isUpdating} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete expense?</h3>
            <p className="mt-2 text-sm text-gray-500">
              <strong>{confirmDelete.expense_type_display || confirmDelete.expense_type}</strong> of{' '}
              <strong>Rs. {Number(confirmDelete.amount).toLocaleString('en-IN')}</strong> will be permanently deleted.
            </p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={() => deleteExpense(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })} disabled={isDeleting}
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300">
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Record and manage fuel, toll, advance, and other expenses.</p>
        </div>
        <button onClick={() => setShowForm((c) => !c)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add Expense'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Driver</span>
              <select required={form.expense_type !== 'company_management'} value={form.driver_id}
                onChange={(e) => setForm((c) => ({ ...c, driver_id: e.target.value }))} className={fieldClass}>
                <option value="">Select driver</option>
                {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} | {d.user?.phone}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle</span>
              <select required={form.expense_type !== 'company_management'} value={form.vehicle_id}
                onChange={(e) => setForm((c) => ({ ...c, vehicle_id: e.target.value }))} className={fieldClass}>
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Expense type</span>
              <select value={form.expense_type} onChange={(e) => setForm((c) => ({ ...c, expense_type: e.target.value }))} className={fieldClass}>
                <option value="fuel">Fuel</option>
                <option value="toll">Toll</option>
                <option value="advance">Advance</option>
                <option value="allowance">Allowance</option>
                <option value="maintenance">Maintenance</option>
                <option value="other">Other</option>
                <option value="company_management">Company / Management</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Amount</span>
              <input type="number" required min="0.01" step="0.01" value={form.amount}
                onChange={(e) => setForm((c) => ({ ...c, amount: e.target.value }))} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Expense date</span>
              <input type="date" required value={form.expense_date} max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setForm((c) => ({ ...c, expense_date: e.target.value }))} className={fieldClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
              <select value={form.payment_mode} onChange={(e) => setForm((c) => ({ ...c, payment_mode: e.target.value }))} className={fieldClass}>
                <option value="cash">Cash</option>
                <option value="phonepay">PhonePe</option>
                <option value="gpay">Google Pay</option>
                <option value="paytm">Paytm</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Receipt image</span>
              <input type="file" accept="image/*" onChange={(e) => setForm((c) => ({ ...c, receipt_image: e.target.files?.[0] || null }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-gray-700">Description</span>
              <textarea rows={2} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} className={`${fieldClass} resize-none`} />
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={resetForm} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isCreating} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {isCreating ? 'Saving…' : 'Record Expense'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total expenses</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {Number(summary.total_expenses || 0).toLocaleString('en-IN')}</div>
        </div>
        {stats.map(([type, amount]) => (
          <div key={type} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm capitalize text-gray-500">{type}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {Number(amount || 0).toLocaleString('en-IN')}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">No expenses recorded yet.</div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {expense.expense_type_display || expense.expense_type}
                    </span>
                    {expense.is_deducted && <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">Deducted</span>}
                    {expense.is_blinkit_reimbursable && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Reimbursable</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2"><User className="h-4 w-4" />{expense.driver_name || '—'}</span>
                    <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4" />{expense.vehicle_number || '—'}</span>
                    <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(expense.expense_date).toLocaleDateString('en-IN')}</span>
                  </div>
                  {expense.description && <p className="mt-2 text-sm text-gray-600">{expense.description}</p>}
                  {expense.payment_mode_display && <p className="mt-1 text-xs text-gray-400">{expense.payment_mode_display}</p>}
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-gray-50 px-4 py-3 text-right">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500"><Wallet className="h-4 w-4" />Amount</div>
                    <div className="mt-1 text-lg font-semibold text-gray-900">Rs. {Number(expense.amount || 0).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button onClick={() => setEditExpense(expense)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(expense)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-red-50 hover:text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExpensesManagement;

import { useMemo, useState } from 'react';
import { Calendar, Pencil, PlusCircle, Trash2, Wallet } from 'lucide-react';
import { COMPANY_EXPENSE_TYPES, PAYMENT_MODES } from '../../services/expenseService';
import { useCompanyExpenseActions, useCompanyExpenses, useCompanyExpenseSummary } from '../../hooks/useExpenses';

const today = new Date().toISOString().split('T')[0];
const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN');
const fieldClass = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const initialForm = {
  expense_date: today,
  expense_time: '',
  expense_type: 'coordinator_salary',
  amount: '',
  payment_mode: 'cash',
  paid_to_name: '',
  paid_to_number: '',
  remarks: '',
  receipt_image: null,
};

const ExpenseModal = ({ title, initial = initialForm, onClose, onSubmit, isSaving }) => {
  const [form, setForm] = useState(initial);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(form);
        }}
        className="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Date</span><input required type="date" max={today} value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Time</span><input type="time" value={form.expense_time || ''} onChange={(e) => set('expense_time', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Type</span><select value={form.expense_type} onChange={(e) => set('expense_type', e.target.value)} className={fieldClass}>{COMPANY_EXPENSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Amount</span><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Payment mode</span><select value={form.payment_mode} onChange={(e) => set('payment_mode', e.target.value)} className={fieldClass}>{PAYMENT_MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Paid to name</span><input value={form.paid_to_name} onChange={(e) => set('paid_to_name', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Paid to number</span><input value={form.paid_to_number} onChange={(e) => set('paid_to_number', e.target.value)} className={fieldClass} /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-gray-700">Receipt image</span><input type="file" accept="image/*" onChange={(e) => set('receipt_image', e.target.files?.[0] || null)} className={fieldClass} /></label>
          <label className="block md:col-span-2"><span className="mb-1.5 block text-sm font-medium text-gray-700">Remarks</span><textarea rows={2} value={form.remarks} onChange={(e) => set('remarks', e.target.value)} className={`${fieldClass} resize-none`} /></label>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
          <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-300">Save Expense</button>
        </div>
      </form>
    </div>
  );
};

const CompanyExpenses = () => {
  const [filters, setFilters] = useState({ expense_type: '', month: currentMonth() });
  const [showModal, setShowModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const params = {
    ...(filters.expense_type ? { expense_type: filters.expense_type } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
  };

  const { data, isLoading } = useCompanyExpenses(params);
  const { data: summaryData } = useCompanyExpenseSummary(params);
  const actions = useCompanyExpenseActions();
  const expenses = data?.data?.data?.expenses || [];
  const summary = summaryData?.data?.data || {};
  const summaryRows = useMemo(() => Object.entries(summary.by_type || {}).filter(([, amount]) => amount > 0), [summary]);

  const buildPayload = (form) => ({
    expense_date: form.expense_date,
    expense_time: form.expense_time || undefined,
    expense_type: form.expense_type,
    amount: form.amount,
    payment_mode: form.payment_mode,
    paid_to_name: form.paid_to_name.trim(),
    paid_to_number: form.paid_to_number.trim(),
    remarks: form.remarks.trim(),
    receipt_image: form.receipt_image || undefined,
  });

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      {showModal && <ExpenseModal title="Add Company Expense" isSaving={actions.isCreatingCompanyExpense} onClose={() => setShowModal(false)} onSubmit={(form) => actions.createCompanyExpense(buildPayload(form), { onSuccess: () => setShowModal(false) })} />}
      {editExpense && (
        <ExpenseModal
          title="Edit Company Expense"
          initial={{
            expense_date: editExpense.expense_date || today,
            expense_time: editExpense.expense_time || '',
            expense_type: editExpense.expense_type || 'other',
            amount: editExpense.amount || '',
            payment_mode: editExpense.payment_mode || 'cash',
            paid_to_name: editExpense.paid_to_name || '',
            paid_to_number: editExpense.paid_to_number || '',
            remarks: editExpense.remarks || '',
            receipt_image: null,
          }}
          isSaving={actions.isUpdatingCompanyExpense}
          onClose={() => setEditExpense(null)}
          onSubmit={(form) => actions.updateCompanyExpense({ id: editExpense.id, data: buildPayload(form) }, { onSuccess: () => setEditExpense(null) })}
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">Owner-only overhead expenses with no vehicle attached.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"><PlusCircle className="h-4 w-4" />Add Expense</button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <select value={filters.expense_type} onChange={(e) => setFilters((current) => ({ ...current, expense_type: e.target.value }))} className={fieldClass}><option value="">All types</option>{COMPANY_EXPENSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
        <input type="month" value={filters.month} onChange={(e) => setFilters((current) => ({ ...current, month: e.target.value }))} className={fieldClass} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Monthly total</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {fmt(summary.total)}</div>
        </div>
        {summaryRows.slice(0, 3).map(([type, amount]) => (
          <div key={type} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{COMPANY_EXPENSE_TYPES.find((item) => item.value === type)?.label || type}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">Rs. {fmt(amount)}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gray-50"><tr>{['Date', 'Type', 'Amount', 'Mode', 'Paid To', 'Remarks', 'Actions'].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No company expenses found</td></tr> : expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="px-4 py-3 text-sm"><Calendar className="mr-1.5 inline h-4 w-4 text-gray-400" />{new Date(expense.expense_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{expense.expense_type_display || COMPANY_EXPENSE_TYPES.find((item) => item.value === expense.expense_type)?.label || expense.expense_type}</td>
                  <td className="px-4 py-3 text-sm font-semibold"><Wallet className="mr-1.5 inline h-4 w-4 text-gray-400" />Rs. {fmt(expense.amount)}</td>
                  <td className="px-4 py-3 text-sm">{expense.payment_mode_display || expense.payment_mode}</td>
                  <td className="px-4 py-3 text-sm">{expense.paid_to_name || '-'}<div className="text-xs text-gray-400">{expense.paid_to_number}</div></td>
                  <td className="px-4 py-3 text-sm text-gray-500">{expense.remarks || '-'}</td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => setEditExpense(expense)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-indigo-50"><Pencil className="h-4 w-4" /></button><button onClick={() => window.confirm('Delete this company expense?') && actions.deleteCompanyExpense(expense.id)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CompanyExpenses;

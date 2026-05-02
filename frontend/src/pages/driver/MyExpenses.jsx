import { useMemo, useState } from 'react';
import { Calendar, Receipt, Truck, User, Wallet } from 'lucide-react';
import { EXPENSE_TYPES } from '../../services/expenseService';
import { useMyExpenses } from '../../hooks/useExpenses';

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
const monthToDate = (value) => (value ? `${value}-01` : '');
const fmt = (value) => Number(value || 0).toLocaleString('en-IN');

const MyExpenses = () => {
  const [filters, setFilters] = useState({ expense_type: '', month: currentMonth() });
  const params = {
    ...(filters.expense_type ? { expense_type: filters.expense_type } : {}),
    ...(filters.month ? { month_year: monthToDate(filters.month) } : {}),
  };
  const { data, isLoading } = useMyExpenses(params);

  const payload = data?.data?.data || {};
  const expenses = payload.expenses || [];
  const totalAmount = useMemo(() => expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0), [expenses]);
  const byType = useMemo(() => {
    const totals = {};
    expenses.forEach((expense) => {
      totals[expense.expense_type] = (totals[expense.expense_type] || 0) + Number(expense.amount || 0);
    });
    return Object.entries(totals).slice(0, 3);
  }, [expenses]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
            <p className="mt-1 text-sm text-gray-500">Read-only expenses recorded for your assigned vehicle.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <select value={filters.expense_type} onChange={(event) => setFilters((current) => ({ ...current, expense_type: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200">
              <option value="">All expense types</option>
              {EXPENSE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <input type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600"><Wallet className="h-5 w-5" /></div>
          <div className="text-2xl font-bold text-gray-900">Rs. {fmt(totalAmount)}</div>
          <div className="mt-1 text-sm text-gray-500">Total vehicle expenses</div>
        </div>
        {byType.map(([type, amount]) => (
          <div key={type} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{EXPENSE_TYPES.find((item) => item.value === type)?.label || type}</div>
            <div className="mt-2 text-2xl font-bold text-gray-900">Rs. {fmt(amount)}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">No expenses recorded for this filter.</div>
        ) : expenses.map((expense) => (
          <div key={expense.id} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">{expense.expense_type_display || EXPENSE_TYPES.find((item) => item.value === expense.expense_type)?.label || expense.expense_type}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(expense.expense_date).toLocaleDateString('en-IN')}</span>
                  <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4" />{expense.vehicle_number || '-'}</span>
                  <span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4" />{expense.payment_mode_display || expense.payment_mode || '-'}</span>
                  <span className="inline-flex items-center gap-2"><User className="h-4 w-4" />{expense.paid_to_name || 'Not specified'}</span>
                </div>
                {expense.paid_to_number && <p className="text-sm text-gray-500">Paid to number: {expense.paid_to_number}</p>}
                {expense.remarks && <p className="text-sm text-gray-600">{expense.remarks}</p>}
              </div>
              <div className="text-lg font-semibold text-gray-900">Rs. {fmt(expense.amount)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyExpenses;

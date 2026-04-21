import { useMemo, useState } from 'react';
import { Calendar, Receipt, Truck, Wallet } from 'lucide-react';
import { useMyExpenses } from '../../hooks/useExpenses';

const MyExpenses = () => {
  const [expenseType, setExpenseType] = useState('');
  const { data, isLoading } = useMyExpenses(
    expenseType ? { expense_type: expenseType } : {}
  );

  const payload = data?.data?.data || {};
  const expenses = payload.expenses || [];
  const summary = payload.summary || {};

  const cards = useMemo(
    () => [
      { label: 'Advance Taken', value: summary.advance_taken || 0 },
      { label: 'Advance Deducted', value: summary.advance_deducted || 0 },
      { label: 'Remaining Advance', value: summary.remaining_advance || 0 },
    ],
    [summary]
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
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
            <p className="mt-2 text-sm text-gray-500">
              Driver expenses are loaded from the backend and grouped by your profile.
            </p>
          </div>

          <select
            value={expenseType}
            onChange={(event) => setExpenseType(event.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          >
            <option value="">All expense types</option>
            <option value="fuel">Fuel</option>
            <option value="toll">Toll</option>
            <option value="advance">Advance</option>
            <option value="allowance">Allowance</option>
            <option value="maintenance">Maintenance</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              Rs. {Number(card.value || 0).toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {expenses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No expenses recorded yet.
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {expense.expense_type_display || expense.expense_type}
                    </span>
                    {expense.is_deducted ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Deducted
                      </span>
                    ) : null}
                    {expense.trip_id ? (
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Linked to trip
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm text-gray-600">{expense.description || 'No description added.'}</p>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {expense.vehicle?.vehicle_number || expense.vehicle_number || '—'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      {expense.payment_mode_display || expense.payment_mode || 'Unspecified mode'}
                    </span>
                  </div>
                </div>

                <div className="text-lg font-semibold text-gray-900">
                  Rs. {Number(expense.amount || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyExpenses;

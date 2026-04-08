import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { Calendar, Truck, Wallet } from 'lucide-react';
import api from '../../services/api';

const MyExpenses = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['myExpenses'],
    queryFn: () => api.get('/expenses/my-expenses/'),
  });

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">Track advances, fuel, toll, and other driver expenses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">Rs. {Number(card.value || 0).toLocaleString('en-IN')}</div>
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {expense.expense_type_display || expense.expense_type}
                    </span>
                    {expense.is_deducted ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Deducted
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-gray-600">{expense.description || 'No description added.'}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {expense.vehicle_number}
                    </span>
                    <span>{expense.payment_mode_display || expense.payment_mode || 'Unspecified mode'}</span>
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

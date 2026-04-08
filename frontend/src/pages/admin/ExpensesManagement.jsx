import { useQuery } from 'react-query';
import { Calendar, Truck, User, Wallet } from 'lucide-react';
import api from '../../services/api';

const ExpensesManagement = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => api.get('/expenses/'),
  });

  const payload = data?.data?.data || {};
  const expenses = payload.expenses || [];
  const summary = payload.summary || { by_type: {} };

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
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-1 text-sm text-gray-500">Review recorded fuel, toll, advance, and maintenance expenses.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total expenses</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            Rs. {Number(summary.total_expenses || 0).toLocaleString('en-IN')}
          </div>
        </div>
        {Object.entries(summary.by_type || {}).slice(0, 3).map(([type, amount]) => (
          <div key={type} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm capitalize text-gray-500">{type}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              Rs. {Number(amount || 0).toLocaleString('en-IN')}
            </div>
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
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-700">
                      {expense.expense_type_display || expense.expense_type}
                    </span>
                    {expense.is_deducted ? (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Deducted
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {expense.driver_name}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {expense.vehicle_number}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(expense.expense_date).toLocaleDateString('en-IN')}
                    </span>
                  </div>

                  <p className="mt-4 text-sm text-gray-600">{expense.description || 'No description added.'}</p>
                </div>

                <div className="rounded-xl bg-gray-50 px-4 py-3 text-right">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                    <Wallet className="h-4 w-4" />
                    Amount
                  </div>
                  <div className="mt-2 text-lg font-semibold text-gray-900">
                    Rs. {Number(expense.amount || 0).toLocaleString('en-IN')}
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

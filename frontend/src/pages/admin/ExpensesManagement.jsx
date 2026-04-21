import { useMemo, useState } from 'react';
import { Calendar, PlusCircle, Truck, User, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useExpenseActions, useExpenses } from '../../hooks/useExpenses';
import { useVehicles } from '../../hooks/useVehicles';

const initialForm = {
  driver_id: '',
  vehicle_id: '',
  trip_id: '',
  expense_type: 'fuel',
  amount: '',
  expense_date: new Date().toISOString().split('T')[0],
  description: '',
  payment_mode: 'cash',
  receipt_image: null,
};

const ExpensesManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const { data, isLoading, isError, error, refetch } = useExpenses();
  const { createExpense, isCreating } = useExpenseActions();
  const { drivers } = useDrivers({ is_active: true });
  const { vehicles } = useVehicles({ is_active: true });

  const payload = data?.data?.data || {};
  const expenses = payload.expenses || [];
  const summary = payload.summary || { by_type: {} };

  const stats = useMemo(() => {
    const entries = Object.entries(summary.by_type || {});
    return entries.slice(0, 3);
  }, [summary.by_type]);

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

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
      {
        onSuccess: () => {
          resetForm();
        },
      }
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
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong while loading expenses.'}
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="mt-1 text-sm text-gray-500">
            Record fuel, toll, advance, and maintenance expenses against drivers and vehicles.
          </p>
        </div>
        <button
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add Expense'}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Add Expense</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Driver</span>
              <select
                required
                value={form.driver_id}
                onChange={(event) => setForm((current) => ({ ...current, driver_id: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select driver</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.user?.first_name} {driver.user?.last_name} | {driver.user?.phone}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle</span>
              <select
                required
                value={form.vehicle_id}
                onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select vehicle</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Trip ID</span>
              <input
                value={form.trip_id}
                onChange={(event) => setForm((current) => ({ ...current, trip_id: event.target.value }))}
                placeholder="Optional trip UUID"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Expense type</span>
              <select
                value={form.expense_type}
                onChange={(event) => setForm((current) => ({ ...current, expense_type: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
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
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Expense date</span>
              <input
                type="date"
                required
                value={form.expense_date}
                onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                max={new Date().toISOString().split('T')[0]}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
              <select
                value={form.payment_mode}
                onChange={(event) => setForm((current) => ({ ...current, payment_mode: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
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
              <input
                type="file"
                accept="image/*"
                onChange={(event) => setForm((current) => ({ ...current, receipt_image: event.target.files?.[0] || null }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2"
              />
            </label>
            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-2 block text-sm font-medium text-gray-700">Description</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreating ? 'Saving...' : 'Record Expense'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total expenses</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            Rs. {Number(summary.total_expenses || 0).toLocaleString('en-IN')}
          </div>
        </div>
        {stats.map(([type, amount]) => (
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

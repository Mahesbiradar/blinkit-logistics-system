import { useState } from 'react';
import { Calendar, CheckCircle, CreditCard, PlusCircle, Truck, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useVehicles } from '../../hooks/useVehicles';
import { usePaymentActions, usePayments } from '../../hooks/usePayments';

const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'phonepay', label: 'PhonePe' },
  { value: 'gpay', label: 'Google Pay' },
  { value: 'paytm', label: 'Paytm' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

const initialForm = {
  type: 'driver',
  driver_id: '',
  vendor_id: '',
  vehicle_id: '',
  month_year: new Date().toISOString().slice(0, 7) + '-01',
  payment_mode: '',
  transaction_reference: '',
  remarks: '',
};

const fmt = (val) => Number(val || 0).toLocaleString('en-IN');

const CalcPreview = ({ calc }) => (
  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm">
    <h3 className="mb-3 font-semibold text-blue-900">Payment Preview</h3>
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Total trips</span>
        <span className="font-medium">{calc.total_trips}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Total KM</span>
        <span className="font-medium">{fmt(calc.total_km)}</span>
      </div>
      {Number(calc.base_salary) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">Base salary</span>
          <span className="font-medium text-green-700">Rs. {fmt(calc.base_salary)}</span>
        </div>
      )}
      {Number(calc.km_amount) > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-gray-600">KM amount ({fmt(calc.km_rate)}/km)</span>
          <span className="font-medium text-green-700">Rs. {fmt(calc.km_amount)}</span>
        </div>
      )}
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Fuel deducted</span>
        <span className="font-medium text-red-600">- Rs. {fmt(calc.total_fuel_expenses)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Advance deducted</span>
        <span className="font-medium text-red-600">- Rs. {fmt(calc.total_advance)}</span>
      </div>
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Allowance deducted</span>
        <span className="font-medium text-red-600">- Rs. {fmt(calc.total_allowance)}</span>
      </div>
      <div className="flex justify-between gap-2 sm:col-span-2 border-t border-blue-200 pt-2">
        <span className="font-semibold text-blue-900">Final amount</span>
        <span className="font-bold text-blue-900">Rs. {fmt(calc.final_amount)}</span>
      </div>
    </div>
  </div>
);

const MarkPaidModal = ({ payment, onClose, onConfirm, isLoading }) => {
  const [mode, setMode] = useState('cash');
  const [ref, setRef] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Mark as Paid</h2>
        <p className="mt-1 text-sm text-gray-500">
          {payment.recipient_name} — Rs. {fmt(payment.final_amount)}
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Payment mode</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-gray-700">Transaction reference</span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            disabled={isLoading}
            onClick={() => onConfirm({ id: payment.id, payment_mode: mode, transaction_reference: ref })}
            className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300"
          >
            {isLoading ? 'Saving...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const PaymentsManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [calc, setCalc] = useState(null);
  const [markingPayment, setMarkingPayment] = useState(null);
  const [filterMonth, setFilterMonth] = useState('');

  const params = filterMonth ? { month_year: filterMonth + '-01' } : {};
  const { data, isLoading, isError, error, refetch } = usePayments(params);
  const { createPayment, isCreating, markPaid, isMarkingPaid, calculatePayment, isCalculating } = usePaymentActions();
  const { drivers } = useDrivers({ is_active: true });
  const { vehicles } = useVehicles({ is_active: true });

  const payments = data?.data?.data?.payments || [];

  const stats = {
    total: payments.length,
    pending: payments.filter((p) => p.status === 'pending').length,
    paid: payments.filter((p) => p.status === 'paid').length,
    totalAmount: payments.reduce((sum, p) => sum + Number(p.final_amount || 0), 0),
  };

  const handleFieldChange = (field, value) => {
    setForm((curr) => ({ ...curr, [field]: value }));
    setCalc(null);
  };

  const handleCalculate = async () => {
    const payload = {
      month_year: form.month_year,
      ...(form.type === 'driver'
        ? { driver_id: form.driver_id }
        : { vendor_id: form.vendor_id, vehicle_id: form.vehicle_id }),
    };
    const result = await calculatePayment(payload);
    if (result?.data?.data) setCalc(result.data.data);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      month_year: form.month_year,
      payment_mode: form.payment_mode || undefined,
      transaction_reference: form.transaction_reference || undefined,
      remarks: form.remarks || undefined,
      ...(form.type === 'driver'
        ? { driver_id: form.driver_id }
        : { vendor_id: form.vendor_id, vehicle_id: form.vehicle_id }),
    };
    createPayment(payload, {
      onSuccess: () => {
        setForm(initialForm);
        setCalc(null);
        setShowForm(false);
      },
    });
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
        <h1 className="text-xl font-bold text-red-900">Unable to load payments</h1>
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong.'}
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
      {markingPayment && (
        <MarkPaidModal
          payment={markingPayment}
          isLoading={isMarkingPaid}
          onClose={() => setMarkingPayment(null)}
          onConfirm={(data) =>
            markPaid(data, { onSuccess: () => setMarkingPayment(null) })
          }
        />
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Calculate and track salary and vendor payment records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <button
            onClick={() => setShowForm((c) => !c)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            {showForm ? 'Close form' : 'Create Payment'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Create Payment</h2>

          <div className="mt-4 flex gap-4">
            {['driver', 'vendor'].map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2 text-sm font-medium capitalize text-gray-700">
                <input
                  type="radio"
                  name="type"
                  value={t}
                  checked={form.type === t}
                  onChange={() => handleFieldChange('type', t)}
                />
                {t}
              </label>
            ))}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {form.type === 'driver' ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Driver</span>
                <select
                  required
                  value={form.driver_id}
                  onChange={(e) => handleFieldChange('driver_id', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.first_name} {d.user?.last_name} | {d.user?.phone}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle (vendor)</span>
                  <select
                    required
                    value={form.vehicle_id}
                    onChange={(e) => {
                      const vehicle = vehicles.find((v) => v.id === e.target.value);
                      setForm((curr) => ({
                        ...curr,
                        vehicle_id: e.target.value,
                        vendor_id: vehicle?.vendor || '',
                      }));
                      setCalc(null);
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Select vehicle</option>
                    {vehicles
                      .filter((v) => v.owner_type === 'vendor')
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.vehicle_number} — {v.vendor_details?.name || 'Vendor'}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            )}

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Month</span>
              <input
                type="month"
                required
                value={form.month_year.slice(0, 7)}
                onChange={(e) => handleFieldChange('month_year', e.target.value + '-01')}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Payment mode</span>
              <select
                value={form.payment_mode}
                onChange={(e) => handleFieldChange('payment_mode', e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select mode</option>
                {PAYMENT_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Transaction reference</span>
              <input
                value={form.transaction_reference}
                onChange={(e) => handleFieldChange('transaction_reference', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-2 block text-sm font-medium text-gray-700">Remarks</span>
              <input
                value={form.remarks}
                onChange={(e) => handleFieldChange('remarks', e.target.value)}
                placeholder="Optional"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          {calc && <CalcPreview calc={calc} />}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => { setShowForm(false); setCalc(null); setForm(initialForm); }}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isCalculating || (!form.driver_id && !form.vehicle_id)}
              onClick={handleCalculate}
              className="rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {isCalculating ? 'Calculating...' : 'Preview calculation'}
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {isCreating ? 'Saving...' : 'Create Payment'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total records', value: stats.total, isCurrency: false },
          { label: 'Pending', value: stats.pending, isCurrency: false },
          { label: 'Paid', value: stats.paid, isCurrency: false },
          { label: 'Total amount', value: stats.totalAmount, isCurrency: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">
              {s.isCurrency ? `Rs. ${fmt(s.value)}` : s.value}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {payments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No payments found.
          </div>
        ) : (
          payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                      {payment.payment_type}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      payment.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : payment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {payment.status}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold text-gray-900">{payment.recipient_name}</h2>

                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      {payment.vehicle_number || 'No vehicle'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(payment.month_year).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-xl bg-gray-50 px-5 py-3 text-right">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      <Wallet className="h-4 w-4" />
                      Final amount
                    </div>
                    <div className="mt-1 text-xl font-bold text-gray-900">
                      Rs. {fmt(payment.final_amount)}
                    </div>
                  </div>

                  {payment.status !== 'paid' && (
                    <button
                      onClick={() => setMarkingPayment(payment)}
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Mark as Paid
                    </button>
                  )}

                  {payment.status === 'paid' && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CreditCard className="h-4 w-4" />
                      Paid
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PaymentsManagement;

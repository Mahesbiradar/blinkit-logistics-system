import { useMemo, useState } from 'react';
import { Phone, PlusCircle, User, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useVehicles } from '../../hooks/useVehicles';

const initialForm = {
  first_name: '',
  last_name: '',
  phone: '',
  license_number: '',
  base_salary: '',
  vehicle_id: '',
};

const DriversManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const { drivers, isLoading, isError, error, refetch, createDriver, isCreating } = useDrivers();
  const { vehicles } = useVehicles({ is_active: true });

  const stats = useMemo(
    () => ({
      total: drivers.length,
      active: drivers.filter((driver) => driver.is_active).length,
      assigned: drivers.filter((driver) => (driver.vehicles || []).length > 0).length,
    }),
    [drivers]
  );

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    createDriver(
      {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim(),
        license_number: form.license_number.trim(),
        base_salary: form.base_salary ? Number(form.base_salary) : undefined,
        vehicle_id: form.vehicle_id || undefined,
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
        <h1 className="text-xl font-bold text-red-900">Unable to load drivers</h1>
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong while loading drivers.'}
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
          <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create drivers, assign an initial vehicle, and review active salary data.
          </p>
        </div>
        <button
          onClick={() => setShowForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add Driver'}
        </button>
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Add Driver</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">First name</span>
              <input
                required
                value={form.first_name}
                onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Last name</span>
              <input
                value={form.last_name}
                onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Phone</span>
              <input
                required
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value.replace(/\D/g, '').slice(0, 10) }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">License number</span>
              <input
                value={form.license_number}
                onChange={(event) => setForm((current) => ({ ...current, license_number: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Base salary</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_salary}
                onChange={(event) => setForm((current) => ({ ...current, base_salary: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Assign vehicle</span>
              <select
                value={form.vehicle_id}
                onChange={(event) => setForm((current) => ({ ...current, vehicle_id: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="">No vehicle yet</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.vehicle_number} | {vehicle.owner_type}
                  </option>
                ))}
              </select>
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
              {isCreating ? 'Saving...' : 'Create Driver'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total drivers</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Active drivers</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.active}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">With vehicle assigned</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.assigned}</div>
        </div>
      </div>

      <div className="space-y-4">
        {drivers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No drivers available yet.
          </div>
        ) : (
          drivers.map((driver) => (
            <div key={driver.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {driver.user?.first_name} {driver.user?.last_name}
                      </h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        {driver.user?.phone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        driver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {driver.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700">
                      License: {driver.license_number || 'Not added'}
                    </span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px]">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Assigned vehicles</div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      {(driver.vehicles || []).length > 0
                        ? driver.vehicles.map((vehicle) => vehicle.vehicle_number).join(', ')
                        : 'No vehicle assigned'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      <Wallet className="h-4 w-4" />
                      Effective salary
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      Rs. {Number(driver.effective_base_salary || 0).toLocaleString('en-IN')}
                    </div>
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

export default DriversManagement;

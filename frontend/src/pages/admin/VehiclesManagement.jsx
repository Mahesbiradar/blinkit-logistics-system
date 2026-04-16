import { useMemo, useState } from 'react';
import { PlusCircle, Truck, Users, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useVehicles } from '../../hooks/useVehicles';

const initialVehicleForm = {
  vehicle_number: '',
  vehicle_type: 'pickup',
  owner_type: 'owner',
  vendor: '',
  km_rate: '',
  base_salary: '',
};

const initialAssignForm = {
  vehicleId: '',
  driver_id: '',
  is_primary: true,
};

const VehiclesManagement = () => {
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(initialVehicleForm);
  const [assignForm, setAssignForm] = useState(initialAssignForm);
  const { vehicles, vendors, isLoading, isError, error, refetch, createVehicle, isCreating, assignDriver, isAssigning } =
    useVehicles();
  const { drivers } = useDrivers({ is_active: true });

  const stats = useMemo(
    () => ({
      total: vehicles.length,
      owner: vehicles.filter((vehicle) => vehicle.owner_type === 'owner').length,
      vendor: vehicles.filter((vehicle) => vehicle.owner_type === 'vendor').length,
    }),
    [vehicles]
  );

  const resetVehicleForm = () => {
    setVehicleForm(initialVehicleForm);
    setShowVehicleForm(false);
  };

  const handleCreateVehicle = (event) => {
    event.preventDefault();

    createVehicle(
      {
        vehicle_number: vehicleForm.vehicle_number.trim(),
        vehicle_type: vehicleForm.vehicle_type,
        owner_type: vehicleForm.owner_type,
        vendor: vehicleForm.owner_type === 'vendor' && vehicleForm.vendor ? vehicleForm.vendor : null,
        km_rate: vehicleForm.km_rate ? Number(vehicleForm.km_rate) : 0,
        base_salary: vehicleForm.base_salary ? Number(vehicleForm.base_salary) : 0,
      },
      {
        onSuccess: () => {
          resetVehicleForm();
        },
      }
    );
  };

  const handleAssignDriver = (event) => {
    event.preventDefault();

    assignDriver(
      {
        vehicleId: assignForm.vehicleId,
        data: {
          driver_id: assignForm.driver_id,
          is_primary: assignForm.is_primary,
        },
      },
      {
        onSuccess: () => {
          setAssignForm(initialAssignForm);
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
        <h1 className="text-xl font-bold text-red-900">Unable to load vehicles</h1>
        <p className="mt-2 text-sm text-red-700">
          {error?.response?.data?.message || error?.message || 'Something went wrong while loading vehicles.'}
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
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Add vehicles, track owner and vendor units, and assign drivers instantly.
          </p>
        </div>
        <button
          onClick={() => setShowVehicleForm((current) => !current)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          {showVehicleForm ? 'Close form' : 'Add Vehicle'}
        </button>
      </div>

      {showVehicleForm ? (
        <form onSubmit={handleCreateVehicle} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Add Vehicle</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle number</span>
              <input
                required
                value={vehicleForm.vehicle_number}
                onChange={(event) => setVehicleForm((current) => ({ ...current, vehicle_number: event.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle type</span>
              <select
                value={vehicleForm.vehicle_type}
                onChange={(event) => setVehicleForm((current) => ({ ...current, vehicle_type: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="pickup">Pickup</option>
                <option value="truck">Truck</option>
                <option value="van">Van</option>
                <option value="bike">Bike</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Ownership</span>
              <select
                value={vehicleForm.owner_type}
                onChange={(event) =>
                  setVehicleForm((current) => ({
                    ...current,
                    owner_type: event.target.value,
                    vendor: event.target.value === 'vendor' ? current.vendor : '',
                  }))
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              >
                <option value="owner">Owner</option>
                <option value="vendor">Vendor</option>
              </select>
            </label>
            {vehicleForm.owner_type === 'vendor' ? (
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vendor</span>
                <select
                  required
                  value={vehicleForm.vendor}
                  onChange={(event) => setVehicleForm((current) => ({ ...current, vendor: event.target.value }))}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                >
                  <option value="">Select vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">KM rate</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={vehicleForm.km_rate}
                onChange={(event) => setVehicleForm((current) => ({ ...current, km_rate: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Base salary</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={vehicleForm.base_salary}
                onChange={(event) => setVehicleForm((current) => ({ ...current, base_salary: event.target.value }))}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={resetVehicleForm}
              className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isCreating ? 'Saving...' : 'Create Vehicle'}
            </button>
          </div>
        </form>
      ) : null}

      <form onSubmit={handleAssignDriver} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Assign Driver</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle</span>
            <select
              required
              value={assignForm.vehicleId}
              onChange={(event) => setAssignForm((current) => ({ ...current, vehicleId: event.target.value }))}
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
            <span className="mb-2 block text-sm font-medium text-gray-700">Driver</span>
            <select
              required
              value={assignForm.driver_id}
              onChange={(event) => setAssignForm((current) => ({ ...current, driver_id: event.target.value }))}
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
          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input
              type="checkbox"
              checked={assignForm.is_primary}
              onChange={(event) => setAssignForm((current) => ({ ...current, is_primary: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Set as primary assignment</span>
          </label>
        </div>

        <div className="mt-6">
          <button
            type="submit"
            disabled={isAssigning}
            className="rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            {isAssigning ? 'Assigning...' : 'Assign Driver'}
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Owner vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.owner}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Vendor vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{stats.vendor}</div>
        </div>
      </div>

      <div className="space-y-4">
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No vehicles available yet.
          </div>
        ) : (
          vehicles.map((vehicle) => (
            <div key={vehicle.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{vehicle.vehicle_number}</h2>
                      <p className="mt-1 text-sm capitalize text-gray-500">
                        {vehicle.vehicle_type} | {vehicle.owner_type}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {vehicle.vendor_details?.name ? (
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                        Vendor: {vehicle.vendor_details.name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      <Users className="h-4 w-4" />
                      Assigned drivers
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      {(vehicle.assigned_drivers || []).length > 0
                        ? vehicle.assigned_drivers
                            .map((driver) => `${driver.name}${driver.is_primary ? ' (Primary)' : ''}`)
                            .join(', ')
                        : 'No drivers assigned'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      <Wallet className="h-4 w-4" />
                      Rate details
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      KM: Rs. {Number(vehicle.km_rate || 0).toLocaleString('en-IN')}
                    </div>
                    <div className="mt-1 text-sm font-medium text-gray-900">
                      Salary: Rs. {Number(vehicle.base_salary || 0).toLocaleString('en-IN')}
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

export default VehiclesManagement;

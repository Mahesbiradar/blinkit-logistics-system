import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Truck, User } from 'lucide-react';
import { useVehicles } from '../../hooks/useVehicles';

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const VEHICLE_TYPES = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'truck', label: 'Truck' },
  { value: 'van', label: 'Van' },
  { value: 'three_wheeler', label: '3-Wheeler' },
  { value: 'bike', label: 'Bike' },
  { value: 'other', label: 'Other' },
];

// ─── Add Vehicle Form ────────────────────────────────────────────────────────

const AddVehicleForm = ({ onSave, isSaving, onCancel }) => {
  const [ownerType, setOwnerType] = useState('owner');
  const [form, setForm] = useState({
    vehicle_number: '', vehicle_type: 'pickup',
    driver_first_name: '', driver_last_name: '', driver_phone: '', driver_password: '',
  });

  const set = (field, val) => setForm((c) => ({ ...c, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      vehicle: {
        vehicle_number: form.vehicle_number.trim().toUpperCase(),
        vehicle_type: form.vehicle_type,
        owner_type: ownerType,
        base_salary: 0,
        km_rate: 0,
      },
      driver: form.driver_first_name ? {
        first_name: form.driver_first_name.trim(),
        last_name: form.driver_last_name.trim(),
        phone: form.driver_phone.trim(),
        password: form.driver_password,
      } : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Add Vehicle</h2>

      <div className="mt-4 flex gap-3">
        {['owner', 'vendor'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setOwnerType(t)}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition ${
              ownerType === t
                ? t === 'owner' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-purple-600 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {t === 'owner' ? 'Owner Vehicle' : 'Vendor Vehicle'}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle number</span>
          <input required value={form.vehicle_number} onChange={(e) => set('vehicle_number', e.target.value.toUpperCase())} className={fieldClass} placeholder="KA15A6749" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle type</span>
          <select value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)} className={fieldClass}>
            {VEHICLE_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <div className="mb-3 text-sm font-semibold text-gray-700">
          Driver login details <span className="font-normal text-gray-400">(optional — can be added later)</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">First name</span>
            <input value={form.driver_first_name} onChange={(e) => set('driver_first_name', e.target.value)} className={fieldClass} placeholder="Akash" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Last name</span>
            <input value={form.driver_last_name} onChange={(e) => set('driver_last_name', e.target.value)} className={fieldClass} placeholder="Kumar" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Phone (login)</span>
            <input value={form.driver_phone} onChange={(e) => set('driver_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder="9876543210" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Password</span>
            <input type="password" value={form.driver_password} onChange={(e) => set('driver_password', e.target.value)} className={fieldClass} placeholder="Min 6 chars" />
          </label>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
        <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
          {isSaving ? 'Saving…' : 'Create Vehicle'}
        </button>
      </div>
    </form>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const VehiclesManagement = () => {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const hooks = useVehicles();
  const { vehicles, isLoading, isError, error, refetch } = hooks;

  const stats = {
    total: vehicles.length,
    owner: vehicles.filter((v) => v.owner_type === 'owner').length,
    vendor: vehicles.filter((v) => v.owner_type === 'vendor').length,
  };

  const handleCreateVehicle = ({ vehicle, driver }) => {
    hooks.createVehicle(vehicle, {
      onSuccess: (res) => {
        const vehicleId = res?.data?.data?.id;
        if (driver && vehicleId) {
          hooks.createDriver({ vehicleId, data: driver }, {
            onSuccess: () => setShowForm(false),
          });
        } else {
          setShowForm(false);
        }
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
        <h1 className="text-xl font-bold text-red-900">Unable to load vehicles</h1>
        <p className="mt-2 text-sm text-red-700">{error?.response?.data?.message || error?.message}</p>
        <button onClick={() => refetch()} className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage owner and vendor vehicles.</p>
        </div>
        <button
          onClick={() => setShowForm((c) => !c)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <PlusCircle className="h-4 w-4" />
          {showForm ? 'Close form' : 'Add Vehicle'}
        </button>
      </div>

      {showForm && (
        <AddVehicleForm
          isSaving={hooks.isCreating || hooks.isCreatingDriver}
          onSave={handleCreateVehicle}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total vehicles', value: stats.total },
          { label: 'Owner vehicles', value: stats.owner },
          { label: 'Vendor vehicles', value: stats.vendor },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Vehicle list */}
      <div className="space-y-4">
        {vehicles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No vehicles yet. Add your first vehicle above.
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const isOwner = vehicle.owner_type === 'owner';
            const primaryDriver = (vehicle.assigned_drivers || []).find((d) => d.is_primary);

            return (
              <div
                key={vehicle.id}
                className={`cursor-pointer rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${isOwner ? 'border-blue-100' : 'border-purple-100'}`}
                onClick={() => navigate(`/admin/vehicles/${vehicle.id}`)}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isOwner ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{vehicle.vehicle_number}</h2>
                      <p className="text-sm capitalize text-gray-500">{vehicle.vehicle_type}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {isOwner ? 'Owner' : 'Vendor'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {vehicle.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-gray-50 px-4 py-2 text-sm">
                      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                        <User className="h-3.5 w-3.5" />
                        {isOwner ? 'Driver' : 'Vendor / Driver'}
                      </div>
                      <div className="mt-0.5 font-medium text-gray-900">
                        {isOwner
                          ? primaryDriver?.name || <span className="text-gray-400 italic text-xs">No driver</span>
                          : vehicle.vendor_details?.name || '—'}
                      </div>
                      {!isOwner && primaryDriver?.name && (
                        <div className="text-xs text-gray-500">Driver: {primaryDriver.name}</div>
                      )}
                      {isOwner && !primaryDriver && (
                        <div className="text-xs text-amber-600 italic">No driver assigned</div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-blue-600 hover:underline">View Details →</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default VehiclesManagement;

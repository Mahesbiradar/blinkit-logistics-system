import { useState } from 'react';
import { Edit2, PlusCircle, Trash2, Truck, User, Wallet } from 'lucide-react';
import { useDrivers } from '../../hooks/useDrivers';
import { useVehicles } from '../../hooks/useVehicles';

// ─── Add Vehicle Form ────────────────────────────────────────────────────────

const initialOwnerForm = {
  vehicle_number: '', vehicle_type: 'pickup', owner_type: 'owner',
  base_salary: '',
  driver_first_name: '', driver_last_name: '', driver_phone: '', driver_password: '',
};

const initialVendorForm = {
  vehicle_number: '', vehicle_type: 'pickup', owner_type: 'vendor',
  vendor_name: '', vendor_phone: '', km_rate: '',
};

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const AddVehicleForm = ({ vendors, onSave, isSaving, onCancel }) => {
  const [ownerType, setOwnerType] = useState('owner');
  const [form, setForm] = useState(initialOwnerForm);

  const switchType = (type) => {
    setOwnerType(type);
    setForm(type === 'owner' ? initialOwnerForm : initialVendorForm);
  };

  const set = (field, val) => setForm((c) => ({ ...c, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ownerType === 'owner') {
      onSave({
        vehicle: {
          vehicle_number: form.vehicle_number.trim().toUpperCase(),
          vehicle_type: form.vehicle_type,
          owner_type: 'owner',
          base_salary: Number(form.base_salary) || 0,
          km_rate: 0,
        },
        driver: form.driver_first_name ? {
          first_name: form.driver_first_name.trim(),
          last_name: form.driver_last_name.trim(),
          phone: form.driver_phone.trim(),
          password: form.driver_password,
        } : null,
        vendor: null,
      });
    } else {
      onSave({
        vehicle: {
          vehicle_number: form.vehicle_number.trim().toUpperCase(),
          vehicle_type: form.vehicle_type,
          owner_type: 'vendor',
          km_rate: Number(form.km_rate) || 0,
          base_salary: 0,
        },
        driver: null,
        vendor: { name: form.vendor_name.trim(), phone: form.vendor_phone.trim() },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">Add Vehicle</h2>

      {/* Owner type selector */}
      <div className="mt-4 flex gap-3">
        {['owner', 'vendor'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchType(t)}
            className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold capitalize transition ${
              ownerType === t
                ? t === 'owner' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-purple-600 bg-purple-50 text-purple-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {t === 'owner' ? '🚛 Owner Vehicle (Salary)' : '🤝 Vendor Vehicle (Per KM)'}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle number</span>
          <input required value={form.vehicle_number} onChange={(e) => set('vehicle_number', e.target.value.toUpperCase())} className={fieldClass} placeholder="KA15A6749" />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle type</span>
          <select value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)} className={fieldClass}>
            <option value="pickup">Pickup</option>
            <option value="truck">Truck</option>
            <option value="van">Van</option>
            <option value="bike">Bike</option>
            <option value="other">Other</option>
          </select>
        </label>

        {ownerType === 'owner' ? (
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-gray-700">Monthly salary (Rs.)</span>
            <input type="number" min="0" required value={form.base_salary} onChange={(e) => set('base_salary', e.target.value)} className={fieldClass} placeholder="15000" />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vendor name</span>
              <input required value={form.vendor_name} onChange={(e) => set('vendor_name', e.target.value)} className={fieldClass} placeholder="e.g. Ravi Transports" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Vendor phone</span>
              <input required value={form.vendor_phone} onChange={(e) => set('vendor_phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder="10-digit number" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-gray-700">Rate per KM (Rs.)</span>
              <input type="number" min="0" step="0.5" required value={form.km_rate} onChange={(e) => set('km_rate', e.target.value)} className={fieldClass} placeholder="30" />
            </label>
          </>
        )}
      </div>

      {ownerType === 'owner' && (
        <div className="mt-6">
          <div className="mb-3 text-sm font-semibold text-gray-700">Driver login details (optional — can be added later)</div>
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
      )}

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
        <button type="submit" disabled={isSaving} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
          {isSaving ? 'Saving…' : 'Create Vehicle'}
        </button>
      </div>
    </form>
  );
};

// ─── Settings Modal ──────────────────────────────────────────────────────────

const SettingsModal = ({ vehicle, vendors, drivers, onClose, hooks }) => {
  const [tab, setTab] = useState('vehicle');
  const [vForm, setVForm] = useState({
    vehicle_number: vehicle.vehicle_number,
    vehicle_type: vehicle.vehicle_type,
    base_salary: vehicle.base_salary || '',
    km_rate: vehicle.km_rate || '',
    vendor: vehicle.vendor || '',
  });
  const [dForm, setDForm] = useState({ first_name: '', last_name: '', phone: '', password: '' });
  const [assignDriverId, setAssignDriverId] = useState('');
  const isOwner = vehicle.owner_type === 'owner';
  const primaryDriver = (vehicle.assigned_drivers || []).find((d) => d.is_primary);

  const setV = (f, v) => setVForm((c) => ({ ...c, [f]: v }));
  const setD = (f, v) => setDForm((c) => ({ ...c, [f]: v }));

  const handleSaveVehicle = (e) => {
    e.preventDefault();
    const payload = {
      vehicle_number: vForm.vehicle_number.trim().toUpperCase(),
      vehicle_type: vForm.vehicle_type,
      ...(isOwner ? { base_salary: Number(vForm.base_salary) || 0 } : { km_rate: Number(vForm.km_rate) || 0, vendor: vForm.vendor }),
    };
    hooks.updateVehicle({ vehicleId: vehicle.id, data: payload }, { onSuccess: onClose });
  };

  const handleSaveDriverLogin = (e) => {
    e.preventDefault();
    if (!primaryDriver) return;
    const payload = {};
    if (dForm.first_name) payload.first_name = dForm.first_name;
    if (dForm.last_name) payload.last_name = dForm.last_name;
    if (dForm.phone) payload.phone = dForm.phone;
    if (dForm.password) payload.password = dForm.password;
    hooks.updateDriverLogin({ vehicleId: vehicle.id, data: payload }, { onSuccess: () => { setDForm({ first_name: '', last_name: '', phone: '', password: '' }); onClose(); } });
  };

  const handleCreateDriver = (e) => {
    e.preventDefault();
    hooks.createDriver({ vehicleId: vehicle.id, data: dForm }, { onSuccess: onClose });
  };

  const handleAssignExisting = (e) => {
    e.preventDefault();
    hooks.assignDriver({ vehicleId: vehicle.id, data: { driver_id: assignDriverId, is_primary: true } }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{vehicle.vehicle_number} Settings</h2>
            <p className="text-sm text-gray-500 capitalize">{vehicle.vehicle_type} · {vehicle.owner_type}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          {['vehicle', ...(isOwner ? ['driver'] : [])].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold capitalize transition ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {t === 'vehicle' ? 'Vehicle Details' : 'Driver Settings'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === 'vehicle' && (
            <form onSubmit={handleSaveVehicle} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle number</span>
                <input required value={vForm.vehicle_number} onChange={(e) => setV('vehicle_number', e.target.value.toUpperCase())} className={fieldClass} />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700">Vehicle type</span>
                <select value={vForm.vehicle_type} onChange={(e) => setV('vehicle_type', e.target.value)} className={fieldClass}>
                  <option value="pickup">Pickup</option>
                  <option value="truck">Truck</option>
                  <option value="van">Van</option>
                  <option value="bike">Bike</option>
                  <option value="other">Other</option>
                </select>
              </label>
              {isOwner ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700">Monthly salary (Rs.)</span>
                  <input type="number" min="0" value={vForm.base_salary} onChange={(e) => setV('base_salary', e.target.value)} className={fieldClass} />
                </label>
              ) : (
                <>
                  {vehicle.vendor_details?.name && (
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      <span className="font-medium">Vendor:</span> {vehicle.vendor_details.name}
                    </div>
                  )}
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700">Rate per KM (Rs.)</span>
                    <input type="number" min="0" step="0.5" value={vForm.km_rate} onChange={(e) => setV('km_rate', e.target.value)} className={fieldClass} />
                  </label>
                </>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={hooks.isUpdating} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
                  {hooks.isUpdating ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {tab === 'driver' && (
            <div className="space-y-6">
              {primaryDriver ? (
                <>
                  <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                    Current driver: <strong>{primaryDriver.name}</strong> · {primaryDriver.phone || 'Phone not shown'}
                  </div>
                  <form onSubmit={handleSaveDriverLogin} className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Update driver login details</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">First name</span>
                        <input value={dForm.first_name} onChange={(e) => setD('first_name', e.target.value)} className={fieldClass} placeholder={primaryDriver.name?.split(' ')[0]} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Last name</span>
                        <input value={dForm.last_name} onChange={(e) => setD('last_name', e.target.value)} className={fieldClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">New phone</span>
                        <input value={dForm.phone} onChange={(e) => setD('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder="Leave blank to keep" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">New password</span>
                        <input type="password" value={dForm.password} onChange={(e) => setD('password', e.target.value)} className={fieldClass} placeholder="Leave blank to keep" />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={hooks.isUpdatingDriverLogin} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300">
                        {hooks.isUpdatingDriverLogin ? 'Saving…' : 'Update Login'}
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Or assign a different driver</div>
                    <form onSubmit={handleAssignExisting} className="flex gap-3">
                      <select required value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className={`flex-1 ${fieldClass}`}>
                        <option value="">Select driver</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} | {d.user?.phone}</option>)}
                      </select>
                      <button type="submit" disabled={hooks.isAssigning} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-300">
                        {hooks.isAssigning ? '…' : 'Assign'}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
                    No driver assigned yet. Create a new login or assign an existing driver.
                  </div>
                  <form onSubmit={handleCreateDriver} className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700">Create new driver login</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">First name *</span>
                        <input required value={dForm.first_name} onChange={(e) => setD('first_name', e.target.value)} className={fieldClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Last name</span>
                        <input value={dForm.last_name} onChange={(e) => setD('last_name', e.target.value)} className={fieldClass} />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Phone *</span>
                        <input required value={dForm.phone} onChange={(e) => setD('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} className={fieldClass} placeholder="10-digit number" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-gray-600">Password *</span>
                        <input required type="password" value={dForm.password} onChange={(e) => setD('password', e.target.value)} className={fieldClass} />
                      </label>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit" disabled={hooks.isCreatingDriver} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-gray-300">
                        {hooks.isCreatingDriver ? 'Creating…' : 'Create Driver'}
                      </button>
                    </div>
                  </form>

                  <div className="border-t border-gray-100 pt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Or assign existing driver</div>
                    <form onSubmit={handleAssignExisting} className="flex gap-3">
                      <select required value={assignDriverId} onChange={(e) => setAssignDriverId(e.target.value)} className={`flex-1 ${fieldClass}`}>
                        <option value="">Select driver</option>
                        {drivers.map((d) => <option key={d.id} value={d.id}>{d.user?.first_name} {d.user?.last_name} | {d.user?.phone}</option>)}
                      </select>
                      <button type="submit" disabled={hooks.isAssigning} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:bg-gray-300">
                        {hooks.isAssigning ? '…' : 'Assign'}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main page ───────────────────────────────────────────────────────────────

const VehiclesManagement = () => {
  const [showForm, setShowForm] = useState(false);
  const [settingsVehicle, setSettingsVehicle] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const hooks = useVehicles();
  const { vehicles, vendors, isLoading, isError, error, refetch } = hooks;
  const { drivers } = useDrivers({ is_active: true });

  const stats = {
    total: vehicles.length,
    owner: vehicles.filter((v) => v.owner_type === 'owner').length,
    vendor: vehicles.filter((v) => v.owner_type === 'vendor').length,
  };

  const handleCreateVehicle = async ({ vehicle, driver, vendor }) => {
    try {
      let vehiclePayload = vehicle;
      if (vehicle.owner_type === 'vendor' && vendor) {
        const vendorRes = await hooks.createVendorAsync(vendor);
        const vendorId = vendorRes?.data?.data?.id;
        vehiclePayload = { ...vehicle, vendor: vendorId };
      }
      hooks.createVehicle(vehiclePayload, {
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
    } catch {
      // error toasted in hook
    }
  };

  const handleDelete = (id) => {
    hooks.deleteVehicle(id, { onSuccess: () => setConfirmDelete(null) });
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
      {/* Settings modal */}
      {settingsVehicle && (
        <SettingsModal
          vehicle={settingsVehicle}
          vendors={vendors}
          drivers={drivers}
          onClose={() => setSettingsVehicle(null)}
          hooks={hooks}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete vehicle?</h3>
            <p className="mt-2 text-sm text-gray-500">This will permanently remove <strong>{confirmDelete.vehicle_number}</strong>. Trips and expenses linked to this vehicle will remain.</p>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete.id)} disabled={hooks.isDeleting} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-300">
                {hooks.isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
          <p className="mt-1 text-sm text-gray-500">Manage owner vehicles (salary) and vendor vehicles (per KM).</p>
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
          vendors={vendors}
          isSaving={hooks.isCreating || hooks.isCreatingDriver}
          onSave={handleCreateVehicle}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Total vehicles', value: stats.total },
          { label: 'Owner vehicles', value: stats.owner, sub: 'Fixed salary' },
          { label: 'Vendor vehicles', value: stats.vendor, sub: 'Per KM rate' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{s.value}</div>
            {s.sub && <div className="mt-1 text-xs text-gray-400">{s.sub}</div>}
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
              <div key={vehicle.id} className={`rounded-2xl border bg-white p-5 shadow-sm ${isOwner ? 'border-blue-100' : 'border-purple-100'}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${isOwner ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        <Truck className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{vehicle.vehicle_number}</h2>
                        <p className="text-sm capitalize text-gray-500">{vehicle.vehicle_type}</p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isOwner ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {isOwner ? 'Owner — Salary' : 'Vendor — Per KM'}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {vehicle.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {/* Driver / Vendor info */}
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                          <User className="h-3.5 w-3.5" />
                          {isOwner ? 'Driver' : 'Vendor'}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-900">
                          {isOwner
                            ? primaryDriver?.name || <span className="text-gray-400 italic">No driver assigned</span>
                            : vehicle.vendor_details?.name || '—'}
                        </div>
                        {isOwner && primaryDriver?.phone && (
                          <div className="text-xs text-gray-500">{primaryDriver.phone}</div>
                        )}
                      </div>

                      {/* Rate info */}
                      <div className="rounded-xl bg-gray-50 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                          <Wallet className="h-3.5 w-3.5" />
                          {isOwner ? 'Monthly salary' : 'KM rate'}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-gray-900">
                          {isOwner
                            ? `Rs. ${Number(vehicle.base_salary || 0).toLocaleString('en-IN')}/month`
                            : `Rs. ${Number(vehicle.km_rate || 0).toLocaleString('en-IN')}/km`}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 lg:items-end">
                    <button
                      onClick={() => setSettingsVehicle(vehicle)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4" />
                      Settings
                    </button>
                    <button
                      onClick={() => setConfirmDelete(vehicle)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
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

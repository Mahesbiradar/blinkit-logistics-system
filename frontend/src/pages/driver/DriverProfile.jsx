import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { BadgeCheck, ClipboardList, MapPin, Phone, Pencil, Truck, User, X } from 'lucide-react';
import profileService from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

const Avatar = ({ name }) => {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
      {initials}
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[140px]">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </div>
    <span className="text-sm font-medium text-gray-900 text-right">{value || '—'}</span>
  </div>
);

// ─── Personal Info ────────────────────────────────────────────────────────────

const PersonalInfo = ({ user, onSaved }) => {
  const { updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
  });

  const mutation = useMutation(profileService.updateProfile, {
    onSuccess: (res) => {
      const updated = res.data?.data?.user;
      if (updated) updateUser(updated);
      toast.success('Name updated');
      setEditing(false);
      onSaved?.(updated);
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((msg) => toast.error(msg));
      else toast.error(err.response?.data?.message || 'Failed to update');
    },
  });

  const handleCancel = () => {
    setForm({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
    setEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ first_name: form.first_name.trim(), last_name: form.last_name.trim() });
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-900">Personal Information</h2>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        ) : (
          <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {!editing ? (
        <div>
          <InfoRow label="First name" value={user?.first_name} icon={User} />
          <InfoRow label="Last name" value={user?.last_name} />
          <InfoRow label="Phone" value={user?.phone} icon={Phone} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">First name</span>
              <input value={form.first_name} onChange={(e) => setForm((c) => ({ ...c, first_name: e.target.value }))} className={fieldClass} required />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Last name</span>
              <input value={form.last_name} onChange={(e) => setForm((c) => ({ ...c, last_name: e.target.value }))} className={fieldClass} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Phone</span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={user?.phone || ''} disabled className={`${fieldClass} pl-9`} />
            </div>
            <p className="mt-1 text-xs text-gray-400">Phone is your login OTP number — it cannot be changed here.</p>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleCancel} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {mutation.isLoading ? 'Saving…' : 'Save Name'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Driver Details ───────────────────────────────────────────────────────────

const DriverDetails = ({ driverData }) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    license_number: driverData?.license_number || '',
    license_expiry: driverData?.license_expiry || '',
    aadhar_number: driverData?.aadhar_number || '',
    emergency_contact: driverData?.emergency_contact || '',
    address: driverData?.address || '',
  });
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const mutation = useMutation(profileService.updateDriverProfile, {
    onSuccess: () => {
      toast.success('Driver details updated');
      setEditing(false);
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((msg) => toast.error(msg));
      else toast.error(err.response?.data?.message || 'Failed to update');
    },
  });

  const handleCancel = () => {
    setForm({
      license_number: driverData?.license_number || '',
      license_expiry: driverData?.license_expiry || '',
      aadhar_number: driverData?.aadhar_number || '',
      emergency_contact: driverData?.emergency_contact || '',
      address: driverData?.address || '',
    });
    setEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({
      license_number: form.license_number.trim(),
      license_expiry: form.license_expiry || null,
      aadhar_number: form.aadhar_number.trim(),
      emergency_contact: form.emergency_contact.trim(),
      address: form.address.trim(),
    });
  };

  const formatExpiry = (val) =>
    val ? new Date(val).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Driver Details</h2>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        ) : (
          <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {!editing ? (
        <div>
          <InfoRow label="License number" value={driverData?.license_number} icon={BadgeCheck} />
          <InfoRow label="License expiry" value={formatExpiry(driverData?.license_expiry)} />
          <InfoRow label="Aadhar number" value={driverData?.aadhar_number} />
          <InfoRow label="Emergency contact" value={driverData?.emergency_contact} icon={Phone} />
          <InfoRow label="Address" value={driverData?.address} icon={MapPin} />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">License number</span>
              <input value={form.license_number} onChange={(e) => set('license_number', e.target.value)} className={fieldClass} placeholder="DL-XXXXXXXXXXX" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">License expiry</span>
              <input type="date" value={form.license_expiry} onChange={(e) => set('license_expiry', e.target.value)} className={fieldClass} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Aadhar number</span>
              <input
                value={form.aadhar_number}
                onChange={(e) => set('aadhar_number', e.target.value.replace(/\D/g, '').slice(0, 12))}
                className={fieldClass}
                placeholder="XXXX XXXX XXXX"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">Emergency contact</span>
              <input
                value={form.emergency_contact}
                onChange={(e) => set('emergency_contact', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className={fieldClass}
                placeholder="9876543210"
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Address</span>
            <textarea
              rows={3}
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              className={`${fieldClass} resize-none`}
              placeholder="Full residential address"
            />
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleCancel} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-gray-300">
              {mutation.isLoading ? 'Saving…' : 'Save Details'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const DriverProfile = () => {
  const { user, driverProfile } = useAuthStore();

  const { data, isLoading } = useQuery('driverProfile', profileService.getProfile, {
    staleTime: 5 * 60 * 1000,
  });

  const profileUser = data?.data?.data?.user || user;
  const driverData = data?.data?.data?.driver_profile;
  const primaryVehicle = driverProfile?.primary_vehicle;
  const joinedDate = driverData?.joining_date
    ? new Date(driverData.joining_date).toLocaleDateString('default', { month: 'long', year: 'numeric' })
    : null;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  const fullName = `${profileUser?.first_name || ''} ${profileUser?.last_name || ''}`.trim();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">View and update your personal and driver details.</p>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={fullName} />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{fullName || 'Driver'}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">Driver</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${driverData?.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {driverData?.is_active ? 'Active' : 'Inactive'}
              </span>
              {joinedDate && <span className="text-xs text-gray-400">Joined {joinedDate}</span>}
            </div>
          </div>

          {primaryVehicle && (
            <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
              <Truck className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-semibold text-gray-900">{primaryVehicle.vehicle_number}</div>
                <div className="text-xs text-gray-500">Primary vehicle</div>
              </div>
            </div>
          )}

          {driverData?.license_number && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm">
              <BadgeCheck className="h-4 w-4 text-emerald-500" />
              <div>
                <div className="font-semibold text-emerald-800">{driverData.license_number}</div>
                <div className="text-xs text-emerald-600">License</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editable sections */}
      <div className="grid gap-6 xl:grid-cols-2">
        <PersonalInfo user={profileUser} />
        <DriverDetails driverData={driverData} />
      </div>
    </div>
  );
};

export default DriverProfile;

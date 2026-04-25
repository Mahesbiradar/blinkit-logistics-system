import { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import toast from 'react-hot-toast';
import { KeyRound, Mail, Pencil, Phone, Shield, User, X } from 'lucide-react';
import profileService from '../../services/profileService';
import { useAuthStore } from '../../store/authStore';

const fieldClass = 'w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500';

const roleBadge = (role) => {
  const map = { owner: 'bg-blue-100 text-blue-700', coordinator: 'bg-purple-100 text-purple-700' };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${map[role] || 'bg-gray-100 text-gray-700'}`}>
      {role}
    </span>
  );
};

const Avatar = ({ name }) => {
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  return (
    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white">
      {initials}
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-2 text-sm text-gray-500 min-w-[120px]">
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </div>
    <span className="text-sm font-medium text-gray-900 text-right">{value || '—'}</span>
  </div>
);

// ─── Personal Info Section ────────────────────────────────────────────────────

const PersonalInfo = ({ user, onSaved }) => {
  const { updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  const mutation = useMutation(profileService.updateProfile, {
    onSuccess: (res) => {
      const updated = res.data?.data?.user;
      if (updated) updateUser(updated);
      toast.success('Profile updated');
      setEditing(false);
      onSaved?.(updated);
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((msg) => toast.error(msg));
      else toast.error(err.response?.data?.message || 'Failed to update profile');
    },
  });

  const handleCancel = () => {
    setForm({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' });
    setEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim() });
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
          <InfoRow label="Email" value={user?.email} icon={Mail} />
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
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Email</span>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input type="email" value={form.email} onChange={(e) => setForm((c) => ({ ...c, email: e.target.value }))} className={`${fieldClass} pl-9`} />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">Phone</span>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={user?.phone || ''} disabled className={`${fieldClass} pl-9`} />
            </div>
            <p className="mt-1 text-xs text-gray-400">Phone cannot be changed — it is your login identifier.</p>
          </label>
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleCancel} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
              {mutation.isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Change Password Section ──────────────────────────────────────────────────

const ChangePassword = () => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const set = (f, v) => setForm((c) => ({ ...c, [f]: v }));

  const mutation = useMutation(profileService.changePassword, {
    onSuccess: () => {
      toast.success('Password changed successfully');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setEditing(false);
    },
    onError: (err) => {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((msg) => toast.error(msg));
      else toast.error(err.response?.data?.message || 'Failed to change password');
    },
  });

  const handleCancel = () => {
    setForm({ current_password: '', new_password: '', confirm_password: '' });
    setEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) { toast.error('New passwords do not match'); return; }
    if (form.new_password.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition">
            <Pencil className="h-3.5 w-3.5" /> Change
          </button>
        ) : (
          <button type="button" onClick={handleCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition">
            <X className="h-3.5 w-3.5" /> Cancel
          </button>
        )}
      </div>

      {!editing ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
            <KeyRound className="h-6 w-6 text-indigo-400" />
          </div>
          <p className="mt-3 text-sm text-gray-500">Click <strong>Change</strong> to update your password.</p>
          <p className="mt-1 text-xs text-gray-400">Use a strong password with at least 8 characters.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { label: 'Current password', key: 'current_password', placeholder: 'Enter current password' },
            { label: 'New password', key: 'new_password', placeholder: 'Min 8 characters' },
            { label: 'Confirm new password', key: 'confirm_password', placeholder: 'Repeat new password' },
          ].map(({ label, key, placeholder }) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
              <input type="password" value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={placeholder} required className={fieldClass} />
            </label>
          ))}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={handleCancel} className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={mutation.isLoading} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-300">
              {mutation.isLoading ? 'Changing…' : 'Change Password'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const AdminProfile = () => {
  const { user } = useAuthStore();

  const { data, isLoading } = useQuery('profile', profileService.getProfile, { staleTime: 5 * 60 * 1000 });

  const profileUser = data?.data?.data?.user || user;
  const joinedDate = profileUser?.created_at
    ? new Date(profileUser.created_at).toLocaleDateString('default', { month: 'long', year: 'numeric' })
    : null;

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your account details and security settings.</p>
      </div>

      {/* Header card */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar name={`${profileUser?.first_name} ${profileUser?.last_name}`} />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profileUser?.first_name} {profileUser?.last_name}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {roleBadge(profileUser?.role)}
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${profileUser?.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {profileUser?.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {joinedDate && <p className="mt-1.5 text-xs text-gray-400">Member since {joinedDate}</p>}
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-sm">
            <Shield className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">{profileUser?.email || '—'}</span>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="grid gap-6 xl:grid-cols-2">
        <PersonalInfo user={profileUser} />
        <ChangePassword />
      </div>
    </div>
  );
};

export default AdminProfile;

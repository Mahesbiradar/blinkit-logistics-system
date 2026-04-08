import { useQuery } from 'react-query';
import { Phone, User, Wallet } from 'lucide-react';
import api from '../../services/api';

const DriversManagement = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => api.get('/drivers/'),
  });

  const drivers = data?.data?.data?.drivers || [];

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
        <h1 className="text-2xl font-bold text-gray-900">Drivers</h1>
        <p className="mt-1 text-sm text-gray-500">Monitor driver profiles, assigned vehicles, and salary data.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total drivers</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{drivers.length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Active drivers</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{drivers.filter((driver) => driver.is_active).length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">With vehicle assigned</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{drivers.filter((driver) => (driver.vehicles || []).length > 0).length}</div>
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
                      <h2 className="text-lg font-semibold text-gray-900">{driver.user?.first_name} {driver.user?.last_name}</h2>
                      <p className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="h-4 w-4" />
                        {driver.user?.phone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
                    <span className={`rounded-full px-3 py-1 font-semibold ${driver.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
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

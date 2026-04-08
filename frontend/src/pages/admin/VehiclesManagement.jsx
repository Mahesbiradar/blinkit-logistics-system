import { useQuery } from 'react-query';
import { Truck, Users, Wallet } from 'lucide-react';
import api from '../../services/api';

const VehiclesManagement = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.get('/vehicles/'),
  });

  const vehicles = data?.data?.data?.vehicles || [];

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
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <p className="mt-1 text-sm text-gray-500">Track owner and vendor vehicles, rates, and driver assignments.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Total vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{vehicles.length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Owner vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{vehicles.filter((vehicle) => vehicle.owner_type === 'owner').length}</div>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-500">Vendor vehicles</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{vehicles.filter((vehicle) => vehicle.owner_type === 'vendor').length}</div>
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
                        {vehicle.vehicle_type} - {vehicle.owner_type}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${vehicle.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
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
                        ? vehicle.assigned_drivers.map((driver) => driver.name).join(', ')
                        : 'No drivers assigned'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                      <Wallet className="h-4 w-4" />
                      KM rate
                    </div>
                    <div className="mt-2 text-sm font-medium text-gray-900">
                      Rs. {Number(vehicle.km_rate || 0).toLocaleString('en-IN')}
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

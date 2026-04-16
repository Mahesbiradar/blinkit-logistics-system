import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Route,
  XCircle,
} from 'lucide-react';
import { useMyTrips } from '../../hooks/useTrips';

const statusStyles = {
  approved: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  rejected: 'bg-red-100 text-red-700',
};

const MyTrips = () => {
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });

  const queryParams = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.start_date ? { start_date: filters.start_date } : {}),
    ...(filters.end_date ? { end_date: filters.end_date } : {}),
  };

  const { myTrips, summary, isLoading } = useMyTrips(queryParams);

  const cards = useMemo(
    () => [
      { label: 'Total Trips', value: summary.total_trips || 0, icon: MapPin },
      { label: 'Approved', value: summary.approved_trips || 0, icon: CheckCircle },
      { label: 'Pending', value: summary.pending_trips || 0, icon: Clock },
      { label: 'Total KM', value: `${summary.total_km || 0} km`, icon: Route },
    ],
    [summary]
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Trips</h1>
            <p className="mt-2 text-sm text-gray-500">
              Trips are loaded from `/trips/my-trips/` and reflect your current approval status.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filters.status}
              onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <input
              type="date"
              value={filters.start_date}
              onChange={(event) => setFilters((current) => ({ ...current, start_date: event.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <input
              type="date"
              value={filters.end_date}
              onChange={(event) => setFilters((current) => ({ ...current, end_date: event.target.value }))}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
            <Link
              to="/driver/add-trip"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Add trip
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <card.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="mt-1 text-sm text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {myTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
            No trips found for the selected filter.
          </div>
        ) : (
          myTrips.map((trip) => (
            <div key={trip.id} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {trip.trip_1?.store_name || 'Trip entry'}
                      {trip.trip_2?.store_name ? ` and ${trip.trip_2.store_name}` : ''}
                    </h2>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
                        statusStyles[trip.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {trip.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(trip.trip_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Route className="h-4 w-4" />
                      {trip.total_km} km total
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {trip.vehicle_number || trip.vehicle?.vehicle_number || 'Vehicle not assigned'}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {trip.trip_1 ? (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">Trip 1</div>
                        <div className="mt-2">{trip.trip_1.store_name}</div>
                        <div className="text-gray-500">
                          {trip.trip_1.one_way_km} km one-way
                          {trip.trip_1.dispatch_time ? ` | ${trip.trip_1.dispatch_time}` : ''}
                        </div>
                      </div>
                    ) : null}
                    {trip.trip_2 ? (
                      <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">Trip 2</div>
                        <div className="mt-2">{trip.trip_2.store_name}</div>
                        <div className="text-gray-500">
                          {trip.trip_2.one_way_km} km one-way
                          {trip.trip_2.dispatch_time ? ` | ${trip.trip_2.dispatch_time}` : ''}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {trip.remarks ? (
                    <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                      Remarks: {trip.remarks}
                    </div>
                  ) : null}

                  {trip.rejection_reason ? (
                    <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                      Rejection reason: {trip.rejection_reason}
                    </div>
                  ) : null}
                </div>

                {trip.status === 'approved' ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Approved
                  </div>
                ) : trip.status === 'rejected' ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                    <XCircle className="h-4 w-4" />
                    Rejected
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700">
                    <Clock className="h-4 w-4" />
                    Awaiting review
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyTrips;

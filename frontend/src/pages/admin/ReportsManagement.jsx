import { useState } from 'react';
import { useQuery } from 'react-query';
import { FileSpreadsheet, FileText, Download, Filter, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';
import driverService from '../../services/driverService';
import vehicleService from '../../services/vehicleService';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;

const YEARS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const EXPENSE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'toll', label: 'Toll' },
  { value: 'advance', label: 'Advance' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Other' },
  { value: 'company_management', label: 'Company / Management' },
];

const SelectField = ({ label, value, onChange, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </select>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs font-medium text-gray-600">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
);

const DownloadButton = ({ onClick, loading, variant = 'excel', label }) => {
  const isExcel = variant === 'excel';
  const isPDF = variant === 'pdf';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        isPDF
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isPDF ? (
        <FileText className="w-4 h-4" />
      ) : (
        <FileSpreadsheet className="w-4 h-4" />
      )}
      {label}
    </button>
  );
};

const ReportCard = ({ title, description, icon: Icon, iconColor, children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="p-5 border-b border-gray-50 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Monthly MIS ─────────────────────────────────────────────────────────────

const MonthlyMISSection = ({ vehicles }) => {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [vehicleId, setVehicleId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await reportService.downloadMonthlyMIS(Number(year), Number(month), vehicleId || null);
      toast.success('MIS report downloaded');
    } catch {
      toast.error('Failed to download MIS report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportCard
      title="Monthly MIS Report"
      description="Trip-by-trip log matching the original Excel format. Regular & adhoc sheets."
      icon={FileSpreadsheet}
      iconColor="bg-blue-600"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <SelectField label="Year" value={year} onChange={setYear}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </SelectField>

        <SelectField label="Month" value={month} onChange={setMonth}>
          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </SelectField>

        <SelectField label="Vehicle (optional)" value={vehicleId} onChange={setVehicleId}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.vehicle_number}</option>
          ))}
        </SelectField>
      </div>

      <DownloadButton
        onClick={handleDownload}
        loading={loading}
        variant="excel"
        label="Download Excel"
      />
    </ReportCard>
  );
};

// ─── Expense Report ───────────────────────────────────────────────────────────

const ExpenseReportSection = ({ drivers, vehicles }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [expenseType, setExpenseType] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      await reportService.downloadExpenseReport({ startDate, endDate, driverId, vehicleId, expenseType });
      toast.success('Expense report downloaded');
    } catch {
      toast.error('Failed to download expense report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportCard
      title="Expense Report"
      description="All expenses filtered by driver, vehicle, type, or date range."
      icon={Filter}
      iconColor="bg-emerald-600"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <InputField label="Start Date" type="date" value={startDate} onChange={setStartDate} />
        <InputField label="End Date" type="date" value={endDate} onChange={setEndDate} />

        <SelectField label="Driver (optional)" value={driverId} onChange={setDriverId}>
          <option value="">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.user?.first_name} {d.user?.last_name}
            </option>
          ))}
        </SelectField>

        <SelectField label="Vehicle (optional)" value={vehicleId} onChange={setVehicleId}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>{v.vehicle_number}</option>
          ))}
        </SelectField>

        <SelectField label="Expense Type" value={expenseType} onChange={setExpenseType}>
          {EXPENSE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </SelectField>
      </div>

      <DownloadButton
        onClick={handleDownload}
        loading={loading}
        variant="excel"
        label="Download Excel"
      />
    </ReportCard>
  );
};

// ─── Payment Summary ──────────────────────────────────────────────────────────

const PaymentSummarySection = () => {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [month, setMonth] = useState(String(CURRENT_MONTH));
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);

  const handleDownload = async (format) => {
    const setLoading = format === 'pdf' ? setLoadingPdf : setLoadingExcel;
    setLoading(true);
    try {
      await reportService.downloadPaymentSummary(Number(year), Number(month), format);
      toast.success(`Payment summary ${format.toUpperCase()} downloaded`);
    } catch {
      toast.error('Failed to download payment summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReportCard
      title="Payment Summary"
      description="Monthly salary & vendor settlement summary with full deduction breakdown."
      icon={Download}
      iconColor="bg-purple-600"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <SelectField label="Year" value={year} onChange={setYear}>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </SelectField>

        <SelectField label="Month" value={month} onChange={setMonth}>
          {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </SelectField>
      </div>

      <div className="flex flex-wrap gap-3">
        <DownloadButton
          onClick={() => handleDownload('excel')}
          loading={loadingExcel}
          variant="excel"
          label="Download Excel"
        />
        <DownloadButton
          onClick={() => handleDownload('pdf')}
          loading={loadingPdf}
          variant="pdf"
          label="Download PDF"
        />
      </div>
    </ReportCard>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const ReportsManagement = () => {
  const { data: driversData } = useQuery('report-drivers', () =>
    driverService.getDrivers({ page_size: 200 })
  );
  const { data: vehiclesData } = useQuery('report-vehicles', () =>
    vehicleService.getVehicles({ page_size: 200 })
  );

  const drivers = driversData?.data?.drivers || driversData?.data?.results || [];
  const vehicles = vehiclesData?.data?.vehicles || vehiclesData?.data?.results || [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Download MIS reports, expense summaries, and payment statements
        </p>
      </div>

      <div className="grid gap-6">
        <MonthlyMISSection vehicles={vehicles} />
        <ExpenseReportSection drivers={drivers} vehicles={vehicles} />
        <PaymentSummarySection />
      </div>
    </div>
  );
};

export default ReportsManagement;

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  PlusCircle,
  List,
  Wallet,
  LogOut,
  Menu,
  X,
  Truck,
  UserCircle
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';

const DriverLayout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { user, driverProfile } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { path: '/driver/dashboard', label: 'Dashboard', icon: Home },
    { path: '/driver/add-trip', label: 'Add Trip', icon: PlusCircle },
    { path: '/driver/my-trips', label: 'My Trips', icon: List },
    { path: '/driver/my-expenses', label: 'My Expenses', icon: Wallet },
    { path: '/driver/profile', label: 'Profile', icon: UserCircle },
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <header className="bg-white border-b sticky top-0 z-50 lg:hidden">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">JJR Logistics</span>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <nav className="border-t bg-white">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </nav>
        )}
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r h-screen sticky top-0">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg block">JJR Logistics</span>
                <span className="text-xs text-gray-500">
                  {user?.first_name || 'Driver'} | {driverProfile?.primary_vehicle?.vehicle_number || 'No vehicle'}
                </span>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t space-y-2">
            <NavLink
              to="/driver/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white flex-shrink-0">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">{user?.first_name} {user?.last_name}</div>
                <div className="truncate text-xs text-gray-500">{driverProfile?.primary_vehicle?.vehicle_number || 'No vehicle'}</div>
              </div>
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="p-4 lg:p-6 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DriverLayout;

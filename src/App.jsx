import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { ChefHat, User, Shield, Utensils, Printer, Receipt } from 'lucide-react';
import CustomerLayout from './layouts/CustomerLayout';
import DashboardLayout from './layouts/DashboardLayout';
import Menu from './pages/customer/Menu';
import Cart from './pages/customer/Cart';
import Payment from './pages/customer/Payment';
import AdminDashboard from './pages/admin/AdminDashboard';
import Analytics from './pages/admin/Analytics';
import Forecast from './pages/admin/Forecast';
import AdminOrders from './pages/admin/AdminOrders';
import AdminTables from './pages/admin/AdminTables';
import AdminMenu from './pages/admin/AdminMenu';
import AdminStaff from './pages/admin/AdminStaff';
import AdminBills from './pages/admin/AdminBills';
import AdminSettings from './pages/admin/AdminSettings';
import WaiterDashboard from './pages/waiter/WaiterDashboard';
import WaiterOrders from './pages/waiter/WaiterOrders';
import OrderStatus from './pages/customer/OrderStatus';
import TableSelection from './pages/customer/TableSelection';
import Login from './pages/auth/Login';
import Home from './pages/public/Home';
import PosDesktop from './pages/pos/PosDesktop';

// Staff portal: role entry points (no credentials shown)
const Portal = () => (
  <div className="min-h-screen bg-[#F4F6F0] flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-lg text-center space-y-6">
      <a href="/" className="inline-block transition-transform hover:scale-105">
        <img src="/images/sparkling-logo-dark.png" alt="The Sparkling" className="h-16 w-auto mx-auto object-contain" />
      </a>
      <div>
        <h1 className="text-2xl font-extrabold text-[#222222]">Staff Operations Portal</h1>
        <p className="text-xs text-[#818181] mt-1">Select your staff role to authenticate and enter the workspace</p>
      </div>

      <div className="p-3 border border-[#EBEBEB] rounded-3xl bg-white shadow-[0_8px_30px_rgba(90,114,74,0.06)] grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a href="/pos/login" className="flex flex-col items-center p-4 bg-[#F8F8F8] rounded-2xl border border-[#EBEBEB] hover:border-[#5A724A] hover:bg-[#BCE2A3]/20 transition-all group">
          <div className="w-11 h-11 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center text-[#5A724A] group-hover:scale-110 transition-transform mb-2 shadow-xs">
            <Receipt size={22} />
          </div>
          <span className="text-sm font-bold text-[#222222]">Cashier POS</span>
          <span className="text-[10px] text-[#818181] mt-0.5 font-mono">billing@sparkling.com</span>
        </a>

        <a href="/admin/login" className="flex flex-col items-center p-4 bg-[#F8F8F8] rounded-2xl border border-[#EBEBEB] hover:border-[#5A724A] hover:bg-[#BCE2A3]/20 transition-all group">
          <div className="w-11 h-11 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center text-[#5A724A] group-hover:scale-110 transition-transform mb-2 shadow-xs">
            <Shield size={22} />
          </div>
          <span className="text-sm font-bold text-[#222222]">Admin Portal</span>
          <span className="text-[10px] text-[#818181] mt-0.5 font-mono">admin@sparkling.com</span>
        </a>

        <a href="/waiter/login" className="flex flex-col items-center p-4 bg-[#F8F8F8] rounded-2xl border border-[#EBEBEB] hover:border-[#5A724A] hover:bg-[#BCE2A3]/20 transition-all group">
          <div className="w-11 h-11 rounded-xl bg-white border border-[#EBEBEB] flex items-center justify-center text-[#5A724A] group-hover:scale-110 transition-transform mb-2 shadow-xs">
            <User size={22} />
          </div>
          <span className="text-sm font-bold text-[#222222]">Waiter Terminal</span>
          <span className="text-[10px] text-[#818181] mt-0.5 font-mono">waiter@sparkling.com</span>
        </a>
      </div>

      {/* Direct thermal printer notice */}
      <div className="p-3 bg-stone-100 rounded-2xl border border-stone-200 text-stone-600 text-xs flex items-center justify-center gap-2">
        <Printer size={15} className="text-[#5A724A]" />
        <span>Kitchen orders automatically print directly to the thermal printer (no kitchen screen).</span>
      </div>

      <div className="pt-2">
        <a href="/" className="text-xs text-[#818181] hover:text-[#5A724A] font-semibold transition-colors">
          ← Return to Website
        </a>
      </div>
    </div>
  </div>
);

const RequireRole = ({ roles, loginPath, children }) => {
  const token = localStorage.getItem('token');
  let user = null;

  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    localStorage.removeItem('user');
  }

  if (!token || !user || !roles.includes(user.role)) {
    return <Navigate to={loginPath} replace />;
  }

  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/portal" element={<Portal />} />

        <Route path="/admin/login" element={<Login role="Admin" />} />
        <Route path="/waiter/login" element={<Login role="Waiter" />} />
        <Route path="/pos/login" element={<Login role="Billing" />} />
        <Route path="/cashier/login" element={<Navigate to="/pos/login" replace />} />
        <Route path="/billing/login" element={<Navigate to="/pos/login" replace />} />
        <Route path="/pos" element={
          <RequireRole roles={['admin', 'billing']} loginPath="/pos/login">
            <PosDesktop />
          </RequireRole>
        } />
        <Route path="/cashier" element={<Navigate to="/pos" replace />} />
        <Route path="/billing" element={<Navigate to="/pos" replace />} />
        <Route path="/kitchen/login" element={<Navigate to="/portal" replace />} />
        <Route path="/kitchen" element={<Navigate to="/portal" replace />} />
        <Route path="/kitchen/*" element={<Navigate to="/portal" replace />} />

        <Route path="/admin" element={
          <RequireRole roles={['admin']} loginPath="/admin/login">
            <DashboardLayout role="admin" />
          </RequireRole>
        }>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="menu" element={<AdminMenu />} />
          <Route path="orders" element={<AdminBills />} />
          <Route path="tables" element={<AdminTables />} />
          <Route path="staff" element={<AdminStaff />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="inventory" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="forecast" element={<Forecast />} />
        </Route>

        <Route path="/waiter" element={
          <RequireRole roles={['admin', 'waiter']} loginPath="/waiter/login">
            <DashboardLayout role="waiter" />
          </RequireRole>
        }>
          <Route path="dashboard" element={<WaiterDashboard />} />
          <Route path="orders" element={<WaiterOrders />} />
        </Route>



        <Route path="/tables" element={<Navigate to="/table" replace />} />
        <Route path="/table" element={<TableSelection />} />
        <Route path="/table/:tableId/*" element={<CustomerLayout />}>
          <Route index element={<Navigate to="menu" replace />} />
          <Route path="menu" element={<Menu />} />
          <Route path="cart" element={<Cart />} />
          <Route path="payment" element={<Payment />} />
          <Route path="status" element={<OrderStatus />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={
          <div className="min-h-screen bg-[#F4F6F0] flex flex-col items-center justify-center text-[#818181] p-6 text-center">
            <span className="text-4xl mb-3">✨</span>
            <h2 className="text-2xl font-bold text-[#222222]">Page Not Found</h2>
            <p className="text-sm mt-1 mb-6">The requested dining area could not be found.</p>
            <a href="/" className="px-6 py-2.5 bg-[#5A724A] text-white font-bold rounded-full text-sm">
              Return Home
            </a>
          </div>
        } />
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{
        style: {
          borderRadius: '9999px',
          background: '#222222',
          color: '#ffffff',
          fontSize: '13px',
          padding: '10px 18px',
        }
      }} />
      <AnimatedRoutes />
    </BrowserRouter>
  );
}

export default App;

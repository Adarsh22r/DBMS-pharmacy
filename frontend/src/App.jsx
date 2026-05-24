import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterPatient from './pages/RegisterPatient';
import PatientLookup from './pages/PatientLookup';
import BedManagement from './pages/BedManagement';
import Dispatch from './pages/Dispatch';
import Stock from './pages/Stock';
import Billing from './pages/Billing';
import SalesReport from './pages/SalesReport';
import { Calendar } from 'lucide-react';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [staff, setStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Check local storage for session
    const token = localStorage.getItem('token');
    const savedStaff = localStorage.getItem('staff');

    if (token && savedStaff) {
      setIsAuthenticated(true);
      setStaff(JSON.parse(savedStaff));
    }

    // Timer for header
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (loggedInStaff) => {
    setIsAuthenticated(true);
    setStaff(loggedInStaff);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('staff');
    setIsAuthenticated(false);
    setStaff(null);
  };

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render correct page view
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard setCurrentPage={setCurrentPage} />;
      case 'register-patient':
        return <RegisterPatient setCurrentPage={setCurrentPage} />;
      case 'patient-lookup':
        return <PatientLookup />;
      case 'bed-management':
        return <BedManagement />;
      case 'dispatch':
        return <Dispatch />;
      case 'stock':
        return <Stock />;
      case 'billing':
        return <Billing />;
      case 'sales-report':
        return <SalesReport />;
      default:
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };

  return (
    <div className="flex bg-[#f0fdf4] min-h-screen">
      {/* Sidebar Navigation */}
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        staff={staff} 
        onLogout={handleLogout} 
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Global Premium Navbar */}
        <header className="bg-white border-b border-slate-100 px-8 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-slate-500 tracking-wide uppercase">
              Hospital Management Subsystem Active
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-500 font-semibold">
            {/* Clock Widget */}
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
              <Calendar size={14} className="text-teal-600" />
              <span>
                {currentTime.toLocaleDateString('en-IN', { 
                  weekday: 'short', 
                  day: '2-digit', 
                  month: 'short' 
                })}
              </span>
              <span className="text-slate-350">|</span>
              <span className="font-mono text-slate-800">
                {currentTime.toLocaleTimeString('en-IN', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </span>
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-150 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200">
                {staff?.full_name?.charAt(0) || 'S'}
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <span className="font-bold text-slate-700 block">{staff?.full_name}</span>
                <span className="text-[10px] text-slate-400 font-medium">{staff?.role}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

export default App;

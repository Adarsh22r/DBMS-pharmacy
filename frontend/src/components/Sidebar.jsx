import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  Search, 
  BedDouble, 
  FileSpreadsheet, 
  Package, 
  Receipt, 
  TrendingUp, 
  LogOut,
  PlusSquare
} from 'lucide-react';

const Sidebar = ({ currentPage, setCurrentPage, staff, onLogout }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Doctor', 'Pharmacist', 'Nurse'] },
    { id: 'register-patient', label: 'Register Patient', icon: UserPlus, roles: ['Admin', 'Nurse'] },
    { id: 'patient-lookup', label: 'Patient Lookup', icon: Search, roles: ['Admin', 'Doctor', 'Nurse', 'Pharmacist'] },
    { id: 'bed-management', label: 'Bed Management', icon: BedDouble, roles: ['Admin', 'Nurse'] },
    { id: 'dispatch', label: 'Medicine Dispatch', icon: FileSpreadsheet, roles: ['Admin', 'Pharmacist'] },
    { id: 'stock', label: 'Stock & Inventory', icon: Package, roles: ['Admin', 'Pharmacist'] },
    { id: 'billing', label: 'Billing & Invoice', icon: Receipt, roles: ['Admin'] },
    { id: 'sales-report', label: 'Sales Reports', icon: TrendingUp, roles: ['Admin'] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.roles.includes(staff?.role));


  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col shadow-xl z-20 transition-all-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center font-bold text-lg text-white">
          M
        </div>
        <div>
          <h1 className="font-bold text-md leading-tight text-teal-400">MediCare Pro</h1>
          <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">DBMS v1.0</span>
        </div>
      </div>

      {/* Staff Logged-in Info */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col">
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Logged In As</span>
        <span className="font-medium text-slate-200 text-sm truncate">{staff?.full_name}</span>
        <span className="text-xs text-teal-400 font-semibold">{staff?.role}</span>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;

          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all-300 ${
                isActive 
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-all-300"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

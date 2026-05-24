import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { 
  Users, 
  Activity, 
  Bed, 
  AlertTriangle, 
  DollarSign,
  Clock,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid
} from 'recharts';

const Dashboard = ({ setCurrentPage }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sample data for revenue chart
  const chartData = [
    { name: 'Mon', revenue: 2400 },
    { name: 'Tue', revenue: 3100 },
    { name: 'Wed', revenue: 4500 },
    { name: 'Thu', revenue: 3800 },
    { name: 'Fri', revenue: 5200 },
    { name: 'Sat', revenue: 4200 },
    { name: 'Sun', revenue: 4800 },
  ];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/reports/dashboard-summary');
        setSummary(res.data);
      } catch (err) {
        setError('Failed to fetch dashboard summary details');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Hospital & Pharmacy Overview</h2>
          <p className="text-sm text-slate-500">Real-time database statistics and clinical operations feed</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setCurrentPage('register-patient')}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium text-sm transition-all-300 shadow-md shadow-teal-700/10 flex items-center gap-1.5"
          >
            <span>Register Patient</span>
          </button>
          <button 
            onClick={() => setCurrentPage('dispatch')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-all-300 shadow-md flex items-center gap-1.5"
          >
            <span>Dispatch Medicine</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Active IPD */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Admitted (IPD)</span>
            <span className="text-2xl font-bold text-slate-800">{summary?.activeIpd || 0}</span>
            <span className="text-[10px] text-teal-600 block mt-1 font-semibold">Active Admissions</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {/* Card 2: OPD Today */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">OPD Visits</span>
            <span className="text-2xl font-bold text-slate-800">{summary?.opdToday || 0}</span>
            <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">Registered Today</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>

        {/* Card 3: Available Beds */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Beds</span>
            <span className="text-2xl font-bold text-slate-800">{summary?.availableBeds || 0}</span>
            <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Ward Capacity</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bed size={24} />
          </div>
        </div>

        {/* Card 4: Low Stock */}
        <button 
          onClick={() => setCurrentPage('stock')}
          className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-amber-200 text-left transition-all-300 group"
        >
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Stock Alerts</span>
            <span className={`text-2xl font-bold ${summary?.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
              {summary?.lowStockCount || 0}
            </span>
            <span className="text-[10px] text-amber-600 block mt-1 font-semibold group-hover:underline">Low/Out of Stock</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary?.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
            <AlertTriangle size={24} />
          </div>
        </button>

        {/* Card 5: Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Rev. (Monthly)</span>
            <span className="text-2xl font-bold text-slate-800">₹{parseFloat(summary?.monthlyRevenue || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-purple-600 block mt-1 font-semibold">Total Invoice Amount</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts & Feed Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Column */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-md">Pharmacy Revenue Trends</h3>
                <p className="text-xs text-slate-400">Weekly medicine billing and dispensary turnover</p>
              </div>
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <TrendingUp size={12} />
                +14% vs last week
              </span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="#0D9488" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>Data updated real-time</span>
            <button 
              onClick={() => setCurrentPage('sales-report')} 
              className="text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 group"
            >
              <span>View Full Report</span>
              <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-all-300" />
            </button>
          </div>
        </div>

        {/* Activity Feed Column */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-md mb-1">Recent Activity Logs</h3>
            <p className="text-xs text-slate-400 mb-4">Latest database triggers and logs</p>

            <div className="space-y-4">
              {summary?.activities && summary.activities.length > 0 ? (
                summary.activities.map((act, index) => (
                  <div key={index} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      act.type === 'Admission' 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {act.type === 'Admission' ? <Users size={16} /> : <Activity size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-slate-700 truncate">{act.patient_name}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 font-medium flex items-center gap-0.5">
                          <Clock size={10} />
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {act.type === 'Admission' ? `Admitted: ${act.detail}` : `Dispatched: ${act.detail}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No activity logs recorded today
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
            <span>Triggers active</span>
            <span className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

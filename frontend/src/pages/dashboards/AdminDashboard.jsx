import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { 
  Users, 
  Activity, 
  Bed, 
  AlertTriangle, 
  DollarSign,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck
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

const AdminDashboard = ({ setCurrentPage }) => {
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
    const fetchAdminData = async () => {
      try {
        const [sumRes, actRes] = await Promise.all([
          api.get('/reports/summary'),
          api.get('/activity/recent')
        ]);
        setSummary({
          ...sumRes.data,
          activities: actRes.data
        });
      } catch (err) {
        setError('Failed to fetch admin overview statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-scaleUp">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Administrative Overview</h2>
          <p className="text-sm text-slate-500">Real-time financial turnover, bed occupancy, and operations feed</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Today's Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Today's Revenue</span>
            <span className="text-2xl font-bold text-slate-800">₹{parseFloat(summary?.todayRevenue || 0).toLocaleString('en-IN')}</span>
            <span className="text-[10px] text-teal-600 block mt-1 font-semibold">Today's Billing</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 2: Active IPD */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Admitted (IPD)</span>
            <span className="text-2xl font-bold text-slate-800">{summary?.activeIpd || 0}</span>
            <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Active Admissions</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        {/* Card 3: OPD Visits */}
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

        {/* Card 4: Bed Occupancy */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Bed Occupancy</span>
            <span className="text-2xl font-bold text-slate-800">{summary?.bedOccupancy || '0%'}</span>
            <span className="text-[10px] text-amber-600 block mt-1 font-semibold">Wards Capacity</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Bed size={24} />
          </div>
        </div>

        {/* Card 5: Actions */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <button 
            onClick={() => setCurrentPage('billing')}
            className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition duration-200 text-center"
          >
            Go to Billing
          </button>
          <button 
            onClick={() => setCurrentPage('sales-report')}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition duration-200 text-center mt-2"
          >
            Sales Reports
          </button>
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
          </div>
        </div>

        {/* Activity Feed Column */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-md mb-1">Recent Activity Logs</h3>
            <p className="text-xs text-slate-400 mb-4">Latest hospital events and transactions</p>

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

export default AdminDashboard;

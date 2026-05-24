import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { TrendingUp, BarChart2, PieChart, Calendar, TrendingDown, RefreshCw } from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts';

const SalesReport = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Date controls
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Stats
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalUnits: 0,
    topMed: 'N/A'
  });

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  useEffect(() => {
    fetchSalesReport();
  }, [year, month]);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      // Calls stored procedure sp_sales_report(year, month) via Express backend
      const res = await api.get(`/reports/sales?year=${year}&month=${month}`);
      const salesData = res.data;
      setSales(salesData);

      // Calculate Metrics
      let rev = 0;
      let units = 0;
      let topItem = 'N/A';
      let maxRevenue = 0;

      salesData.forEach(item => {
        const itemRev = parseFloat(item.total_revenue) || 0;
        const itemUnits = parseInt(item.total_units_sold) || 0;
        rev += itemRev;
        units += itemUnits;

        if (itemRev > maxRevenue) {
          maxRevenue = itemRev;
          topItem = item.medicine_name;
        }
      });

      setMetrics({
        totalRevenue: rev,
        totalUnits: units,
        topMed: topItem
      });

    } catch (err) {
      setError('Failed to fetch sales analytics datasets');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data: Top 5 medicines by revenue
  const barChartData = sales
    .slice(0, 5)
    .map(item => ({
      name: item.medicine_name.split(' ')[0], // short name
      revenue: parseFloat(item.total_revenue)
    }));

  // Prepare chart data: Group revenue by category for PieChart
  const categoriesDataMap = sales.reduce((acc, item) => {
    const cat = item.category || 'General';
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += parseFloat(item.total_revenue);
    return acc;
  }, {});

  const COLORS = ['#0D9488', '#0F766E', '#14B8A6', '#2DD4BF', '#06B6D4', '#0891B2', '#0E7490'];
  
  const pieChartData = Object.keys(categoriesDataMap).map((cat, idx) => ({
    name: cat,
    value: categoriesDataMap[cat]
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Sales Dashboard & Reports</h2>
          <p className="text-sm text-slate-500">Analyze inventory turnover, medicine revenue splits, and sales summaries</p>
        </div>

        {/* Date Pickers */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm shrink-0">
          <Calendar size={16} className="text-slate-400 ml-1.5" />
          
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-2.5 py-1 text-xs border border-transparent outline-none bg-transparent font-medium text-slate-700"
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-2.5 py-1 text-xs border border-transparent outline-none bg-transparent font-semibold text-slate-800"
          >
            {[2025, 2026, 2027, 2028].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button 
            onClick={fetchSalesReport}
            className="p-1.5 hover:bg-slate-55 border border-transparent hover:border-slate-150 text-slate-500 hover:text-slate-700 rounded-lg transition-all-300"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Sales metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Metric 1: Monthly Total Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Monthly Turnover</span>
            <span className="text-2xl font-bold text-slate-800">₹{metrics.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="text-[10px] text-teal-600 block mt-1 font-semibold flex items-center gap-0.5">
              <TrendingUp size={10} />
              Sum of medicine dispatches
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Metric 2: Total Units Sold */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dispensary Output</span>
            <span className="text-2xl font-bold text-slate-800">{metrics.totalUnits} units</span>
            <span className="text-[10px] text-slate-400 block mt-1">Total items dispatched to wards</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <BarChart2 size={24} />
          </div>
        </div>

        {/* Metric 3: Top Selling Medicine */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Top Selling Medicine</span>
            <span className="text-lg font-bold text-slate-800 truncate block w-48">{metrics.topMed}</span>
            <span className="text-[10px] text-purple-600 block mt-1 font-semibold">Highest monthly revenue</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <PieChart size={24} />
          </div>
        </div>
      </div>

      {/* Analytics Charts */}
      {sales.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Medicine Bar Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Top 5 Medicines by Revenue</h3>
              <span className="text-xs text-slate-400">Monthly gross billing split</span>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                  <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]}>
                    {barChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Category Pie Chart */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Revenue Share by Category</h3>
              <span className="text-xs text-slate-400">Total portfolio distribution</span>
            </div>
            <div className="h-60 flex items-center justify-center relative">
              <div className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Tooltip formatter={(value) => [`₹${value.toFixed(2)}`, 'Revenue']} />
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              {/* Category legends right side */}
              <div className="absolute right-2 top-10 space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px]">
                {pieChartData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5 font-medium text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="truncate w-24">{entry.name}: ₹{entry.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Medicine Sales table detailed */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 mb-4">
              Medicine Turnover Ledger
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Category</th>
                    <th className="p-3 text-center">Units Sold</th>
                    <th className="p-3 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sales.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{item.medicine_name}</td>
                      <td className="p-3 text-slate-500">{item.category || 'General'}</td>
                      <td className="p-3 text-center font-bold text-slate-750">{item.total_units_sold} units</td>
                      <td className="p-3 text-right font-extrabold text-teal-700">₹{parseFloat(item.total_revenue).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-16 rounded-2xl border border-slate-100 shadow-sm text-center text-slate-400">
          <TrendingDown size={42} className="mx-auto mb-2 text-slate-350" />
          <p className="text-sm font-semibold">No sales recorded for {months.find(m => m.value === month)?.label} {year}</p>
          <p className="text-xs text-slate-400 mt-1">Dispense and bill medicine dispatches to populate dashboard trends</p>
        </div>
      )}
    </div>
  );
};

export default SalesReport;

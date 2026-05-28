import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { 
  FileSpreadsheet, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  CheckCircle,
  Package
} from 'lucide-react';

const PharmacistDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [expiringStock, setExpiringStock] = useState([]);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

  useEffect(() => {
    const fetchPharmacyData = async () => {
      try {
        const [pendingRes, lowRes, expiringRes, historyRes] = await Promise.all([
          api.get('/dispatch/pending'),
          api.get('/stock/low'),
          api.get('/stock/expiring?days=30'),
          api.get('/dispatch/history')
        ]);

        setPendingDispatches(pendingRes.data);
        setLowStock(lowRes.data);
        setExpiringStock(expiringRes.data);

        // Count dispatches completed today
        const todayStr = new Date().toDateString();
        const completedToday = historyRes.data.filter(
          d => new Date(d.dispatch_date).toDateString() === todayStr
        );
        setCompletedTodayCount(completedToday.length);

      } catch (err) {
        console.error(err);
        setError('Failed to retrieve pharmacy dispatch data');
      } finally {
        setLoading(false);
      }
    };

    fetchPharmacyData();
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
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Pharmacy Dispatch Desk</h2>
        <p className="text-sm text-slate-500">Monitor pending prescriptions, verify stock levels, and dispatch medications safely</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Pending Dispatches */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Pending Dispatches</span>
            <span className="text-2xl font-bold text-amber-600">{pendingDispatches.length}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Prescriptions outstanding</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        {/* Card 2: Completed Today */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Dispatched Today</span>
            <span className="text-2xl font-bold text-emerald-600">{completedTodayCount}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Completed dispatches</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>

        {/* Card 3: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Low Stock Alerts</span>
            <span className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-red-500' : 'text-slate-800'}`}>{lowStock.length}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Items below threshold</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Card 4: Near Expiry */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Expiry Warnings</span>
            <span className={`text-2xl font-bold ${expiringStock.length > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{expiringStock.length}</span>
            <span className="text-[10px] text-slate-500 block mt-1">Expiring within 30 days</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      {/* Main Layout Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Dispatch Queue */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-teal-600" />
            Pending Dispatch Queue
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3">Patient</th>
                  <th className="p-3">Medicine</th>
                  <th className="p-3 text-center">Prescribed</th>
                  <th className="p-3 text-center">Filled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingDispatches.length > 0 ? (
                  pendingDispatches.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{p.patient_name} <span className="text-[9px] text-slate-400 block font-mono">ID: {p.patient_id}</span></td>
                      <td className="p-3 text-slate-600 font-medium">{p.medicine_name}</td>
                      <td className="p-3 text-center font-bold text-slate-800">{p.prescribed_quantity}</td>
                      <td className="p-3 text-center">
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-semibold rounded text-[9px] border border-amber-100">
                          {p.dispatched_quantity} units
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-400">All dispatches are fully filled!</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Low Stock & Expirations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Low Stock Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Package size={16} className="text-teal-600" />
              Low Stock Alerts
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {lowStock.length > 0 ? (
                lowStock.map((alert, idx) => (
                  <div key={idx} className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-700">{alert.medicine_name}</span>
                      <span className="text-[9px] text-red-500 block font-bold mt-0.5">{alert.status}</span>
                    </div>
                    <span className="font-bold font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] border border-red-100">
                      {alert.current_qty} left
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">All stocks healthy</div>
              )}
            </div>
          </div>

          {/* Expiry Warnings Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calendar size={16} className="text-rose-600" />
              Expiry Warning Desk
            </h3>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {expiringStock.length > 0 ? (
                expiringStock.map((item) => (
                  <div key={item.stock_id} className="bg-rose-50/20 p-2.5 rounded-xl border border-rose-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-700">{item.medicine_name}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">Batch: {item.batch_number}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-rose-700 block text-[10px]">
                        Exp: {new Date(item.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="text-[9px] text-slate-400">Qty: {item.quantity}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">No batches expiring within 30 days</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacistDashboard;

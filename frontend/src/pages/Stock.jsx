import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Package, AlertTriangle, ShieldCheck, Plus, List, ArrowDownToLine, Clock, X, Check } from 'lucide-react';

const Stock = () => {
  const [stockList, setStockList] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [addMedOpen, setAddMedOpen] = useState(false);
  const [restockOpen, setRestockOpen] = useState(false);

  // Form states
  const [medForm, setMedForm] = useState({
    medicine_name: '',
    category: 'Antibiotic',
    manufacturer: '',
    unit_price: '',
    unit: 'Tablet',
    batch_number: '',
    quantity: 0,
    expiry_date: '',
    reorder_level: 50
  });

  const [restockForm, setRestockForm] = useState({
    medicine_id: '',
    quantity: 0,
    batch_number: '',
    expiry_date: ''
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const getUniqueMedicines = () => {
    const map = {};
    stockList.forEach(item => {
      if (!map[item.medicine_id]) {
        map[item.medicine_id] = { ...item, quantity: 0 };
      }
      map[item.medicine_id].quantity += item.quantity;
    });
    return Object.values(map);
  };

  useEffect(() => {
    fetchStockDetails();
  }, []);

  const fetchStockDetails = async () => {
    setLoading(true);
    try {
      const [stockRes, lowRes, logsRes] = await Promise.all([
        api.get('/stock'),
        api.get('/stock/low'), // calls CURSOR stored procedure sp_low_stock_report
        api.get('/stock/logs')  // gets audit trail log
      ]);
      setStockList(stockRes.data);
      setLowStockList(lowRes.data);
      setLogs(logsRes.data);
    } catch (err) {
      setError('Failed to load inventory stock datasets from database');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!medForm.medicine_name || !medForm.unit_price || !medForm.batch_number || !medForm.expiry_date) {
      setModalError('Please enter all required fields');
      return;
    }

    setModalLoading(true);
    try {
      await api.post('/stock/add-medicine', medForm);
      
      // Close & refresh
      setAddMedOpen(false);
      setMedForm({
        medicine_name: '',
        category: 'Antibiotic',
        manufacturer: '',
        unit_price: '',
        unit: 'Tablet',
        batch_number: '',
        quantity: 0,
        expiry_date: '',
        reorder_level: 50
      });
      await fetchStockDetails();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to initialize medicine stock');
    } finally {
      setModalLoading(false);
    }
  };

  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!restockForm.medicine_id || restockForm.quantity <= 0) {
      setModalError('Please select a medicine and input valid restock quantity');
      return;
    }

    setModalLoading(true);
    try {
      await api.post('/stock/restock', restockForm);

      // Close & refresh
      setRestockOpen(false);
      setRestockForm({
        medicine_id: '',
        quantity: 0,
        batch_number: '',
        expiry_date: ''
      });
      await fetchStockDetails();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to restock medicine');
    } finally {
      setModalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title & Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pharmacy Stock & Inventory</h2>
          <p className="text-sm text-slate-500">Real-time inventory levels, reorder logs, and low-stock alerts</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setRestockOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition-all-300 shadow flex items-center gap-1.5"
          >
            <ArrowDownToLine size={16} />
            <span>Restock Item</span>
          </button>
          <button 
            onClick={() => setAddMedOpen(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium text-sm transition-all-300 shadow-md shadow-teal-700/10 flex items-center gap-1.5"
          >
            <Plus size={16} />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Low Stock Warn Banner (Cursor output) */}
      {lowStockList.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-250 p-4 rounded-2xl space-y-3 animate-pulse">
          <h3 className="font-bold text-amber-800 text-sm flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-600 animate-bounce" />
            Low Stock Alerts Detected ({lowStockList.length} items need replenishment)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {lowStockList.map((alert, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-amber-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-slate-800">{alert.medicine_name}</span>
                  <span className="text-[10px] text-slate-400 block">Reorder Lvl: {alert.reorder_level}</span>
                </div>
                <div className="text-right">
                  <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${
                    alert.current_qty === 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                  }`}>
                    {alert.current_qty} left
                  </span>
                  <span className="text-[9px] text-red-500 font-bold block mt-1 uppercase">{alert.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Stock Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-md flex items-center gap-2">
            <List size={18} className="text-teal-600" />
            Inventory Records
          </h3>
          <span className="text-xs text-slate-400 font-medium">Showing {stockList.length} medicines</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
                <th className="p-4">Medicine Name</th>
                <th className="p-4">Category</th>
                <th className="p-4">Batch Number</th>
                <th className="p-4 text-center">Unit Price</th>
                <th className="p-4 text-center">Expiry</th>
                <th className="p-4 text-center">Qty / Stock</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {stockList.map((m) => {
                const isOut = m.quantity === 0;
                const isLow = m.quantity > 0 && m.quantity <= m.reorder_level;
                
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                let badgeText = 'Good';
                if (isOut) {
                  badgeClass = 'bg-red-50 text-red-600 border-red-100';
                  badgeText = 'Out of Stock';
                } else if (isLow) {
                  badgeClass = 'bg-amber-50 text-amber-600 border-amber-100';
                  badgeText = 'Low Stock';
                }

                return (
                  <tr key={m.stock_id || m.medicine_id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-semibold text-slate-800">
{m.medicine_name}</td>
                    <td className="p-4 text-slate-500">{m.category || 'General'}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-500">{m.batch_number || 'N/A'}</td>
                    <td className="p-4 text-center font-semibold text-slate-700">₹{parseFloat(m.unit_price).toFixed(2)}</td>
                    <td className="p-4 text-center text-slate-500">
                      {m.expiry_date ? new Date(m.expiry_date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      }) : 'N/A'}
                    </td>
                    <td className="p-4 text-center font-bold text-slate-850">
                      {m.quantity} <span className="text-[10px] text-slate-400 font-normal">{m.unit}s</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                        {badgeText}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Logs Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-md flex items-center gap-2 border-b border-slate-100 pb-3">
          <Clock size={18} className="text-teal-600" />
          Stock Activity Logs (Audit Trail)
        </h3>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div key={log.log_id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{log.medicine_name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      log.change_type === 'IN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      STOCK {log.change_type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Reason: {log.reason}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-700 block font-mono">
                    {log.change_type === 'IN' ? '+' : '-'}{log.quantity} units
                  </span>
                  <span className="text-[9px] text-slate-400 font-medium">
                    {new Date(log.log_time).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-slate-400 text-xs">No stock logs generated yet</div>
          )}
        </div>
      </div>

      {/* Modal 1: Add New Medicine */}
      {addMedOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
                <Package size={18} className="text-teal-600" />
                Initialize Medicine stock
              </h4>
              <button onClick={() => setAddMedOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddMedSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    value={medForm.medicine_name}
                    onChange={(e) => setMedForm(prev => ({ ...prev, medicine_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={medForm.category}
                    onChange={(e) => setMedForm(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-teal-500"
                  >
                    <option value="Antibiotic">Antibiotic</option>
                    <option value="Analgesic">Analgesic</option>
                    <option value="Antipyretic">Antipyretic</option>
                    <option value="Antitussive">Antitussive</option>
                    <option value="Cardiovascular">Cardiovascular</option>
                    <option value="Antidiabetic">Antidiabetic</option>
                  </select>
                </div>

                {/* Manufacturer */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Cipla Ltd"
                    value={medForm.manufacturer}
                    onChange={(e) => setMedForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Unit Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unit Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="5.50"
                    value={medForm.unit_price}
                    onChange={(e) => setMedForm(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || '' }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Unit Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Unit Form</label>
                  <select
                    value={medForm.unit}
                    onChange={(e) => setMedForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-teal-500"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Vial">Vial</option>
                    <option value="Bottle">Bottle</option>
                  </select>
                </div>

                {/* Batch Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Batch Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="B-PAR101"
                    value={medForm.batch_number}
                    onChange={(e) => setMedForm(prev => ({ ...prev, batch_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Initial Qty */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Initial Quantity</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="100"
                    value={medForm.quantity}
                    onChange={(e) => setMedForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Reorder Level */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Reorder Warning Level</label>
                  <input
                    type="number"
                    min="1"
                    value={medForm.reorder_level}
                    onChange={(e) => setMedForm(prev => ({ ...prev, reorder_level: parseInt(e.target.value) || 50 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>

                {/* Expiry Date */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={medForm.expiry_date}
                    onChange={(e) => setMedForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setAddMedOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:bg-slate-400 flex items-center gap-1"
                >
                  {modalLoading ? 'Saving...' : <><Check size={14} /><span>Save Medicine</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Restock Existing Item */}
      {restockOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
                <ArrowDownToLine size={18} className="text-teal-600" />
                Restock Existing Inventory
              </h4>
              <button onClick={() => setRestockOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              {/* Select Medicine */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Medicine *</label>
                <select
                  required
                  value={restockForm.medicine_id}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, medicine_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-xs outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Medicine --</option>
                  {getUniqueMedicines().map(m => (
                    <option key={m.medicine_id} value={m.medicine_id}>{m.medicine_name} (Current: {m.quantity})</option>
                  ))}
                </select>
              </div>


              {/* Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantity to Add *</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="50"
                  value={restockForm.quantity || ''}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                />
              </div>

              {/* New Batch Number (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Update Batch (Optional)</label>
                <input
                  type="text"
                  placeholder="Leave blank to retain current batch"
                  value={restockForm.batch_number}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                />
              </div>

              {/* New Expiry Date (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Update Expiry (Optional)</label>
                <input
                  type="date"
                  value={restockForm.expiry_date}
                  onChange={(e) => setRestockForm(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setRestockOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:bg-slate-400 flex items-center gap-1"
                >
                  {modalLoading ? 'Restocking...' : <><Check size={14} /><span>Confirm Intake</span></>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;

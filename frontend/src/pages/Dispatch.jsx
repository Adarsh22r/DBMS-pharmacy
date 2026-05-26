import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, FileSpreadsheet, User, CheckCircle, AlertTriangle, Plus, Trash2, ShieldAlert } from 'lucide-react';


const Dispatch = () => {
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState(null);
  const [prescriptionItems, setPrescriptionItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dispatch items selector
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dispatchLoading, setDispatchLoading] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [dispatchSuccess, setDispatchSuccess] = useState('');

  // Inventory & History
  const [inventory, setInventory] = useState([]);
  const [recentDispatches, setRecentDispatches] = useState([]);

  useEffect(() => {
    fetchInventoryAndHistory();
  }, []);

  const fetchInventoryAndHistory = async () => {
    try {
      const [invRes, histRes] = await Promise.all([
        api.get('/stock'),
        api.get('/dispatch/history')
      ]);
      setInventory(invRes.data);
      setRecentDispatches(histRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return;

    setLoading(true);
    setError('');
    setPatient(null);
    setPrescriptionItems([]);
    setDispatchSuccess('');
    setDispatchError('');

    try {
      // 1. Fetch Patient details
      const patRes = await api.get(`/patients/${patientId.trim()}`);
      setPatient(patRes.data);

      // 2. Fetch prescriptions
      const presRes = await api.get(`/prescriptions/patient/${patientId.trim()}`);
      setPrescriptionItems(presRes.data);

    } catch (err) {
      setError(err.response?.data?.message || 'Patient not found. Verify 6-digit ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchSubmit = async (e) => {
    e.preventDefault();
    setDispatchError('');
    setDispatchSuccess('');

    if (!selectedMedicine || quantity <= 0) {
      setDispatchError('Select a medicine and specify a valid quantity');
      return;
    }

    setDispatchLoading(true);

    try {
      // Execute the dispatch. This invokes the SQL Stored Procedure sp_dispatch_medicine
      // inside a database Transaction!
      await api.post('/dispatch', {
        patient_id: patient.patient_id,
        medicine_id: selectedMedicine,
        quantity: parseInt(quantity, 10)
      });

      setDispatchSuccess('Medicine dispatched successfully! Stock logs updated.');
      setSelectedMedicine('');
      setQuantity(1);

      // Reload inventory, history, and search result to reflect changes
      await fetchInventoryAndHistory();

      // Quick reload patient details to see if prescription counts or active logs changed
      const presRes = await api.get(`/prescriptions/patient/${patient.patient_id}`);
      setPrescriptionItems(presRes.data);

    } catch (err) {
      setDispatchError(err.response?.data?.message || 'Dispatch transaction failed');
    } finally {
      setDispatchLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dispense / Dispatch Medicine</h2>
        <p className="text-sm text-slate-500">Atomic transactions to dispatch medicines and log database records</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Dispatch Action Panel (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient Lookup Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Search size={16} className="text-teal-600" />
              Identify Patient
            </h3>
            
            <form onSubmit={handlePatientSearch} className="flex gap-2">
              <input
                type="text"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="Enter 6-digit Patient ID (e.g. 100001)"
                className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-500 font-mono tracking-widest"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all-300 disabled:bg-slate-400"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {error && (
              <span className="text-xs text-red-500 block font-medium">{error}</span>
            )}
          </div>

          {/* Dispatch Action Panel */}
          {patient && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 animate-scaleUp">
              {/* Header patient banner */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 font-bold block">Patient Name</span>
                  <span className="font-bold text-slate-800 text-sm">{patient.full_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Patient ID</span>
                  <span className="font-mono font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">{patient.patient_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block">Type</span>
                  <span className="font-bold text-slate-700">{patient.patient_type}</span>
                </div>
              </div>

              {dispatchError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{dispatchError}</span>
                </div>
              )}

              {dispatchSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle size={16} className="shrink-0" />
                  <span>{dispatchSuccess}</span>
                </div>
              )}

              {/* Form dispatch */}
              <form onSubmit={handleDispatchSubmit} className="space-y-4">
                <h4 className="font-bold text-slate-800 text-sm">Dispense Medicine</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select Medicine */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Medicine *</label>
                    <select
                      value={selectedMedicine}
                      onChange={(e) => {
                        setSelectedMedicine(e.target.value);
                        setDispatchError('');
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-teal-500"
                    >
                      <option value="">-- Choose Medicine --</option>
                      {inventory.map(m => (
                        <option key={m.medicine_id} value={m.medicine_id} disabled={m.quantity === 0}>
                          {m.medicine_name} (Avail: {m.quantity} {m.unit}s) {m.quantity === 0 ? '- OUT OF STOCK' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Quantity to Dispatch *</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 bg-teal-50/50 p-3 rounded-lg border border-teal-100 text-[10px] text-teal-800">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Atomic Transaction:</span>
                    <p className="text-teal-700 mt-0.5">This dispatch request executes a MySQL stored transaction. It utilizes InnoDB locks to check current quantities before inserting. If stocks are insufficient, the transaction will rollback automatically.</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={dispatchLoading || !selectedMedicine}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-700/10 hover:shadow-teal-700/20 transition-all-300 disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-1.5"
                >
                  {dispatchLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <FileSpreadsheet size={16} />
                      <span>Execute Dispatch Transaction</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Prescriptions & Recent logs (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Prescription items */}
          {patient && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-scaleUp">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <User size={16} className="text-teal-600" />
                Active Prescription
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {prescriptionItems.length > 0 ? (
                  prescriptionItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSelectedMedicine(item.medicine_id);
                        setQuantity(item.quantity);
                      }}
                      className="w-full text-left p-3 rounded-xl border border-slate-150 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition-all-300 flex items-center justify-between group"
                    >
                      <div>
                        <span className="font-semibold text-slate-700 text-xs group-hover:text-teal-800">{item.medicine_name}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Dosage: {item.dosage || 'N/A'} | Freq: {item.frequency}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-700 block">Qty: {item.quantity}</span>
                        <span className="text-[9px] text-slate-400 font-medium">Click to fill</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No prescription recorded for this patient
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Recent Dispatches logs */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2.5">
              Recent Dispatches
            </h3>
            
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {recentDispatches.length > 0 ? (
                recentDispatches.map((hist) => (
                  <div key={hist.dispatch_id} className="text-xs p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-1">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-slate-800">{hist.patient_name}</span>
                      <span className="text-[9px] text-slate-400">
                        {new Date(hist.dispatch_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-500">
                      <span>{hist.medicine_name}</span>
                      <strong className="text-teal-700 font-bold">Qty: {hist.quantity}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No dispatches logged today
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dispatch;

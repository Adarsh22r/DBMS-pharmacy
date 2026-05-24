import React, { useState } from 'react';
import api from '../utils/api';
import { generateBillPDF } from '../utils/generatePDF';
import { Search, Receipt, CreditCard, Percent, FileText, Printer, AlertTriangle, ShieldCheck } from 'lucide-react';

const Billing = () => {
  const [patientId, setPatientId] = useState('');
  const [patient, setPatient] = useState(null);
  const [pendingDispatches, setPendingDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Billing parameters
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [billLoading, setBillLoading] = useState(false);
  const [billError, setBillError] = useState('');
  
  // Previous Bills list
  const [pastBills, setPastBills] = useState([]);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientId.trim()) return;

    setLoading(true);
    setError('');
    setPatient(null);
    setPendingDispatches([]);
    setPastBills([]);

    try {
      // 1. Fetch Patient details
      const patRes = await api.get(`/patients/${patientId.trim()}`);
      setPatient(patRes.data);

      // 2. Fetch past bills
      const billsRes = await api.get(`/bills/patient/${patientId.trim()}`);
      setPastBills(billsRes.data);

      // 3. To list items that will be billed today:
      // We can fetch today's dispatches or search what medicines were dispatched
      const histRes = await api.get('/dispatch/history');
      const todayDispatches = histRes.data.filter(
        d => d.patient_id === patRes.data.patient_id && 
             new Date(d.dispatch_date).toDateString() === new Date().toDateString()
      );

      // Fetch pricing for medicine rows
      const stockRes = await api.get('/stock');
      const pricingMap = {};
      stockRes.data.forEach(item => {
        pricingMap[item.medicine_id] = item.unit_price;
      });

      const itemsWithCost = todayDispatches.map(d => {
        const matchingMed = stockRes.data.find(m => m.medicine_name === d.medicine_name);
        const price = matchingMed ? parseFloat(matchingMed.unit_price) : 0;
        return {
          description: d.medicine_name,
          quantity: d.quantity,
          unit_price: price,
          subtotal: d.quantity * price
        };
      });

      setPendingDispatches(itemsWithCost);

    } catch (err) {
      setError(err.response?.data?.message || 'Patient not found. Verify 6-digit ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async (e) => {
    e.preventDefault();
    setBillError('');
    setBillLoading(true);

    try {
      // 1. Call SQL stored procedure `sp_generate_bill` to write bill + items to database
      const genRes = await api.post('/bills/generate', {
        patient_id: patient.patient_id,
        payment_mode: paymentMode
      });
      
      const billId = genRes.data.bill_id;

      // 2. Apply discount if specified
      if (discountPercent > 0) {
        const subtotal = calculateSubtotal();
        const discountAmount = parseFloat(((subtotal * discountPercent) / 100).toFixed(2));
        await api.put(`/bills/${billId}/discount`, { discount: discountAmount });
      }

      // 3. Fetch final compiled bill from backend (joins patient metadata + line items)
      const detailsRes = await api.get(`/bills/${billId}`);
      const fullBill = detailsRes.data;

      // 4. Trigger PDF Generation & display in new window
      generateBillPDF(fullBill);

      // Refresh list
      const billsRes = await api.get(`/bills/patient/${patient.patient_id}`);
      setPastBills(billsRes.data);
      setPendingDispatches([]); // Clear pending since they are billed
      setDiscountPercent(0);

    } catch (err) {
      setBillError(err.response?.data?.message || 'Failed to generate billing records');
    } finally {
      setBillLoading(false);
    }
  };

  const handlePrintPastBill = async (billId) => {
    try {
      const detailsRes = await api.get(`/bills/${billId}`);
      generateBillPDF(detailsRes.data);
    } catch (err) {
      alert('Failed to retrieve PDF data');
    }
  };

  const calculateSubtotal = () => {
    const medSub = pendingDispatches.reduce((sum, item) => sum + item.subtotal, 0);
    const consultFee = 300.00; // Added by SP automatically
    return medSub + consultFee;
  };

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    return ((subtotal * discountPercent) / 100);
  };

  const calculateFinal = () => {
    const subtotal = calculateSubtotal();
    const discount = calculateDiscount();
    return Math.max(0, subtotal - discount);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Billing & PDF Invoice Generator</h2>
        <p className="text-sm text-slate-500">Generate medical receipts, apply discount policies, and print receipts</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Invoice breakdown (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient Lookup Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Search size={16} className="text-teal-600" />
              Billed Patient Lookup
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

          {/* Invoice Preview */}
          {patient && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <Receipt size={18} className="text-teal-600" />
                  Today's Items Invoice Breakdown
                </h3>
                <span className="text-xs font-mono font-bold text-slate-400">ID: {patient.patient_id}</span>
              </div>

              {billError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{billError}</span>
                </div>
              )}

              {/* Table items */}
              <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 border-b border-slate-100">
                      <th className="p-3">Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {/* Medicines rows */}
                    {pendingDispatches.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-850">{item.description}</td>
                        <td className="p-3 text-center">{item.quantity}</td>
                        <td className="p-3 text-right">₹{item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-right font-bold text-slate-800">₹{item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                    
                    {/* Consultation Row */}
                    <tr>
                      <td className="p-3 font-semibold text-slate-850">Doctor Consultation Fee</td>
                      <td className="p-3 text-center">1</td>
                      <td className="p-3 text-right">₹300.00</td>
                      <td className="p-3 text-right font-bold text-slate-800">₹300.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Billing totals */}
              <div className="space-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-650 flex flex-col items-end">
                <div className="flex justify-between w-64">
                  <span>Gross Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between w-64 text-amber-600">
                  <span>Discount ({discountPercent}%):</span>
                  <span className="font-bold">-₹{calculateDiscount().toFixed(2)}</span>
                </div>

                <div className="h-px bg-slate-100 w-64 my-1"></div>
                
                <div className="flex justify-between w-64 text-sm text-teal-600 font-bold">
                  <span>Invoice Grand Total:</span>
                  <span className="text-base font-extrabold text-teal-700">₹{calculateFinal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Configurations & Past bills (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Checkout controls */}
          {patient && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-5 animate-scaleUp">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
                <CreditCard size={18} className="text-teal-600" />
                Checkout Configurations
              </h3>

              {/* Payment Mode Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Payment Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Cash', 'Card', 'UPI', 'Insurance'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setPaymentMode(mode)}
                      className={`py-2 px-1 rounded-xl border font-bold text-xs transition-all-300 ${
                        paymentMode === mode
                          ? 'bg-teal-50 border-teal-500 text-teal-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex justify-between">
                  <span>Apply Discount Policy</span>
                  <span className="text-teal-600 font-bold">{discountPercent}% Off</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Percent size={14} />
                  </span>
                  <select
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseInt(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 bg-white rounded-xl text-xs text-slate-700 outline-none focus:border-teal-500"
                  >
                    <option value="0">No Discount</option>
                    <option value="5">5% Senior Citizen / General Discount</option>
                    <option value="10">10% Hospital Staff Privilege Discount</option>
                    <option value="15">15% Medical Insurance Shield Discount</option>
                    <option value="20">20% Special Clinic Approval Discount</option>
                  </select>
                </div>
              </div>

              {/* Checkout Trigger */}
              <button
                onClick={handleGenerateBill}
                disabled={billLoading || pendingDispatches.length === 0}
                className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-700/10 hover:shadow-teal-700/20 transition-all-300 disabled:bg-slate-350 disabled:shadow-none flex items-center justify-center gap-1.5"
              >
                {billLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Printer size={16} />
                    <span>Generate & Print PDF Bill</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Past Bills list */}
          {patient && (
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-scaleUp">
              <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                Previous Bills Invoice Logs
              </h3>
              
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {pastBills.length > 0 ? (
                  pastBills.map((b) => (
                    <div key={b.bill_id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50 transition-all-300">
                      <div>
                        <span className="font-semibold text-slate-800 block">Bill #{b.bill_id}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(b.bill_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="font-bold text-teal-700 block">₹{parseFloat(b.final_amount).toFixed(2)}</span>
                          <span className="text-[9px] text-slate-400 font-semibold">{b.payment_mode}</span>
                        </div>
                        
                        <button
                          onClick={() => handlePrintPastBill(b.bill_id)}
                          className="p-1.5 bg-white border border-slate-200 hover:bg-teal-50 hover:border-teal-200 text-slate-500 hover:text-teal-600 rounded-lg shadow-sm transition-all-300"
                          title="Print Receipt"
                        >
                          <Printer size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No billing invoices recorded for this patient
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Billing;

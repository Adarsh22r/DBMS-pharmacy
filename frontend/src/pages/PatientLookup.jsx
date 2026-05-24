import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Search, FileText, User, Bed, Plus, Trash2, Check, AlertCircle } from 'lucide-react';

const PatientLookup = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Prescription Writing State
  const [writeMode, setWriteMode] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState([
    { medicine_id: '', dosage: '', quantity: 1, frequency: 'BD', duration_days: 5 }
  ]);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    if (writeMode) {
      fetchDoctorsAndMedicines();
    }
  }, [writeMode]);

  const fetchDoctorsAndMedicines = async () => {
    try {
      const [docRes, medRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/stock') // fetches medicines and stock details
      ]);
      setDoctors(docRes.data);
      // Filter out of stock items or just list all
      setMedicines(medRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchError('');
    setPatient(null);
    setPrescriptions(null);
    setWriteMode(false);

    try {
      // 1. Search for patient
      const patRes = await api.get(`/patients/${searchQuery.trim()}`);
      setPatient(patRes.data);

      // 2. Fetch prescriptions (Calls SP inside controller)
      const presRes = await api.get(`/prescriptions/patient/${searchQuery.trim()}`);
      setPrescriptions(presRes.data);
    } catch (err) {
      setSearchError(err.response?.data?.message || 'Patient not found. Ensure 6-digit ID is correct.');
    } finally {
      setLoading(false);
    }
  };

  // Prescription Items management
  const addPrescriptionItem = () => {
    setPrescriptionItems((prev) => [
      ...prev,
      { medicine_id: '', dosage: '', quantity: 1, frequency: 'BD', duration_days: 5 }
    ]);
  };

  const removePrescriptionItem = (index) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    setPrescriptionItems((prev) => {
      const newItems = [...prev];
      newItems[index][field] = value;
      return newItems;
    });
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess(false);

    if (!selectedDoctor) {
      setSubmitError('Please select a prescribing Doctor');
      return;
    }

    // Validate items
    const invalidItem = prescriptionItems.some(item => !item.medicine_id || item.quantity <= 0);
    if (invalidItem) {
      setSubmitError('Please select a medicine and enter a valid quantity for all items');
      return;
    }

    setSubmitLoading(true);

    try {
      await api.post('/prescriptions', {
        patient_id: patient.patient_id,
        doctor_id: selectedDoctor,
        notes: prescriptionNotes,
        items: prescriptionItems
      });

      setSubmitSuccess(true);
      setPrescriptionNotes('');
      setSelectedDoctor('');
      setPrescriptionItems([{ medicine_id: '', dosage: '', quantity: 1, frequency: 'BD', duration_days: 5 }]);
      
      // Reload prescriptions
      const presRes = await api.get(`/prescriptions/patient/${patient.patient_id}`);
      setPrescriptions(presRes.data);

      // Close write panel after short delay
      setTimeout(() => {
        setWriteMode(false);
        setSubmitSuccess(false);
      }, 1500);

    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit prescription');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Patient Lookup & Prescriptions</h2>
        <p className="text-sm text-slate-500">View prescription history and write new pharmacy instructions</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter 6-digit Patient ID (e.g., 100001)"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 outline-none text-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300 font-mono text-md tracking-widest"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-all-300 shadow-lg shadow-teal-700/10 hover:shadow-teal-700/20 disabled:bg-slate-400 flex items-center justify-center"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            'Lookup'
          )}
        </button>
      </form>

      {searchError && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} />
          <span>{searchError}</span>
        </div>
      )}

      {/* Patient Details & Prescription History */}
      {patient && (
        <div className="space-y-6 animate-fadeIn">
          {/* Patient Header Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
            <div className="absolute w-2 h-full bg-teal-500 left-0 top-0"></div>
            
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-teal-50 border border-teal-100 text-teal-600">
                  ID: {patient.patient_id}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  patient.patient_type === 'IPD' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}>
                  {patient.patient_type}
                </span>
              </div>
              <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                <User size={20} className="text-slate-400" />
                {patient.full_name}
              </h3>
              <p className="text-xs text-slate-400">
                Blood Group: <strong className="text-slate-600">{patient.blood_group || 'N/A'}</strong> | Gender: <strong className="text-slate-600">{patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}</strong> | Phone: <strong className="text-slate-600">{patient.phone}</strong>
              </p>
            </div>

            {/* Ward/Bed Admission details if IPD */}
            {patient.patient_type === 'IPD' && patient.admission && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                  <Bed size={12} />
                  Active Bed Assignment
                </span>
                <span className="font-bold text-sm text-slate-700">{patient.admission.bed_number} ({patient.admission.ward_name})</span>
                <span className="text-[11px] text-slate-500">Diagnosis: {patient.admission.diagnosis || 'General Observation'}</span>
              </div>
            )}
          </div>

          {/* Action Bar: Write Prescription Button */}
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-md flex items-center gap-2">
              <FileText size={18} className="text-teal-600" />
              Prescription History
            </h4>
            {!writeMode && (
              <button
                onClick={() => setWriteMode(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow flex items-center gap-1.5 transition-all-300"
              >
                <Plus size={14} />
                <span>Write Prescription</span>
              </button>
            )}
          </div>

          {/* Prescription Writing Panel */}
          {writeMode && (
            <form onSubmit={handlePrescriptionSubmit} className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-xl space-y-5 animate-scaleUp">
              <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                <h4 className="font-bold text-sm text-teal-400">New Clinical Prescription</h4>
                <button
                  type="button"
                  onClick={() => setWriteMode(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {submitError && (
                <div className="p-3 bg-red-950/40 border border-red-900 text-red-200 rounded-xl text-xs font-medium">
                  {submitError}
                </div>
              )}

              {submitSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900 text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-1.5">
                  <Check size={14} />
                  <span>Prescription recorded successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Prescribing Doctor *</label>
                  <select
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-850 text-slate-200 text-sm outline-none focus:border-teal-500"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>{d.full_name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>

                {/* Prescription Notes */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Prescription Notes / Advice</label>
                  <input
                    type="text"
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder="Take after meals. Rest advised."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-850 text-slate-200 text-sm outline-none focus:border-teal-500 placeholder-slate-600"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Prescribed Items</span>
                
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 bg-slate-850 p-3 rounded-xl border border-slate-800 items-end">
                    {/* Medicine */}
                    <div className="col-span-12 md:col-span-4">
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Medicine *</label>
                      <select
                        value={item.medicine_id}
                        onChange={(e) => handleItemChange(index, 'medicine_id', e.target.value)}
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs outline-none focus:border-teal-500"
                      >
                        <option value="">Select Medicine</option>
                        {medicines.map(m => (
                          <option key={m.medicine_id} value={m.medicine_id}>
                            {m.medicine_name} (Stock: {m.quantity})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Dosage */}
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Dosage</label>
                      <input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        placeholder="e.g. 500mg"
                        className="w-full px-2.5 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Frequency */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Frequency</label>
                      <select
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs outline-none focus:border-teal-500"
                      >
                        <option value="OD">Once Daily (OD)</option>
                        <option value="BD">Twice Daily (BD)</option>
                        <option value="TDS">Thrice Daily (TDS)</option>
                        <option value="QDS">Four Times (QDS)</option>
                        <option value="PRN">As Needed (PRN)</option>
                      </select>
                    </div>

                    {/* Duration Days */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Days</label>
                      <input
                        type="number"
                        min="1"
                        value={item.duration_days}
                        onChange={(e) => handleItemChange(index, 'duration_days', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Qty */}
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Qty *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-200 text-xs outline-none focus:border-teal-500"
                      />
                    </div>

                    {/* Delete Item */}
                    <div className="col-span-12 md:col-span-1 flex justify-center">
                      <button
                        type="button"
                        disabled={prescriptionItems.length === 1}
                        onClick={() => removePrescriptionItem(index)}
                        className="p-2 text-slate-500 hover:text-red-400 disabled:text-slate-800 transition-all-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addPrescriptionItem}
                  className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1 pt-1"
                >
                  <Plus size={14} /> Add Medicine Line
                </button>
              </div>

              {/* Submit panel buttons */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => setWriteMode(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:bg-slate-700"
                >
                  Submit Prescription
                </button>
              </div>
            </form>
          )}

          {/* Prescriptions List Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {prescriptions && prescriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-150">
                      <th className="p-4">Date</th>
                      <th className="p-4">Doctor</th>
                      <th className="p-4">Medicine</th>
                      <th className="p-4">Dosage</th>
                      <th className="p-4">Frequency</th>
                      <th className="p-4 text-center">Duration</th>
                      <th className="p-4 text-center">Prescribed Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {prescriptions.map((p, index) => (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="p-4 text-slate-500">
                          {new Date(p.prescribed_on).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="p-4 font-semibold text-slate-800">{p.doctor_name}</td>
                        <td className="p-4 font-semibold text-teal-700">{p.medicine_name}</td>
                        <td className="p-4 text-slate-500">{p.dosage || 'N/A'}</td>
                        <td className="p-4"><span className="bg-slate-100 px-2 py-0.5 rounded font-mono text-[10px] font-semibold text-slate-600">{p.frequency}</span></td>
                        <td className="p-4 text-center">{p.duration_days ? `${p.duration_days} days` : 'N/A'}</td>
                        <td className="p-4 text-center font-bold text-slate-800">{p.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <FileText size={42} className="mx-auto mb-2 text-slate-350" />
                <p className="text-sm font-semibold">No prescription history found</p>
                <p className="text-xs text-slate-400 mt-1">Write a prescription above to seed records</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientLookup;

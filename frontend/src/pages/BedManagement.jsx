import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Bed, Users, AlertCircle, Clock, ShieldAlert, Check } from 'lucide-react';

const BedManagement = () => {
  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals / Selection details
  const [selectedBedForPatient, setSelectedBedForPatient] = useState(null); // Patient Details Modal
  const [selectedBedForAdmit, setSelectedBedForAdmit] = useState(null); // Admission Modal
  
  // Admission Form State
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [admitLoading, setAdmitLoading] = useState(false);
  const [admitError, setAdmitError] = useState('');

  useEffect(() => {
    fetchBedsAndDoctors();
  }, []);

  const fetchBedsAndDoctors = async () => {
    setLoading(true);
    try {
      const [bedRes, docRes] = await Promise.all([
        api.get('/beds/status'),
        api.get('/doctors')
      ]);
      setBeds(bedRes.data);
      setDoctors(docRes.data);
    } catch (err) {
      setError('Failed to fetch beds status from database');
    } finally {
      setLoading(false);
    }
  };

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    setAdmitError('');

    if (!patientId || !doctorId) {
      setAdmitError('Patient ID and Doctor selection are required');
      return;
    }

    setAdmitLoading(true);

    try {
      // Calls `/ipd/admit` which runs trigger `trg_bed_occupied` inside MySQL database!
      await api.post('/ipd/admit', {
        patient_id: patientId,
        bed_id: selectedBedForAdmit.bed_id,
        diagnosis,
        attending_doctor: doctorId
      });

      // Clear states & Refresh
      setPatientId('');
      setDoctorId('');
      setDiagnosis('');
      setSelectedBedForAdmit(null);
      await fetchBedsAndDoctors();

    } catch (err) {
      setAdmitError(err.response?.data?.message || 'Failed to admit patient');
    } finally {
      setAdmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Group beds by ward
  const bedsByWard = beds.reduce((acc, bed) => {
    if (!acc[bed.ward_name]) {
      acc[bed.ward_name] = {
        id: bed.ward_id,
        beds: [],
        occupied: 0
      };
    }
    acc[bed.ward_name].beds.push(bed);
    if (bed.status === 'Occupied') {
      acc[bed.ward_name].occupied += 1;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ward Bed Management</h2>
        <p className="text-sm text-slate-500">Live ward occupancy, bed logistics, and admissions manager</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Ward Cards Grid */}
      <div className="space-y-8">
        {Object.keys(bedsByWard).map((wardName) => {
          const ward = bedsByWard[wardName];
          const capacity = ward.beds.length;
          const occupancyRate = Math.round((ward.occupied / capacity) * 100);

          return (
            <div key={wardName} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              {/* Ward Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{wardName}</h3>
                  <span className="text-xs text-slate-400">Total Capacity: {capacity} beds</span>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Occupancy bar */}
                  <div className="w-28 bg-slate-150 h-2 rounded-full overflow-hidden shrink-0">
                    <div 
                      className={`h-full rounded-full transition-all-300 ${
                        occupancyRate >= 80 
                          ? 'bg-red-500' 
                          : occupancyRate >= 50 
                            ? 'bg-amber-500' 
                            : 'bg-teal-500'
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-slate-600">
                    {ward.occupied} / {capacity} Occupied ({occupancyRate}%)
                  </span>
                </div>
              </div>

              {/* Beds Grid Layout */}
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
                {ward.beds.map((bed) => {
                  const isAvailable = bed.status === 'Available';
                  const isOccupied = bed.status === 'Occupied';
                  const isMaintenance = bed.status === 'Maintenance';

                  return (
                    <button
                      key={bed.bed_id}
                      onClick={() => {
                        if (isOccupied) {
                          setSelectedBedForPatient(bed);
                        } else if (isAvailable) {
                          setSelectedBedForAdmit(bed);
                        }
                      }}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center space-y-2 text-center transition-all-300 shadow-sm relative group cursor-pointer ${
                        isAvailable
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:shadow-emerald-100'
                          : isOccupied
                            ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100 hover:shadow-red-100'
                            : 'bg-amber-50 border-amber-200 text-amber-600 cursor-default'
                      }`}
                    >
                      <Bed size={22} className={
                        isAvailable 
                          ? 'text-emerald-600' 
                          : isOccupied 
                            ? 'text-red-500' 
                            : 'text-amber-500'
                      } />
                      <span className="font-bold text-xs leading-none">{bed.bed_number}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider leading-none scale-90">
                        {bed.status}
                      </span>

                      {/* Small hover tag */}
                      {isOccupied && (
                        <span className="absolute -top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bed Legends */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 flex gap-6 justify-center text-xs text-slate-500 shadow-sm">
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded-lg"></span>Available (Click to Admit)</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-red-100 border border-red-200 rounded-lg"></span>Occupied (Click to View Patient)</span>
        <span className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-lg"></span>Maintenance</span>
      </div>

      {/* Modal 1: Occupied Patient Details */}
      {selectedBedForPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
                <Bed size={18} className="text-red-500" />
                Bed details: {selectedBedForPatient.bed_number}
              </h4>
              <button 
                onClick={() => setSelectedBedForPatient(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Patient Info Card */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admitted Patient</span>
                  <span className="font-bold text-slate-800 text-base">{selectedBedForPatient.patient.patient_name}</span>
                  <span className="text-xs text-slate-400 block font-mono">Patient ID: {selectedBedForPatient.patient.patient_id}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold">Diagnosis</span>
                    <span className="text-slate-700 font-bold">{selectedBedForPatient.patient.diagnosis || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Doctor In-Charge</span>
                    <span className="text-slate-700 font-bold">{selectedBedForPatient.patient.doctor_name}</span>
                  </div>
                </div>
              </div>

              {/* Alert note about triggers */}
              <div className="flex gap-2.5 p-3 rounded-lg bg-red-50 text-red-800 border border-red-100 text-xs">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Bed Management Rules:</span>
                  <p className="text-[10px] text-red-700 mt-0.5">To discharge this patient and mark this bed as Available, please head to the Billing & Invoice page or complete the clinical discharge checklist.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedBedForPatient(null)}
              className="w-full py-2.5 bg-slate-850 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow transition-all-300"
            >
              Okay, Go Back
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Admission Form */}
      {selectedBedForAdmit && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-md flex items-center gap-1.5">
                <Bed size={18} className="text-teal-600" />
                Assign Bed: {selectedBedForAdmit.bed_number} ({selectedBedForAdmit.ward_name})
              </h4>
              <button 
                onClick={() => setSelectedBedForAdmit(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            {admitError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                {admitError}
              </div>
            )}

            <form onSubmit={handleAdmitSubmit} className="space-y-4">
              {/* Patient ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Patient ID (6-digit) *</label>
                <input
                  type="text"
                  maxLength="6"
                  value={patientId}
                  onChange={(e) => setPatientId(e.target.value)}
                  placeholder="e.g. 100001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500 font-mono tracking-widest"
                />
              </div>

              {/* Attending Doctor */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Attending Doctor *</label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500"
                >
                  <option value="">-- Choose Doctor --</option>
                  {doctors.map(d => (
                    <option key={d.doctor_id} value={d.doctor_id}>{d.full_name} ({d.specialization})</option>
                  ))}
                </select>
              </div>

              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Diagnosis / Symptoms</label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Cardiac observation"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBedForAdmit(null)}
                  className="flex-1 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-semibold transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={admitLoading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow transition-all-300 disabled:bg-slate-400 flex items-center justify-center gap-1.5"
                >
                  {admitLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm Admission</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BedManagement;

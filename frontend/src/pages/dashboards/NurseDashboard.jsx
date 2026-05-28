import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { 
  Bed, 
  Users, 
  AlertCircle, 
  Activity,
  Heart,
  Plus
} from 'lucide-react';

const NurseDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);

  useEffect(() => {
    const fetchNurseData = async () => {
      try {
        const [bedsRes, ipdRes] = await Promise.all([
          api.get('/beds'),
          api.get('/ipd/active')
        ]);
        setBeds(bedsRes.data);
        setAdmissions(ipdRes.data);
      } catch (err) {
        console.error(err);
        setError('Failed to retrieve nursing ward dataset');
      } finally {
        setLoading(false);
      }
    };

    fetchNurseData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getAvailableCount = () => beds.filter(b => b.status === 'Available').length;
  const getOccupiedCount = () => beds.filter(b => b.status === 'Occupied').length;
  const getMaintenanceCount = () => beds.filter(b => b.status === 'Maintenance').length;

  return (
    <div className="space-y-6 animate-scaleUp">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Ward Overview</h2>
        <p className="text-sm text-slate-500">Monitor bed occupancy rates, check active ward admissions, and supervise patient health vitals</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Available Beds</span>
            <span className="text-2xl font-bold text-emerald-600">{getAvailableCount()}</span>
            <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">Vacant beds ready</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Bed size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Occupied Beds</span>
            <span className="text-2xl font-bold text-blue-600">{getOccupiedCount()}</span>
            <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Inpatient admissions</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Under Maintenance</span>
            <span className="text-2xl font-bold text-amber-600">{getMaintenanceCount()}</span>
            <span className="text-[10px] text-amber-600 block mt-1 font-semibold">Beds blocked</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Active Admissions</span>
            <span className="text-2xl font-bold text-slate-800">{admissions.length}</span>
            <span className="text-[10px] text-teal-600 block mt-1 font-semibold">Total IPD In-house</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Ward Admissions list */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <Heart size={16} className="text-teal-600" />
            Admitted Inpatients List
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3">Patient</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Attending Doctor</th>
                  <th className="p-3">Admitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {admissions.length > 0 ? (
                  admissions.map((adm) => (
                    <tr key={adm.admission_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{adm.patient_name} <span className="text-[9px] text-slate-400 block font-mono">ID: {adm.patient_id}</span></td>
                      <td className="p-3 text-slate-600 font-medium">
                        {adm.bed_number} <span className="text-[10px] text-slate-400">({adm.ward_name})</span>
                      </td>
                      <td className="p-3 text-slate-500">Dr. {adm.doctor_name}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(adm.admission_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short'
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-400">No active admissions recorded in ward</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Bed Grid (Read-Only overview) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <Bed size={16} className="text-teal-600" />
            Ward Beds Status Grid
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[350px] pr-1">
            {beds.map((b) => {
              let colorClasses = 'border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-800';
              if (b.status === 'Occupied') {
                colorClasses = 'border-blue-100 bg-blue-50/30 hover:bg-blue-50 text-blue-800';
              } else if (b.status === 'Maintenance') {
                colorClasses = 'border-amber-100 bg-amber-50/30 hover:bg-amber-50 text-amber-800';
              }

              return (
                <div key={b.bed_id} className={`p-3 rounded-xl border text-center transition duration-200 flex flex-col justify-between ${colorClasses}`}>
                  <span className="text-[11px] font-bold font-mono block">{b.bed_number}</span>
                  <span className="text-[9px] font-semibold opacity-70 block mt-1 uppercase">{b.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NurseDashboard;

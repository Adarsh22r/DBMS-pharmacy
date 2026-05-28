import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { getAuthUser } from '../../utils/auth';
import { 
  Users, 
  Activity, 
  Bed, 
  ClipboardList, 
  Calendar, 
  User,
  Heart
} from 'lucide-react';

const DoctorDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opdVisits, setOpdVisits] = useState([]);
  const [ipdAdmissions, setIpdAdmissions] = useState([]);

  useEffect(() => {
    const fetchDoctorDashboardData = async () => {
      try {
        const user = getAuthUser();
        if (!user) return;

        // Find matching doctor record from doctors list
        const docRes = await api.get('/doctors');
        const myDoctor = docRes.data.find(
          d => d.email === user.email || d.full_name.toLowerCase().includes(user.full_name.toLowerCase())
        );

        if (myDoctor) {
          const docId = myDoctor.doctor_id;
          const [opdRes, ipdRes] = await Promise.all([
            api.get(`/opd/today?doctor_id=${docId}`),
            api.get(`/ipd/active?doctor_id=${docId}`)
          ]);
          setOpdVisits(opdRes.data);
          setIpdAdmissions(ipdRes.data);
        } else {
          setError('Could not associate your staff profile with a doctor record.');
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load clinical dashboard datasets');
      } finally {
        setLoading(false);
      }
    };

    fetchDoctorDashboardData();
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
        <h2 className="text-2xl font-bold text-slate-800">My Clinical Dashboard</h2>
        <p className="text-sm text-slate-500">Manage today's consultations, view admitted patients, and prescribe treatments</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Today's OPD Consultations</span>
            <span className="text-2xl font-bold text-slate-800">{opdVisits.length}</span>
            <span className="text-[10px] text-teal-600 block mt-1 font-semibold">Scheduled Today</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Activity size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">My Active IPD Patients</span>
            <span className="text-2xl font-bold text-slate-800">{ipdAdmissions.length}</span>
            <span className="text-[10px] text-blue-600 block mt-1 font-semibold">Currently Admitted</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bed size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Clinic Status</span>
            <span className="text-2xl font-bold text-emerald-600">On Duty</span>
            <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">MediCare Active</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Heart size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's OPD Schedule */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <Calendar size={16} className="text-teal-600" />
            Today's OPD Schedule
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3">Patient Name</th>
                  <th className="p-3">Time</th>
                  <th className="p-3">Symptoms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {opdVisits.length > 0 ? (
                  opdVisits.map((visit) => (
                    <tr key={visit.visit_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{visit.patient_name}</td>
                      <td className="p-3 text-slate-400">
                        {new Date(visit.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[180px]">{visit.symptoms || 'General Checkup'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400">No OPD patients registered for you today</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* My Admitted Patients (IPD) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
            <ClipboardList size={16} className="text-teal-600" />
            Admitted Patients (IPD)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="p-3">Patient</th>
                  <th className="p-3">Bed/Ward</th>
                  <th className="p-3">Diagnosis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ipdAdmissions.length > 0 ? (
                  ipdAdmissions.map((adm) => (
                    <tr key={adm.admission_id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-semibold text-slate-800">{adm.patient_name}</td>
                      <td className="p-3 text-slate-600 font-medium">
                        {adm.bed_number} <span className="text-[10px] text-slate-400">({adm.ward_name})</span>
                      </td>
                      <td className="p-3 text-slate-500 truncate max-w-[180px]">{adm.diagnosis || 'Under Observation'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-slate-400">No active admissions registered under you</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorDashboard;

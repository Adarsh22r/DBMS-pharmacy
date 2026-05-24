import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { User, Calendar, Phone, Mail, Droplets, MapPin, Bed, CheckCircle2, UserCheck } from 'lucide-react';

const RegisterPatient = ({ setCurrentPage }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    dob: '',
    gender: 'M',
    phone: '',
    email: '',
    blood_group: 'A+',
    address: '',
    patient_type: 'OPD' // default
  });

  // IPD Admission fields
  const [ipdData, setIpdData] = useState({
    bed_id: '',
    diagnosis: '',
    attending_doctor: ''
  });

  const [doctors, setDoctors] = useState([]);
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (formData.patient_type === 'IPD') {
      fetchBedsAndDoctors();
    }
  }, [formData.patient_type]);

  const fetchBedsAndDoctors = async () => {
    try {
      const [docRes, bedRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/beds/status') // all beds to render visual grid
      ]);
      setDoctors(docRes.data);
      setBeds(bedRes.data);
    } catch (err) {
      setError('Failed to fetch beds or doctors layout');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleIpdChange = (e) => {
    const { name, value } = e.target;
    setIpdData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (!formData.full_name || !formData.dob || !formData.phone) {
      setError('Please fill in all required fields (Name, DOB, Phone)');
      return;
    }

    if (formData.patient_type === 'IPD') {
      if (!ipdData.bed_id || !ipdData.attending_doctor) {
        setError('Please select an Attending Doctor and an Available Bed for IPD Admission');
        return;
      }
    }

    setLoading(true);

    try {
      // 1. Register Patient (returns auto-generated 6-digit patient_id)
      const patRes = await api.post('/patients/register', formData);
      const patientId = patRes.data.patient_id;

      // 2. If IPD, create admission record (triggers automatically lock the bed)
      if (formData.patient_type === 'IPD') {
        await api.post('/ipd/admit', {
          patient_id: patientId,
          bed_id: ipdData.bed_id,
          diagnosis: ipdData.diagnosis,
          attending_doctor: ipdData.attending_doctor
        });
      }

      // Success
      setSuccessData({
        patient_id: patientId,
        full_name: formData.full_name,
        patient_type: formData.patient_type,
        bed_number: beds.find(b => b.bed_id === parseInt(ipdData.bed_id))?.bed_number
      });

      // Clear Form
      setFormData({
        full_name: '',
        dob: '',
        gender: 'M',
        phone: '',
        email: '',
        blood_group: 'A+',
        address: '',
        patient_type: 'OPD'
      });
      setIpdData({
        bed_id: '',
        diagnosis: '',
        attending_doctor: ''
      });

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete registration');
    } finally {
      setLoading(false);
    }
  };

  // Group beds by ward for rendering
  const bedsByWard = beds.reduce((acc, bed) => {
    if (!acc[bed.ward_name]) acc[bed.ward_name] = [];
    acc[bed.ward_name].push(bed);
    return acc;
  }, {});

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Register New Patient</h2>
        <p className="text-sm text-slate-500">Add a patient record to the DBMS and set admission status</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Main Registration Split Panel */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Demographic Form (8 Columns) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-7 space-y-5">
          <h3 className="font-bold text-slate-800 text-md pb-2 border-b border-slate-100 flex items-center gap-2">
            <UserCheck size={18} className="text-teal-600" />
            Demographic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Full Name *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User size={16} />
                </span>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Date of Birth *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Calendar size={16} />
                </span>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Phone Number *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Phone size={16} />
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="patient@example.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                />
              </div>
            </div>

            {/* Blood Group */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Blood Group</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Droplets size={16} />
                </span>
                <select
                  name="blood_group"
                  value={formData.blood_group}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                >
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Residential Address</label>
            <div className="relative">
              <span className="absolute top-3 left-3.5 text-slate-400">
                <MapPin size={16} />
              </span>
              <textarea
                name="address"
                rows="3"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Enter patient complete address"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Admission Type & Bed Picker (5 Columns) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-md pb-2 border-b border-slate-100 flex items-center gap-2">
              <Bed size={18} className="text-teal-600" />
              Admission Settings
            </h3>

            {/* Patient Type Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Patient Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, patient_type: 'OPD' }))}
                  className={`py-3 rounded-xl border font-semibold text-sm transition-all-300 ${
                    formData.patient_type === 'OPD'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  OPD (Outpatient)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, patient_type: 'IPD' }))}
                  className={`py-3 rounded-xl border font-semibold text-sm transition-all-300 ${
                    formData.patient_type === 'IPD'
                      ? 'bg-teal-50 border-teal-500 text-teal-700 shadow-sm'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  IPD (Inpatient Admission)
                </button>
              </div>
            </div>

            {/* Conditional IPD Fields */}
            {formData.patient_type === 'IPD' && (
              <div className="space-y-4 animate-fadeIn">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attending Doctor *</label>
                  <select
                    name="attending_doctor"
                    value={ipdData.attending_doctor}
                    onChange={handleIpdChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                  >
                    <option value="">-- Select Attending Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.doctor_id} value={d.doctor_id}>
                        {d.full_name} ({d.specialization})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Diagnosis */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Diagnosis / Symptoms</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={ipdData.diagnosis}
                    onChange={handleIpdChange}
                    placeholder="e.g. Acute Appendicitis"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 outline-none placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
                  />
                </div>

                {/* Visual Bed Grid Picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Select Bed * {ipdData.bed_id && <span className="text-teal-600 font-bold">(Selected)</span>}
                  </label>
                  <div className="max-h-48 overflow-y-auto border border-slate-100 p-3 rounded-xl space-y-4">
                    {Object.keys(bedsByWard).map((wardName) => (
                      <div key={wardName} className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{wardName}</span>
                        <div className="grid grid-cols-5 gap-1.5">
                          {bedsByWard[wardName].map((bed) => {
                            const isSelected = ipdData.bed_id === String(bed.bed_id);
                            const isAvailable = bed.status === 'Available';
                            const isOccupied = bed.status === 'Occupied';
                            const isMaintenance = bed.status === 'Maintenance';

                            let btnBg = 'bg-slate-100 text-slate-400 cursor-not-allowed border-transparent';
                            if (isAvailable) {
                              btnBg = isSelected 
                                ? 'bg-teal-600 text-white border-teal-700 shadow-md'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer';
                            } else if (isOccupied) {
                              btnBg = 'bg-red-50 text-red-500 border-red-100 cursor-not-allowed';
                            } else if (isMaintenance) {
                              btnBg = 'bg-amber-50 text-amber-600 border-amber-100 cursor-not-allowed';
                            }

                            return (
                              <button
                                key={bed.bed_id}
                                type="button"
                                disabled={!isAvailable}
                                onClick={() => setIpdData(prev => ({ ...prev, bed_id: String(bed.bed_id) }))}
                                title={`${bed.bed_number} - ${bed.status}`}
                                className={`py-2 px-1 text-[10px] font-bold border rounded-lg transition-all-300 text-center truncate ${btnBg}`}
                              >
                                {bed.bed_number.split('-')[1] || bed.bed_number}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Bed Color Legends */}
                  <div className="flex gap-4 mt-2 justify-center text-[10px] text-slate-500">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-200 rounded"></span>Available</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-100 border border-red-200 rounded"></span>Occupied</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-100 border border-amber-200 rounded"></span>Maint.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-700/10 hover:shadow-teal-700/20 transition-all-300 disabled:bg-slate-400 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Complete Registration'
            )}
          </button>
        </div>
      </form>

      {/* Success Modal */}
      {successData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-slate-100 space-y-6 animate-scaleUp">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-100">
              <CheckCircle2 size={36} />
            </div>
            
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 text-lg">Registration Successful</h4>
              <p className="text-sm text-slate-500">Patient records has been successfully written to the database</p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Patient Name</span>
                <span className="font-bold text-slate-700">{successData.full_name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Unique Patient ID</span>
                <span className="font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded text-sm font-mono border border-teal-100">
                  {successData.patient_id}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-400">Patient Type</span>
                <span className="font-bold text-slate-700">{successData.patient_type}</span>
              </div>
              {successData.bed_number && (
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Assigned Bed</span>
                  <span className="font-bold text-blue-600">{successData.bed_number}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setSuccessData(null);
                  setCurrentPage('patient-lookup');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-all-300"
              >
                Go to Prescription
              </button>
              <button
                onClick={() => setSuccessData(null)}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-all-300"
              >
                Register Another
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterPatient;

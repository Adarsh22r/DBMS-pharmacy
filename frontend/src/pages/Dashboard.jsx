import React from 'react';
import { getRole } from '../utils/auth';
import AdminDashboard from './dashboards/AdminDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import PharmacistDashboard from './dashboards/PharmacistDashboard';
import NurseDashboard from './dashboards/NurseDashboard';

const Dashboard = ({ setCurrentPage }) => {
  const role = getRole();

  switch (role) {
    case 'Admin':
      return <AdminDashboard setCurrentPage={setCurrentPage} />;
    case 'Doctor':
      return <DoctorDashboard />;
    case 'Pharmacist':
      return <PharmacistDashboard />;
    case 'Nurse':
      return <NurseDashboard />;
    default:
      return (
        <div className="p-8 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold">
          Unknown role: {role}. Please contact your administrator.
        </div>
      );
  }
};

export default Dashboard;

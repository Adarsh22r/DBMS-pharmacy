import React, { useState } from 'react';
import api from '../utils/api';
import { Lock, User, AlertCircle } from 'lucide-react';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      const { token, staff } = res.data;

      // Save to localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('staff', JSON.stringify(staff));

      // Trigger callback
      onLoginSuccess(staff);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-teal-950 flex items-center justify-center relative overflow-hidden px-4">
      {/* Decorative backdrop shapes */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-teal-800/20 blur-3xl -top-40 -left-40"></div>
      <div className="absolute w-[500px] h-[500px] rounded-full bg-emerald-800/10 blur-3xl -bottom-40 -right-40"></div>

      <div className="w-full max-w-md p-8 rounded-2xl glass shadow-2xl relative z-10">
        {/* Brand/Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-teal-500 flex items-center justify-center font-bold text-3xl text-white mx-auto shadow-md shadow-teal-500/20 mb-3">
            M
          </div>
          <h2 className="text-2xl font-bold text-slate-800">MediCare Pro</h2>
          <p className="text-sm text-slate-500 mt-1">E-Pharmacy & Hospital Management System</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start gap-3 text-sm animate-pulse">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 outline-none text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white/70 outline-none text-slate-800 placeholder-slate-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 mt-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-lg shadow-teal-700/20 hover:shadow-teal-700/30 outline-none transition-all-300 disabled:bg-slate-400 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        {/* Help footer */}
        <div className="mt-8 text-center text-xs text-slate-400 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
          <span className="font-semibold text-slate-500 block mb-0.5">Demo Credentials</span>
          username: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600">admin</code> &nbsp;|&nbsp; password: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600">password123</code>
        </div>
      </div>
    </div>
  );
};

export default Login;

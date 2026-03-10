import React, { useState } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (!email || password.length < 6) {
        throw new Error('Please enter valid credentials (password min 6 chars).');
      }

      if (isRegistering) {
        if (!name || name.trim().length < 2) throw new Error('Please enter your full name.');

        const res = await authService.register({
          name: name.trim(),
          email: email.toLowerCase(),
          password: password
        });

        // Auto-login after registration
        if (res.data.user) {
          onLogin({
            ...res.data.user,
            token: res.data.token
          });
        } else {
          setSuccessMsg(res.data.message);
          setIsRegistering(false);
        }
      } else {
        const res = await authService.login({
          email: email.toLowerCase(),
          password: password
        });

        // Extract user and token, handle both camelCase and PascalCase
        const user = res.data.user || res.data.User;
        const token = res.data.token || res.data.Token;

        onLogin({
          ...user,
          token: token
        });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Authentication failed. Check connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center justify-center space-x-3 group mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 transform transition-all duration-500 group-hover:rotate-6">
              <i className="fas fa-bridge-water text-white text-3xl"></i>
            </div>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Setu</h1>
          <p className="text-emerald-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Enterprise Suite</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-500">
          <div className="p-8 sm:p-10">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-slate-500 mb-8">
              {isRegistering ? 'Join the secure business network' : 'Secure access to your business bridge'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegistering && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Full Name</label>
                  <div className="relative">
                    <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
                    <i className="fas fa-user absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Work Email</label>
                <div className="relative">
                  <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                  <i className="fas fa-envelope absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Access Password</label>
                <div className="relative">
                  <input required type={showPassword ? 'text' : 'password'} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all pl-12 pr-12" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <i className="fas fa-lock absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center animate-shake">
                  <i className="fas fa-exclamation-circle mr-2"></i> {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl text-xs font-bold flex items-center">
                  <i className="fas fa-check-circle mr-2"></i> {successMsg}
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200 flex items-center justify-center group overflow-hidden relative">
                {isLoading ? (
                  <i className="fas fa-circle-notch fa-spin text-lg"></i>
                ) : (
                  <>
                    <span className="relative z-10 uppercase tracking-widest text-xs">{isRegistering ? 'Complete Registration' : 'Enter Dashboard'}</span>
                    <i className="fas fa-arrow-right ml-2 relative z-10 transition-transform group-hover:translate-x-1"></i>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center space-y-3">
              <button
                onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccessMsg(''); }}
                className="block w-full text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Don\'t have an account? Create one'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center">
              Verified by Setu India <i className="fas fa-shield-check text-emerald-500 ml-2"></i>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

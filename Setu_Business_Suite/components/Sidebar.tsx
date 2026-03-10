import React from 'react';
import { NAVIGATION } from '../constants';
import { User, UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  currentUser?: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, currentUser, onLogout }) => {

  const role = currentUser?.role || UserRole.CUSTOMER;
  const filteredNav = NAVIGATION.filter(item => {
    if (role === UserRole.ADMIN) {
      return ['dashboard', 'admin', 'users', 'analytics'].includes(item.id);
    }
    // CUSTOMER
    if (item.id === 'admin') return false;
    return true;
  });

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-50
      w-64 bg-slate-900 text-slate-300 border-r border-slate-800
      transform ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      transition-transform duration-300 ease-in-out
      flex flex-col
    `}>
      <div className="p-6 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center space-x-3 group cursor-pointer">
          <div className="relative">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/40 transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
              <i className="fas fa-bridge-water text-white text-xl"></i>
            </div>
            <div className="absolute -inset-1 bg-blue-500/20 blur-md rounded-xl -z-10 group-hover:bg-emerald-400/20 transition-all duration-300"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-blue-400 transition-colors">Setu</span>
            <span className="text-[7px] font-black text-emerald-500 tracking-[0.4em] uppercase opacity-80">Connect All</span>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden text-slate-500 hover:text-white p-2 transition-colors"
        >
          <i className="fas fa-times text-lg"></i>
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-6 overflow-y-auto custom-scrollbar">
        {filteredNav.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${activeTab === item.id
              ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
              : 'hover:bg-slate-800/50 hover:text-white'
              }`}
          >
            <i className={`fas ${item.icon} w-6 text-lg transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}></i>
            <span className="ml-3 font-semibold text-sm">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-2xl p-4 flex items-center space-x-3 border border-slate-700/30">
          <div className="relative">
            <img src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'User'}&background=0D9488&color=fff`} className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-inner" alt="User" />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-slate-900 rounded-full bg-emerald-500`}></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{currentUser?.name || 'User'}</p>
            <div className="flex items-center">
              <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest truncate ${currentUser?.role === UserRole.ADMIN ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}>{currentUser?.role || UserRole.CUSTOMER}</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-500 hover:text-red-400 transition-colors p-2 bg-slate-800/50 rounded-lg"
            title="Secure Logout"
          >
            <i className="fas fa-power-off text-xs"></i>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

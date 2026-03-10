import React, { useState, useEffect } from 'react';
import { adminService } from '../services/api';
import { User, UserRole, SubscriptionPlan, UserSubscription } from '../types';
import { formatDisplayDate } from '../utils';

const AdminPanel: React.FC = () => {
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'users' | 'subscriptions' | 'plans'>('dashboard');
    const [stats, setStats] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [pendingSubs, setPendingSubs] = useState<UserSubscription[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, userRes, pendingRes, planRes] = await Promise.all([
                adminService.getStats(),
                adminService.getUsers(),
                adminService.getPendingSubscriptions(),
                adminService.getPlans()
            ]);
            setStats(statsRes.data);
            setUsers(userRes.data);
            setPendingSubs(pendingRes.data);
            setPlans(planRes.data);
        } catch (err) {
            console.error("Error fetching admin data", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleApprove = async (id: string) => {
        if (!window.confirm("Approve this subscription request?")) return;
        try {
            await adminService.approveSubscription(id);
            alert("Subscription approved!");
            fetchData();
        } catch (err) {
            alert("Approval failed.");
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm("Reject this subscription request?")) return;
        try {
            await adminService.rejectSubscription(id);
            alert("Subscription rejected.");
            fetchData();
        } catch (err) {
            alert("Rejection failed.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Admin Command Center</h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Platform Management & Control</p>
                </div>
                <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    {(['dashboard', 'users', 'subscriptions', 'plans'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveSubTab(tab)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab
                                    ? 'bg-slate-900 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {activeSubTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Customers" value={stats?.totalUsers || 0} icon="fa-users" color="blue" />
                    <StatCard title="Active Subs" value={stats?.activeSubscriptions || 0} icon="fa-check-circle" color="emerald" />
                    <StatCard title="Expired Subs" value={stats?.expiredSubscriptions || 0} icon="fa-clock" color="amber" />
                    <StatCard title="Pending Requests" value={stats?.pendingSubscriptionRequests || 0} icon="fa-hourglass-half" color="purple" />
                </div>
            )}

            {activeSubTab === 'users' && (
                <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5">User Detail</th>
                                    <th className="px-8 py-5">Role</th>
                                    <th className="px-8 py-5">Plan</th>
                                    <th className="px-8 py-5">Status</th>
                                    <th className="px-8 py-5 text-right">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 text-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 text-xs">
                                                    {u.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{u.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${u.role === 'Admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs font-bold text-slate-700">{u.subscription?.planName || 'No Plan'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${u.subscription?.status === 'Active' ? 'bg-emerald-50 text-emerald-600' :
                                                    u.subscription?.status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                }`}>
                                                {u.subscription?.status || 'None'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {formatDisplayDate(u.createdAt)}
                                            </p>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeSubTab === 'subscriptions' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase tracking-tight">Pending Requests</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Approve or reject new subscription signups</p>
                            </div>
                            <span className="bg-amber-100 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                                {pendingSubs.length} Pending
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-8 py-5">User</th>
                                        <th className="px-8 py-5">Requested Plan</th>
                                        <th className="px-8 py-5">Date</th>
                                        <th className="px-8 py-5 text-right">Control</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {pendingSubs.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-8 py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                                No pending requests at the moment
                                            </td>
                                        </tr>
                                    ) : (
                                        pendingSubs.map((sub) => (
                                            <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5">
                                                    <p className="text-sm font-bold text-slate-800">{sub.userName}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{sub.userId}</p>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">
                                                        {sub.planName}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase">
                                                        2 mins ago
                                                    </p>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => handleReject(sub.id)}
                                                            className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">
                                                            Reject
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(sub.id)}
                                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all">
                                                            Approve
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeSubTab === 'plans' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {plans.map((p) => (
                        <div key={p.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative group">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{p.name}</h3>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${p.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    {p.status}
                                </span>
                            </div>
                            <div className="mb-6">
                                <span className="text-3xl font-black text-slate-900">${p.price}</span>
                                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-2">/ {p.validity}</span>
                            </div>
                            <div className="space-y-2 mb-8 border-t border-slate-50 pt-6">
                                <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                                    <span>Companies</span>
                                    <span className="font-black text-slate-800">{p.maxCompanies}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                                    <span>Products</span>
                                    <span className="font-black text-slate-800">{p.maxProducts}</span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium flex justify-between uppercase tracking-widest">
                                    <span>Users</span>
                                    <span className="font-black text-slate-800">{p.maxUsers}</span>
                                </div>
                            </div>
                            <button className="w-full py-3 bg-slate-50 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                Edit Plan
                            </button>
                        </div>
                    ))}
                    <button className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all group">
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-4 group-hover:border-blue-500">
                            <i className="fas fa-plus"></i>
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-widest">Create New Plan</span>
                    </button>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: number | string, icon: string, color: string }> = ({ title, value, icon, color }) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        purple: 'bg-purple-50 text-purple-600'
    };

    return (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center gap-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-sm ${colors[color] || colors.blue}`}>
                <i className={`fas ${icon}`}></i>
            </div>
            <div>
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{title}</h4>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
            </div>
        </div>
    );
};

export default AdminPanel;

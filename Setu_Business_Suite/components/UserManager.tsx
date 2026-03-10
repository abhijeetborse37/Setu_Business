
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { db, collection, addDoc, deleteDoc, doc, onSnapshot } from '../firebase';

interface Props {
    currentUser: User;
}

const UserManager: React.FC<Props> = ({ currentUser }) => {
    const [users, setUsers] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: UserRole.MANAGER
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
            setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })));
        });
        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password) return;

        setIsLoading(true);
        try {
            const newUser = {
                ...formData,
                avatar: `https://ui-avatars.com/api/?name=${formData.name}&background=0D9488&color=fff`,
                createdAt: new Date().toISOString()
            };
            await addDoc(collection(db, 'users'), newUser);
            setShowForm(false);
            setFormData({ name: '', email: '', password: '', role: UserRole.MANAGER });
        } catch (err) {
            alert("Failed to add user.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (id === currentUser.id) {
            alert("You cannot delete your own account.");
            return;
        }
        if (window.confirm("Are you sure you want to remove this user?")) {
            try {
                await deleteDoc(doc(db, 'users', id));
            } catch (err) {
                alert("Delete failed.");
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Access Control</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manage System Users</p>
                </div>
                <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-blue-500/30 text-[10px] uppercase tracking-[0.2em] flex items-center">
                    <i className="fas fa-plus mr-2"></i> Add User
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map(user => (
                    <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col relative group hover:border-blue-500 transition-all">
                        <div className="flex items-center space-x-4 mb-4">
                            <img src={user.avatar} className="w-12 h-12 rounded-xl shadow-sm" alt={user.name} />
                            <div>
                                <h4 className="font-bold text-slate-800 uppercase tracking-tight">{user.name}</h4>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${user.role === UserRole.ADMIN ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-2 flex-1">
                            <div className="flex items-center text-xs text-slate-500">
                                <i className="fas fa-envelope w-5"></i> {user.email}
                            </div>
                            <div className="flex items-center text-xs text-slate-500">
                                <i className="fas fa-key w-5"></i> <span className="font-mono">••••••••</span>
                            </div>
                        </div>

                        <div className="pt-4 mt-4 border-t border-slate-50 flex justify-between items-center">
                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                                {user.id === currentUser.id ? 'Current Session' : 'Active Account'}
                            </span>
                            {user.id !== currentUser.id && (
                                <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                                    <i className="fas fa-trash"></i>
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {showForm && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-8 animate-in zoom-in-95">
                        <h3 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-tight">Add New Member</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Name</label>
                                <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Email</label>
                                <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Password</label>
                                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none font-mono"
                                    placeholder="Set initial password"
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Role</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.values(UserRole).map(role => (
                                        <button type="button" key={role} onClick={() => setFormData({ ...formData, role })}
                                            className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-wider border ${formData.role === role ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                            {role.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4 mt-4">
                                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-slate-400 font-bold text-xs uppercase tracking-widest">Cancel</button>
                                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20">{isLoading ? 'Saving...' : 'Add User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManager;

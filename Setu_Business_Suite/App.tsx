
import React, { useState, useMemo, useEffect } from 'react';
import { Company, Product, Customer, Transaction, User, UserRole } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CompanyManager from './components/CompanyManager';
import ProductManager from './components/ProductManager';
import CustomerManager from './components/CustomerManager';
import Analytics from './components/Analytics';
import UserManager from './components/UserManager';
import InventoryManager from './components/InventoryManager';
import SalesManager from './components/SalesManager';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import SubscriptionSelection from './components/SubscriptionSelection';
import ErrorBoundary from './components/ErrorBoundary';

// Import Backend services and utilities
import { companyService, productService, transactionService, authService, customerService } from './services/api';
import { formatDisplayDate } from './utils';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // API-synchronized states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(localStorage.getItem('setu_active_company'));

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) localStorage.setItem('setu_active_company', id);
    else localStorage.removeItem('setu_active_company');
  };

  const fetchData = async () => {
    if (!currentUser) return;
    // Allow fetching if Admin or if they have any subscription status (including Pending)
    // if (currentUser.role !== UserRole.ADMIN && currentUser.subscriptionStatus === 'None') return;
    setIsSyncing(true);
    const normalize = (obj: any) => {
      if (!obj || typeof obj !== 'object') return obj;
      const newObj: any = {};
      for (const key in obj) {
        // Map common property names to their expected lowercase versions
        const normalizedKey = key.toLowerCase() === 'id' ? 'id' : (key.charAt(0).toLowerCase() + key.slice(1));
        newObj[normalizedKey] = obj[key];
      }
      return newObj;
    };

    try {
      const companyRes = await companyService.getAll();
      const normalizedCompanies = (companyRes.data || []).map(normalize);
      setCompanies(normalizedCompanies);

      let currentActiveId = activeCompanyId;
      if (!currentActiveId || !normalizedCompanies.find((c: any) => c.id === currentActiveId)) {
        currentActiveId = normalizedCompanies.length > 0 ? normalizedCompanies[0].id : null;
        setActiveCompanyId(currentActiveId);
      }

      if (currentActiveId) {
        console.log("App: Fetching data for Company ID:", currentActiveId);

        // Fetch data with individual error handling so one failure doesn't block others
        const fetchResults = await Promise.all([
          productService.getByCompany(currentActiveId).catch(err => { console.error("App: Product fetch failed:", err); return { data: [] }; }),
          transactionService.getByCompany(currentActiveId).catch(err => { console.error("App: Transaction fetch failed:", err); return { data: [] }; }),
          customerService.getAll().catch(err => { console.error("App: Customer fetch failed:", err); return { data: [] }; })
        ]);

        const [productRes, transactionRes, customerRes] = fetchResults;

        console.log("App: Raw Product Data:", productRes.data);
        console.log("App: Raw Transaction Data:", transactionRes.data);

        const normalizedProducts = (productRes.data || []).map(normalize);
        const normalizedTransactions = (transactionRes.data || []).map(normalize);
        const normalizedCustomers = (customerRes.data || []).map(normalize);

        setProducts(normalizedProducts);
        setTransactions(normalizedTransactions);
        setCustomers(normalizedCustomers);

        if (normalizedProducts.length > 0) {
          console.info(`✓ Successfully loaded ${normalizedProducts.length} products for company ${currentActiveId}`);
        }
      } else {
        console.warn("App: No active company ID to fetch products for.");
      }
    } catch (err: any) {
      console.error("App: Error fetching data:", err.response?.data || err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // 1. Data Fetching
  useEffect(() => {
    fetchData();
  }, [currentUser, activeCompanyId]);

  // Session handling
  useEffect(() => {
    const savedUser = localStorage.getItem('setu_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('setu_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('setu_user');
    setActiveTab('dashboard');
  };

  const activeCompany = useMemo(() =>
    companies.find(c => c.id === activeCompanyId) || null,
    [companies, activeCompanyId]);

  const navigateTo = (tab: string) => {
    /*
    if (currentUser?.role === UserRole.CUSTOMER) {
      // Allow navigation if Active OR if they are Pending (to see their profile/dashboard)
      if (!currentUser?.isSubscriptionActive && currentUser.subscriptionStatus !== 'Pending') {
        alert("Subscription Required: Please finalize your subscription to access this feature.");
        return;
      }
    }
    */

    if (tab === 'admin' && currentUser?.role !== UserRole.ADMIN) {
      alert("Unauthorized: Admin access only.");
      return;
    }

    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  /*
  // Handle Subscription Scenarios for Customers
  if (currentUser.role === UserRole.CUSTOMER) {
    if (currentUser.subscriptionStatus === 'None' || currentUser.subscriptionStatus === 'Rejected') {
      return (
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><i className="fas fa-bridge-water"></i></div>
                <span className="font-black text-xl tracking-tighter">Setu</span>
              </div>
              <button onClick={handleLogout} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500">Logout</button>
            </div>
            {currentUser.subscriptionStatus === 'Rejected' && (
              <div className="mb-10 bg-red-50 border border-red-100 p-6 rounded-[2rem] text-center">
                <p className="text-red-600 font-bold">Your previous subscription request was rejected. Please select a new plan.</p>
              </div>
            )}
            <SubscriptionSelection currentUser={currentUser} onPlanRequested={() => {
              const updatedUser = { ...currentUser, subscriptionStatus: 'Pending' };
              setCurrentUser(updatedUser);
              localStorage.setItem('setu_user', JSON.stringify(updatedUser));
              setActiveTab('dashboard');
            }} />
          </div>
        </div>
      );
    }
  }
  */
  /*
  // Check for expiry
  if (currentUser.subscriptionStatus === 'Active' && !currentUser.isSubscriptionActive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[3rem] p-12 text-center shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 text-3xl">
            <i className="fas fa-calendar-times"></i>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Subscription Expired</h2>
          <p className="text-slate-500 font-medium mb-2">
            Your subscription expired on {currentUser.subscriptionEndDate ? formatDisplayDate(currentUser.subscriptionEndDate) : 'recently'}.
          </p>
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-10">Please renew to continue.</p>
          <div className="space-y-4">
            <button onClick={() => setCurrentUser({ ...currentUser, subscriptionStatus: 'None' })} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-200">
              Renew Now
            </button>
            <button onClick={handleLogout} className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }
  */

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard company={activeCompany} products={products} customers={customers} transactions={transactions} onNavigate={navigateTo} />;
      case 'companies':
        return (
          <CompanyManager
            companies={companies}
            activeId={activeCompanyId}
            setActiveId={setActiveCompanyId}
            products={products}
            transactions={transactions}
            currentUser={currentUser}
            onDataChange={fetchData}
          />
        );
      case 'inventory':
        return <InventoryManager products={products} transactions={transactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'sales':
        return <SalesManager products={products} customers={customers} transactions={transactions} activeCompany={activeCompany} currentUser={currentUser} onDataChange={fetchData} />;
      case 'products':
        return <ProductManager products={products} onDataChange={fetchData} activeCompanyId={activeCompanyId} currencySymbol={activeCompany?.currencySymbol || '$'} currentUser={currentUser!} />;
      case 'customers':
        return <CustomerManager customers={customers} onDataChange={fetchData} activeCompanyId={activeCompanyId} currencySymbol={activeCompany?.currencySymbol || '$'} currentUser={currentUser!} />;
      case 'users':
        return <UserManager currentUser={currentUser} />;
      case 'admin':
        return <AdminPanel />;
      case 'analytics':
        return <Analytics company={activeCompany} products={products} transactions={transactions} />;
      default:
        return <Dashboard company={activeCompany} products={products} customers={customers} transactions={transactions} onNavigate={navigateTo} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-[100dvh] overflow-hidden bg-slate-50 font-sans">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <Header
            activeTab={activeTab}
            companyName={activeCompany?.name}
            onMenuClick={() => setIsSidebarOpen(true)}
          />

          {isSyncing && (
            <div className="absolute top-20 left-0 right-0 h-1 bg-blue-100 overflow-hidden z-50">
              <div className="h-full bg-blue-600 animate-[loading_1.5s_infinite] w-1/3"></div>
            </div>
          )}

          {/* 
          {currentUser.subscriptionStatus === 'Pending' && (
            <div className="m-4 mb-0 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between text-amber-700 font-bold text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center">
                <i className="fas fa-hourglass-half mr-3 animate-pulse"></i>
                Subscription Pending Approval: Some features may be restricted until an admin approves your request.
              </div>
            </div>
          )}
          */}

          {currentUser.warningMessage && (
            <div className="m-4 mb-0 bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between text-amber-700 font-bold text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center">
                <i className="fas fa-exclamation-triangle mr-3"></i>
                {currentUser.warningMessage}
              </div>
              <button onClick={() => setCurrentUser({ ...currentUser, warningMessage: undefined })} className="text-amber-400 hover:text-amber-600"><i className="fas fa-times"></i></button>
            </div>
          )}

          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 flex flex-col custom-scrollbar">
            <div className="max-w-7xl mx-auto flex-1 w-full">
              {renderContent()}
            </div>

            <footer className="mt-auto py-6 border-t border-slate-200 text-center no-print flex-shrink-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center justify-center">
                Made with <i className="fas fa-heart text-red-500 mx-1.5"></i> in India <span className="ml-2">🇮🇳</span>
              </p>
              <p className="text-[8px] text-slate-300 font-bold uppercase tracking-widest mt-2">
                © {new Date().getFullYear()} Setu Business Suite • Powered by .NET Core & Postgres
              </p>
            </footer>
          </main>
        </div>
        <style>{`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(300%); }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default App;


import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Company, Product, Transaction } from '../types';
import { formatDate } from '../utils';

interface Props {
  company: Company | null;
  products: Product[];
  transactions: Transaction[];
}

const Analytics: React.FC<Props> = ({ company, products, transactions }) => {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Define useMemo BEFORE early return
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // API dates are "YYYY-MM-DDTHH:mm:ss", pickers are "YYYY-MM-DD"
      const tDate = t.date.split('T')[0];
      return tDate >= startDate && tDate <= endDate;
    });
  }, [transactions, startDate, endDate]);

  // Now safe to do early return
  if (!company) return (
    <div className="py-20 text-center text-slate-400">Select a company to view reports.</div>
  );

  const handleDownloadReport = () => {
    if (filteredTransactions.length === 0) {
      alert("No data found for the selected date range.");
      return;
    }

    const headers = ['Date', 'Invoice Number', 'Type', 'Entity (Customer/Supplier)', 'Description', `Grand Total (In ${company.currency})`];
    const rows = filteredTransactions.map(t => [
      formatDate(t.date),
      t.invoiceNumber,
      t.type,
      t.entityName,
      t.items.map(i => `${i.productName} (x${i.quantity})`).join('; '),
      t.totalAmount.toLocaleString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Ledger_Report_${company.name.replace(/\s+/g, '_')}_${formatDate(startDate)}_to_${formatDate(endDate)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const symbol = company.currencySymbol || '$';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Financial Reports</h3>
          <p className="text-sm text-slate-500">Select date ranges to generate detailed ledgers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input type="date" className="bg-transparent text-xs font-bold outline-none border-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <span className="text-slate-300 text-xs">to</span>
            <input type="date" className="bg-transparent text-xs font-bold outline-none border-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button
            onClick={handleDownloadReport}
            className="bg-slate-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-bold flex items-center shadow-lg shadow-slate-200 transition-all uppercase tracking-widest"
          >
            <i className="fas fa-file-export mr-2"></i> Export Ledger
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Transaction Ledger ({formatDate(startDate)} to {formatDate(endDate)})</h4>
          <div className="text-[10px] font-bold text-slate-400">Showing {filteredTransactions.length} entries</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-white border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                <th className="px-8 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredTransactions.length > 0 ? filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-8 py-4 text-xs font-bold text-slate-800">{formatDate(t.date)}</td>
                  <td className="px-8 py-4">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase ${t.type === 'SALE' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <div className="text-xs text-slate-600">
                      {t.items[0]?.productName} {t.items.length > 1 && `(+${t.items.length - 1} more)`}
                      <div className="text-[10px] text-slate-400 font-mono">{t.invoiceNumber}</div>
                    </div>
                  </td>
                  <td className="px-8 py-4 text-right text-sm font-black text-slate-900">
                    {symbol}{t.totalAmount.toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center text-slate-400 italic">No transactions found for the selected period.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;

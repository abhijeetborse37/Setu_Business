
import React from 'react';
import { Transaction, Company } from '../types';

interface Props {
  transaction: Transaction;
  company: Company | null;
  onClose: () => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const COUNTRY_TAX_MAP: Record<string, string> = {
  'India': 'GST',
  'United States': 'Sales Tax',
  'United Kingdom': 'VAT',
  'European Union': 'VAT',
  'Canada': 'HST/GST',
  'Australia': 'GST'
};

const InvoiceModal: React.FC<Props> = ({ transaction, company, onClose }) => {
  if (!company) return null;

  const symbol = company.currencySymbol || '$';
  const taxLabel = COUNTRY_TAX_MAP[company.country] || 'Tax';

  const handleDownload = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300">
        <div className="bg-slate-900 px-8 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center space-x-2 text-white">
            <i className="fas fa-file-invoice text-blue-400"></i>
            <span className="font-bold text-sm tracking-widest uppercase">Invoice Preview</span>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
              <i className="fas fa-download mr-2"></i> Print Invoice
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <div id="invoice-content" className="p-12 bg-white min-h-[600px] text-slate-800 overflow-y-auto max-h-[85vh]">
          <div className="flex justify-between items-start mb-12">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-1">{company.name}</h1>
              <p className="text-xs text-slate-500 font-medium whitespace-pre-line">{company.address}</p>
              <p className="text-xs text-slate-500 mt-1">{taxLabel} No: <span className="text-slate-800 font-bold">{company.taxId}</span></p>
            </div>
            <div className="text-right">
              <h2 className="text-5xl font-black text-slate-100 uppercase tracking-tighter mb-4">INVOICE</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Invoice Number</p>
              <p className="text-sm font-black text-blue-600 mb-2">{transaction.invoiceNumber}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date</p>
              <p className="text-sm font-bold text-slate-800">{formatDate(transaction.date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 mb-12 border-y border-slate-100 py-8">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Bill To</p>
              <p className="font-bold text-slate-900 text-lg">{transaction.entityName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Payment Summary</p>
              <p className="font-bold text-slate-900">Due on Receipt</p>
              <p className="text-xs text-slate-500 mt-1">Status: <span className="text-emerald-600 font-bold uppercase tracking-tighter">Paid</span></p>
            </div>
          </div>

          <table className="w-full mb-12">
            <thead>
              <tr className="border-b-2 border-slate-900">
                <th className="py-4 text-left text-[10px] font-bold uppercase tracking-widest">Description</th>
                <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">Qty</th>
                <th className="py-4 text-right text-[10px] font-bold uppercase tracking-widest">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transaction.items.map((item, index) => (
                <tr key={index}>
                  <td className="py-6">
                    <p className="font-bold text-slate-900">{item.productName}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Rate: {symbol}{item.unitPrice.toLocaleString()}</p>
                  </td>
                  <td className="py-6 text-right font-medium">{item.quantity}</td>
                  <td className="py-6 text-right font-black text-slate-900">{symbol}{item.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end pt-8 border-t-2 border-slate-900">
            <div className="text-right w-72">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-black text-slate-900">{symbol}{(transaction.totalAmount - transaction.totalTax - (transaction.roundOff || 0)).toLocaleString()}</span>
              </div>
              {(transaction.cgstTotal !== undefined || transaction.sgstTotal !== undefined) ? (
                <>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">CGST Total</span>
                    <span className="text-sm font-black text-slate-900">{symbol}{(transaction.cgstTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">SGST Total</span>
                    <span className="text-sm font-black text-slate-900">{symbol}{(transaction.sgstTotal || 0).toLocaleString()}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tax Total</span>
                  <span className="text-sm font-black text-slate-900">{symbol}{transaction.totalTax.toLocaleString()}</span>
                </div>
              )}
              {transaction.roundOff ? (
                <div className="flex justify-between mb-4 border-b border-slate-100 pb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Round Off</span>
                  <span className="text-sm font-black text-slate-900">{symbol}{(transaction.roundOff).toLocaleString()}</span>
                </div>
              ) : (
                <div className="mb-4 border-b border-slate-100 pb-4"></div>
              )}
              <div className="flex justify-between items-end mt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mr-4">Grand Total Payable</span>
                <span className="text-2xl font-black text-blue-600">{symbol}{transaction.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceModal;

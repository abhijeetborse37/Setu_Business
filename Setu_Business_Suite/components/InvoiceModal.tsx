
import React from 'react';
import { Transaction, Company, Customer } from '../types';

interface Props {
  transaction: Transaction;
  company: Company | null;
  customer: Customer | null;
  onClose: () => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Handle both ISO format (YYYY-MM-DDTHH:mm:ss) and date only format (YYYY-MM-DD)
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
};

const InvoiceModal: React.FC<Props> = ({ transaction, company, customer, onClose }) => {
  if (!company) return null;

  const symbol = company.currencySymbol || '₹';

  const handleDownload = () => {
    // Set document title temporarily to control default PDF filename
    const originalTitle = document.title;
    const formattedDate = formatDate(transaction.date).replace(/\//g, '-');
    const safeCustomerName = transaction.entityName.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${safeCustomerName}_${transaction.invoiceNumber}_${formattedDate}`;

    document.title = fileName;
    window.print();

    // Restore original title after print dialog closes
    // Use a small timeout to ensure the print process has initialized with the new title
    setTimeout(() => {
      document.title = originalTitle;
    }, 100);
  };

  // Calculate totals
  const subtotal = transaction.items.reduce((sum, item) => {
    const amount = item.quantity * item.unitPrice;
    return sum + amount;
  }, 0);

  const totalQuantity = transaction.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalCGST = transaction.cgstTotal || transaction.items.reduce((sum, item) => sum + (item.cgstAmount || 0), 0) || 0;
  const totalSGST = transaction.sgstTotal || transaction.items.reduce((sum, item) => sum + (item.sgstAmount || 0), 0) || 0;
  const totalTax = totalCGST + totalSGST;
  const grandTotal = transaction.totalAmount;

  // Print styles for clean invoice output
  const printStyles = `
    @page {
      size: A4 portrait;
      margin: 5mm; /* Reduced margin to maximize space */
    }
    @media print {
      html, body {
        background: white !important;
        margin: 0 !important;
        padding: 0 !important;
        height: auto !important;
        min-height: 100% !important;
        transform: none !important;
        animation: none !important;
      }
      /* Hide all non-invoice content using visibility instead of display */
      body * {
        visibility: hidden;
      }
      /* Show invoice modal and all its contents */
      #invoice-modal-print,
      #invoice-modal-print * {
        visibility: visible;
      }
      /* Reset any fixed or absolute barriers */
      #invoice-modal-print {
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        z-index: 9999 !important;
        margin: 0 !important;
        padding: 0 !important; /* Critical: Remove p-4 on print */
        background: white !important;
        overflow: visible !important;
        transform: none !important; /* Remove Tailwind animations on print */
        animation: none !important;
      }
      
      /* Remove any scale/overflow constraints on inner wrapper */
      #invoice-modal-print > div {
        max-width: 100% !important;
        width: 100% !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        transform: none !important; /* Critical: Prevent slide-in-from-top artifacts */
        animation: none !important;
        position: static !important;
      }
      
      /* Invoice content container */
      #invoice-content {
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
        padding: 40px !important; /* Consistent padding for clean paper look */
        width: 100% !important;
        margin-top: 0 !important;
      }
      
      /* ...rest of typography and breaks... */
      h1 { word-wrap: break-word !important; overflow-wrap: break-word !important; }
      .prevent-break { page-break-inside: avoid !important; }
      
      /* Ensure colors and table borders are preserved */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      table { border-collapse: collapse !important; width: 100% !important; }
      th, td { border: 1px solid #000 !important; }
    }
  `;


  return (
    <>
      <style>{printStyles}</style>
      <div id="invoice-modal-print" className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white rounded-lg w-full max-w-5xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 duration-300 print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-4 flex justify-between items-center print:hidden">
            <div className="flex items-center space-x-2 text-white">
              <i className="fas fa-file-invoice text-blue-400"></i>
              <span className="font-bold text-sm tracking-widest uppercase">Invoice Preview</span>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/20">
                <i className="fas fa-download mr-2"></i> Print Invoice
              </button>
              <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          {/* Invoice Content */}
          <div id="invoice-content" className="p-10 bg-white text-slate-800 overflow-y-auto max-h-[90vh]">

            {/* ===== COMPANY HEADER ===== */}
            <div className="border-b-2 border-slate-900 pb-8 mb-8 prevent-break">
              <div className="flex flex-wrap justify-between gap-6">
                {/* Company Details - Left */}
                <div className="flex-1 min-w-[250px]">
                  <h1 className="text-2xl font-black text-slate-900 mb-3 break-words" style={{ letterSpacing: '0.05em' }}>
                    {company.name}
                  </h1>
                  <div className="text-xs text-slate-700 space-y-1 leading-relaxed text-left">
                    <p className="font-semibold text-slate-800">Address:</p>
                    <p className="whitespace-pre-wrap ml-0 break-words">{company.address}</p>
                  </div>
                </div>

                {/* Invoice Details - Center */}
                <div className="text-center px-6 min-w-[150px]">
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-widest">INVOICE</h2>
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Invoice No.</p>
                      <p className="text-sm font-bold text-blue-600">{transaction.invoiceNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Date</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(transaction.date)}</p>
                    </div>
                  </div>
                </div>

                {/* Contact Details - Right */}
                <div className="text-left min-w-[150px]">
                  <div className="text-xs text-slate-700 space-y-2">
                    <div>
                      <span className="font-bold text-slate-800">Contact No:</span>
                      <p className="ml-0">{company.contact}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">Email:</span>
                      <p className="ml-0 break-all">{company.website || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">GSTIN:</span>
                      <p className="ml-0">{company.gstNumber || company.taxId}</p>
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">License No:</span>
                      <p className="ml-0">{company.licenseNumber}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===== BUYER DETAILS ===== */}
            <div className="grid grid-cols-2 gap-12 mb-8 pb-6 border-b border-slate-200 prevent-break">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Sold To (Buyer Details)</p>
                <div className="text-xs text-slate-700 space-y-1">
                  <p><span className="font-bold text-slate-800">Name:</span> {transaction.entityName}</p>
                  <p><span className="font-bold text-slate-800">Address:</span> {customer?.address || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">Contact:</span> {customer?.phone || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">GSTIN:</span> {customer?.gstPanId || 'Not provided'}</p>
                  <p><span className="font-bold text-slate-800">License No:</span> {customer?.licenseNo || 'Not provided'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Shipping Details</p>
                <div className="text-xs text-slate-700 space-y-1">
                  <p><span className="font-bold text-slate-800">Address:</span> {customer?.address || 'Same as Buyer'}</p>
                  <p><span className="font-bold text-slate-800">Delivery Date:</span> {formatDate(transaction.date)}</p>
                </div>
              </div>
            </div>

            {/* ===== ITEMS TABLE ===== */}
            <div className="mb-8">
              <table className="w-full border-collapse border-2 border-slate-900">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="border border-slate-900 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest w-8">Sr.</th>
                    <th className="border border-slate-900 px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest flex-1">Description of Goods</th>
                    <th className="border border-slate-900 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest w-16">Qty</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">Rate</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">SGST%</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">CGST%</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-20">Discount</th>
                    <th className="border border-slate-900 px-3 py-3 text-right text-[10px] font-bold uppercase tracking-widest w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transaction.items.map((item, index) => {
                    const amount = item.quantity * item.unitPrice;
                    const sgstRate = item.sgstRate || 0;
                    const cgstRate = item.cgstRate || 0;

                    return (
                      <tr key={index} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="border border-slate-300 px-3 py-4 text-center text-xs font-medium">{index + 1}</td>
                        <td className="border border-slate-300 px-3 py-4 text-xs text-slate-800">
                          <p className="font-semibold">{item.productName}</p>
                        </td>
                        <td className="border border-slate-300 px-3 py-4 text-center text-xs font-medium">{item.quantity}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{symbol}{item.unitPrice.toFixed(2)}</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{sgstRate}%</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{cgstRate}%</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-medium">{symbol}0.00</td>
                        <td className="border border-slate-300 px-3 py-4 text-right text-xs font-bold text-slate-900">{symbol}{amount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr className="bg-slate-50 border-t-2 border-slate-900">
                    <td colSpan={2} className="border border-slate-300 px-3 py-4 text-right font-bold text-sm">TOTAL</td>
                    <td className="border border-slate-300 px-3 py-4 text-center font-bold text-sm">{totalQuantity}</td>
                    <td colSpan={4} className="border border-slate-300 px-3 py-4"></td>
                    <td className="border border-slate-300 px-3 py-4 text-right font-bold text-sm">{symbol}{subtotal.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ===== AMOUNTS SUMMARY ===== */}
            <div className="flex justify-end mb-12">
              <div className="w-full max-w-xs">
                <table className="w-full border border-slate-300">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">Subtotal</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">SGST</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{totalSGST.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-700">CGST</td>
                      <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{totalCGST.toFixed(2)}</td>
                    </tr>
                    {transaction.roundOff && (
                      <tr className="border-b border-slate-300">
                        <td className="px-4 py-2 text-xs font-semibold text-slate-700">Round Off</td>
                        <td className="px-4 py-2 text-right text-xs font-semibold text-slate-900">{symbol}{transaction.roundOff.toFixed(2)}</td>
                      </tr>
                    )}
                    <tr className="bg-blue-50 border-t-2 border-slate-900">
                      <td className="px-4 py-3 text-xs font-bold text-slate-900">GRAND TOTAL</td>
                      <td className="px-4 py-3 text-right text-lg font-black text-blue-600">{symbol}{grandTotal.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ===== DECLARATION SECTION ===== */}
            <div className="grid grid-cols-2 gap-8 mb-12 prevent-break">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Declaration</p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  I/We hereby certify that the particulars given above are true and correct. The goods supplied/services rendered are as per the terms and conditions agreed upon. All statutory obligations have been complied with.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3 pb-2 border-b border-slate-300">Notes & Terms</p>
                <ul className="text-xs text-slate-600 space-y-1 leading-relaxed">
                  <li>• Payment Terms: Due on Receipt</li>
                  <li>• Method of Payment: As per agreement</li>
                  <li>• All disputes subject to jurisdiction</li>
                </ul>
              </div>
            </div>

            {/* ===== SIGNATURE SECTION ===== */}
            <div className="border-t-2 border-slate-900 pt-8 prevent-break">
              <div className="grid grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="text-xs font-semibold text-slate-600"></span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-widest">Authorized Signature</p>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">of Firm/Company</p>
                </div>
                <div></div>
                <div className="text-center">
                  <div className="border-t border-slate-400 min-h-16 flex items-end justify-center">
                    <span className="text-xs font-semibold text-slate-600"></span>
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1 uppercase tracking-widest">Signature of Buyer</p>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">with Stamp/Seal</p>
                </div>
              </div>
            </div>

            {/* Footer - Hidden on print */}
            <div className="mt-8 text-center border-t pt-4 print:hidden">
              <p className="text-xs text-slate-500">
                This is a computer-generated invoice. No physical signature is required.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                For enquiries, please contact {company.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceModal;

import React from 'react';
import { 
  CheckCircle2, 
  Printer, 
  Download, 
  X, 
  ShieldCheck, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  User, 
  Mail, 
  Phone, 
  FileText,
  AlertTriangle,
  Copy,
  Check
} from 'lucide-react';

export default function PaymentReceiptModal({ isOpen, receipt, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    const text = `Mehanda Army Investments - Payment Receipt\nReceipt No: ${receipt.receiptNumber}\nOrder ID: ${receipt.orderId}\nPayment ID: ${receipt.paymentId}\nCustomer: ${receipt.customerName}\nAmount: ₹${receipt.amount}\nService: ${receipt.serviceName}\nDate: ${new Date(receipt.verifiedAt).toLocaleString('en-IN')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedDate = new Date(receipt.verifiedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalAmount = Number(receipt.amount);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative bg-white text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200 print:border-none print:shadow-none print:rounded-none">
        
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="bg-[#081525] text-white px-6 py-4 flex justify-between items-center print:hidden border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-[#50745A]" />
            <span className="text-xs sm:text-sm font-bold tracking-wide uppercase">Official Verified Receipt</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#876A2E] hover:bg-[#725522] text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Printer size={14} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Receipt Content */}
        <div id="printable-receipt" className="p-6 sm:p-10 space-y-6">
          
          {/* Company Branding Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-tr from-[#876A2E] to-[#876A2E] rounded-2xl flex items-center justify-center shadow-md">
                <TrendingUp size={26} className="text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl text-[#081525] tracking-tight">
                  MEHANDA ARMY INVESTMENTS
                </h1>
                <p className="text-xs text-gray-500 font-medium">
                  Disciplined Multi-Asset Advisory & Portfolio Planning
                </p>
                <p className="text-[11px] text-gray-400">
                  Contact: +91 9812947813 | Email: info@mehandaarmy.net
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                ✓ Cryptographically Verified
              </span>
              <p className="text-xs font-mono font-bold text-gray-700 mt-1">
                Receipt #{receipt.receiptNumber}
              </p>
              <p className="text-[11px] text-gray-400">{formattedDate}</p>
            </div>
          </div>

          {/* Verification Stamp Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#50745A] text-white flex items-center justify-center shadow-sm">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#081525]">Service Fee Payment Authenticated</p>
                <p className="text-[11px] text-emerald-800">
                  Verified server-side via HMAC-SHA256 signature protocol.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Mode</span>
              <span className="text-xs font-bold text-gray-800 uppercase">
                {receipt.isLive ? 'Live Production' : 'Sandbox Test Verified'}
              </span>
            </div>
          </div>

          {/* Customer & Transaction Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Billed To (Client Details)
              </span>
              <p className="font-bold text-sm text-gray-900">{receipt.customerName}</p>
              <p className="text-gray-600 flex items-center gap-1.5">
                <Mail size={13} className="text-gray-400" /> {receipt.customerEmail}
              </p>
              <p className="text-gray-600 flex items-center gap-1.5">
                <Phone size={13} className="text-gray-400" /> {receipt.customerPhone}
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5 font-mono text-[11px]">
              <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans tracking-wider">
                Gateway Transaction Credentials
              </span>
              <div className="flex justify-between">
                <span className="text-gray-500">Gateway Order:</span>
                <span className="text-gray-900 font-semibold truncate max-w-[170px]" title={receipt.orderId}>
                  {receipt.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment ID:</span>
                <span className="text-emerald-700 font-bold truncate max-w-[170px]" title={receipt.paymentId}>
                  {receipt.paymentId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-sans">Payment Method:</span>
                <span className="text-gray-900 font-sans font-semibold">
                  {receipt.paymentMethod || 'UPI / NetBanking / Cards'}
                </span>
              </div>
            </div>
          </div>

          {/* Service Line Item Table */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#081525] text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Service Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Fee (INR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3.5">
                    <p className="font-bold text-gray-900">{receipt.serviceName}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Advisory consultation, asset allocation planning & strategic risk analysis.
                    </p>
                  </td>
                  <td className="px-4 py-3.5 text-right font-medium">1</td>
                  <td className="px-4 py-3.5 text-right font-bold text-gray-900">₹{totalAmount.toFixed(2)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 text-xs border-t border-gray-200">
                <tr className="border-t border-gray-300 font-bold text-sm bg-gray-100">
                  <td colSpan="2" className="px-4 py-3 text-right text-[#081525]">Total Amount Paid:</td>
                  <td className="px-4 py-3 text-right text-[#50745A] font-black text-base">₹{totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Statutory Disclaimers */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-[11px] text-amber-950 leading-relaxed">
            <strong>Important Regulatory Notice:</strong> This receipt confirms payment solely for advisory and portfolio blueprinting fees. Mehanda Army Investments does not hold client capital, pooled investment deposits, or guarantee financial returns. All investment assets must be held in client’s own depository/broking accounts subject to SEBI/RBI regulations.
          </div>

          {/* Footer & Digital Stamp */}
          <div className="pt-4 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs text-gray-500">
            <div>
              <p className="font-semibold text-gray-800">Mehanda Army Investments</p>
              <p className="text-[11px]">Advisory services and wealth strategy</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Automated digitally signed receipt. No physical signature required.</p>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-1.5 bg-[#876A2E] hover:bg-[#725522] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

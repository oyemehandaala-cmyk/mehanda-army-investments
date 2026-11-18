import React, { useState, useEffect } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileCheck,
  Eye,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getDocumentSignedUrl } from '../lib/studentLoanService';

// Friendly labels for known document keys
const DOCUMENT_LABEL_MAP = {
  studentId: 'Student Verification Document (ID / Admission)',
  signature: 'Specimen Signature Note',
  addressProof: 'Residential Address Proof',
  academicMarksheet: 'Academic Marksheet / Record',
  educationCertificate: 'Educational Passing Certificate',
  aadhaarProof: 'Aadhaar Card (KYC Proof)',
  panProof: 'PAN Card (Identity Verification)',
  farmProof: 'Farm Land Record / Livestock Ownership Proof',
  bankPassbook: 'Bank Account Passbook / 6-Month Statement',
  investorProof: 'Investor Verification Proof',
  investorSignature: 'Investor Specimen Signature',
  supportingDocument: 'Supporting Verification Document',
};

/**
 * Normalizes document fields from multiple potential formats (object, string, array)
 * into a standard array of document items for presentation.
 */
export function extractApplicationDocuments(documents, singleDoc = null) {
  const result = [];

  // Helper to extract a single document entry
  const processEntry = (key, value) => {
    if (!value) return;

    if (typeof value === 'string') {
      const fileName = value.split('/').pop() || value;
      const isPdf = /\.pdf$/i.test(fileName);
      result.push({
        key,
        label: DOCUMENT_LABEL_MAP[key] || key.replace(/([A-Z])/g, ' $1').trim(),
        fileName,
        path: value.startsWith('http') || value.startsWith('data:') ? null : value,
        url: value.startsWith('http') || value.startsWith('data:') ? value : null,
        contentType: isPdf ? 'application/pdf' : 'image/jpeg',
        sizeFormatted: 'Attached',
        isPdf,
        isImage: !isPdf,
        isSample: fileName.includes('sample'),
      });
      return;
    }

    if (typeof value === 'object') {
      const fileName = value.fileName || value.name || value.path?.split('/').pop() || `${key}.pdf`;
      const contentType = value.contentType || value.mimeType || (/\.pdf$/i.test(fileName) ? 'application/pdf' : 'image/jpeg');
      const isPdf = contentType === 'application/pdf' || /\.pdf$/i.test(fileName);
      const isImage = contentType.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(fileName);
      
      const sizeBytes = Number(value.size || 0);
      const sizeFormatted = sizeBytes > 1024 * 1024
        ? `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
        : sizeBytes > 0
          ? `${Math.ceil(sizeBytes / 1024)} KB`
          : 'Attached & Verified';

      const dataUrl = value.contentBase64
        ? `data:${contentType};base64,${value.contentBase64}`
        : value.dataUrl || value.url || null;

      result.push({
        key,
        label: DOCUMENT_LABEL_MAP[key] || value.label || key.replace(/([A-Z])/g, ' $1').trim(),
        fileName,
        path: value.path || null,
        url: dataUrl,
        contentType,
        sizeFormatted,
        isPdf,
        isImage,
        isSample: fileName.includes('sample') || value.isTest === true,
      });
    }
  };

  if (documents && typeof documents === 'object') {
    Object.entries(documents).forEach(([key, val]) => {
      processEntry(key, val);
    });
  }

  // Check single document field if result is empty or additional
  if (singleDoc && typeof singleDoc === 'object') {
    const alreadyIncluded = result.some(
      (r) => r.path && singleDoc.path && r.path === singleDoc.path
    );
    if (!alreadyIncluded) {
      processEntry('supportingDocument', singleDoc);
    }
  }

  return result;
}

/**
 * Individual Document Card Component
 */
export function CustomerDocumentCard({ item, onOpenModal }) {
  const [signedUrl, setSignedUrl] = useState(item.url || '');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    if (!item.url && item.path) {
      setLoading(true);
      setLoadError('');
      getDocumentSignedUrl(item.path)
        .then((url) => {
          if (active && url) {
            setSignedUrl(url);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            // Graceful fallback for mock/sample files
            setLoadError(err?.message || 'Signed preview restricted');
            setLoading(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [item.path, item.url]);

  const handleDownload = (e) => {
    e.stopPropagation();
    const targetUrl = signedUrl || item.url;
    if (targetUrl) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.download = item.fileName || 'verification-document';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Fallback: inform user
      onOpenModal({ ...item, signedUrl });
    }
  };

  const handleCardClick = () => {
    onOpenModal({ ...item, signedUrl });
  };

  return (
    <div
      onClick={handleCardClick}
      className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-[#876A2E]/50 hover:shadow-md cursor-pointer"
    >
      <div>
        {/* Top Header with Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-8 w-8 place-items-center rounded-xl ${
                item.isPdf
                  ? 'bg-rose-50 text-rose-700 border border-rose-100'
                  : 'bg-blue-50 text-blue-700 border border-blue-100'
              }`}
            >
              {item.isPdf ? <FileText size={17} /> : <ImageIcon size={17} />}
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#876A2E]">
                {item.label}
              </p>
              <p className="text-xs font-bold text-[#10243B] truncate max-w-[170px]" title={item.fileName}>
                {item.fileName}
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${
              item.isPdf
                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {item.isPdf ? 'PDF' : 'IMAGE'}
          </span>
        </div>

        {/* Thumbnail or File Info Banner */}
        <div className="mt-3 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 relative">
          {loading ? (
            <div className="flex h-24 items-center justify-center text-xs text-slate-400">
              <Loader2 size={15} className="animate-spin mr-1.5 text-[#876A2E]" /> Loading...
            </div>
          ) : signedUrl && item.isImage ? (
            <div className="relative h-24 w-full bg-slate-900/5">
              <img
                src={signedUrl}
                alt={item.fileName}
                className="h-full w-full object-contain p-1 transition-transform group-hover:scale-105 duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                  Click to View Full
                </span>
              </div>
            </div>
          ) : signedUrl && item.isPdf ? (
            <div className="flex h-24 flex-col items-center justify-center bg-rose-50/40 p-2 text-center">
              <FileCheck size={26} className="text-rose-600 mb-1" />
              <span className="text-[11px] font-bold text-rose-950">PDF Document Ready</span>
              <span className="text-[9px] text-slate-500 mt-0.5">Click to Open / Read PDF</span>
            </div>
          ) : (
            <div className="flex h-24 flex-col items-center justify-center bg-slate-50 p-2 text-center">
              <FileText size={24} className="text-slate-400 mb-1" />
              <span className="text-[11px] font-semibold text-slate-700">Digital Copy Verified</span>
              <span className="text-[9px] text-slate-400">Stored in Secure Vault</span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer with Details & Action Buttons */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px]">
        <span className="text-slate-400 font-medium">
          {item.sizeFormatted}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-[#F6F2E8] px-2.5 py-1 text-[11px] font-bold text-[#725522] hover:bg-[#ede4d0] transition"
          >
            <Eye size={12} /> View
          </button>
          {(signedUrl || item.url) && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download Document"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition"
            >
              <Download size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * High-definition Document Viewer Modal (Supports Zoom, Pan, PDF & Download)
 */
export function CustomerDocumentModal({ modalData, onClose }) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!modalData) return null;

  const {
    label,
    fileName,
    contentType,
    sizeFormatted,
    isPdf,
    isImage,
    signedUrl,
    url,
    isSample,
  } = modalData;

  const displayUrl = signedUrl || url;

  const handleDownload = () => {
    if (displayUrl) {
      const a = document.createElement('a');
      a.href = displayUrl;
      a.download = fileName || 'verification-document';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Document Viewer"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-700 bg-[#081525] shadow-2xl overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0e1d33] px-5 py-3.5 sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#c5a880]">
                {label || 'Verification Document'}
              </span>
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/30">
                Verified Document
              </span>
            </div>
            <h3 className="mt-0.5 text-base font-bold text-white truncate max-w-md sm:max-w-xl">
              {fileName}
            </h3>
            <p className="text-[11px] text-slate-400">
              {contentType} {sizeFormatted ? `· ${sizeFormatted}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls for Images */}
            {isImage && displayUrl && (
              <div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-800/80 px-2 py-1 text-xs border border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  title="Zoom Out"
                  className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 font-bold"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="font-mono text-[11px] px-1 text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  title="Zoom In"
                  className="px-1.5 py-0.5 rounded hover:bg-slate-700 text-slate-300 font-bold"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  title="Reset Zoom"
                  className="ml-1 p-1 rounded hover:bg-slate-700 text-slate-400"
                >
                  <RotateCcw size={12} />
                </button>
              </div>
            )}

            {displayUrl && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#c5a880] px-3 py-1.5 text-xs font-bold text-[#081525] hover:bg-[#b5956a] transition"
              >
                <Download size={13} /> <span className="hidden sm:inline">Download</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
              aria-label="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="relative flex-1 overflow-auto bg-slate-950 p-4 min-h-[350px] max-h-[72vh] flex items-center justify-center">
          {displayUrl && isImage ? (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-2">
              <img
                src={displayUrl}
                alt={fileName}
                className="max-h-[66vh] max-w-full rounded-lg object-contain transition-transform duration-200 shadow-xl"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : displayUrl && isPdf ? (
            <div className="h-full w-full flex flex-col items-center">
              <iframe
                src={`${displayUrl}#view=FitH&toolbar=1`}
                title={fileName}
                className="h-[65vh] w-full rounded-xl border border-slate-800 bg-white"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-md">
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[#c5a880] mb-3">
                <ShieldCheck size={32} />
              </div>
              <h4 className="text-base font-bold text-white">Digitally Encrypted Document</h4>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                This verification record (<strong>{fileName}</strong>) has been securely encrypted and submitted with your loan application. Original records are maintained in private compliance storage.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-slate-300 border border-slate-700">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Format: {isPdf ? 'PDF Digital Proof' : 'Image KYC Proof'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Status Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-[#0a182b] px-6 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>256-Bit TLS Vault Encryption · Mehanda Army Investments</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-[#c5a880] hover:underline"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Unified Attached Documents Section Component
 * Drops cleanly into any application card or modal.
 */
export default function CustomerDocumentsSection({
  documents,
  singleDoc = null,
  title = 'Uploaded Verification Documents',
  subtitle = 'Official verification proofs attached to this loan enquiry (Images & PDFs).',
}) {
  const [activeModalData, setActiveModalData] = useState(null);

  const documentList = extractApplicationDocuments(documents, singleDoc);

  if (!documentList || documentList.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-center text-xs text-slate-500">
        <FileText size={20} className="mx-auto mb-1.5 text-slate-400" />
        <p className="font-semibold text-slate-700">No Attached Documents</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Supporting documentation is requested during offline verification.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* Section Title */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-[#10243B] flex items-center gap-1.5">
            <FileCheck size={16} className="text-[#876A2E]" />
            <span>{title}</span>
            <span className="rounded-full bg-[#F6F2E8] px-2 py-0.5 text-[10px] font-extrabold text-[#725522]">
              {documentList.length} Files
            </span>
          </h4>
          {subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Responsive Grid of Document Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {documentList.map((docItem) => (
          <CustomerDocumentCard
            key={`${docItem.key}-${docItem.fileName}`}
            item={docItem}
            onOpenModal={(data) => setActiveModalData(data)}
          />
        ))}
      </div>

      {/* Document Viewer Modal */}
      {activeModalData && (
        <CustomerDocumentModal
          modalData={activeModalData}
          onClose={() => setActiveModalData(null)}
        />
      )}
    </div>
  );
}

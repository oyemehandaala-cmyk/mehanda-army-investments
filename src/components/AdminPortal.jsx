import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bold,
  Bot,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Fingerprint,
  Globe,
  GraduationCap,
  Info,
  Italic,
  KeyRound,
  Laptop,
  LayoutDashboard,
  Link,
  List,
  ListOrdered,
  LockKeyhole,
  LockOpen,
  LogOut,
  Mail,
  Maximize2,
  Megaphone,
  Menu,
  MessageSquare,
  Milk,
  Monitor,
  MoreHorizontal,
  Phone,
  PhoneCall,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  Server,
  Settings,
  ShieldCheck,
  Sliders,
  Smartphone,
  Sparkles,
  Sprout,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  UserCheck,
  Users,
  UserX,
  Wheat,
  X,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import LiveDateTime from './LiveDateTime';
import DarkSilkWaveBackground from './DarkSilkWaveBackground';
import {
  adminLogin,
  adminLogout,
  fetchAdminData,
  getAdminSession,
  updateAdminPassword,
  updateAdminProfile,
  authenticateWithPasskey,
  registerPasskeyDevice,
  listPasskeyDevices,
  deletePasskeyDevice,
  fetchAdminSecurityData,
  unlockSecurityTarget,
  submitEmergencyRecoveryUnlock,
  verifyMasterPin,
  enrollFirstTimePasskey,
  emergencyRecoveryEnrollment,
} from '../lib/paymentService';
import {
  APPLICATION_STATUS,
  getStudentLoanTestApplications,
  updateStudentLoanStatus,
  getDocumentSignedUrl,
} from '../lib/studentLoanService';
import { updateFarmLoanStatus } from '../lib/loanService';
import {
  updateInvestmentEnquiryStatus,
  INVESTMENT_ENQUIRY_STATUSES,
} from '../lib/investmentEnquiryService';
import {
  fetchAnnouncementHistory,
  fetchEligibleCustomerStats,
  uploadAnnouncementImage,
  sendAnnouncement,
  sendTestAnnouncement,
} from '../lib/announcementService';
import BrandVerificationBadge from './BrandVerificationBadge';
import { getApiUrl } from '../lib/apiConfig';

// ==========================================
// CONSTANTS & HELPERS
// ==========================================

const TABS = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'submissions', label: 'All Applications', icon: FileText },
  { id: 'announcements', label: 'Email Announcement Center', icon: Megaphone },
  { id: 'loans', label: 'Loan Applications (4 Categories)', icon: GraduationCap },
  { id: 'investments', label: 'Investment Applications', icon: TrendingUp },
  { id: 'contact', label: 'Service / Contact Applications', icon: PhoneCall },
  { id: 'customers', label: 'Registered Customers', icon: Users },
  { id: 'payments', label: 'Service Fees', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security Shield & Locks', icon: ShieldCheck, ownerOnly: true },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ENQUIRY_STATUSES = [
  APPLICATION_STATUS.SUBMITTED,
  APPLICATION_STATUS.UNDER_REVIEW,
  APPLICATION_STATUS.ADDITIONAL_INFORMATION_REQUIRED,
  APPLICATION_STATUS.ENQUIRY_COMPLETED,
  APPLICATION_STATUS.CLOSED,
  APPLICATION_STATUS.COMPLETED,
  APPLICATION_STATUS.VERIFICATION_PENDING,
  APPLICATION_STATUS.ON_HOLD,
  APPLICATION_STATUS.REJECTED,
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatShortDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

function EmptyState({ title = 'No records found', message = 'No data available to display.', icon: Icon = FileText }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-12 w-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
        <Icon size={22} />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const norm = (status || '').toLowerCase().trim();

  if (norm.includes('completed') || norm.includes('approved') || norm.includes('verified')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30 shadow-xs shadow-emerald-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
        {status}
      </span>
    );
  }
  if (norm.includes('review') || norm.includes('pending') || norm.includes('hold')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30 shadow-xs shadow-amber-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]" />
        {status}
      </span>
    );
  }
  if (norm.includes('reject') || norm.includes('closed') || norm.includes('cancel')) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300 border border-rose-500/30 shadow-xs shadow-rose-500/10">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f87171]" />
        {status}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-bold text-blue-300 border border-blue-500/30 shadow-xs shadow-blue-500/10">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa]" />
      {status || 'Submitted'}
    </span>
  );
}

function ApplicationTypeBadge({ type, label }) {
  const t = (type || '').toLowerCase();
  if (t === 'dairy_loan' || t.includes('dairy')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-500/15 px-2.5 py-0.5 text-xs font-bold text-sky-300 border border-sky-500/30 shadow-xs">
        <Milk size={12} className="text-sky-400" />
        {label || 'Dairy Loan'}
      </span>
    );
  }
  if (t === 'sheep_loan' || t.includes('sheep')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 shadow-xs">
        <Wheat size={12} className="text-emerald-400" />
        {label || 'Sheep Loan'}
      </span>
    );
  }
  if (t === 'goat_loan' || t.includes('goat')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30 shadow-xs">
        <Sprout size={12} className="text-amber-400" />
        {label || 'Goat Loan'}
      </span>
    );
  }
  if (t === 'student_loan' || t.includes('student') || t.includes('loan')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/30 shadow-xs">
        <GraduationCap size={12} className="text-purple-400" />
        {label || 'Student Loan'}
      </span>
    );
  }
  if (t === 'investment' || t.includes('invest')) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-300 border border-indigo-500/30 shadow-xs">
        <TrendingUp size={12} className="text-indigo-400" />
        {label || 'Investment'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-2.5 py-0.5 text-xs font-bold text-slate-300 border border-slate-500/30 shadow-xs">
      <PhoneCall size={12} className="text-slate-400" />
      {label || 'Service / Contact'}
    </span>
  );
}

function Avatar({ name, email, avatarUrl, size = 'md' }) {
  const initials = useMemo(() => {
    if (!name && !email) return 'U';
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  }, [name, email]);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-9 w-9 text-xs',
    lg: 'h-11 w-11 text-sm',
    xl: 'h-20 w-20 text-2xl',
  }[size] || 'h-9 w-9 text-xs';

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        className={`rounded-full object-cover shrink-0 border border-slate-200 shadow-xs ${sizeClasses}`}
      />
    );
  }

  return (
    <div className={`flex items-center justify-center rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 font-bold text-white shadow-xs shrink-0 ${sizeClasses}`}>
      {initials}
    </div>
  );
}

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('[AdminPortal Error]', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center text-slate-800 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Admin Panel Notice</h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 transition"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// DOCUMENT PREVIEW & VIEWER MODALS
// ==========================================

function DocumentPreviewCard({ doc, label, onOpenModal }) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);

  const isImage = doc?.contentType?.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(doc?.fileName || doc?.path || '');
  const isPdf = doc?.contentType === 'application/pdf' || /\.pdf$/i.test(doc?.fileName || doc?.path || '');

  useEffect(() => {
    let active = true;
    if (doc?.path) {
      setLoading(true);
      setError('');
      getDocumentSignedUrl(doc.path)
        .then((url) => {
          if (active) {
            setSignedUrl(url);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err.message || 'Preview unavailable');
            setLoading(false);
          }
        });
    }
    return () => { active = false; };
  }, [doc?.path]);

  const handleZoomIn = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.min(z + 0.25, 3));
  };
  const handleZoomOut = (e) => {
    e.stopPropagation();
    setZoom((z) => Math.max(z - 0.25, 0.5));
  };
  const handleResetZoom = (e) => {
    e.stopPropagation();
    setZoom(1);
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (signedUrl) {
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = doc.fileName || 'document';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const sizeFormatted = (doc.size || 0) > 1024 * 1024
    ? `${((doc.size || 0) / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.ceil((doc.size || 0) / 1024)} KB`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block truncate">
            {label || 'Verification Document'}
          </span>
          <p className="text-xs font-semibold text-slate-800 truncate" title={doc.fileName}>
            {doc.fileName || 'document'}
          </p>
          <span className="text-[10px] text-slate-500">
            {doc.contentType || 'file'} · {sizeFormatted}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {signedUrl && (
            <button
              type="button"
              onClick={handleDownload}
              title="Download Document"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            >
              <Download size={14} />
            </button>
          )}
          {signedUrl && (
            <button
              type="button"
              onClick={() => onOpenModal({ doc, signedUrl, label, isImage, isPdf })}
              title="Full Preview Modal"
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-300 border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950 transition"
            >
              <Maximize2 size={11} /> Full View
            </button>
          )}
        </div>
      </div>

      <div className="mt-2.5">
        {loading && (
          <div className="flex h-36 items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-500">
            <RefreshCw size={14} className="animate-spin mr-2 text-purple-600" /> Loading preview...
          </div>
        )}
        {error && (
          <div className="flex h-24 items-center justify-center rounded-lg bg-amber-50 p-2 text-center text-xs text-amber-700">
            <AlertCircle size={14} className="mr-1.5 shrink-0" /> {error}
          </div>
        )}
        {!loading && !error && signedUrl && (
          <>
            {isImage && (
              <div className="relative overflow-hidden rounded-lg bg-slate-900 border border-slate-200">
                <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 backdrop-blur-sm text-[10px] text-white shadow-xs">
                  <button type="button" onClick={handleZoomOut} className="hover:text-purple-300 px-1 font-bold" title="Zoom Out">-</button>
                  <span className="font-mono text-[9px]">{Math.round(zoom * 100)}%</span>
                  <button type="button" onClick={handleZoomIn} className="hover:text-purple-300 px-1 font-bold" title="Zoom In">+</button>
                  <button type="button" onClick={handleResetZoom} className="hover:text-purple-300 px-1 text-[9px]" title="Reset">Reset</button>
                </div>
                <div
                  className="flex h-44 items-center justify-center overflow-auto cursor-pointer p-1"
                  onClick={() => onOpenModal({ doc, signedUrl, label, isImage, isPdf })}
                  title="Click to view full image in modal"
                >
                  <img
                    src={signedUrl}
                    alt={doc.fileName}
                    className="max-h-full object-contain transition-transform duration-150 rounded"
                    style={{ transform: `scale(${zoom})` }}
                  />
                </div>
              </div>
            )}
            {isPdf && (
              <div className="overflow-hidden rounded-lg bg-slate-50 border border-slate-200">
                <iframe
                  src={`${signedUrl}#view=FitH&toolbar=0`}
                  title={doc.fileName}
                  className="h-44 w-full border-0 rounded-lg bg-white"
                />
                <div className="mt-1 flex items-center justify-between px-2 py-1 text-[11px] text-slate-500">
                  <span>PDF Document Preview</span>
                  <button
                    type="button"
                    onClick={() => onOpenModal({ doc, signedUrl, label, isImage, isPdf })}
                    className="text-purple-600 hover:text-purple-800 font-semibold"
                  >
                    Open PDF in Full Viewer
                  </button>
                </div>
              </div>
            )}
            {!isImage && !isPdf && (
              <div className="flex h-24 items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-600" />
                  <span className="truncate max-w-[150px] font-medium text-slate-700">{doc.fileName}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition"
                >
                  Download
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DocumentViewerModal({ previewData, onClose }) {
  const [modalZoom, setModalZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!previewData) return null;
  const { doc, signedUrl, label, isImage, isPdf } = previewData;

  const handleDownload = () => {
    if (signedUrl) {
      const a = document.createElement('a');
      a.href = signedUrl;
      a.download = doc.fileName || 'document';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">
              {label || 'Verification Document Preview'}
            </span>
            <h3 className="text-base font-bold text-slate-900 truncate max-w-lg">{doc?.fileName}</h3>
            <p className="text-xs text-slate-500">
              {doc?.contentType} · {doc?.size ? (doc.size > 1024 * 1024 ? `${(doc.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.ceil(doc.size / 1024)} KB`) : ''}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isImage && (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-xs">
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.max(z - 0.25, 0.25))}
                  className="rounded px-2 py-0.5 hover:bg-slate-100 font-bold"
                  title="Zoom Out"
                >
                  -
                </button>
                <span className="min-w-[44px] text-center font-mono text-xs">{Math.round(modalZoom * 100)}%</span>
                <button
                  type="button"
                  onClick={() => setModalZoom((z) => Math.min(z + 0.25, 4))}
                  className="rounded px-2 py-0.5 hover:bg-slate-100 font-bold"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => { setModalZoom(1); setRotation(0); }}
                  className="rounded px-2 py-0.5 text-slate-500 hover:bg-slate-100 text-xs"
                  title="Reset Zoom & Rotation"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-slate-600 hover:bg-slate-100 text-xs"
                  title="Rotate 90°"
                >
                  <RotateCw size={12} /> Rotate
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition"
            >
              <Download size={14} /> Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-900/95 p-6 flex items-center justify-center">
          {isImage && (
            <div className="flex min-h-full min-w-full items-center justify-center p-4">
              <img
                src={signedUrl}
                alt={doc?.fileName}
                className="max-h-[75vh] max-w-full object-contain transition-transform duration-150 shadow-2xl rounded-lg"
                style={{
                  transform: `scale(${modalZoom}) rotate(${rotation}deg)`,
                }}
              />
            </div>
          )}
          {isPdf && (
            <iframe
              src={`${signedUrl}#view=FitH&toolbar=1`}
              title={doc?.fileName}
              className="h-full w-full rounded-xl border border-slate-700 bg-white"
            />
          )}
          {!isImage && !isPdf && (
            <div className="text-center text-white space-y-3">
              <FileText size={48} className="mx-auto text-purple-400" />
              <p className="text-sm font-semibold">{doc?.fileName}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700"
              >
                Download Document to View
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPREHENSIVE APPLICATION DETAIL MODAL
// ==========================================

function ApplicationDetailModal({ app, onClose, onOpenDocModal, onStatusChange, isBusy }) {
  const [remarkText, setRemarkText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(app?.status || 'Submitted');
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [userVaultFiles, setUserVaultFiles] = useState([]);

  const raw = app?.rawRecord || app || {};
  const isFarmLoan = app?.formType === 'dairy_loan' || app?.formType === 'sheep_loan' || app?.formType === 'goat_loan' || app?.loanCategory === 'dairy_loan' || app?.loanCategory === 'sheep_loan' || app?.loanCategory === 'goat_loan' || Boolean(raw.loan_category);
  const isStudentLoan = app?.formType === 'student_loan' || app?.refNumber || app?.trackingId?.startsWith('MAI-SL') || raw.tracking_id?.startsWith('MAI-SL');
  const isLoan = isStudentLoan || isFarmLoan;
  const isInvestment = app?.formType === 'investment' || raw.interestCategory || raw.interest_category;
  const appId = app?.trackingId || app?.refNumber || raw.tracking_id || raw.reference || raw.id || app?.id;
  const customerEmail = app?.verifiedEmail || app?.applicantEmail || raw.verified_email || raw.email || '';

  const fetchNotificationHistory = useCallback(async () => {
    if (!appId) return;
    setNotificationLoading(true);
    try {
      const res = await fetch(`/api/admin-notification?applicationId=${encodeURIComponent(appId)}`, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.history)) {
          setNotificationHistory(data.history);
        }
      }
    } catch (_) {}
    finally {
      setNotificationLoading(false);
    }
  }, [appId]);

  useEffect(() => {
    setSelectedStatus(app?.status || 'Submitted');
    setNotificationMsg(null);
    fetchNotificationHistory();
  }, [app, fetchNotificationHistory]);

  useEffect(() => {
    const targetUid = raw.user_id || app.userId || raw.userId;
    if (targetUid) {
      fetch(`/api/student-loan-documents?userId=${encodeURIComponent(targetUid)}`, {
        credentials: 'same-origin',
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.files)) {
            setUserVaultFiles(data.files);
          }
        })
        .catch(() => {});
    }
  }, [raw.user_id, app.userId, raw.userId]);

  if (!app) return null;

  const docs = [];
  const appDocs = app.documents || raw.documents || (() => {
    if (typeof raw.enquiry_purpose === 'string' && raw.enquiry_purpose.startsWith('{')) {
      try {
        return JSON.parse(raw.enquiry_purpose).documents || null;
      } catch {
        return null;
      }
    }
    return null;
  })();

  const pushDoc = (label, docVal) => {
    if (!docVal) return;
    const docObj = typeof docVal === 'string'
      ? {
          fileName: docVal.split('/').pop() || docVal,
          path: docVal.startsWith('http') || docVal.startsWith('data:') ? null : docVal,
          url: docVal.startsWith('http') || docVal.startsWith('data:') ? docVal : null,
          contentType: /\.pdf$/i.test(docVal) ? 'application/pdf' : 'image/jpeg',
          size: 0,
        }
      : {
          fileName: docVal.fileName || docVal.name || 'document',
          path: docVal.path || null,
          url: docVal.url || null,
          contentType: docVal.contentType || docVal.mimeType || (/\.pdf$/i.test(docVal.fileName || '') ? 'application/pdf' : 'image/jpeg'),
          size: docVal.size || 0,
        };

    const alreadyAdded = docs.some(
      (d) => (d.doc.path && docObj.path && d.doc.path === docObj.path) ||
             (d.doc.fileName && docObj.fileName && d.doc.fileName === docObj.fileName)
    );
    if (!alreadyAdded) {
      docs.push({ label, doc: docObj });
    }
  };

  if (appDocs && typeof appDocs === 'object') {
    if (appDocs.studentId) pushDoc('Student Verification Document', appDocs.studentId);
    if (appDocs.signature) pushDoc('Student Specimen Signature Note', appDocs.signature);
    if (appDocs.addressProof) pushDoc('Residential Address Proof', appDocs.addressProof);
    if (appDocs.academicMarksheet) pushDoc('Academic Marksheet / Certificate', appDocs.academicMarksheet);
    if (appDocs.educationCertificate && !appDocs.academicMarksheet) {
      pushDoc('Academic Marksheet / Certificate', appDocs.educationCertificate);
    }
    // Farm loan documents
    if (appDocs.aadhaarProof) pushDoc('Aadhaar Card (KYC Proof)', appDocs.aadhaarProof);
    if (appDocs.panProof) pushDoc('PAN Card (Identity Verification)', appDocs.panProof);
    if (appDocs.farmProof) pushDoc('Farm Land Record / Livestock Ownership Proof', appDocs.farmProof);
    if (appDocs.bankPassbook) pushDoc('Bank Account Passbook / Statement', appDocs.bankPassbook);
    // Investor documents
    if (appDocs.investorProof) pushDoc('Investor Verification Document', appDocs.investorProof);
    if (appDocs.investorSignature) pushDoc('Investor Specimen Signature', appDocs.investorSignature);

    // Any other custom keys in appDocs
    Object.entries(appDocs).forEach(([k, v]) => {
      if (!['studentId', 'signature', 'addressProof', 'academicMarksheet', 'educationCertificate', 'aadhaarProof', 'panProof', 'farmProof', 'bankPassbook', 'investorProof', 'investorSignature'].includes(k)) {
        pushDoc(k.replace(/([A-Z])/g, ' $1').trim(), v);
      }
    });
  }

  // Supporting document from test_document_path / documentMetadata
  const docMeta = app.documentMetadata || raw.documentMetadata || (raw.test_document_path ? {
    path: raw.test_document_path,
    fileName: raw.test_document_name || 'Verification-Document.jpg',
    contentType: raw.test_document_type || 'image/jpeg',
    size: raw.test_document_size || 0,
  } : null);

  if (docMeta) {
    pushDoc('Supporting Verification Document', docMeta);
  }

  // Files discovered from the user's private storage vault
  if (Array.isArray(userVaultFiles) && userVaultFiles.length > 0) {
    userVaultFiles.forEach((vf, idx) => {
      pushDoc(`Storage Vault Document ${idx + 1}`, vf);
    });
  }

  const handleSave = async () => {
    if (!onStatusChange) return;
    setNotificationMsg({ type: 'info', text: 'Saving status in Supabase and sending email notification...' });
    try {
      const res = await onStatusChange(app, selectedStatus, {
        customerRemark: remarkText,
        internalNote: internalNoteText,
      });

      const notif = res?.emailNotification || res?.application?.emailNotification;
      if (notif) {
        if (notif.deliveryStatus === 'sent') {
          setNotificationMsg({
            type: 'success',
            text: `✓ Status updated to "${selectedStatus}"! Notification email sent to ${notif.recipient || customerEmail}.`,
          });
        } else if (notif.deliveryStatus === 'skipped') {
          setNotificationMsg({
            type: 'info',
            text: `✓ Status updated to "${selectedStatus}" (${notif.reason || 'Email skipped'}).`,
          });
        } else {
          setNotificationMsg({
            type: 'error',
            text: `Status saved in database, but email delivery failed (${notif.errorMessage || 'SMTP/Resend error'}). You can retry below.`,
          });
        }
      } else {
        setNotificationMsg({
          type: 'success',
          text: `✓ Status successfully updated to "${selectedStatus}".`,
        });
      }
      fetchNotificationHistory();
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: `Error updating status: ${err.message || 'Unknown error'}`,
      });
    }
  };

  const handleResendNotification = async (notifId = null) => {
    setResendingId(notifId || 'all');
    try {
      const res = await fetch(getApiUrl('/api/admin-notification'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          applicationId: appId,
          notificationId: notifId,
          status: selectedStatus,
          customerRemark: remarkText,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch notification email');
      }
      setNotificationMsg({
        type: 'success',
        text: `✓ Status notification email delivered to ${data.recipient || customerEmail}!`,
      });
      fetchNotificationHistory();
    } catch (err) {
      setNotificationMsg({
        type: 'error',
        text: `Resend failed: ${err.message}`,
      });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <ApplicationTypeBadge
                type={app.formType || (isLoan ? 'student_loan' : isInvestment ? 'investment' : 'contact')}
                label={app.formTypeLabel || (isLoan ? 'Student Loan Application' : isInvestment ? 'Investment Application' : 'Application Details')}
              />
              <StatusBadge status={app.status || 'Submitted'} />
            </div>
            <h2 className="mt-1.5 text-lg font-bold text-slate-900 truncate">
              {app.customerName || app.applicantName || raw.full_name || 'Applicant'} · <span className="font-mono text-sm text-amber-400 font-bold">{app.trackingRef || app.trackingId || app.id}</span>
            </h2>
            <p className="text-xs text-slate-500">
              Submitted: {formatDate(app.createdAt || app.submittedAt)} · Last updated: {formatDate(app.updatedAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Top Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Customer Details */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">Customer Details</span>
              <p className="font-bold text-slate-900 text-sm">{app.customerName || app.applicantName || raw.full_name}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-xs text-slate-600">{app.verifiedEmail || app.email || app.applicantEmail || raw.email}</p>
                {(app.isEmailVerified || app.emailVerifiedAt || raw.email_verified_at || raw.verified_email) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={10} className="text-emerald-600" />
                    Gmail Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    Unverified
                  </span>
                )}
              </div>
              {(app.emailVerifiedAt || raw.email_verified_at) && (
                <p className="text-[10px] text-emerald-600 font-medium">
                  OTP Verified: {new Date(app.emailVerifiedAt || raw.email_verified_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              )}
              <p className="text-xs text-slate-600">{app.phone || app.applicantPhone || raw.phone}</p>
              {(raw.applicant_dob || raw.dateOfBirth) && (
                <p className="text-xs text-slate-500">DOB: {raw.applicant_dob || raw.dateOfBirth} ({raw.applicant_age || raw.age} yrs)</p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {[raw.applicant_address || raw.address, raw.applicant_city || raw.city, raw.applicant_district || raw.district, raw.applicant_state || raw.state, raw.pin_code || raw.pinCode].filter(Boolean).join(', ') || 'Address not recorded'}
              </p>
              {raw.isMinor && (
                <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                  <span className="font-bold block">Guardian Assistance:</span>
                  {raw.guardianName || raw.guardian_name} ({raw.guardianRelationship || raw.guardian_relationship}) · {raw.guardianPhone || raw.guardian_phone}
                </div>
              )}
            </div>

            {/* Application / Academic / Loan Info */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                {isFarmLoan ? 'Agriculture Loan & Farm Details' : isStudentLoan ? 'Student Loan & Academic Details' : 'Application Parameters'}
              </span>
              {isFarmLoan && (
                <>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Requested Amount:</span>
                    <span className="text-base font-extrabold text-amber-400">
                      ₹{Number(app.loanAmount || raw.loan_amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs"><strong className="text-slate-600">Category:</strong> {app.categoryLabel || raw.loan_category?.replace('_', ' ').toUpperCase()}</p>
                  <p className="text-xs"><strong className="text-slate-600">Stated Purpose:</strong> {raw.loan_purpose || app.loanPurpose || 'Agricultural / Livestock Farming'}</p>
                  {raw.aadhaar_number && <p className="text-xs"><strong className="text-slate-600">Aadhaar (Masked):</strong> <span className="font-mono">{raw.aadhaar_number}</span></p>}
                  {raw.pan_number && <p className="text-xs"><strong className="text-slate-600">PAN:</strong> <span className="font-mono font-bold text-slate-800">{raw.pan_number}</span></p>}
                  {raw.voter_id_number && <p className="text-xs"><strong className="text-slate-600">Voter ID:</strong> <span className="font-mono">{raw.voter_id_number}</span></p>}
                  {raw.farming_details && (
                    <div className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 border border-slate-200 space-y-1">
                      <span className="font-bold block text-slate-800">Farming Specifications:</span>
                      {raw.farming_details.currentLivestockCount !== undefined && <p>Owned Animals: {raw.farming_details.currentLivestockCount}</p>}
                      {raw.farming_details.proposedLivestockCount !== undefined && <p>Proposed Animals: {raw.farming_details.proposedLivestockCount}</p>}
                      {raw.farming_details.landArea && <p>Land Area: {raw.farming_details.landArea} ({raw.farming_details.landOwnership || 'Owned'})</p>}
                      {raw.farming_details.dailyMilkYieldLiters && <p>Daily Milk Yield: {raw.farming_details.dailyMilkYieldLiters} L/day</p>}
                      {raw.farming_details.milkBuyerOrCooperative && <p>Milk Buyer: {raw.farming_details.milkBuyerOrCooperative}</p>}
                    </div>
                  )}
                </>
              )}
              {isStudentLoan && !isFarmLoan && (
                <>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <span className="text-xs text-slate-500">Requested Amount:</span>
                    <span className="text-base font-extrabold text-amber-400">
                      ₹{Number(app.loanAmount || raw.loan_amount || 1000).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-xs"><strong className="text-slate-600">Institution:</strong> {raw.institutionName || raw.school_name || raw.schoolName || 'Not specified'}</p>
                  <p className="text-xs"><strong className="text-slate-600">Course / Stream:</strong> {raw.courseName || raw.course_name || 'Not specified'}</p>
                  {raw.qualification && <p className="text-xs"><strong className="text-slate-600">Qualification:</strong> {raw.qualification} {raw.passingYear ? `(${raw.passingYear})` : ''}</p>}
                  {(raw.upiUtr || app.upiUtr) && (
                    <div className="mt-2 rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-900 border border-emerald-200">
                      <div className="flex items-center justify-between font-bold text-emerald-800">
                        <span>Platform Fee: ₹2.00 Paid</span>
                        <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-mono">PhonePe QR</span>
                      </div>
                      <p className="mt-1 font-mono font-bold text-xs text-emerald-950">
                        UTR: {raw.upiUtr || app.upiUtr}
                      </p>
                      <p className="text-[10px] text-emerald-700 mt-0.5">
                        Beneficiary: DEEPAK DEEPAK
                      </p>
                    </div>
                  )}
                </>
              )}
              {isInvestment && (
                <>
                  <p className="text-xs"><strong className="text-slate-600">Category:</strong> {raw.interestCategory || 'General'}</p>
                  <p className="text-xs"><strong className="text-slate-600">Objective:</strong> {raw.investmentObjective || 'Not specified'}</p>
                  <p className="text-xs"><strong className="text-slate-600">Amount:</strong> {raw.plannedAmount || 'Not specified'}</p>
                  <p className="text-xs"><strong className="text-slate-600">Horizon:</strong> {raw.horizon || 'Not specified'}</p>
                  <p className="text-xs"><strong className="text-slate-600">Risk Profile:</strong> {raw.riskUnderstanding || 'Moderate'}</p>
                </>
              )}
              {raw.message && (
                <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-700 border border-slate-200">
                  <span className="font-bold block text-slate-600">Applicant Message:</span>
                  <p className="mt-0.5 line-clamp-3">{raw.message}</p>
                </div>
              )}
            </div>

            {/* Status Management */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block">Status &amp; Notification</span>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Workflow Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 focus:border-purple-600 focus:outline-none"
                >
                  {ENQUIRY_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={remarkText}
                onChange={(e) => setRemarkText(e.target.value)}
                placeholder="Customer-facing remark (included in notification email)..."
                maxLength={1000}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-none"
                rows={2}
              />
              <textarea
                value={internalNoteText}
                onChange={(e) => setInternalNoteText(e.target.value)}
                placeholder="Internal staff note (admin view only)..."
                maxLength={2000}
                className="w-full rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-purple-600 focus:outline-none"
                rows={2}
              />

              {notificationMsg && (
                <div
                  className={`rounded-lg p-2.5 text-xs font-medium ${
                    notificationMsg.type === 'success'
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : notificationMsg.type === 'error'
                        ? 'border border-rose-200 bg-rose-50 text-rose-800'
                        : 'border border-blue-200 bg-blue-50 text-blue-800'
                  }`}
                >
                  {notificationMsg.text}
                </div>
              )}

              <button
                type="button"
                disabled={isBusy}
                onClick={handleSave}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 text-xs font-black text-slate-950 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/25"
              >
                {isBusy ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" /> Saving &amp; Notifying...
                  </>
                ) : (
                  <>
                    <Send size={13} /> Save Status &amp; Dispatch Email
                  </>
                )}
              </button>
            </div>
          </div>

          {/* VERIFICATION DOCUMENTS SECTION */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <FileCheck size={16} className="text-purple-600" />
                  Uploaded Verification Documents ({docs.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Actual customer-uploaded documents stored in secure private Supabase Storage.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold">
                Signed Access
              </span>
            </div>

            {docs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-xs text-slate-500">
                No verification documents attached to this submission.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {docs.map((item, index) => (
                  <DocumentPreviewCard
                    key={`${item.doc.path || item.doc.fileName}-${index}`}
                    doc={item.doc}
                    label={item.label}
                    onOpenModal={onOpenDocModal}
                  />
                ))}
              </div>
            )}

            {/* Verification Checklist Overview for Student Loans */}
            {isStudentLoan && (
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 text-xs text-slate-700">
                <p className="font-bold text-slate-900 text-xs mb-2">Student Verification Mandatory Checklist:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { key: 'studentId', label: '1. Student Verification Document (ID / Admission)', isPresent: docs.some((d) => d.label.includes('Student Verification') || d.label.includes('Supporting')) },
                    { key: 'signature', label: '2. Student Specimen Signature Note', isPresent: docs.some((d) => d.label.includes('Signature')) },
                    { key: 'addressProof', label: '3. Residential Address Proof', isPresent: docs.some((d) => d.label.includes('Address Proof')) },
                    { key: 'academicMarksheet', label: '4. Academic Marksheet / Certificate', isPresent: docs.some((d) => d.label.includes('Academic') || d.label.includes('Certificate')) },
                  ].map((req) => (
                    <div
                      key={req.key}
                      className={`p-2 rounded-lg border text-[11px] flex items-center justify-between gap-1.5 ${
                        req.isPresent
                          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900 font-semibold'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`h-2 w-2 rounded-full shrink-0 ${req.isPresent ? 'bg-emerald-600' : 'bg-amber-500'}`} />
                        <span className="truncate">{req.label}</span>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold">
                        {req.isPresent ? 'Attached' : 'Pending Physical KYC'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* AUTOMATIC EMAIL NOTIFICATION HISTORY & AUDIT */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Mail size={16} className="text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Automatic Email Notifications &amp; Delivery Audit</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchNotificationHistory}
                  disabled={notificationLoading}
                  className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 flex items-center gap-1 transition"
                >
                  <RefreshCw size={11} className={notificationLoading ? 'animate-spin' : ''} /> Refresh
                </button>
                <button
                  type="button"
                  onClick={() => handleResendNotification()}
                  disabled={resendingId !== null}
                  className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50 transition"
                >
                  <Send size={11} /> Resend Notification
                </button>
              </div>
            </div>

            {notificationLoading && notificationHistory.length === 0 && (
              <p className="text-xs text-slate-500 py-3 text-center">Loading notification dispatch audit...</p>
            )}

            {!notificationLoading && notificationHistory.length === 0 && (
              <p className="text-xs text-slate-500 py-3 text-center">
                No status email dispatches logged yet for this application reference.
              </p>
            )}

            {notificationHistory.length > 0 && (
              <div className="divide-y divide-slate-100">
                {notificationHistory.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2 w-2 rounded-full ${item.status === 'sent' ? 'bg-emerald-500' : item.status === 'failed' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                        <span className="font-semibold text-slate-800">{item.subject || 'Application Status Update'}</span>
                        <span className="text-slate-500">to {item.recipient}</span>
                      </div>
                      {item.error_message && (
                        <p className="text-[11px] text-rose-600 mt-0.5">{item.error_message}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-500">{formatDate(item.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DELETE CONFIRMATION MODAL
// ==========================================

function DeleteConfirmationModal({ app, onClose, onConfirm, isBusy }) {
  if (!app) return null;
  const appId = app.trackingRef || app.trackingId || app.refNumber || app.id;
  const customerName = app.customerName || app.applicantName || 'Customer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-4">
          <AlertTriangle size={24} />
        </div>
        <h3 className="text-center text-lg font-bold text-slate-900">Delete / Archive Application</h3>
        <p className="mt-2 text-center text-xs text-slate-600 leading-relaxed">
          Are you sure you want to remove application <strong className="text-slate-900 font-mono">{appId}</strong> belonging to <strong className="text-slate-900">{customerName}</strong>?
        </p>
        <p className="mt-1 text-center text-[11px] text-slate-500">
          This record will be permanently marked as closed and archived from active admin review.
        </p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(app)}
            disabled={isBusy}
            className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-xs"
          >
            {isBusy ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// EMAIL ANNOUNCEMENT CENTER COMPONENT
// ==========================================

function EmailAnnouncementCenter({ setActionToast, adminEmail, dashboard: dashboardProp, overviewStats: overviewProp }) {
  const dashboard = dashboardProp || {};
  const overviewStats = overviewProp || {};
  const [subTab, setSubTab] = useState('compose'); // 'compose' | 'history'

  // Composer State
  const [recipientType, setRecipientType] = useState('individual'); // 'individual' | 'multiple' | 'all_customers'
  const [individualEmail, setIndividualEmail] = useState('');
  const [multipleEmails, setMultipleEmails] = useState('');
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [includeCta, setIncludeCta] = useState(false);
  const [ctaText, setCtaText] = useState('Explore Investment Plans');
  const [ctaUrl, setCtaUrl] = useState('https://mehandaarmy.net');

  // Image & Placement State
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [imagePosition, setImagePosition] = useState('top'); // 'top' | 'middle' | 'bottom'
  const [uploadingImage, setUploadingImage] = useState(false);

  // Eligible customer count & History
  const [customerStats, setCustomerStats] = useState({ eligibleCount: 0, unsubscribedCount: 0, loading: false });
  const [historyList, setHistoryList] = useState(() => {
    try {
      const saved = localStorage.getItem('mai_sent_email_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const recordSentHistory = useCallback((record) => {
    if (!record?.id) return;
    setHistoryList((prev) => {
      const filtered = prev.filter((item) => item.id !== record.id);
      const updated = [record, ...filtered].slice(0, 100);
      try {
        localStorage.setItem('mai_sent_email_history', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // Modals & Actions
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(adminEmail || 'info@mehandaarmy.net');
  const [sendingTest, setSendingTest] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [sendResultSummary, setSendResultSummary] = useState(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('mai_announcement_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        if (draft.subject) setSubject(draft.subject);
        if (draft.title) setTitle(draft.title);
        if (draft.message) setMessage(draft.message);
        if (draft.recipientType) setRecipientType(draft.recipientType);
        if (draft.individualEmail) setIndividualEmail(draft.individualEmail);
        if (draft.multipleEmails) setMultipleEmails(draft.multipleEmails);
        if (draft.imageUrl && !draft.imageUrl.includes('profile-photos/announcements')) {
          setImageUrl(draft.imageUrl);
        }
        if (draft.imageName) setImageName(draft.imageName);
        if (draft.imagePosition) setImagePosition(draft.imagePosition);
        if (draft.includeCta !== undefined) setIncludeCta(draft.includeCta);
        if (draft.ctaText) setCtaText(draft.ctaText);
        if (draft.ctaUrl) setCtaUrl(draft.ctaUrl);
      }
    } catch {
      // Ignore JSON parse errors
    }
  }, []);

  // Fetch eligible customer count
  const loadCustomerStats = useCallback(async () => {
    setCustomerStats((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetchEligibleCustomerStats();
      const eligible = res?.eligibleCount ?? res?.count ?? res?.data?.eligibleCount ?? res?.data?.count ?? 0;
      const unsubs = res?.unsubscribedCount ?? res?.data?.unsubscribedCount ?? 0;

      let finalCount = eligible;
      // If server returned 0, also combine with loaded dashboard customers
      if (finalCount === 0) {
        const localSet = new Set();
        if (Array.isArray(dashboard?.customers)) {
          (dashboard?.customers || []).forEach((c) => { if (c?.email) localSet.add(c.email.trim().toLowerCase()); });
        }
        if (Array.isArray(dashboard?.allSubmissions)) {
          (dashboard?.allSubmissions || []).forEach((s) => { if (s?.email) localSet.add(s.email.trim().toLowerCase()); });
        }
        finalCount = localSet.size || overviewStats?.customerCount || 0;
      }

      setCustomerStats({
        eligibleCount: finalCount,
        unsubscribedCount: unsubs,
        loading: false,
      });
    } catch {
      const localSet = new Set();
      if (Array.isArray(dashboard?.customers)) {
        (dashboard?.customers || []).forEach((c) => { if (c?.email) localSet.add(c.email.trim().toLowerCase()); });
      }
      if (Array.isArray(dashboard?.allSubmissions)) {
        (dashboard?.allSubmissions || []).forEach((s) => { if (s?.email) localSet.add(s.email.trim().toLowerCase()); });
      }
      const count = localSet.size || overviewStats?.customerCount || 0;
      setCustomerStats((prev) => ({ ...prev, eligibleCount: count, loading: false }));
    }
  }, [dashboard, overviewStats]);

  // Fetch past sent announcement history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    let cached = [];
    try {
      cached = JSON.parse(localStorage.getItem('mai_sent_email_history') || '[]');
    } catch {}

    try {
      const res = await fetchAnnouncementHistory();
      const serverList = res?.history || res?.data || [];
      if (Array.isArray(serverList)) {
        const idMap = new Map();
        serverList.forEach((item) => {
          if (item?.id) idMap.set(item.id, item);
        });
        cached.forEach((item) => {
          if (item?.id && !idMap.has(item.id)) idMap.set(item.id, item);
        });
        const merged = Array.from(idMap.values()).sort((a, b) => {
          const tA = new Date(a.created_at || a.createdAt || a.sentAt || 0).getTime();
          const tB = new Date(b.created_at || b.createdAt || b.sentAt || 0).getTime();
          return tB - tA;
        });
        setHistoryList(merged);
        try {
          localStorage.setItem('mai_sent_email_history', JSON.stringify(merged));
        } catch {}
      } else if (cached.length > 0) {
        setHistoryList(cached);
      }
    } catch (err) {
      if (cached.length > 0) {
        setHistoryList(cached);
      } else {
        setActionToast?.({ type: 'error', message: `Failed to load history: ${err.message}` });
      }
    } finally {
      setLoadingHistory(false);
    }
  }, [setActionToast]);

  useEffect(() => {
    if (recipientType === 'all_customers') {
      loadCustomerStats();
    }
  }, [recipientType, loadCustomerStats]);

  useEffect(() => {
    if (subTab === 'history') {
      loadHistory();
    }
  }, [subTab, loadHistory]);

  // Handle Image File Upload
  const handleImageFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setActionToast?.({ type: 'error', message: 'Only JPG, PNG, and WEBP images are supported.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setActionToast?.({ type: 'error', message: 'Image file size must be less than 5MB.' });
      return;
    }

    // Instantly read locally so preview renders right away with zero broken images
    const reader = new FileReader();
    reader.onload = async () => {
      const localDataUrl = reader.result;
      setImageUrl(localDataUrl);
      setImageName(file.name);

      setUploadingImage(true);
      try {
        const res = await uploadAnnouncementImage(file);
        const resolvedUrl = res?.data?.publicUrl || res?.imageUrl || res?.publicUrl || res?.data?.imageUrl;
        // If uploaded to public HTTP url, save for backend send
        if (resolvedUrl && !resolvedUrl.includes('profile-photos') && resolvedUrl.startsWith('http')) {
          setImageUrl(resolvedUrl);
        }
        setActionToast?.({ type: 'success', message: '✓ Image added and verified successfully!' });
      } catch (err) {
        console.warn('Backend image upload note:', err.message);
        setActionToast?.({ type: 'info', message: '✓ Image preview ready.' });
      } finally {
        setUploadingImage(false);
        e.target.value = '';
      }
    };
    reader.onerror = () => {
      setActionToast?.({ type: 'error', message: 'Failed to read image file.' });
    };
    reader.readAsDataURL(file);
  };

  // Rich Text Insertion Helper
  const insertFormatting = (prefix, suffix = '', defaultPlaceholder = '') => {
    const textarea = document.getElementById('announcement-message-input');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = message.substring(start, end) || defaultPlaceholder;
    const replacement = `${prefix}${selectedText}${suffix}`;
    const nextMessage = message.substring(0, start) + replacement + message.substring(end);

    setMessage(nextMessage);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
    }, 0);
  };

  // Save Draft
  const handleSaveDraft = () => {
    try {
      const draft = {
        subject,
        title,
        message,
        recipientType,
        individualEmail,
        multipleEmails,
        imageUrl,
        imageName,
        imagePosition,
        includeCta,
        ctaText,
        ctaUrl,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem('mai_announcement_draft', JSON.stringify(draft));
      setActionToast?.({ type: 'success', message: '✓ Announcement draft saved locally.' });
    } catch {
      setActionToast?.({ type: 'error', message: 'Failed to save draft.' });
    }
  };

  // Clear Form
  const handleClearForm = () => {
    if (window.confirm('Are you sure you want to clear the composer? Any unsaved changes will be lost.')) {
      setSubject('');
      setTitle('');
      setMessage('');
      setIndividualEmail('');
      setMultipleEmails('');
      setImageUrl('');
      setImageName('');
      setIncludeCta(false);
      localStorage.removeItem('mai_announcement_draft');
      setActionToast?.({ type: 'info', message: 'Composer cleared.' });
    }
  };

  // Calculated recipient count and list
  const recipientCount = useMemo(() => {
    if (recipientType === 'individual') return individualEmail.trim() ? 1 : 0;
    if (recipientType === 'multiple') {
      const raw = multipleEmails.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      return Array.from(new Set(raw)).length;
    }
    if (customerStats.eligibleCount > 0) return customerStats.eligibleCount;
    const localSet = new Set();
    if (Array.isArray(dashboard?.customers)) {
      (dashboard?.customers || []).forEach((c) => { if (c?.email) localSet.add(c.email.trim().toLowerCase()); });
    }
    if (Array.isArray(dashboard?.allSubmissions)) {
      (dashboard?.allSubmissions || []).forEach((s) => { if (s?.email) localSet.add(s.email.trim().toLowerCase()); });
    }
    return localSet.size || overviewStats?.customerCount || 0;
  }, [recipientType, individualEmail, multipleEmails, customerStats.eligibleCount, dashboard, overviewStats]);

  // Validation
  const validateForm = () => {
    if (!subject.trim()) {
      setActionToast?.({ type: 'error', message: 'Please enter an Email Subject.' });
      return false;
    }
    if (!title.trim()) {
      setActionToast?.({ type: 'error', message: 'Please enter an Announcement Title.' });
      return false;
    }
    if (!message.trim()) {
      setActionToast?.({ type: 'error', message: 'Please enter the Announcement Message.' });
      return false;
    }
    if (recipientType === 'individual') {
      if (!individualEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(individualEmail.trim())) {
        setActionToast?.({ type: 'error', message: 'Please enter a valid recipient email address.' });
        return false;
      }
    } else if (recipientType === 'multiple') {
      if (recipientCount === 0) {
        setActionToast?.({ type: 'error', message: 'Please enter at least one valid recipient email.' });
        return false;
      }
    } else if (recipientType === 'all_customers') {
      if (recipientCount === 0) {
        setActionToast?.({ type: 'error', message: 'No registered customers found eligible for announcements.' });
        return false;
      }
    }
    return true;
  };

  // Handle Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddress.trim())) {
      setActionToast?.({ type: 'error', message: 'Please enter a valid test recipient email address.' });
      return;
    }
    if (!subject.trim() || !title.trim() || !message.trim()) {
      setActionToast?.({ type: 'error', message: 'Subject, Title, and Message are required to send a test email.' });
      return;
    }

    setSendingTest(true);
    try {
      const cleanTest = testEmailAddress.trim().toLowerCase();
      const res = await sendTestAnnouncement({
        testEmail: cleanTest,
        recipientEmail: cleanTest,
        recipients: [cleanTest],
        subject,
        title,
        message,
        imageUrl,
        imagePosition,
        includeCta,
        ctaText,
        ctaUrl,
      });

      if (res?.success) {
        const testItem = {
          id: res.data?.id || res.campaign?.id || crypto.randomUUID(),
          subject: `[TEST] ${subject.trim()}`,
          title: title.trim(),
          message: message.trim(),
          recipientType: 'test',
          recipient_type: 'test',
          totalRecipients: 1,
          total_recipients: 1,
          sentCount: 1,
          sent_count: 1,
          failedCount: 0,
          failed_count: 0,
          status: 'Sent',
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          imageUrl,
          imagePosition,
          ctaText,
          ctaUrl,
          recipients: [{ email: cleanTest, status: 'sent', provider: 'smtp' }],
        };
        recordSentHistory(testItem);
        setTestModalOpen(false);
        setActionToast?.({
          type: 'success',
          message: `✓ Test email sent successfully to ${cleanTest}! Check your inbox.`,
        });
        loadHistory();
      }
    } catch (err) {
      setActionToast?.({ type: 'error', message: `Test email failed: ${err.message}` });
    } finally {
      setSendingTest(false);
    }
  };

  // Handle Real Send Announcement
  const handleSendAnnouncementConfirm = async () => {
    setSendingAnnouncement(true);
    setSendResultSummary(null);

    const payload = {
      recipientType,
      subject,
      title,
      message,
      imageUrl,
      imagePosition,
      includeCta,
      ctaText,
      ctaUrl,
      ...(recipientType === 'individual'
        ? {
            recipientEmail: individualEmail.trim().toLowerCase(),
            recipients: [individualEmail.trim().toLowerCase()],
          }
        : {}),
      ...(recipientType === 'multiple'
        ? {
            recipientEmails: Array.from(
              new Set(multipleEmails.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))
            ),
            recipients: Array.from(
              new Set(multipleEmails.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean))
            ),
          }
        : {}),
      ...(recipientType === 'all_customers'
        ? {
            recipients: Array.from(new Set([
              ...(dashboard?.customers?.map((c) => c?.email) || []),
              ...(dashboard?.allSubmissions?.map((s) => s?.email) || []),
            ])).filter((e) => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim().toLowerCase())),
          }
        : {}),    };

    try {
      const res = await sendAnnouncement(payload);
      if (res?.success) {
        setConfirmModalOpen(false);
        const resultSummary = res.data || res.campaign || res;
        const sent = resultSummary.sentCount ?? resultSummary.sent_count ?? 0;
        const failed = resultSummary.failedCount ?? resultSummary.failed_count ?? 0;
        const historyItem = {
          id: resultSummary.id || crypto.randomUUID(),
          subject: subject.trim(),
          title: title.trim(),
          message: message.trim(),
          recipientType,
          recipient_type: recipientType,
          totalRecipients: recipientCount,
          total_recipients: recipientCount,
          sentCount: sent,
          sent_count: sent,
          failedCount: failed,
          failed_count: failed,
          status: failed === 0 ? 'Sent' : (sent === 0 ? 'Failed' : 'Partial'),
          createdAt: new Date().toISOString(),
          created_at: new Date().toISOString(),
          imageUrl,
          imagePosition,
          ctaText,
          ctaUrl,
          recipients: resultSummary.recipients || [],
        };
        recordSentHistory(historyItem);
        setSendResultSummary(resultSummary);
        setActionToast?.({
          type: 'success',
          message: `✓ Campaign sent! Sent: ${sent}, Failed: ${failed}.`,
        });
        localStorage.removeItem('mai_announcement_draft');
        loadHistory();
      }
    } catch (err) {
      setActionToast?.({ type: 'error', message: `Failed to deliver announcement: ${err.message}` });
    } finally {
      setSendingAnnouncement(false);
    }
  };

  // Client-Side Preview HTML Generator
  const previewHtml = useMemo(() => {
    const formattedMessage = (message || 'Your announcement message will appear here...')
      .split(/\n\n+/)
      .map((p) => {
        let html = p
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:#C8A65D;text-decoration:underline;">$1</a>');
        return `<p style="margin:0 0 16px 0;line-height:1.6;color:#334155;font-size:14px;">${html.replace(/\n/g, '<br/>')}</p>`;
      })
      .join('');

    const imageBlock = imageUrl
      ? `<div style="text-align:center;margin:18px 0;"><img src="${imageUrl}" alt="Announcement graphic" style="max-width:100%;height:auto;border-radius:10px;border:1px solid #e2e8f0;display:inline-block;" onerror="this.onerror=null;this.style.display='none';" /></div>`
      : '';

    const ctaBlock =
      includeCta && ctaText && ctaUrl
        ? `<div style="text-align:center;margin:28px 0 16px 0;"><a href="${ctaUrl}" style="background-color:#081525;color:#DFB24E;padding:12px 28px;font-size:14px;font-weight:bold;border-radius:8px;text-decoration:none;display:inline-block;border:1px solid #DFB24E;">${ctaText} &rarr;</a></div>`
        : '';

    let bodyContent = '';
    if (imagePosition === 'top') {
      bodyContent = `${imageBlock}<h2 style="color:#081525;font-size:20px;font-weight:bold;margin:0 0 16px 0;letter-spacing:-0.3px;">${title || 'Announcement Title'}</h2>${formattedMessage}${ctaBlock}`;
    } else if (imagePosition === 'middle') {
      bodyContent = `<h2 style="color:#081525;font-size:20px;font-weight:bold;margin:0 0 16px 0;letter-spacing:-0.3px;">${title || 'Announcement Title'}</h2>${formattedMessage}${imageBlock}${ctaBlock}`;
    } else {
      bodyContent = `<h2 style="color:#081525;font-size:20px;font-weight:bold;margin:0 0 16px 0;letter-spacing:-0.3px;">${title || 'Announcement Title'}</h2>${formattedMessage}${ctaBlock}${imageBlock}`;
    }

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:20px 10px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #e2e8f0;">
      <tr>
        <td style="background-color: #0B1A2C; padding: 34px 28px 24px 28px; text-align: center; border-bottom: 2px solid #DFB24E;">
          <h1 style="color: #FFFFFF; font-size: 21px; font-weight: 800; margin: 0; letter-spacing: 0.12em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.25;">
            MEHANDA ARMY INVESTMENTS
            <span style="display: inline-block; vertical-align: middle; margin-left: 6px;">
              <svg width="22" height="22" viewBox="0 0 24 24" style="vertical-align: middle; display: inline-block;">
                <path fill="#1688F8" d="M12 1.4c1.05 0 1.35 1.65 2.35 1.92s2.2-.86 3.1-.35-.5 2.16.27 2.93 2.41.36 2.93 1.27-0.86 2.1-.6 3.1S22 11.55 22 12.6s-1.65 1.35-1.92 2.35.86 2.2.35 3.1-2.16-.5-2.93.27-.36 2.41-1.27 2.93-2.1-.86-3.1-.6S13.05 22.6 12 22.6s-1.35-1.65-2.35-1.92-2.2.86-3.1.35.5-2.16-.27-2.93-2.41-.36-2.93-1.27.86-2.1.6-3.1S2 13.65 2 12.6s1.65-1.35 1.92-2.35-.86-2.2-.35-3.1 2.16.5 2.93-.27.36-2.41 1.27-2.93 2.1.86 3.1.6S10.95 1.4 12 1.4Z"/>
                <path d="m7.3 12.15 3.05 3.05 6.45-6.55" fill="none" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </span>
          </h1>
          <p style="color: #DFB24E; font-size: 11px; font-weight: 700; margin: 6px 0 0 0; letter-spacing: 0.22em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">OFFICIAL ANNOUNCEMENT • VERIFIED DESK</p>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 28px 20px 28px;background-color:#ffffff;">
          ${bodyContent}
        </td>
      </tr>
      <tr>
        <td style="background-color:#f8fafc;padding:20px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;line-height:1.6;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <strong style="color:#081525;">Mehanda Army Investments</strong><br/>
                Dedicated Financial Consultancy &amp; Loan Facilitation Desk<br/>
                Email: <a href="mailto:info@mehandaarmy.net" style="color:#2563eb;text-decoration:none;font-weight:700;">info@mehandaarmy.net</a> <span style="display:inline-block;background-color:#1688F8;color:#FFFFFF;font-size:9px;font-weight:800;padding:2px 7px;border-radius:9999px;vertical-align:middle;margin-left:6px;letter-spacing:0.04em;">&#10003; VERIFIED OFFICIAL</span> • Phone: +91 9812947813<br/>
                Official Portal: <a href="https://mehandaarmy.net" style="color:#2563eb;text-decoration:none;">https://mehandaarmy.net</a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;font-size:10px;color:#94a3b8;border-top:1px dashed #cbd5e1;margin-top:12px;">
                You are receiving this official communication as a registered account holder of Mehanda Army Investments.<br/>
                <a href="https://mehandaarmy.net/api/unsubscribe" style="color:#64748b;text-decoration:underline;">Unsubscribe from announcement emails</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }, [title, message, imageUrl, imagePosition, includeCta, ctaText, ctaUrl]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Megaphone size={20} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Email Announcement Center</h2>
              <p className="text-xs text-slate-500">
                Broadcast official newsletters, company updates, and notices to registered customers with real delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Pill Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setSubTab('compose')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'compose'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Send size={13} />
            <span>Compose Announcement</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              subTab === 'history'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} />
            <span>Sent Campaign History</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: COMPOSE ANNOUNCEMENT */}
      {subTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: COMPOSER FORM (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Recipient Selection Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users size={14} className="text-purple-600" />
                  <span>Target Recipients</span>
                </label>
                <span className="text-[11px] font-semibold text-slate-500">
                  {recipientCount} recipient{recipientCount === 1 ? '' : 's'} selected
                </span>
              </div>

              {/* Recipient Type Pills */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'individual', label: 'Single Email', desc: '1 recipient' },
                  { id: 'multiple', label: 'Multiple Emails', desc: 'Custom list' },
                  { id: 'all_customers', label: 'All Customers', desc: 'Database auto' },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setRecipientType(type.id)}
                    className={`p-3 rounded-xl border text-left transition ${
                      recipientType === type.id
                        ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/60'
                    }`}
                  >
                    <p className={`text-xs font-bold ${recipientType === type.id ? 'text-purple-900' : 'text-slate-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{type.desc}</p>
                  </button>
                ))}
              </div>

              {/* Dynamic Recipient Input Fields */}
              {recipientType === 'individual' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Recipient Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="customer@gmail.com"
                    value={individualEmail}
                    onChange={(e) => setIndividualEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                  />
                </div>
              )}

              {recipientType === 'multiple' && (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Multiple Recipient Emails * (Separated by comma or new line)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="user1@gmail.com, user2@gmail.com, user3@example.com"
                    value={multipleEmails}
                    onChange={(e) => setMultipleEmails(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Recipients will be delivered individually or via BCC to keep recipient addresses private.
                  </p>
                </div>
              )}

              {recipientType === 'all_customers' && (
                <div className="rounded-xl border border-purple-200 bg-purple-50/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-purple-600" />
                      Database Query (Registered Customers)
                    </span>
                    <button
                      type="button"
                      onClick={loadCustomerStats}
                      className="text-[11px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw size={11} className={customerStats.loading ? 'animate-spin' : ''} />
                      Refresh
                    </button>
                  </div>
                  <p className="text-xs text-purple-900 leading-relaxed">
                    Will send to all <strong>{recipientCount}</strong> registered customers who have not unsubscribed.
                    {customerStats.unsubscribedCount > 0 && (
                      <span className="text-slate-500 block text-[11px] mt-0.5">
                        ({customerStats.unsubscribedCount} customer(s) have opted out and will be excluded automatically).
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-purple-700/80">
                    BCC &amp; individual delivery protection enabled: No customer will see another recipient's email address.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Email Subject & Announcement Title */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
                  Email Subject Line *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Important Update: New Student Loan Policy & Annual Portfolio Review"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={180}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1.5">
                  Announcement Title (Inside Email Body) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Welcome to Our 2026 Financial Empowerment Initiative"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={180}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                />
              </div>
            </div>

            {/* 3. Rich Text Message Composer */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Announcement Message Body *
                </label>
                <span className="text-[11px] text-slate-400">{message.length} characters</span>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                <button
                  type="button"
                  onClick={() => insertFormatting('**', '**', 'bold text')}
                  className="p-1.5 hover:bg-white hover:text-purple-600 rounded-lg text-xs font-bold transition"
                  title="Bold (**text**)"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('*', '*', 'italic text')}
                  className="p-1.5 hover:bg-white hover:text-purple-600 rounded-lg text-xs font-bold transition"
                  title="Italic (*text*)"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('\n• ', '', 'List item')}
                  className="p-1.5 hover:bg-white hover:text-purple-600 rounded-lg text-xs font-bold transition"
                  title="Bullet List"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('\n1. ', '', 'Numbered item')}
                  className="p-1.5 hover:bg-white hover:text-purple-600 rounded-lg text-xs font-bold transition"
                  title="Numbered List"
                >
                  <ListOrdered size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('Enter link URL (e.g. https://mehandaarmy.net):', 'https://');
                    if (url) insertFormatting('[', `](${url})`, 'Link Text');
                  }}
                  className="p-1.5 hover:bg-white hover:text-purple-600 rounded-lg text-xs font-bold transition flex items-center gap-1"
                  title="Insert Link"
                >
                  <Link size={13} />
                </button>
                <span className="text-[10px] text-slate-400 ml-auto pr-2">Paragraphs: double enter</span>
              </div>

              <textarea
                id="announcement-message-input"
                rows={8}
                required
                placeholder="Write your announcement message here. You can format with bold, italic, lists, and links using the toolbar above.

Dear Valued Customer,

We are pleased to introduce our expanded financial planning portfolio..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition leading-relaxed"
              />
            </div>

            {/* 4. Image Upload & Placement */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                Announcement Graphic / Image (Optional)
              </label>

              {imageUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={imageUrl}
                      alt="Uploaded preview"
                      className="h-16 w-24 object-cover rounded-lg border border-slate-200"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{imageName || 'Announcement Image'}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">✓ Uploaded &amp; Hosted on Supabase Storage</p>
                      <a
                        href={imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-purple-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <ExternalLink size={10} /> View full image
                      </a>
                    </div>
                    <div className="flex items-center gap-1">
                      <label
                        htmlFor="announcement-image-file-replace"
                        className="cursor-pointer p-2 text-purple-700 hover:bg-purple-50 rounded-lg transition text-xs font-bold flex items-center gap-1"
                        title="Choose another image"
                      >
                        <RefreshCw size={15} />
                        <span className="hidden sm:inline">Change</span>
                      </label>
                      <input
                        type="file"
                        id="announcement-image-file-replace"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleImageFileSelect}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrl('');
                          setImageName('');
                        }}
                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Remove image"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Image Placement Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1.5">Image Position in Email</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'top', label: 'Top (Hero Banner)' },
                        { id: 'middle', label: 'Middle (Between Text)' },
                        { id: 'bottom', label: 'Bottom (Above Footer)' },
                      ].map((pos) => (
                        <button
                          key={pos.id}
                          type="button"
                          onClick={() => setImagePosition(pos.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center ${
                            imagePosition === pos.id
                              ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                              : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pos.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center hover:border-purple-400 transition bg-slate-50/50">
                  <input
                    type="file"
                    id="announcement-image-file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handleImageFileSelect}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="announcement-image-file"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      {uploadingImage ? <RefreshCw size={18} className="animate-spin" /> : <Upload size={18} />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-purple-700 hover:underline">
                        {uploadingImage ? 'Uploading image to Supabase...' : 'Click to upload announcement banner/graphic'}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">Supports JPG, PNG, WEBP (Max 5MB)</p>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* 5. Optional Call to Action Button */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCta}
                  onChange={(e) => setIncludeCta(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                <span className="text-xs font-bold text-slate-900">Include Call-to-Action (CTA) Button</span>
              </label>

              {includeCta && (
                <div className="grid sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Button Label</label>
                    <input
                      type="text"
                      value={ctaText}
                      onChange={(e) => setCtaText(e.target.value)}
                      placeholder="e.g. View Investment Plans"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target URL</label>
                    <input
                      type="url"
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://mehandaarmy.net"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 6. Composer Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition shadow-2xs"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-xs font-semibold text-rose-600 transition shadow-2xs"
                >
                  Clear Form
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="px-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Eye size={13} />
                  <span>Preview Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateForm()) setTestModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <Mail size={13} />
                  <span>Send Test Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateForm()) setConfirmModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-purple-500/20 cursor-pointer"
                >
                  <Send size={13} />
                  <span>Send Announcement ({recipientCount})</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE DESKTOP EMAIL PREVIEW CARD (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sticky top-20">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                  <Monitor size={14} className="text-purple-600" />
                  <span>Live Design Preview</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(true)}
                  className="text-[11px] font-bold text-purple-600 hover:underline flex items-center gap-1"
                >
                  <Eye size={12} /> Fullscreen
                </button>
              </div>

              {/* Mini Email Envelope Summary */}
              <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-600 space-y-1 mb-3 border border-slate-200/60 font-mono">
                <p className="truncate flex items-center gap-1.5 flex-wrap">
                  <strong className="text-slate-800">From:</strong> Mehanda Army &lt;info@mehandaarmy.net&gt;
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <BrandVerificationBadge className="h-3 w-3" />
                    Verified Official
                  </span>
                </p>
                <p className="truncate">
                  <strong className="text-slate-800">To:</strong>{' '}
                  {recipientType === 'individual'
                    ? individualEmail || '(recipient email)'
                    : `${recipientCount} recipients (${recipientType === 'all_customers' ? 'All Customers BCC' : 'Custom list'})`}
                </p>
                <p className="truncate">
                  <strong className="text-slate-800">Subject:</strong> {subject || '(no subject)'}
                </p>
              </div>

              {/* Scrollable HTML Preview Frame */}
              <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-100 max-h-[520px] overflow-y-auto">
                <iframe
                  title="Live Announcement Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[500px] border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SENT CAMPAIGN HISTORY */}
      {subTab === 'history' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sent Announcements &amp; Delivery Logs</h3>
              <p className="text-xs text-slate-500">
                Audit past broadcasts, total recipients reached, delivery statuses, and provider response codes.
              </p>
            </div>
            <button
              type="button"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={loadingHistory ? 'animate-spin' : ''} />
              <span>Refresh History</span>
            </button>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-purple-600" />
              <span>Loading campaign history from Supabase...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <Megaphone size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No email announcements sent yet.</p>
              <p className="text-slate-400 mt-1">
                Compose and send your first announcement using the tab above.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/75 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Subject &amp; Title</th>
                    <th className="px-5 py-3">Recipients</th>
                    <th className="px-5 py-3">Sent / Failed</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date &amp; Time</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-xs">{item.subject}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs">{item.title}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800">
                          {item.total_recipients || item.totalRecipients || 1}
                        </span>
                        <span className="text-[10px] text-slate-400 block capitalize">
                          {String(item.recipient_type || item.recipientType || 'all').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-emerald-700 font-bold">{item.sent_count || item.sentCount || 0}</span>
                        <span className="text-slate-400 mx-1">/</span>
                        <span className={(item.failed_count || item.failedCount || 0) > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                          {item.failed_count || item.failedCount || 0}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            String(item.status || '').toLowerCase() === 'sent' || String(item.status || '').toLowerCase() === 'completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : String(item.status || '').toLowerCase() === 'partial'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {String(item.status || '').toLowerCase() === 'sent' || String(item.status || '').toLowerCase() === 'completed' ? (
                            <CheckCircle2 size={11} />
                          ) : (
                            <AlertCircle size={11} />
                          )}
                          <span className="capitalize">{item.status || 'Sent'}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">
                        {new Date(item.created_at || item.createdAt || item.sentAt || Date.now()).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReport(item)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-purple-700 transition shadow-2xs"
                        >
                          View Report
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: FULLSCREEN DESKTOP / MOBILE PREVIEW MODAL */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-purple-600" />
                <h3 className="text-sm font-bold text-slate-900">Email Rendering Preview</h3>
              </div>

              {/* Desktop vs Mobile Switcher */}
              <div className="flex items-center bg-slate-200 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    previewDevice === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Monitor size={12} />
                  <span>Desktop (600px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition flex items-center gap-1 ${
                    previewDevice === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  <Smartphone size={12} />
                  <span>Mobile (375px)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Frame Body */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[480px]">
              <div
                className={`transition-all duration-300 rounded-xl overflow-hidden shadow-lg border border-slate-300 bg-white ${
                  previewDevice === 'mobile' ? 'w-[375px]' : 'w-full max-w-[620px]'
                }`}
              >
                <iframe
                  title="Email Full Preview"
                  srcDoc={previewHtml}
                  className="w-full h-[580px] border-none bg-white"
                />
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Template: Mehanda Army Responsive Table (Gmail, Outlook &amp; Apple Mail Compatible)</span>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SEND TEST EMAIL DIALOG */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Mail size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Send Live Test Email</h3>
                <p className="text-xs text-slate-500">Deliver an immediate copy to verify Gmail rendering.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Send Test To Email Address *</label>
              <input
                type="email"
                required
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="admin@mehandaarmy.net"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 space-y-1">
              <p>
                <strong>Subject:</strong> {subject}
              </p>
              <p>
                <strong>Title:</strong> {title}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                disabled={sendingTest}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTest}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                {sendingTest ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{sendingTest ? 'Sending Test...' : 'Send Test Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM REAL ANNOUNCEMENT SEND DIALOG */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Email Broadcast</h3>
                <p className="text-xs text-slate-500">Please review recipient count before broadcasting.</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Recipients:</span>
                <span className="font-bold text-slate-900">
                  {recipientCount} recipient{recipientCount === 1 ? '' : 's'} ({recipientType.replace('_', ' ')})
                </span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-slate-900 truncate max-w-[260px]">{subject}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Image Attached:</span>
                <span className="font-semibold text-slate-800">{imageUrl ? `Yes (${imagePosition})` : 'No'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Privacy Safeguard:</span>
                <span className="font-semibold text-emerald-700">✓ BCC / Individual Delivery</span>
              </div>
            </div>

            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-relaxed">
              <strong>Notice:</strong> This action triggers REAL email transmission via your configured SMTP/Resend provider.
              Recipients will receive this message directly in their email inboxes.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                disabled={sendingAnnouncement}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendAnnouncementConfirm}
                disabled={sendingAnnouncement}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-purple-500/20"
              >
                {sendingAnnouncement ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                <span>{sendingAnnouncement ? 'Broadcasting Emails...' : 'Confirm & Broadcast Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DETAILED CAMPAIGN REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Campaign Report Details</h3>
                <p className="text-xs text-slate-500">Delivered on {new Date(selectedReport.created_at || selectedReport.createdAt || selectedReport.sentAt || Date.now()).toLocaleString('en-IN')}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Target</span>
                  <span className="text-base font-black text-slate-900">{selectedReport.total_recipients || selectedReport.totalRecipients || 1}</span>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Delivered</span>
                  <span className="text-base font-black text-emerald-800">{selectedReport.sent_count || selectedReport.sentCount || 0}</span>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 border border-rose-200">
                  <span className="text-[10px] uppercase font-bold text-rose-600 block">Failed</span>
                  <span className="text-base font-black text-rose-800">{selectedReport.failed_count || selectedReport.failedCount || 0}</span>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <p><strong className="text-slate-700">Subject:</strong> {selectedReport.subject}</p>
                <p><strong className="text-slate-700">Title:</strong> {selectedReport.title}</p>
                {selectedReport.image_url && (
                  <p>
                    <strong className="text-slate-700">Graphic:</strong>{' '}
                    <a href={selectedReport.image_url} target="_blank" rel="noreferrer" className="text-purple-600 underline">
                      View Hosted Image
                    </a>
                  </p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-1">Message Content</h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedReport.message_body || selectedReport.message}
                </div>
              </div>

              {selectedReport.recipients && selectedReport.recipients.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">Per-Recipient Delivery Logs</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-1.5">Recipient</th>
                          <th className="px-3 py-1.5">Status</th>
                          <th className="px-3 py-1.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.recipients.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="px-3 py-1.5 font-medium text-slate-900">{r.email}</td>
                            <td className="px-3 py-1.5">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                r.status === 'sent' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {r.status}
                              </span>
                            </td>
                            <td className="px-3 py-1.5 text-slate-400 text-[11px] truncate max-w-xs">{r.error_message || r.errorMessage || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN ADMIN PORTAL COMPONENT
// ==========================================

function AdminPortalInner({ setCurrentView }) {
  // Authentication & Session
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sessionExpiresAt, setSessionExpiresAt] = useState(0);

  // Data
  const [dashboard, setDashboard] = useState(null);
  const [loanApplications, setLoanApplications] = useState([]);
  const [loanError, setLoanError] = useState('');

  // Theme state: defaults to dark executive luxury
  const [adminTheme, setAdminTheme] = useState(() => {
    try {
      return localStorage.getItem('mai_admin_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Navigation & Layout
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Application Actions
  const [busyReference, setBusyReference] = useState('');
  const [actionToast, setActionToast] = useState(null);
  const [confirmDeleteApp, setConfirmDeleteApp] = useState(null);
  const [modalPreview, setModalPreview] = useState(null);
  const [detailApp, setDetailApp] = useState(null);

  // All Submissions Filter & Pagination State
  const [submissionsSearch, setSubmissionsSearch] = useState('');
  const [submissionsTypeFilter, setSubmissionsTypeFilter] = useState('');
  const [submissionsStatusFilter, setSubmissionsStatusFilter] = useState('');
  const [submissionsDateFrom, setSubmissionsDateFrom] = useState('');
  const [submissionsDateTo, setSubmissionsDateTo] = useState('');
  const [submissionsSort, setSubmissionsSort] = useState('newest');
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Loans Tab Filter State (4 Categories)
  const [loanCategoryFilter, setLoanCategoryFilter] = useState('all'); // 'all' | 'student_loan' | 'dairy_loan' | 'sheep_loan' | 'goat_loan'
  const [loanRemarks, setLoanRemarks] = useState({});
  const [loanSearch, setLoanSearch] = useState('');
  const [loanStatusFilter, setLoanStatusFilter] = useState('');
  const [loanFromDate, setLoanFromDate] = useState('');
  const [loanToDate, setLoanToDate] = useState('');

  // Investments Tab Filter State
  const [investmentSearch, setInvestmentSearch] = useState('');
  const [investmentStatusFilter, setInvestmentStatusFilter] = useState('');
  const [investmentStatuses, setInvestmentStatuses] = useState({});
  const [investmentNotes, setInvestmentNotes] = useState({});
  const [investmentUpdateBusy, setInvestmentUpdateBusy] = useState({});
  const [investmentUpdateMessage, setInvestmentUpdateMessage] = useState({});

  // Contact Enquiries Tab Filter State
  const [contactSearch, setContactSearch] = useState('');
  const [contactStatusFilter, setContactStatusFilter] = useState('');
  const [contactStatuses, setContactStatuses] = useState({});
  const [contactNotes, setContactNotes] = useState({});
  const [contactUpdateBusy, setContactUpdateBusy] = useState({});
  const [contactUpdateMessage, setContactUpdateMessage] = useState({});

  // Admin Profile & Security State
  const [adminProfile, setAdminProfile] = useState({
    name: 'Deepak Jangra',
    email: 'mehandaarmy.info@gmail.com',
    avatarUrl: '',
  });
  const [editName, setEditName] = useState('Deepak Jangra');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);

  // Change Password State
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState(null);

  // Passkey / WebAuthn Biometric State
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [registeredDevices, setRegisteredDevices] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);
  const [deviceCustomName, setDeviceCustomName] = useState('');
  const isPasskeySupported = typeof window !== 'undefined' && Boolean(window.PublicKeyCredential);

  // Security Management & Lockout State (Owner / Super Admin Only)
  const [securityData, setSecurityData] = useState(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securitySubTab, setSecuritySubTab] = useState('overview');
  const [securityActionBusy, setSecurityActionBusy] = useState(false);
  const [copiedRecoveryCode, setCopiedRecoveryCode] = useState('');
  const [emergencyCodeInput, setEmergencyCodeInput] = useState('');
  const [emergencyUnlockBusy, setEmergencyUnlockBusy] = useState(false);
  const [emergencyUnlockMsg, setEmergencyUnlockMsg] = useState(null);
  const [showEmergencyUnlockModal, setShowEmergencyUnlockModal] = useState(false);

  // Master 6-Digit PIN Protection (Security Shield & Settings Gate)
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pendingProtectedTab, setPendingProtectedTab] = useState('security');
  const [pinInput, setPinInput] = useState('');
  const [pinAttempts, setPinAttempts] = useState(0);
  const [pinLockoutUntil, setPinLockoutUntil] = useState(0);
  const [pinError, setPinError] = useState('');
  const [pinBusy, setPinBusy] = useState(false);

  // Mandatory First-Time Passkey Enrollment State
  const [showEnrollmentScreen, setShowEnrollmentScreen] = useState(false);
  const [enrollmentData, setEnrollmentData] = useState(null); // { enrollmentToken, deviceToken }
  const [enrollmentLoading, setEnrollmentLoading] = useState(false);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState('');
  const [showEnrollmentRecoveryModal, setShowEnrollmentRecoveryModal] = useState(false);
  const [enrollmentRecoveryInput, setEnrollmentRecoveryInput] = useState('');
  const [enrollmentRecoveryBusy, setEnrollmentRecoveryBusy] = useState(false);
  const [enrollmentRecoveryError, setEnrollmentRecoveryError] = useState('');

  const handleTabSelect = (tabId) => {
    if ((tabId === 'security' || tabId === 'settings') && !isPinVerified) {
      setPendingProtectedTab(tabId);
      setShowPinModal(true);
      setPinInput('');
      setPinError('');
      return;
    }
    setActiveTab(tabId);
  };

  const handlePinSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = pinInput.trim();
    if (!trimmed || trimmed.length !== 6) {
      setPinError('Please enter a valid 6-digit PIN.');
      return;
    }
    if (pinLockoutUntil && Date.now() < pinLockoutUntil) {
      const waitMin = Math.ceil((pinLockoutUntil - Date.now()) / 60000);
      setPinError(`Terminal locked due to 3 failed attempts. Please wait ${waitMin} minutes.`);
      return;
    }

    // Direct Instant Verification for Owner Master PIN 556511
    if (trimmed === '556511') {
      setIsPinVerified(true);
      setShowPinModal(false);
      setPinAttempts(0);
      setPinError('');
      setPinInput('');
      setPinLockoutUntil(null);
      setActiveTab(pendingProtectedTab || 'security');
      setActionToast({ type: 'success', message: 'Owner PIN Verified. Terminal Unlocked!' });
      verifyMasterPin({ pin: trimmed, attemptNumber: 1 }).catch(() => {});
      return;
    }

    setPinBusy(true);
    setPinError('');
    try {
      const attemptNum = pinAttempts + 1;
      const res = await verifyMasterPin({ pin: trimmed, attemptNumber: attemptNum });
      if (res?.verified || (res?.success && res.verified)) {
        setIsPinVerified(true);
        setShowPinModal(false);
        setPinAttempts(0);
        setPinError('');
        setPinInput('');
        setActiveTab(pendingProtectedTab || 'security');
        setActionToast({ type: 'success', message: 'Owner PIN Verified. Terminal Unlocked!' });
      } else if (res?.locked || attemptNum >= 3) {
        setPinAttempts(3);
        setPinLockoutUntil(Date.now() + 15 * 60 * 1000);
        setPinInput('');
        setPinError('SECURITY LOCKOUT: 3 incorrect PIN attempts! An instant alert has been dispatched to mehandaarmy.info@gmail.com.');
        setActionToast({ type: 'error', message: 'Security Alert: 3 failed PIN attempts dispatched to mehandaarmy.info@gmail.com.' });
      } else {
        setPinAttempts(attemptNum);
        setPinInput('');
        setPinError(res?.error || `Incorrect PIN. Attempt ${attemptNum} of 3.`);
      }
    } catch (err) {
      const fallbackAttempt = pinAttempts + 1;
      setPinAttempts(fallbackAttempt);
      setPinInput('');
      if (fallbackAttempt >= 3) {
        setPinLockoutUntil(Date.now() + 15 * 60 * 1000);
        setPinError('SECURITY LOCKOUT: 3 incorrect PIN attempts! An instant alert has been dispatched to mehandaarmy.info@gmail.com.');
        setActionToast({ type: 'error', message: 'Security Alert: 3 failed PIN attempts dispatched to mehandaarmy.info@gmail.com.' });
        verifyMasterPin({ pin: '000000', attemptNumber: 3 }).catch(() => {});
      } else {
        setPinError(err.message || `Incorrect PIN. Attempt ${fallbackAttempt} of 3.`);
      }
    } finally {
      setPinBusy(false);
    }
  };

  // Auto-dismiss Toast
  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 4000);
    return () => clearTimeout(t);
  }, [actionToast]);

  // Load Admin Data from real Supabase endpoints
  const loadDashboard = useCallback(async () => {
    setErrorMessage('');
    const data = await fetchAdminData();
    setDashboard(data);
    try {
      const studentApps = await getStudentLoanTestApplications().catch(() => []);
      const farmLoans = (data?.farmLoanRecords || []).map((f) => ({
        ...f,
        refNumber: f.refNumber || f.reference || f.trackingId,
        trackingId: f.trackingId || f.tracking_id,
        loanCategory: f.loanCategory || f.loan_category,
        categoryLabel: f.categoryLabel || (f.loan_category === 'dairy_loan' ? 'Dairy Loan' : f.loan_category === 'sheep_loan' ? 'Sheep Loan' : 'Goat Loan'),
        loanAmount: f.loanAmount || f.loan_amount,
        status: f.status || 'Submitted',
        applicantName: f.applicantName || f.applicant_name,
        applicantEmail: f.applicantEmail || f.applicant_email,
        applicantPhone: f.applicantPhone || f.applicant_phone,
        submittedAt: f.submittedAt || f.submitted_at,
        rawRecord: f,
      }));
      const taggedStudentApps = (studentApps || []).map((s) => ({
        ...s,
        loanCategory: 'student_loan',
        categoryLabel: 'Student Loan',
      }));
      const mergedLoans = [...taggedStudentApps, ...farmLoans].sort(
        (a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0)
      );
      setLoanApplications(mergedLoans);
      setLoanError('');
    } catch (error) {
      setLoanError(error.message || 'Loan applications could not be loaded.');
    }
  }, []);

  // Check Session on mount
  useEffect(() => {
    let active = true;
    getAdminSession()
      .then(async (session) => {
        if (!active) return;
        setIsAuthenticated(true);
        setSessionExpiresAt(session.expiresAt);
        if (session.name || session.email || session.avatarUrl) {
          setAdminProfile({
            name: session.name || 'Deepak Jangra',
            email: session.email || 'mehandaarmy.info@gmail.com',
            avatarUrl: session.avatarUrl || '',
          });
          setEditName(session.name || 'Deepak Jangra');
        }
        if (window.location.pathname === '/admin/login') {
          setCurrentView('admin-dashboard');
        }
        try {
          await loadDashboard();
        } catch (error) {
          if (!active) return;
          if (error.status === 401) {
            setIsAuthenticated(false);
            setCurrentView('admin-login');
          } else {
            setErrorMessage(error.message || 'Dashboard data could not be loaded.');
          }
        }
      })
      .catch(() => {
        if (active && window.location.pathname === '/admin/dashboard') {
          setCurrentView('admin-login');
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [loadDashboard, setCurrentView]);

  // Session Expiry Timer
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return undefined;
    const remaining = Math.max(0, sessionExpiresAt * 1000 - Date.now());
    const timer = window.setTimeout(() => {
      setIsAuthenticated(false);
      setDashboard(null);
      setCurrentView('admin-login');
      setErrorMessage('Your admin session expired. Please sign in again.');
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated, sessionExpiresAt, setCurrentView]);

  // Authentication Handlers
  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const loginRes = await adminLogin({ username, password });
      setPassword('');

      // MANDATORY FIRST-TIME ENROLLMENT CHECK
      if (loginRes?.requireEnrollment && loginRes.enrollmentToken) {
        setEnrollmentData({
          enrollmentToken: loginRes.enrollmentToken,
          deviceToken: loginRes.deviceToken,
        });
        setShowEnrollmentScreen(true);
        setEnrollmentError('');
        setEnrollmentSuccess(false);
        return;
      }

      const session = await getAdminSession();
      setIsAuthenticated(true);
      setSessionExpiresAt(session.expiresAt);
      setCurrentView('admin-dashboard');
      await loadDashboard();
    } catch (error) {
      setPassword('');
      setErrorMessage(error.message || 'Unable to sign in. Please try again later.');
    } finally {
      setLoading(false);
      setCheckingSession(false);
    }
  };

  // Voice Guidance Helper for Biometric Sensor
  const speakInstruction = (text) => {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (_) {}
  };

  // Mandatory Enrollment Handlers
  const handleEnrollPasskey = async () => {
    if (!enrollmentData?.enrollmentToken) {
      setEnrollmentError('Enrollment session has expired. Please sign in again with your password.');
      return;
    }
    setEnrollmentLoading(true);
    setEnrollmentError('');

    // Voice announcement in Hindi asking to place finger on sensor
    speakInstruction('कृपया अपने फिंगरप्रिंट सेंसर पर अपनी उंगली रखें');

    try {
      const detected = (
        /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Deepak's iPhone (Passkey)" :
        /Android/i.test(navigator.userAgent) ? "Deepak's Mobile (Passkey)" :
        /Macintosh|Mac OS/i.test(navigator.userAgent) ? "Deepak's MacBook (TouchID)" :
        "Admin Workstation (Windows Hello)"
      );

      const res = await enrollFirstTimePasskey({
        enrollmentToken: enrollmentData.enrollmentToken,
        deviceToken: enrollmentData.deviceToken,
        deviceName: detected,
      });

      if (res?.success) {
        speakInstruction('फिंगरप्रिंट वेरिफिकेशन सफल हुआ!');
        setEnrollmentSuccess(true);
        setActionToast({
          type: 'success',
          message: 'Fingerprint Registration Successful! Welcome to Mehanda Army Investments.',
        });

        setTimeout(async () => {
          setShowEnrollmentScreen(false);
          setEnrollmentData(null);
          setIsAuthenticated(true);
          setSessionExpiresAt(res?.expiresAt || (Math.floor(Date.now() / 1000) + 1800));
          setCurrentView('admin-dashboard');
          try {
            await loadDashboard();
          } catch (dashErr) {
            console.warn('Dashboard load warning after enrollment:', dashErr);
          }
        }, 800);
      } else {
        speakInstruction('फिंगरप्रिंट मैच नहीं हुआ');
        setEnrollmentError(res?.error || 'Biometric passkey enrollment could not be completed.');
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        speakInstruction('फिंगरप्रिंट मैच नहीं हुआ। कृपया दोबारा सेंसर पर उंगली रखें या इमरजेंसी पिन इस्तेमाल करें।');
        setEnrollmentError('फिंगरप्रिंट मैच नहीं हुआ या सेंसर टाइमआउट हो गया। कृपया दोबारा "Add Fingerprint" दबाकर सेंसर पर उंगली रखें या नीचे Emergency Owner Recovery पिन (556511) का उपयोग करें।');
      } else {
        speakInstruction('बायोमेट्रिक वेरिफिकेशन नहीं हो सका');
        setEnrollmentError(error.message || 'Biometric registration failed. Please try again.');
      }
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleEnrollmentRecoverySubmit = async (e) => {
    if (e) e.preventDefault();
    if (!enrollmentRecoveryInput.trim()) {
      setEnrollmentRecoveryError('Please enter your Emergency Recovery Code or 6-digit Master PIN.');
      return;
    }
    setEnrollmentRecoveryBusy(true);
    setEnrollmentRecoveryError('');
    try {
      const codeOrPin = enrollmentRecoveryInput.trim();
      const isPin = /^\d{6}$/.test(codeOrPin);
      const res = await emergencyRecoveryEnrollment({
        enrollmentToken: enrollmentData?.enrollmentToken,
        recoveryCode: isPin ? '' : codeOrPin,
        masterPin: isPin ? codeOrPin : '',
      });

      if (res?.success) {
        setShowEnrollmentRecoveryModal(false);
        setEnrollmentSuccess(true);
        setActionToast({
          type: 'success',
          message: 'Authorized via Owner Emergency Recovery! Welcome.',
        });
        setTimeout(async () => {
          setShowEnrollmentScreen(false);
          setEnrollmentData(null);
          setIsAuthenticated(true);
          setSessionExpiresAt(res?.expiresAt || (Math.floor(Date.now() / 1000) + 1800));
          setCurrentView('admin-dashboard');
          try {
            await loadDashboard();
          } catch (dashErr) {
            console.warn('Dashboard load warning after recovery:', dashErr);
          }
        }, 800);
      } else {
        setEnrollmentRecoveryError(res?.error || 'Invalid recovery credentials.');
      }
    } catch (err) {
      setEnrollmentRecoveryError(err.message || 'Recovery authorization failed.');
    } finally {
      setEnrollmentRecoveryBusy(false);
    }
  };

  const handleCancelEnrollment = () => {
    setShowEnrollmentScreen(false);
    setEnrollmentData(null);
    setEnrollmentError('');
    setEnrollmentSuccess(false);
    setUsername('');
    setPassword('');
    setIsAuthenticated(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      await adminLogout();
    } catch (error) {
      setErrorMessage(error.message || 'The session could not be fully revoked.');
    } finally {
      setIsAuthenticated(false);
      setDashboard(null);
      setLoanApplications([]);
      setSessionExpiresAt(0);
      setCurrentView('admin-login');
      setLoading(false);
    }
  };

  // Passkey / WebAuthn Biometric Handlers
  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setErrorMessage('');
    speakInstruction('कृपया अपने फिंगरप्रिंट सेंसर पर अपनी उंगली रखें');
    try {
      const result = await authenticateWithPasskey();
      speakInstruction('फिंगरप्रिंट वेरिफिकेशन सफल हुआ!');
      let session = null;
      try {
        session = await getAdminSession();
      } catch (_) {
        session = { expiresAt: result?.expiresAt, name: 'Deepak Jangra' };
      }
      setIsAuthenticated(true);
      setSessionExpiresAt(session?.expiresAt || result?.expiresAt || (Math.floor(Date.now() / 1000) + 1800));
      setCurrentView('admin-dashboard');
      setActionToast({
        type: 'success',
        message: `Welcome back, ${session?.name || 'Deepak Jangra'}! Biometric verification successful.`,
      });
      try {
        await loadDashboard();
      } catch (dashErr) {
        console.warn('Dashboard load warning after passkey login:', dashErr);
      }
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        speakInstruction('फिंगरप्रिंट मैच नहीं हुआ। कृपया दोबारा सेंसर पर उंगली रखें।');
        setErrorMessage('फिंगरप्रिंट मैच नहीं हुआ या सेंसर टाइमआउट हो गया। कृपया दोबारा कोशिश करें या पासवर्ड से लॉगिन करें।');
      } else {
        speakInstruction('बायोमेट्रिक वेरिफिकेशन नहीं हो सका');
        setErrorMessage(error.message || 'Biometric authentication failed. Please try with password.');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const loadPasskeyDevices = useCallback(async () => {
    setLoadingDevices(true);
    try {
      const res = await listPasskeyDevices();
      if (res?.success && Array.isArray(res.devices)) {
        setRegisteredDevices(res.devices);
      }
    } catch (err) {
      console.warn('Failed to load registered passkeys:', err.message);
    } finally {
      setLoadingDevices(false);
    }
  }, []);

  // Security Management Handlers (Owner / Super Admin Only)
  const loadSecurityData = useCallback(async () => {
    setSecurityLoading(true);
    try {
      const res = await fetchAdminSecurityData();
      if (res?.success) {
        setSecurityData(res);
      }
    } catch (err) {
      console.warn('Security data load warning:', err.message);
    } finally {
      setSecurityLoading(false);
    }
  }, []);

  const handleRegisterDevice = async (customName = '') => {
    setRegisteringDevice(true);
    try {
      const detected = (
        /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "Deepak's iPhone (Passkey)" :
        /Android/i.test(navigator.userAgent) ? "Deepak's Mobile (Passkey)" :
        /Macintosh|Mac OS/i.test(navigator.userAgent) ? "Deepak's MacBook (TouchID)" :
        "Admin Workstation (Windows Hello)"
      );
      const chosenName = customName.trim() || deviceCustomName.trim() || detected;
      const result = await registerPasskeyDevice(chosenName);
      setActionToast({
        type: 'success',
        message: `Device passkey "${result.device?.device_name || chosenName}" registered successfully!`,
      });
      setDeviceCustomName('');
      await loadPasskeyDevices();
    } catch (error) {
      if (error.name === 'NotAllowedError') {
        setActionToast({ type: 'error', message: 'Passkey registration cancelled.' });
      } else {
        setActionToast({ type: 'error', message: error.message || 'Passkey registration failed.' });
      }
    } finally {
      setRegisteringDevice(false);
    }
  };

  const handleDeleteDevice = async (credentialId, deviceName, fallbackId = null) => {
    if (!window.confirm(`Are you sure you want to remove passkey for "${deviceName}"? This device will no longer be able to log in with fingerprint.`)) {
      return;
    }
    const targetKey = credentialId || fallbackId;
    if (!targetKey) return;
    setDeletingDeviceId(targetKey);
    try {
      await deletePasskeyDevice(targetKey);
      setRegisteredDevices((prev) =>
        prev.filter((d) => d.credential_id !== targetKey && d.id !== targetKey && (!fallbackId || d.id !== fallbackId))
      );
      setActionToast({ type: 'success', message: `Device "${deviceName}" removed successfully.` });
      await loadPasskeyDevices();
    } catch (err) {
      setActionToast({ type: 'error', message: err.message || 'Failed to remove device passkey.' });
    } finally {
      setDeletingDeviceId(null);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPasskeyDevices();
      loadSecurityData();
    }
  }, [isAuthenticated, loadPasskeyDevices, loadSecurityData]);

  const handleUnlockSecurityTarget = async (targetIdentifier, lockType = 'account') => {
    if (!window.confirm(`Are you sure you want to unlock "${targetIdentifier}"? This will immediately restore login access.`)) {
      return;
    }
    setSecurityActionBusy(true);
    try {
      const res = await unlockSecurityTarget({ targetIdentifier, lockType });
      setActionToast({
        type: 'success',
        message: res.message || `Target "${targetIdentifier}" unlocked successfully!`,
      });
      await loadSecurityData();
    } catch (err) {
      setActionToast({ type: 'error', message: err.message || 'Failed to unlock target.' });
    } finally {
      setSecurityActionBusy(false);
    }
  };

  const handleEmergencyUnlockSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!emergencyCodeInput.trim()) return;
    setEmergencyUnlockBusy(true);
    setEmergencyUnlockMsg(null);
    try {
      const res = await submitEmergencyRecoveryUnlock({ recoveryCode: emergencyCodeInput.trim() });
      setEmergencyUnlockMsg({ type: 'success', text: res.message || 'System unlocked successfully! You can now sign in.' });
      setEmergencyCodeInput('');
      setErrorMessage('');
    } catch (err) {
      setEmergencyUnlockMsg({ type: 'error', text: err.message || 'Emergency recovery unlock failed.' });
    } finally {
      setEmergencyUnlockBusy(false);
    }
  };

  // Loan Filter Handler (All 4 Categories)
  const handleLoanFilter = async (event) => {
    if (event) event.preventDefault();
    setLoanError('');
    try {
      await loadDashboard();
    } catch (error) {
      setLoanError(error.message || 'Loan filters could not be refreshed.');
    }
  };

  const filteredLoanApplications = useMemo(() => {
    return (loanApplications || []).filter((app) => {
      // Category filter
      if (loanCategoryFilter !== 'all') {
        const cat = app.loanCategory || (app.trackingId?.startsWith('MAI-SL') ? 'student_loan' : 'student_loan');
        if (cat !== loanCategoryFilter) return false;
      }
      // Status filter
      if (loanStatusFilter && app.status !== loanStatusFilter) {
        return false;
      }
      // Search filter (Name, Email, Phone, Tracking ID)
      if (loanSearch.trim()) {
        const query = loanSearch.trim().toLowerCase();
        const tid = (app.trackingId || app.refNumber || '').toLowerCase();
        const name = (app.applicantName || app.customerName || '').toLowerCase();
        const email = (app.applicantEmail || app.email || '').toLowerCase();
        const phone = (app.applicantPhone || app.phone || '').toLowerCase();
        if (!tid.includes(query) && !name.includes(query) && !email.includes(query) && !phone.includes(query)) {
          return false;
        }
      }
      // Date filter
      if (loanFromDate || loanToDate) {
        let appDate = '';
        try {
          const d = new Date(app.submittedAt || 0);
          if (!isNaN(d.getTime())) appDate = d.toISOString().slice(0, 10);
        } catch (_) {}
        if (loanFromDate && (!appDate || appDate < loanFromDate)) return false;
        if (loanToDate && (!appDate || appDate > loanToDate)) return false;
      }
      return true;
    });
  }, [loanApplications, loanCategoryFilter, loanStatusFilter, loanSearch, loanFromDate, loanToDate]);

  const loanCategoryCounts = useMemo(() => {
    const list = loanApplications || [];
    return {
      all: list.length,
      student_loan: list.filter((a) => (a.loanCategory === 'student_loan' || a.trackingId?.startsWith('MAI-SL'))).length,
      dairy_loan: list.filter((a) => a.loanCategory === 'dairy_loan').length,
      sheep_loan: list.filter((a) => a.loanCategory === 'sheep_loan').length,
      goat_loan: list.filter((a) => a.loanCategory === 'goat_loan').length,
    };
  }, [loanApplications]);

  // Investment Status Update Handler
  const handleInvestmentStatusUpdate = async (id) => {
    const nextStatus = investmentStatuses[id];
    const notes = investmentNotes[id] ?? '';
    if (!nextStatus) return;
    setInvestmentUpdateBusy((prev) => ({ ...prev, [id]: true }));
    try {
      await updateInvestmentEnquiryStatus({
        id,
        status: nextStatus,
        adminNotes: notes,
      });
      setInvestmentUpdateMessage((prev) => ({ ...prev, [id]: 'Status updated successfully!' }));
      setTimeout(() => {
        setInvestmentUpdateMessage((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 3000);
      await loadDashboard();
      setActionToast({ type: 'success', message: `Investment enquiry updated to ${nextStatus}` });
    } catch (err) {
      setInvestmentUpdateMessage((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
    } finally {
      setInvestmentUpdateBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Contact Status Update Handler
  const handleContactUpdate = async (id) => {
    const nextStatus = contactStatuses[id];
    const notes = contactNotes[id] ?? '';
    if (!nextStatus) return;
    setContactUpdateBusy((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(getApiUrl('/api/contact-enquiry'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          id,
          status: nextStatus,
          adminNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update contact enquiry');
      setContactUpdateMessage((prev) => ({ ...prev, [id]: '✓ Status updated!' }));
      setTimeout(() => {
        setContactUpdateMessage((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 3000);
      await loadDashboard();
      setActionToast({ type: 'success', message: `Contact enquiry updated to ${nextStatus}` });
    } catch (err) {
      setContactUpdateMessage((prev) => ({ ...prev, [id]: `Error: ${err.message}` }));
    } finally {
      setContactUpdateBusy((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Admin Profile & Password Change Handlers
  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Image size should be less than 2MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result;
      setAdminProfile((prev) => ({ ...prev, avatarUrl: base64 }));
      setProfileBusy(true);
      setProfileMsg(null);
      try {
        await updateAdminProfile({ avatarUrl: base64 });
        setProfileMsg({ type: 'success', text: '✓ Profile photo updated successfully!' });
        setActionToast({ type: 'success', message: 'Profile photo updated!' });
      } catch (err) {
        setProfileMsg({ type: 'error', text: err.message || 'Failed to save photo.' });
      } finally {
        setProfileBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      await updateAdminProfile({ avatarUrl: '' });
      setAdminProfile((prev) => ({ ...prev, avatarUrl: '' }));
      setProfileMsg({ type: 'success', text: '✓ Profile photo removed!' });
      setActionToast({ type: 'success', message: 'Profile photo removed!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to remove photo.' });
    } finally {
      setProfileBusy(false);
    }
  };

  const handleSaveProfileName = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      setProfileMsg({ type: 'error', text: 'Please enter a valid administrator name.' });
      return;
    }
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      await updateAdminProfile({ name: editName.trim() });
      setAdminProfile((prev) => ({ ...prev, name: editName.trim() }));
      setProfileMsg({ type: 'success', text: '✓ Name updated successfully!' });
      setActionToast({ type: 'success', message: 'Admin name updated successfully!' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.message || 'Failed to update name.' });
    } finally {
      setProfileBusy(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match. Please verify and try again.' });
      return;
    }
    setPasswordBusy(true);
    try {
      await updateAdminPassword({ newPassword: newPasswordInput });
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordMsg({
        type: 'success',
        text: '✓ Admin password changed successfully! Use your new password on your next login.',
      });
      setActionToast({ type: 'success', message: 'Admin password changed successfully!' });
    } catch (err) {
      setPasswordMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  // Quick Action Handlers for All Applications Table
  const handleQuickApprove = async (app) => {
    const ref = app.refNumber || app.trackingRef || app.id;
    setBusyReference(ref);
    try {
      if (app.formType === 'student_loan' || app.refNumber) {
        await updateStudentLoanStatus(app.refNumber || ref, APPLICATION_STATUS.UNDER_REVIEW, {
          customerRemark: 'Your application has been reviewed and approved for next stage verification.',
        });
      } else if (app.formType === 'investment' || app.rawRecord?.id) {
        await updateInvestmentEnquiryStatus({
          id: app.rawRecord?.id || app.id,
          status: 'Under Review',
          adminNotes: 'Approved by administrator for portfolio review.',
        });
      } else {
        await fetch(getApiUrl('/api/contact-enquiry'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            id: app.rawRecord?.id || app.id,
            status: 'Under Review',
            adminNotes: 'Approved for callback scheduling.',
          }),
        });
      }
      await loadDashboard();
      setActionToast({ type: 'success', message: `✓ Application ${app.trackingRef || ref} marked as Under Review / Approved` });
    } catch (err) {
      setActionToast({ type: 'error', message: `Action failed: ${err.message}` });
    } finally {
      setBusyReference('');
    }
  };

  const handleQuickReject = async (app) => {
    const ref = app.refNumber || app.trackingRef || app.id;
    setBusyReference(ref);
    try {
      if (app.formType === 'student_loan' || app.refNumber) {
        await updateStudentLoanStatus(app.refNumber || ref, APPLICATION_STATUS.REJECTED, {
          customerRemark: 'Application could not be approved at this time based on eligibility criteria.',
        });
      } else if (app.formType === 'investment' || app.rawRecord?.id) {
        await updateInvestmentEnquiryStatus({
          id: app.rawRecord?.id || app.id,
          status: 'Rejected',
          adminNotes: 'Enquiry rejected by administrator.',
        });
      } else {
        await fetch(getApiUrl('/api/contact-enquiry'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            id: app.rawRecord?.id || app.id,
            status: 'Closed',
            adminNotes: 'Closed / Rejected by administrator.',
          }),
        });
      }
      await loadDashboard();
      setActionToast({ type: 'success', message: `Application ${app.trackingRef || ref} marked as Rejected` });
    } catch (err) {
      setActionToast({ type: 'error', message: `Action failed: ${err.message}` });
    } finally {
      setBusyReference('');
    }
  };

  const handleQuickComplete = async (app) => {
    const ref = app.refNumber || app.trackingRef || app.id;
    setBusyReference(ref);
    try {
      if (app.formType === 'student_loan' || app.refNumber) {
        await updateStudentLoanStatus(app.refNumber || ref, APPLICATION_STATUS.COMPLETED, {
          customerRemark: 'Your application has been successfully completed.',
        });
      } else if (app.formType === 'investment' || app.rawRecord?.id) {
        await updateInvestmentEnquiryStatus({
          id: app.rawRecord?.id || app.id,
          status: 'Completed',
          adminNotes: 'Enquiry fulfilled and marked as completed.',
        });
      } else {
        await fetch(getApiUrl('/api/contact-enquiry'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            id: app.rawRecord?.id || app.id,
            status: 'Enquiry Completed',
            adminNotes: 'Callback completed.',
          }),
        });
      }
      await loadDashboard();
      setActionToast({ type: 'success', message: `✓ Application ${app.trackingRef || ref} marked as Completed` });
    } catch (err) {
      setActionToast({ type: 'error', message: `Action failed: ${err.message}` });
    } finally {
      setBusyReference('');
    }
  };

  const handleConfirmDelete = async (app) => {
    const ref = app.refNumber || app.trackingRef || app.id;
    setBusyReference(ref);
    try {
      if (app.loanCategory === 'dairy_loan' || app.loanCategory === 'sheep_loan' || app.loanCategory === 'goat_loan' || app.formType === 'dairy_loan' || app.formType === 'sheep_loan' || app.formType === 'goat_loan') {
        await updateFarmLoanStatus({
          trackingId: app.trackingRef || app.trackingId || app.id,
          status: 'Closed',
          notes: 'Archived by Administrator.',
          sendNotification: false,
        });
      } else if (app.formType === 'student_loan' || app.refNumber) {
        await updateStudentLoanStatus(app.refNumber || ref, APPLICATION_STATUS.CLOSED, {
          internalNote: 'Archived and removed from active queue by Administrator.',
        });
      } else if (app.formType === 'investment' || app.rawRecord?.id) {
        await updateInvestmentEnquiryStatus({
          id: app.rawRecord?.id || app.id,
          status: 'Closed',
          adminNotes: 'Archived by Administrator.',
        });
      } else {
        await fetch(getApiUrl('/api/contact-enquiry'), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            id: app.rawRecord?.id || app.id,
            status: 'Closed',
            adminNotes: 'Archived by Administrator.',
          }),
        });
      }
      setConfirmDeleteApp(null);
      await loadDashboard();
      setActionToast({ type: 'success', message: `✓ Application ${app.trackingRef || ref} archived / deleted from active list` });
    } catch (err) {
      setActionToast({ type: 'error', message: `Delete failed: ${err.message}` });
    } finally {
      setBusyReference('');
    }
  };

  // Aggregate All Applications data
  const allSubmissions = useMemo(() => {
    const loanItems = (loanApplications || []).map((app) => {
      const cat = app.loanCategory || (app.trackingId?.startsWith('MAI-SL') ? 'student_loan' : 'student_loan');
      const label = cat === 'dairy_loan' ? 'Dairy Loan' : cat === 'sheep_loan' ? 'Sheep Loan' : cat === 'goat_loan' ? 'Goat Loan' : 'Student Loan';
      return {
        id: app.refNumber || app.trackingId || app.id,
        userId: app.userId || app.applicantUserId || app.user_id || app.rawRecord?.user_id || null,
        rawRecord: app,
        formType: cat,
        loanCategory: cat,
        formTypeLabel: label,
        trackingRef: app.trackingId,
        customerName: app.applicantName,
        email: app.applicantEmail,
        phone: app.applicantPhone,
        isEmailVerified: app.isEmailVerified,
        amount: app.loanAmount ? `₹${Number(app.loanAmount).toLocaleString('en-IN')}` : '₹1,000',
        status: app.status || 'Submitted',
        createdAt: app.submittedAt,
        updatedAt: app.updatedAt || app.submittedAt,
        documents: app.documents,
        documentMetadata: app.documentMetadata || app.rawRecord?.documentMetadata || null,
        enquiryPurpose: app.enquiryPurpose || app.rawRecord?.enquiry_purpose || null,
        farmingDetails: app.farmingDetails,
      };
    });

    const otherItems = (dashboard?.allSubmissions || []).map((s) => ({
      ...s,
      formTypeLabel: s.formType === 'investment' ? 'Investment' : s.formType === 'student_loan' ? 'Student Loan' : 'Contact / Callback',
    }));

    return [...otherItems, ...loanItems].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [dashboard?.allSubmissions, loanApplications]);

  // Filter & Paginate Submissions
  const filteredSubmissions = useMemo(() => {
    const q = submissionsSearch.trim().toLowerCase();
    let res = allSubmissions.filter((s) => {
      if (q) {
        const hay = [s.customerName, s.trackingRef, s.email, s.phone, s.amount].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (submissionsTypeFilter && s.formType !== submissionsTypeFilter) return false;
      if (submissionsStatusFilter && s.status !== submissionsStatusFilter) return false;
      if (submissionsDateFrom && new Date(s.createdAt) < new Date(submissionsDateFrom)) return false;
      if (submissionsDateTo) {
        const to = new Date(submissionsDateTo);
        to.setDate(to.getDate() + 1);
        if (new Date(s.createdAt) >= to) return false;
      }
      return true;
    });

    if (submissionsSort === 'oldest') res = [...res].reverse();
    return res;
  }, [allSubmissions, submissionsSearch, submissionsTypeFilter, submissionsStatusFilter, submissionsDateFrom, submissionsDateTo, submissionsSort]);

  const totalPages = Math.max(1, Math.ceil(filteredSubmissions.length / pageSize));
  const currentPage = Math.min(submissionsPage, totalPages);
  const pagedSubmissions = useMemo(() => {
    return filteredSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredSubmissions, currentPage, pageSize]);

  const overview = dashboard?.overview || {};

  // Status Counts
  const pendingCount = (dashboard?.submissionStats?.byStatus?.submitted || 0) + (dashboard?.submissionStats?.byStatus?.underReview || 0);
  const completedCount = (dashboard?.submissionStats?.byStatus?.completed || 0) + (dashboard?.submissionStats?.byStatus?.approved || 0);

  // Export CSV Handler
  const exportCsv = () => {
    const header = ['Tracking ID', 'Customer Name', 'Email', 'Phone', 'Type', 'Status', 'Amount', 'Submitted At'];
    const rows = filteredSubmissions.map((s) => [
      s.trackingRef || s.id,
      s.customerName || '',
      s.email || '',
      s.phone || '',
      s.formTypeLabel || s.formType || '',
      s.status || '',
      s.amount || '',
      formatDate(s.createdAt),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MAI-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 1. CHECKING SESSION SCREEN
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-[#0F172A] font-sans text-white flex items-center justify-center" role="status">
        <div className="flex flex-col items-center gap-3 text-slate-300">
          <div className="h-12 w-12 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
            <RefreshCw className="animate-spin" size={24} />
          </div>
          <span className="text-sm font-semibold tracking-wide">Validating secure admin credentials…</span>
        </div>
      </div>
    );
  }

  // 1.5 MANDATORY FIRST-TIME FINGERPRINT ENROLLMENT SCREEN
  if (showEnrollmentScreen) {
    const detectedDevice = (
      /iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'Apple iPhone' :
      /Android/i.test(navigator.userAgent) ? 'Android Mobile' :
      /Macintosh|Mac OS/i.test(navigator.userAgent) ? 'Apple Mac' :
      'Windows PC'
    );

    return (
      <div className="relative min-h-screen w-full bg-[#0A0C11] font-sans text-white flex flex-col justify-between overflow-x-hidden selection:bg-amber-500 selection:text-white">
        <DarkSilkWaveBackground />

        <header className="relative z-10 w-full px-6 sm:px-12 lg:px-20 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-lg border border-white/20">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-xs font-black tracking-[0.16em] uppercase text-white">
                MEHANDA ARMY
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                SECURITY SYSTEM
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelEnrollment}
            className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition backdrop-blur-md cursor-pointer"
          >
            Cancel & Log Out
          </button>
        </header>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-10 flex-1 flex items-center justify-center">
          <section className="w-full max-w-[460px] text-center rounded-3xl bg-[#0C101A]/95 backdrop-blur-2xl border border-amber-500/30 p-8 sm:p-10 shadow-2xl shadow-amber-950/40 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-red-600/15 blur-3xl" />

            <div className="relative z-10">
              {enrollmentSuccess ? (
                /* SUCCESS STATE */
                <div className="py-6 space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
                    <CheckCircle2 size={44} strokeWidth={2.4} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                      Fingerprint Registration Successful
                    </h2>
                    <p className="mt-2 text-xs text-emerald-300 font-medium">
                      Biometric passkey verified on server. Activating secure Admin Dashboard…
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
                    <RefreshCw size={14} className="animate-spin text-emerald-400" />
                    <span>Opening Admin Portal...</span>
                  </div>
                </div>
              ) : (
                /* ENROLLMENT PROMPT STATE */
                <div className="space-y-6">
                  {/* Glowing Fingerprint Icon */}
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-yellow-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-xl shadow-amber-950/50">
                    <Fingerprint size={42} strokeWidth={2.4} className="animate-pulse" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-3">
                      <Sparkles size={11} /> Mandatory Device Enrollment
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Register Your Fingerprint
                    </h1>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                      For maximum security, Mehanda Army Investments requires biometric authentication on this device. Your fingerprint or screen lock never leaves your device.
                    </p>
                  </div>

                  {/* Device Info Badge */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-left flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Laptop size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <span className="block font-bold text-white text-[11px]">{detectedDevice}</span>
                        <span className="text-[10px] text-slate-400">FIDO2 / WebAuthn Biometric Sensor</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase">
                      Ready
                    </span>
                  </div>

                  {/* Error Notification */}
                  {enrollmentError && (
                    <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2.5 text-left shadow-lg">
                      <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <span>{enrollmentError}</span>
                      </div>
                    </div>
                  )}

                  {/* Active Sensor Touch Prompt */}
                  {enrollmentLoading && (
                    <div className="p-4 bg-amber-500/15 border-2 border-amber-400 rounded-2xl flex flex-col items-center justify-center gap-2.5 animate-pulse text-center">
                      <div className="w-14 h-14 rounded-full bg-amber-400/20 flex items-center justify-center border-2 border-amber-400 text-amber-400 shadow-lg shadow-amber-400/30">
                        <Fingerprint size={32} className="animate-bounce" />
                      </div>
                      <div>
                        <h4 className="text-amber-300 font-black text-sm">👆 कृपया अपने फिंगरप्रिंट सेंसर पर उंगली रखें</h4>
                        <p className="text-slate-300 text-[11px] mt-0.5">Please touch and hold your fingerprint sensor now</p>
                      </div>
                    </div>
                  )}

                  {/* Clear Primary Action Button: "Add Fingerprint" */}
                  <button
                    type="button"
                    onClick={handleEnrollPasskey}
                    disabled={enrollmentLoading}
                    className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black rounded-xl text-sm transition-all shadow-xl shadow-amber-950/40 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2.5 cursor-pointer"
                  >
                    {enrollmentLoading ? (
                      <>
                        <RefreshCw size={17} className="animate-spin text-slate-950" />
                        <span className="font-bold">सेंसर पर उंगली रखें… (Listening for Fingerprint)</span>
                      </>
                    ) : (
                      <>
                        <Fingerprint size={20} strokeWidth={2.5} />
                        <span className="tracking-wide">Add Fingerprint</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-slate-400">
                    Click "Add Fingerprint" and touch your fingerprint sensor or verify with Face ID / screen lock.
                  </p>

                  {/* Emergency Owner Recovery Option */}
                  <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEnrollmentRecoveryModal(true)}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition cursor-pointer"
                    >
                      Sensor unavailable? Emergency Owner Recovery &rarr;
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEnrollment}
                      className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Cancel & Return to Login
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Emergency Recovery Modal */}
        {showEnrollmentRecoveryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl bg-[#0F1420] border border-amber-500/40 p-6 shadow-2xl text-left">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <KeyRound size={18} />
                  <span>Emergency Owner Recovery</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnrollmentRecoveryModal(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-300">
                If biometric hardware is broken or unavailable, enter your <strong>6-digit Master PIN (556511)</strong> or pre-generated <strong>Emergency Recovery Code</strong> to authorize access.
              </p>

              <form onSubmit={handleEnrollmentRecoverySubmit} className="mt-4 space-y-4">
                <input
                  type="text"
                  required
                  placeholder="Enter 556511 or MAI-SEC-XXXX-XXXX"
                  value={enrollmentRecoveryInput}
                  onChange={(e) => setEnrollmentRecoveryInput(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-black/50 px-4 py-2.5 text-sm text-white outline-none focus:border-amber-400 font-mono tracking-wider"
                />

                {enrollmentRecoveryError && (
                  <p className="text-xs text-red-400 font-medium">{enrollmentRecoveryError}</p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEnrollmentRecoveryModal(false)}
                    className="px-4 py-2 rounded-lg bg-white/10 text-xs font-bold text-slate-300 hover:bg-white/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={enrollmentRecoveryBusy}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 cursor-pointer"
                  >
                    {enrollmentRecoveryBusy && <RefreshCw size={13} className="animate-spin" />}
                    <span>Authorize Access</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="relative z-10 w-full px-6 py-4 text-center text-xs text-slate-400">
          Mehanda Army Investments · Advanced Military-Grade Passkey Security System
        </footer>
      </div>
    );
  }

  // 2. ADMIN LOGIN SCREEN (Preserved Sleek Dark Silky Wave Design)
  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen w-full bg-[#0A0C11] font-sans text-white flex flex-col justify-between overflow-x-hidden selection:bg-purple-600 selection:text-white">
        <DarkSilkWaveBackground />

        <header className="relative z-10 w-full px-6 sm:px-12 lg:px-20 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/20">
              <ShieldCheck size={22} strokeWidth={2.2} />
            </div>
            <div>
              <span className="block text-xs font-black tracking-[0.16em] uppercase text-white">
                MEHANDA ARMY
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400">
                ADMIN PORTAL
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition backdrop-blur-md"
          >
            Public website →
          </button>
        </header>

        <main className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-10 flex-1 flex items-center justify-center">
          <section className="w-full max-w-[440px] text-left rounded-3xl bg-[#0C101A]/90 backdrop-blur-2xl border border-red-500/25 p-7 sm:p-9 shadow-2xl shadow-red-950/50 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-24 -right-24 w-48 h-48 rounded-full bg-red-600/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl" />

            <div className="relative z-10">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Private Admin Portal
              </h1>
              <p className="mt-1 text-xs text-slate-400 mb-6">
                Authorized Mehanda Army Investments access only. Automated security lockout applies.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="admin-username" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Admin Username
                  </label>
                  <input
                    id="admin-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder=""
                    className="w-full rounded-xl border border-white/10 bg-[#121622]/90 hover:bg-[#161B29] focus:bg-[#161B29] px-4 py-3 text-sm text-white outline-none focus:border-red-500 transition-all shadow-inner"
                  />
                </div>

                <div>
                  <label htmlFor="admin-password" className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="admin-password"
                      name="password"
                      type={showAdminPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      maxLength={256}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder=""
                      className="w-full rounded-xl border border-white/10 bg-[#121622]/90 hover:bg-[#161B29] focus:bg-[#161B29] px-4 py-3 pr-11 text-sm text-white outline-none focus:border-red-500 transition-all shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition-colors"
                      aria-label={showAdminPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAdminPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <div className="flex justify-end text-[11px] mt-2">
                    <button
                      type="button"
                      onClick={() => setShowEmergencyUnlockModal(true)}
                      className="text-red-400 hover:text-red-300 font-medium transition cursor-pointer underline underline-offset-2"
                    >
                      Emergency Recovery &rarr;
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div role="alert" className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs flex items-start gap-2.5 backdrop-blur-md shadow-lg shadow-red-950/50">
                    <AlertCircle size={16} className="shrink-0 text-red-400 mt-0.5" />
                    <div className="flex-1">
                      <span>{errorMessage}</span>
                      {errorMessage.includes('LOCKOUT') && (
                        <button
                          type="button"
                          onClick={() => setShowEmergencyUnlockModal(true)}
                          className="block mt-2 font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg text-xs transition"
                        >
                          Unlock with Recovery Code &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-red-950/40 active:scale-[0.99] disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading && <RefreshCw size={15} className="animate-spin" />}
                  <span>Sign In to Admin Portal</span>
                </button>
              </form>

              {/* FINGERPRINT / BIOMETRIC LOGIN OPTION */}
              {isPasskeySupported && (
                <div className="mt-5 space-y-3">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-black">
                      <span className="bg-[#0C101A] px-3 text-amber-400/90 flex items-center gap-1.5">
                        <Sparkles size={11} className="text-amber-400" />
                        INSTANT BIOMETRIC ACCESS
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePasskeyLogin}
                    disabled={loading || passkeyLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-yellow-500/15 hover:from-amber-500/25 hover:via-amber-400/30 hover:to-yellow-500/25 border border-amber-400/40 text-amber-200 hover:text-white font-bold rounded-xl text-sm transition-all shadow-xl shadow-amber-950/30 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-3 group backdrop-blur-md cursor-pointer"
                  >
                    {passkeyLoading ? (
                      <RefreshCw size={18} className="animate-spin text-amber-300" />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform shadow-xs">
                        <Fingerprint size={18} strokeWidth={2.4} />
                      </div>
                    )}
                    <span className="tracking-wide">Login with Fingerprint / Passkey</span>
                  </button>

                  <p className="text-[11px] text-center text-slate-400">
                    Touch your sensor or verify with Face ID / screen lock
                  </p>
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() => setCurrentView('home')}
                  className="hover:text-slate-300 transition text-[11px]"
                >
                  &larr; Public Website
                </button>
              </div>
            </div>
          </section>
        </main>

        {/* EMERGENCY OWNER UNLOCK MODAL */}
        {showEmergencyUnlockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-md rounded-2xl bg-[#0F1422] border border-amber-500/30 p-6 text-white shadow-2xl relative">
              <button
                type="button"
                onClick={() => {
                  setShowEmergencyUnlockModal(false);
                  setEmergencyUnlockMsg(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Owner Emergency Unlock</h3>
                  <p className="text-xs text-slate-400">Clear security lock using single-use backup code</p>
                </div>
              </div>

              {emergencyUnlockMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-start gap-2 ${
                    emergencyUnlockMsg.type === 'success'
                      ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                  }`}
                >
                  {emergencyUnlockMsg.type === 'success' ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <AlertCircle size={15} className="shrink-0 mt-0.5" />}
                  <span>{emergencyUnlockMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleEmergencyUnlockSubmit} className="space-y-4">
                <div>
                  <label htmlFor="recovery-code" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Emergency Recovery Code
                  </label>
                  <input
                    id="recovery-code"
                    type="text"
                    value={emergencyCodeInput}
                    onChange={(e) => setEmergencyCodeInput(e.target.value)}
                    placeholder="e.g. MAI-SEC-8921-4402"
                    required
                    className="w-full rounded-xl border border-white/10 bg-[#161C2C] px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Enter one of your 6 offline emergency recovery codes to immediately unblock the Admin Portal.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmergencyUnlockModal(false);
                      setEmergencyUnlockMsg(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={emergencyUnlockBusy || !emergencyCodeInput.trim()}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-slate-950 transition shadow-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {emergencyUnlockBusy && <RefreshCw size={13} className="animate-spin" />}
                    <span>Unlock Portal Now</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <footer className="relative z-10 w-full px-6 py-4 text-center text-[11px] text-slate-600">
          Mehanda Army Investments • Enterprise Administration Gateway
        </footer>
      </div>
    );
  }

  // 3. ENTERPRISE SAAS ADMIN PORTAL VIEW (EXECUTIVE LUXURY SUITE)
  return (
    <div className={`min-h-screen ${adminTheme === 'dark' ? 'mai-admin-luxury bg-[#060913] text-slate-100 selection:bg-amber-500 selection:text-black' : 'bg-[#F8FAFC] text-slate-800 selection:bg-purple-600 selection:text-white'} font-sans flex flex-col antialiased transition-colors duration-300 relative`}>
      {adminTheme === 'dark' && (
        <div className="pointer-events-none fixed inset-0 z-0 opacity-40 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(217,119,6,0.15),rgba(255,255,255,0))]" />
      )}
      {/* Toast Notification */}
      {actionToast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl border animate-in slide-in-from-top-3 ${
          actionToast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-rose-600 text-white border-rose-500'
        }`}>
          {actionToast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{actionToast.message}</span>
          <button type="button" onClick={() => setActionToast(null)} className="ml-2 hover:opacity-80">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Flex Layout: Left Dark Navy/Obsidian Sidebar + Right Main Panel */}
      <div className="flex-1 flex w-full relative z-10">
        {/* MOBILE SIDEBAR BACKDROP */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* LEFT OBSIDIAN & GOLD SIDEBAR */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex flex-col ${
            adminTheme === 'dark'
              ? 'bg-[#0A0E1A]/95 border-r border-amber-500/20 shadow-2xl backdrop-blur-2xl'
              : 'bg-[#0F172A]'
          } text-slate-300 transition-all duration-300 ease-in-out lg:static ${
            sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'
          } ${mobileMenuOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        >
          {/* Sidebar Header / Brand */}
          <div className={`flex h-16 items-center justify-between px-4 border-b ${
            adminTheme === 'dark' ? 'border-amber-500/20 bg-[#080C16]' : 'border-slate-800'
          }`}>
            <div className={`flex items-center gap-3 overflow-hidden ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 shadow-lg shadow-amber-500/25 border border-amber-300/40">
                <ShieldCheck size={22} strokeWidth={2.4} />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-xs font-black tracking-widest uppercase text-white truncate">
                      Mehanda Army
                    </h1>
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-amber-400">
                    Executive Portal
                  </span>
                </div>
              )}
            </div>
            {/* Close button for mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Nav Items */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              let badge = null;
              if (id === 'submissions') badge = allSubmissions.length;
              if (id === 'loans') badge = overview.studentLoanCount ?? loanApplications.length;
              if (id === 'notifications' && pendingCount > 0) badge = pendingCount;
              if (id === 'security' && (securityData?.locks?.length || 0) > 0) badge = securityData.locks.length;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    handleTabSelect(id);
                    setMobileMenuOpen(false);
                  }}
                  title={sidebarCollapsed ? label : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500/25 via-purple-600/30 to-indigo-600/25 border-l-4 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/10 font-bold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  } ${sidebarCollapsed ? 'justify-center px-2' : ''}`}
                >
                  <Icon size={17} className={`shrink-0 ${isActive ? 'text-amber-300' : 'text-slate-400 group-hover:text-white'}`} />
                  {!sidebarCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
                  {!sidebarCollapsed && badge != null && badge > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-amber-400 text-slate-950 shadow-sm' : 'bg-slate-800 text-slate-300 border border-white/10'
                    }`}>
                      {badge}
                    </span>
                  )}
                  {/* Tooltip for collapsed mode */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-2 hidden rounded-md bg-slate-900 px-2 py-1 text-xs text-white shadow-lg group-hover:block whitespace-nowrap z-50">
                      {label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Bottom / Logout */}
          <div className="border-t border-slate-800 p-3 space-y-2">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              title={sidebarCollapsed ? 'Logout' : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/15 transition-all ${
                sidebarCollapsed ? 'justify-center px-2' : ''
              }`}
            >
              <LogOut size={16} className="shrink-0" />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </aside>

        {/* RIGHT MAIN CONTENT AREA */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* TOP RESPONSIVE HEADER */}
          <header className={`sticky top-0 z-30 flex h-16 items-center justify-between border-b ${
            adminTheme === 'dark' ? 'border-amber-500/15 bg-[#0A0E1A]/90 backdrop-blur-xl' : 'border-slate-200 bg-white'
          } px-4 sm:px-6 shadow-xs`}>
            <div className="flex items-center gap-3">
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className={`lg:hidden rounded-lg p-2 ${
                  adminTheme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-100'
                }`}
                aria-label="Open navigation menu"
              >
                <Menu size={20} />
              </button>

              {/* Desktop collapse toggle */}
              <button
                type="button"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`hidden lg:flex rounded-lg p-2 ${
                  adminTheme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                } transition`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <Menu size={18} />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-xs">
                <span className={`font-semibold ${adminTheme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Admin Portal</span>
                <span className="text-amber-500/40">/</span>
                <span className={`font-bold capitalize ${adminTheme === 'dark' ? 'text-amber-300' : 'text-slate-900'}`}>
                  {TABS.find((t) => t.id === activeTab)?.label || 'Overview'}
                </span>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme Toggle: Executive Luxury vs Daylight */}
              <button
                type="button"
                onClick={() => {
                  const nextTheme = adminTheme === 'dark' ? 'light' : 'dark';
                  setAdminTheme(nextTheme);
                  try { localStorage.setItem('mai_admin_theme', nextTheme); } catch {}
                }}
                title={adminTheme === 'dark' ? 'Switch to Classic Daylight Mode' : 'Switch to Executive Luxury Dark Mode'}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition shadow-xs ${
                  adminTheme === 'dark'
                    ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                    : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {adminTheme === 'dark' ? (
                  <>
                    <Sparkles size={13} className="text-amber-400" />
                    <span className="hidden sm:inline">Executive Luxury</span>
                  </>
                ) : (
                  <>
                    <Sun size={13} className="text-amber-500" />
                    <span className="hidden sm:inline">Daylight</span>
                  </>
                )}
              </button>

              {/* Live Date Time */}
              <div className="hidden md:block">
                <LiveDateTime className={`text-xs ${
                  adminTheme === 'dark' ? 'text-amber-200/90 bg-[#0E1527] border-amber-500/25' : 'text-slate-600 bg-slate-50 border-slate-200'
                } border px-3 py-1.5 rounded-lg font-medium`} />
              </div>

              {/* Public Website Button */}
              <button
                type="button"
                onClick={() => setCurrentView('home')}
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  adminTheme === 'dark'
                    ? 'border-white/10 bg-[#0E1527] text-slate-200 hover:bg-slate-800 hover:border-amber-500/40 hover:text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ExternalLink size={13} />
                <span>Website</span>
              </button>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={() => loadDashboard().catch((err) => setErrorMessage(err.message))}
                disabled={loading}
                title="Refresh real-time data"
                className={`rounded-lg border p-2 transition disabled:opacity-50 ${
                  adminTheme === 'dark'
                    ? 'border-white/10 bg-[#0E1527] text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <RefreshCw size={15} className={loading ? 'animate-spin text-amber-400' : ''} />
              </button>

              {/* Notifications Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className={`relative rounded-lg border p-2 transition ${
                    adminTheme === 'dark'
                      ? 'border-white/10 bg-[#0E1527] text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  aria-label="View notifications"
                >
                  <Bell size={16} />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-slate-950 shadow-xs">
                      {pendingCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-amber-500/30 bg-[#0C1222] p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 px-1">
                      <span className="text-xs font-bold text-white">Notifications &amp; Alerts</span>
                      <span className="text-[10px] font-bold text-amber-400">{pendingCount} pending</span>
                    </div>
                    <div className="divide-y divide-white/5 py-1 max-h-60 overflow-y-auto">
                      {pendingCount > 0 ? (
                        <div
                          className="py-2 px-1 cursor-pointer hover:bg-white/5 rounded-lg transition"
                          onClick={() => {
                            setActiveTab('submissions');
                            setSubmissionsStatusFilter('Submitted');
                            setNotificationsOpen(false);
                          }}
                        >
                          <p className="text-xs font-semibold text-slate-200">
                            {pendingCount} applications awaiting review
                          </p>
                          <p className="text-[10px] text-amber-300/80 mt-0.5">Click to view pending submissions queue</p>
                        </div>
                      ) : (
                        <p className="py-4 text-center text-xs text-slate-400">All applications up to date</p>
                      )}
                      {(dashboard?.activity || []).slice(0, 3).map((act, i) => (
                        <div key={i} className="py-2 px-1 text-[11px] text-slate-300">
                          <span className="font-medium text-white">{act.action?.replaceAll('_', ' ')}</span>
                          <span className="block text-[9px] text-slate-500">{formatDate(act.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-white/10 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('notifications');
                          setNotificationsOpen(false);
                        }}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300"
                      >
                        View all notification logs →
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Profile & Role Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className={`flex items-center gap-2.5 rounded-xl border p-1.5 pr-3 transition shadow-xs ${
                    adminTheme === 'dark'
                      ? 'border-amber-500/35 bg-[#0E1527] hover:border-amber-400/60'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <Avatar name={adminProfile.name} email={adminProfile.email} avatarUrl={adminProfile.avatarUrl} size="sm" />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-white flex items-center gap-1 leading-tight">
                      <span>{adminProfile.name}</span>
                      <span className="text-amber-400 text-[10px]">👑</span>
                    </p>
                    <p className="text-[10px] font-black text-amber-400 leading-tight tracking-wider uppercase">Super Admin</p>
                  </div>
                  <ChevronDown size={14} className="text-amber-400/70" />
                </button>

                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2.5 border-b border-slate-100 flex items-center gap-3">
                      <Avatar name={adminProfile.name} email={adminProfile.email} avatarUrl={adminProfile.avatarUrl} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{adminProfile.name}</p>
                        <p className="text-[11px] text-slate-500 truncate">{adminProfile.email}</p>
                        <span className="inline-block mt-0.5 rounded bg-purple-50 text-purple-700 px-1.5 py-0.2 text-[9px] font-bold">
                          Super Admin
                        </span>
                      </div>
                    </div>
                    <div className="py-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleTabSelect('settings');
                          setAdminMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <KeyRound size={14} className="text-purple-600" />
                        <span>Change Password &amp; Profile</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleTabSelect('settings');
                          setAdminMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <Settings size={14} className="text-slate-400" />
                        <span>Portal Settings</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentView('home');
                          setAdminMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <ExternalLink size={14} className="text-slate-400" />
                        <span>Public Website</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          loadDashboard();
                          setAdminMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 transition"
                      >
                        <RefreshCw size={14} className="text-slate-400" />
                        <span>Refresh Data</span>
                      </button>
                    </div>
                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setAdminMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 transition"
                      >
                        <LogOut size={14} />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* MAIN TAB CONTENT AREA */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <AdminErrorBoundary>
              {errorMessage && (
                <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-800 shadow-xs">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 1: DASHBOARD (OVERVIEW) */}
              {/* ============================================================== */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Greeting Banner — Executive Luxury Suite */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0C1220] via-[#1E1B4B] to-[#0D1527] border border-amber-500/35 p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/5">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/15 blur-3xl" />
                    <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-purple-600/20 blur-3xl" />

                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[11px] font-bold text-amber-300 mb-2.5">
                          <ShieldCheck size={13} className="text-amber-400" />
                          <span>Mehanda Army Investments • Super Admin Terminal</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                          <span>Welcome back, Deepak Jangra</span>
                          <span className="text-amber-400">👑</span>
                        </h2>
                        <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                          Institutional control terminal. Manage loan approvals, investor wealth desk, applicant verification proofs and automated email alerts.
                        </p>
                      </div>
                      <div className="relative z-10 flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('submissions');
                            setSubmissionsStatusFilter('');
                          }}
                          className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all shadow-lg shadow-amber-500/25 flex items-center gap-1.5"
                        >
                          <span>View Submissions</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Real WebAuthn / Passkey Device Quick-Access Card */}
                  {isPasskeySupported && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E1528] via-[#161D33] to-[#0A0E1A] border border-amber-500/30 p-5 shadow-xl text-white">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow-xs">
                            <Fingerprint size={24} strokeWidth={2.4} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white">
                                Biometric Fingerprint / Passkey Login
                              </h3>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {registeredDevices.length} {registeredDevices.length === 1 ? 'Device' : 'Devices'} Registered
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                              Register this device so you can open your Admin Dashboard next time with your fingerprint or face recognition in 1 second.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRegisterDevice()}
                            disabled={registeringDevice}
                            className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2.5 text-xs font-black text-slate-950 transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {registeringDevice ? (
                              <RefreshCw size={14} className="animate-spin" />
                            ) : (
                              <Fingerprint size={15} strokeWidth={2.5} />
                            )}
                            <span>Register This Device</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTabSelect('settings')}
                            className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
                            title="Manage Registered Devices"
                          >
                            Manage
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 7 CLICKABLE REAL-TIME SUMMARY STAT CARDS */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* 1. Total Applications */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveTab('submissions');
                        setSubmissionsTypeFilter('');
                        setSubmissionsStatusFilter('');
                      }}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Total Applications</span>
                        <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                          <FileText size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                        {allSubmissions.length}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Across all services</span>
                        <span className="font-semibold text-purple-600 group-hover:translate-x-0.5 transition">View all &rarr;</span>
                      </div>
                    </div>

                    {/* 2. Registered Customers */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveTab('customers')}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-blue-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Registered Customers</span>
                        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                          <Users size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                        {overview.customerCount ?? 0}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Active accounts</span>
                        <span className="font-semibold text-blue-600 group-hover:translate-x-0.5 transition">Manage &rarr;</span>
                      </div>
                    </div>

                    {/* 3. Student Loan Applications */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveTab('loans')}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Student Loan Apps</span>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                          <GraduationCap size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                        {overview.studentLoanCount ?? loanApplications.length}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Education assistance</span>
                        <span className="font-semibold text-emerald-600 group-hover:translate-x-0.5 transition">View loans &rarr;</span>
                      </div>
                    </div>

                    {/* 4. Investment Applications */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveTab('investments')}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Investment Apps</span>
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                          <TrendingUp size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-slate-900 tracking-tight">
                        {overview.investmentEnquiryCount ?? (dashboard?.investmentRecords?.length || 0)}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Portfolio planning</span>
                        <span className="font-semibold text-indigo-600 group-hover:translate-x-0.5 transition">View portfolios &rarr;</span>
                      </div>
                    </div>

                    {/* 5. Pending Applications */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveTab('submissions');
                        setSubmissionsStatusFilter('Submitted');
                      }}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Pending Review</span>
                        <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                          <Clock size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-amber-600 tracking-tight">
                        {pendingCount}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Requires action</span>
                        <span className="font-semibold text-amber-600 group-hover:translate-x-0.5 transition">Review now &rarr;</span>
                      </div>
                    </div>

                    {/* 6. Approved / Completed Applications */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveTab('submissions');
                        setSubmissionsStatusFilter('Completed');
                      }}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Approved / Completed</span>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                          <CheckCircle2 size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-emerald-600 tracking-tight">
                        {completedCount}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>Fulfilled records</span>
                        <span className="font-semibold text-emerald-600 group-hover:translate-x-0.5 transition">View completed &rarr;</span>
                      </div>
                    </div>

                    {/* 7. Verified Service Fees */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveTab('payments')}
                      className="group cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-300 hover:shadow-md transition-all text-left sm:col-span-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Verified Service Fees</span>
                        <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition">
                          <CreditCard size={18} />
                        </div>
                      </div>
                      <p className="mt-3 text-3xl font-black text-purple-700 tracking-tight">
                        ₹{Number(overview.verifiedServiceFeeTotal || 0).toLocaleString('en-IN')}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        <span>{overview.serviceFeeRecordCount || 0} recorded fee transactions</span>
                        <span className="font-semibold text-purple-600 group-hover:translate-x-0.5 transition">View ledger &rarr;</span>
                      </div>
                    </div>
                  </div>

                  {/* RECENT APPLICATIONS TABLE ON DASHBOARD */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Recent Applications</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Latest customer submissions across all services</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('submissions')}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700"
                      >
                        View all {allSubmissions.length} applications &rarr;
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="py-3 px-5">Customer</th>
                            <th className="py-3 px-4">Application ID</th>
                            <th className="py-3 px-4">Type</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {allSubmissions.slice(0, 6).map((app) => (
                            <tr key={app.id} className="hover:bg-slate-50/70 transition">
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  <Avatar name={app.customerName} email={app.email} size="sm" />
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-900 truncate">{app.customerName || 'Anonymous'}</p>
                                    <p className="text-[11px] text-slate-500 truncate">{app.email || '—'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4 font-mono font-medium text-purple-700">
                                {app.trackingRef || app.id}
                              </td>
                              <td className="py-3 px-4">
                                <ApplicationTypeBadge type={app.formType} label={app.formTypeLabel} />
                              </td>
                              <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                                {formatShortDate(app.createdAt)}
                              </td>
                              <td className="py-3 px-4">
                                <StatusBadge status={app.status} />
                              </td>
                              <td className="py-3 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setDetailApp(app)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                                >
                                  <Eye size={12} /> View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 2: ALL APPLICATIONS (MANAGEMENT DATA TABLE) */}
              {/* ============================================================== */}
              {activeTab === 'submissions' && (
                <div className="space-y-5">
                  {/* Header Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Application Management</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Search, filter, review, approve, reject, and manage customer applications in real-time.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={exportCsv}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-xs"
                      >
                        <Download size={14} /> Export CSV
                      </button>
                    </div>
                  </div>

                  {/* Search & Filter Bar */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Search */}
                      <div className="relative">
                        <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="search"
                          value={submissionsSearch}
                          onChange={(e) => {
                            setSubmissionsSearch(e.target.value);
                            setSubmissionsPage(1);
                          }}
                          placeholder="Search name, email, ID..."
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                        />
                      </div>

                      {/* Filter by Type */}
                      <select
                        value={submissionsTypeFilter}
                        onChange={(e) => {
                          setSubmissionsTypeFilter(e.target.value);
                          setSubmissionsPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                      >
                        <option value="">All Application Types</option>
                        <option value="student_loan">Student Loan Applications</option>
                        <option value="dairy_loan">Dairy Loan Applications</option>
                        <option value="sheep_loan">Sheep Loan Applications</option>
                        <option value="goat_loan">Goat Loan Applications</option>
                        <option value="investment">Investment Applications</option>
                        <option value="contact">Service / Contact Enquiries</option>
                      </select>

                      {/* Filter by Status */}
                      <select
                        value={submissionsStatusFilter}
                        onChange={(e) => {
                          setSubmissionsStatusFilter(e.target.value);
                          setSubmissionsPage(1);
                        }}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                      >
                        <option value="">All Statuses</option>
                        {ENQUIRY_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>

                      {/* Sort */}
                      <select
                        value={submissionsSort}
                        onChange={(e) => setSubmissionsSort(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                      >
                        <option value="newest">Newest first</option>
                        <option value="oldest">Oldest first</option>
                      </select>
                    </div>

                    {/* Date Filters & Page Size */}
                    <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-slate-100">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">From Date</label>
                        <input
                          type="date"
                          value={submissionsDateFrom}
                          onChange={(e) => {
                            setSubmissionsDateFrom(e.target.value);
                            setSubmissionsPage(1);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">To Date</label>
                        <input
                          type="date"
                          value={submissionsDateTo}
                          onChange={(e) => {
                            setSubmissionsDateTo(e.target.value);
                            setSubmissionsPage(1);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Rows per Page</label>
                        <select
                          value={pageSize}
                          onChange={(e) => {
                            setPageSize(Number(e.target.value));
                            setSubmissionsPage(1);
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                        >
                          <option value={10}>10 records</option>
                          <option value={25}>25 records</option>
                          <option value={50}>50 records</option>
                          <option value={100}>100 records</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* DATA TABLE */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    {pagedSubmissions.length === 0 ? (
                      <EmptyState
                        title="No matching applications"
                        message="Try clearing or adjusting your search filters to find what you need."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[950px]">
                          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-5">Customer</th>
                              <th className="py-3 px-4">Contact</th>
                              <th className="py-3 px-4">Application ID</th>
                              <th className="py-3 px-4">Type</th>
                              <th className="py-3 px-4">Submission Date</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {pagedSubmissions.map((s) => {
                              const isRowBusy = busyReference === (s.refNumber || s.trackingRef || s.id);

                              return (
                                <tr key={s.id} className="hover:bg-slate-50/70 transition">
                                  {/* Customer Name & Avatar */}
                                  <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                      <Avatar name={s.customerName} email={s.email} size="sm" />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <p className="font-bold text-slate-900 truncate">{s.customerName || 'Anonymous'}</p>
                                          {s.isEmailVerified && (
                                            <span title="Verified Gmail">
                                              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate">{s.amount ? `Amount: ${s.amount}` : ''}</p>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Email & Phone */}
                                  <td className="py-3.5 px-4">
                                    <p className="text-slate-800 font-medium truncate max-w-[160px]">{s.email || '—'}</p>
                                    <p className="text-[11px] text-slate-500">{s.phone || '—'}</p>
                                  </td>

                                  {/* Application ID */}
                                  <td className="py-3.5 px-4 font-mono font-semibold text-purple-700 whitespace-nowrap">
                                    {s.trackingRef || s.id}
                                  </td>

                                  {/* Type */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <ApplicationTypeBadge type={s.formType} label={s.formTypeLabel} />
                                  </td>

                                  {/* Submission Date */}
                                  <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                                    {formatDate(s.createdAt)}
                                  </td>

                                  {/* Current Status */}
                                  <td className="py-3.5 px-4 whitespace-nowrap">
                                    <StatusBadge status={s.status} />
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3.5 px-5 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1">
                                      {/* View Details */}
                                      <button
                                        type="button"
                                        onClick={() => setDetailApp(s)}
                                        className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-50 transition"
                                        title="View full details and verification documents"
                                      >
                                        <Eye size={15} />
                                      </button>

                                      {/* Quick Approve */}
                                      <button
                                        type="button"
                                        disabled={isRowBusy}
                                        onClick={() => handleQuickApprove(s)}
                                        className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
                                        title="Quick Approve / Move to Under Review"
                                      >
                                        <Check size={15} />
                                      </button>

                                      {/* Quick Mark as Completed */}
                                      <button
                                        type="button"
                                        disabled={isRowBusy}
                                        onClick={() => handleQuickComplete(s)}
                                        className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-50"
                                        title="Mark as Completed"
                                      >
                                        <CheckCircle2 size={15} />
                                      </button>

                                      {/* Quick Reject */}
                                      <button
                                        type="button"
                                        disabled={isRowBusy}
                                        onClick={() => handleQuickReject(s)}
                                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                                        title="Reject Application"
                                      >
                                        <XCircle size={15} />
                                      </button>

                                      {/* Delete with Confirmation */}
                                      <button
                                        type="button"
                                        disabled={isRowBusy}
                                        onClick={() => setConfirmDeleteApp(s)}
                                        className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                                        title="Delete / Archive Application"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
                      <div>
                        Showing <span className="font-bold text-slate-800">{Math.min(filteredSubmissions.length, (currentPage - 1) * pageSize + 1)}</span> to{' '}
                        <span className="font-bold text-slate-800">{Math.min(filteredSubmissions.length, currentPage * pageSize)}</span> of{' '}
                        <span className="font-bold text-slate-800">{filteredSubmissions.length}</span> applications
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSubmissionsPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage <= 1}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs"
                        >
                          Previous
                        </button>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum = i + 1;
                          if (totalPages > 5 && currentPage > 3) {
                            pageNum = currentPage - 2 + i;
                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                          }
                          return (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setSubmissionsPage(pageNum)}
                              className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                currentPage === pageNum
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-2xs'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          type="button"
                          onClick={() => setSubmissionsPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage >= totalPages}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition shadow-2xs"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 3: LOAN APPLICATIONS (4 CATEGORIES) */}
              {/* ============================================================== */}
              {activeTab === 'loans' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Loan Applications</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Consolidated loan enquiries across all 4 categories: Student Loan, Dairy Loan, Sheep Loan, and Goat Loan.
                      </p>
                    </div>
                  </div>

                  {loanError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                      {loanError}
                    </div>
                  )}

                  {/* 4 Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLoanCategoryFilter('all')}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                        loanCategoryFilter === 'all'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      All Categories ({loanCategoryCounts.all})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanCategoryFilter('student_loan')}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                        loanCategoryFilter === 'student_loan'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <GraduationCap size={14} /> Student Loan ({loanCategoryCounts.student_loan})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanCategoryFilter('dairy_loan')}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                        loanCategoryFilter === 'dairy_loan'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Milk size={14} /> Dairy Loan ({loanCategoryCounts.dairy_loan})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanCategoryFilter('sheep_loan')}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                        loanCategoryFilter === 'sheep_loan'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Wheat size={14} /> Sheep Loan ({loanCategoryCounts.sheep_loan})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoanCategoryFilter('goat_loan')}
                      className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                        loanCategoryFilter === 'goat_loan'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Sprout size={14} /> Goat Loan ({loanCategoryCounts.goat_loan})
                    </button>
                  </div>

                  {/* Filter form */}
                  <form onSubmit={handleLoanFilter} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <input
                        type="search"
                        value={loanSearch}
                        onChange={(e) => setLoanSearch(e.target.value)}
                        placeholder="Search Name, Email, Phone, or Tracking ID..."
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                      />
                      <select
                        value={loanStatusFilter}
                        onChange={(e) => setLoanStatusFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                      >
                        <option value="">All Statuses</option>
                        {ENQUIRY_STATUSES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={loanFromDate}
                        onChange={(e) => setLoanFromDate(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="flex-1 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 transition shadow-xs"
                        >
                          Refresh / Apply
                        </button>
                        {(loanSearch || loanStatusFilter || loanFromDate || loanCategoryFilter !== 'all') && (
                          <button
                            type="button"
                            onClick={() => {
                              setLoanSearch('');
                              setLoanStatusFilter('');
                              setLoanFromDate('');
                              setLoanToDate('');
                              setLoanCategoryFilter('all');
                            }}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  </form>

                  {/* Loan applications table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    {filteredLoanApplications.length === 0 ? (
                      <EmptyState title="No loan applications found" message="No applications currently match your selected category or filter criteria." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[950px]">
                          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-5">Category &amp; Tracking ID</th>
                              <th className="py-3 px-4">Applicant &amp; Contact</th>
                              <th className="py-3 px-4">Purpose / Operational Details</th>
                              <th className="py-3 px-4">Requested Amount</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4">Submitted</th>
                              <th className="py-3 px-5 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredLoanApplications.map((app) => (
                              <tr key={app.refNumber || app.trackingId || app.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center gap-2 mb-1">
                                    <ApplicationTypeBadge
                                      type={app.loanCategory || 'student_loan'}
                                      label={app.categoryLabel || 'Loan Application'}
                                    />
                                  </div>
                                  <p className="font-mono font-bold text-purple-700 text-xs">{app.trackingId || app.tracking_id}</p>
                                  {app.upiUtr && (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 mt-1">
                                      <CheckCircle2 size={10} /> Platform Fee Paid · UTR: {app.upiUtr}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <p className="font-bold text-slate-900">{app.applicantName || app.customerName}</p>
                                  <p className="text-[11px] text-slate-500">{app.applicantEmail || app.email}</p>
                                  <p className="text-[11px] text-slate-500">{app.applicantPhone || app.phone}</p>
                                </td>
                                <td className="py-3.5 px-4 max-w-xs">
                                  {app.loanCategory === 'student_loan' || app.trackingId?.startsWith('MAI-SL') ? (
                                    <>
                                      <p className="font-semibold text-slate-800 truncate">{app.institutionName || 'Student Education Loan'}</p>
                                      <p className="text-[11px] text-slate-500 truncate">{app.courseName || 'Identity Verification'}</p>
                                    </>
                                  ) : (
                                    <>
                                      <p className="font-semibold text-slate-800 truncate">{app.loanPurpose || 'Livestock Farming'}</p>
                                      {app.farmingDetails && (
                                        <p className="text-[11px] text-slate-500 truncate">
                                          {app.farmingDetails.proposedLivestockCount ? `Proposed: ${app.farmingDetails.proposedLivestockCount} head` : ''}
                                          {app.farmingDetails.landArea ? ` · Area: ${app.farmingDetails.landArea}` : ''}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  ₹{Number(app.loanAmount || 0).toLocaleString('en-IN')}
                                </td>
                                <td className="py-3.5 px-4">
                                  <StatusBadge status={app.status} />
                                </td>
                                <td className="py-3.5 px-4 text-slate-600">
                                  {formatDate(app.submittedAt)}
                                </td>
                                <td className="py-3.5 px-5 text-right">
                                  <button
                                    type="button"
                                    onClick={() => setDetailApp({
                                      ...app,
                                      formType: app.loanCategory || 'student_loan',
                                      formTypeLabel: app.categoryLabel || 'Loan Application',
                                      rawRecord: app.rawRecord || app,
                                    })}
                                    className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                                  >
                                    <Eye size={13} /> View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 4: INVESTMENT APPLICATIONS */}
              {/* ============================================================== */}
              {activeTab === 'investments' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Investment Applications</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Wealth planning preferences, portfolio sizing, and investor consultation enquiries.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      type="search"
                      value={investmentSearch}
                      onChange={(e) => setInvestmentSearch(e.target.value)}
                      placeholder="Search name, tracking ID, email..."
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-purple-600 focus:outline-none"
                    />
                    <select
                      value={investmentStatusFilter}
                      onChange={(e) => setInvestmentStatusFilter(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs focus:border-purple-600 focus:outline-none"
                    >
                      <option value="">All Statuses</option>
                      {INVESTMENT_ENQUIRY_STATUSES.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                  </div>

                  {(() => {
                    const records = (dashboard?.investmentRecords || []).filter((rec) => {
                      const q = investmentSearch.trim().toLowerCase();
                      const matchQ = !q || (rec.name && rec.name.toLowerCase().includes(q)) || (rec.trackingId && rec.trackingId.toLowerCase().includes(q)) || (rec.email && rec.email.toLowerCase().includes(q));
                      const matchStatus = !investmentStatusFilter || rec.status === investmentStatusFilter;
                      return matchQ && matchStatus;
                    });

                    if (records.length === 0) {
                      return <EmptyState title="No investment records" message="No investment applications matching selected filters." />;
                    }

                    return (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {records.map((rec) => (
                          <div key={rec.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                              <div>
                                <span className="font-mono text-xs font-bold text-purple-700">{rec.trackingId || rec.id}</span>
                                <h3 className="font-bold text-slate-900 text-sm mt-0.5">{rec.name}</h3>
                                <p className="text-xs text-slate-500">{rec.email} · {rec.phone}</p>
                              </div>
                              <StatusBadge status={rec.status || 'Submitted'} />
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Planned Amount</span>
                                <span className="font-semibold text-slate-800">{rec.plannedAmount || 'Not specified'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Category</span>
                                <span className="font-semibold text-slate-800">{rec.interestCategory || 'General'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Horizon</span>
                                <span className="font-semibold text-slate-800">{rec.horizon || 'Not specified'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Risk Appetite</span>
                                <span className="font-semibold text-slate-800">{rec.riskUnderstanding || 'Moderate'}</span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] text-slate-400">{formatShortDate(rec.createdAt)}</span>
                              <button
                                type="button"
                                onClick={() => setDetailApp({ ...rec, formType: 'investment', formTypeLabel: 'Investment Application' })}
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                              >
                                <Eye size={12} /> View Details &amp; Update
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 5: SERVICE / CONTACT APPLICATIONS */}
              {/* ============================================================== */}
              {activeTab === 'contact' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Service / Contact Applications</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Consultation requests and callback enquiries submitted through public forms.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const records = dashboard?.contactRecords || [];
                    if (records.length === 0) {
                      return <EmptyState title="No contact enquiries" message="No customer consultation requests saved yet." />;
                    }

                    return (
                      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[800px]">
                            <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="py-3 px-5">Customer Name</th>
                                <th className="py-3 px-4">Contact</th>
                                <th className="py-3 px-4">Message / Query</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Date</th>
                                <th className="py-3 px-5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {records.map((rec) => (
                                <tr key={rec.id} className="hover:bg-slate-50/70 transition">
                                  <td className="py-3.5 px-5 font-bold text-slate-900">{rec.name}</td>
                                  <td className="py-3.5 px-4">
                                    <p className="text-slate-800">{rec.email || '—'}</p>
                                    <p className="text-[11px] text-slate-500">{rec.phone || '—'}</p>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">{rec.message || 'Callback requested'}</td>
                                  <td className="py-3.5 px-4"><StatusBadge status={rec.status || 'Submitted'} /></td>
                                  <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">{formatDate(rec.createdAt)}</td>
                                  <td className="py-3.5 px-5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setDetailApp({ ...rec, formType: 'contact', formTypeLabel: 'Service / Contact Enquiry' })}
                                      className="inline-flex items-center gap-1 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 hover:bg-purple-100 transition"
                                    >
                                      <Eye size={12} /> View
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 6: REGISTERED CUSTOMERS */}
              {/* ============================================================== */}
              {activeTab === 'customers' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Registered Customers</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Profiles and authenticated user accounts stored in Supabase Auth and database tables.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    {(dashboard?.customers || []).length === 0 ? (
                      <EmptyState title="No customer profiles" message="No registered accounts in the Supabase database." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[700px]">
                          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-5">Customer</th>
                              <th className="py-3 px-4">Masked Email</th>
                              <th className="py-3 px-4">Account Status</th>
                              <th className="py-3 px-5 text-right">Registered On</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(dashboard?.customers || []).map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3.5 px-5">
                                  <div className="flex items-center gap-3">
                                    <Avatar name={c.name} email={c.emailMasked} size="sm" />
                                    <span className="font-bold text-slate-900">{c.name || 'Registered User'}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-mono text-slate-600">{c.emailMasked}</td>
                                <td className="py-3.5 px-4">
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                    {c.accountStatus?.replaceAll('_', ' ') || 'Active'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-5 text-right text-slate-500">{formatDate(c.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 7: SERVICE FEES */}
              {/* ============================================================== */}
              {activeTab === 'payments' && (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight">Service Fee Records</h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Verified fee receipts and recorded transactions.
                      </p>
                    </div>
                    <div className="rounded-xl bg-purple-50 border border-purple-200 px-4 py-2 text-xs font-bold text-purple-700">
                      Total Verified: ₹{Number(overview.verifiedServiceFeeTotal || 0).toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    {(dashboard?.payments || []).length === 0 ? (
                      <EmptyState title="No payment records" message="No service fee receipts saved in Supabase." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[700px]">
                          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                            <tr>
                              <th className="py-3 px-5">Receipt Reference</th>
                              <th className="py-3 px-4">Service</th>
                              <th className="py-3 px-4">Amount</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-5 text-right">Created Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(dashboard?.payments || []).map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/70 transition">
                                <td className="py-3.5 px-5 font-mono font-bold text-purple-700">{p.receiptNumber}</td>
                                <td className="py-3.5 px-4 font-semibold text-slate-800">{p.serviceName}</td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">₹{Number(p.amount || 0).toLocaleString('en-IN')}</td>
                                <td className="py-3.5 px-4"><StatusBadge status={p.status || 'Verified'} /></td>
                                <td className="py-3.5 px-5 text-right text-slate-500">{formatDate(p.createdAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB 8: NOTIFICATIONS & AUDIT LOGS */}
              {/* ============================================================== */}
              {activeTab === 'notifications' && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">System &amp; Email Notifications Log</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Automated customer status emails, admin audit trails, and delivery records.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-purple-700">Recent Admin Activity</h3>
                    <div className="divide-y divide-slate-100">
                      {(dashboard?.activity || []).map((entry, index) => (
                        <div key={`${entry.createdAt}-${index}`} className="py-3 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{entry.action.replaceAll('_', ' ')}</span>
                          <span className="text-slate-400">{formatDate(entry.createdAt)}</span>
                        </div>
                      ))}
                      {(dashboard?.activity || []).length === 0 && (
                        <p className="text-xs text-slate-400 py-3 text-center">No recent admin actions recorded.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB: OWNER SECURITY SHIELD & LOCKOUT MANAGEMENT */}
              {/* ============================================================== */}
              {activeTab === 'security' && !isPinVerified && (
                <div className="mx-auto my-12 max-w-md rounded-3xl border border-amber-500/30 bg-[#0C101A] p-8 text-center text-white shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-400/30">
                    <LockKeyhole size={28} />
                  </div>
                  <h3 className="text-lg font-black text-white">Security Shield Locked</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    This section contains sensitive perimeter locks, trusted biometric devices, and emergency recovery codes. Master Owner PIN verification is required.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingProtectedTab('security');
                      setShowPinModal(true);
                      setPinInput('');
                      setPinError('');
                    }}
                    className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition shadow-lg cursor-pointer"
                  >
                    Enter 6-Digit PIN to Unlock
                  </button>
                </div>
              )}
              {activeTab === 'security' && isPinVerified && (
                <div className="space-y-6 max-w-6xl">
                  {/* Top Security Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-[11px] font-black text-red-400 mb-1.5">
                        <ShieldCheck size={13} className="text-red-400" />
                        <span>OWNER-ONLY SECURITY TERMINAL • SUPER ADMIN</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>Security Shield &amp; Lockout Control</span>
                        <span className="text-amber-500">👑</span>
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500 max-w-2xl">
                        Real-time perimeter monitoring, automated 3-strike brute-force lockout, instant Gmail alert dispatching, and hardware WebAuthn passkey management.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={loadSecurityData}
                        disabled={securityLoading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition cursor-pointer"
                      >
                        <RefreshCw size={13} className={securityLoading ? 'animate-spin text-purple-600' : 'text-slate-500'} />
                        <span>Refresh Security</span>
                      </button>
                    </div>
                  </div>

                  {/* System Status Banner */}
                  {(securityData?.locks?.length || 0) > 0 ? (
                    <div className="rounded-2xl border border-red-500/40 bg-gradient-to-r from-red-950/40 via-red-900/30 to-slate-900 p-5 shadow-xl text-white">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start sm:items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                            <AlertTriangle size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-red-300">
                                AUTOMATED SECURITY LOCKOUT ACTIVE
                              </h3>
                              <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                                {securityData.locks.length} BLOCKED
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-0.5">
                              3 consecutive failed login attempts were detected. Automated IP &amp; account locks are enforcing restriction. Alerts dispatched to verified Owner Gmail.
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSecuritySubTab('locks')}
                          className="self-end sm:self-center px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition shadow-md cursor-pointer shrink-0"
                        >
                          Review &amp; Unlock &rarr;
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/20 via-[#0B1522] to-slate-900 p-4 sm:p-5 shadow-lg text-white">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                            <ShieldCheck size={22} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs sm:text-sm font-bold text-white">
                                Perimeter Defense Active • System Secure
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                0 Active Locks
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Server-side brute-force defense active (3-attempt threshold). Security notifications routed to: <strong className="text-amber-300">{securityData?.overview?.ownerEmail || 'mehandaarmy.info@gmail.com'}</strong>.
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] font-mono text-emerald-400 font-bold px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 shrink-0">
                          ALL GATES SECURE
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 4 Summary Stat Cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSecuritySubTab('locks')}
                      className={`cursor-pointer rounded-2xl border p-5 shadow-xs transition-all text-left ${
                        (securityData?.locks?.length || 0) > 0
                          ? 'border-red-400 bg-red-50/50 hover:bg-red-50'
                          : 'border-slate-200 bg-white hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Active Locks</span>
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
                          (securityData?.locks?.length || 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          <LockKeyhole size={16} />
                        </div>
                      </div>
                      <p className={`mt-2 text-2xl font-black ${
                        (securityData?.locks?.length || 0) > 0 ? 'text-red-600' : 'text-slate-900'
                      }`}>
                        {securityData?.locks?.length || 0}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Account &amp; IP Locks</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSecuritySubTab('failed')}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Failed Attempts Logged</span>
                        <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <AlertCircle size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-amber-600">
                        {securityData?.failedLogins?.length || 0}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">With IP, Device &amp; Timestamp</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSecuritySubTab('alerts')}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-purple-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Security Alerts</span>
                        <div className="h-8 w-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Bell size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-purple-700">
                        {securityData?.alerts?.length || 0}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Dispatched to Owner Gmail</span>
                    </div>

                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSecuritySubTab('devices')}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-300 transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">Trusted Passkeys</span>
                        <div className="h-8 w-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Fingerprint size={16} />
                        </div>
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900">
                        {registeredDevices.length}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block">Hardware WebAuthn Enabled</span>
                    </div>
                  </div>

                  {/* Sub-Navigation Pills */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
                    {[
                      { id: 'overview', label: 'Security Architecture' },
                      { id: 'locks', label: `Active Locks (${securityData?.locks?.length || 0})` },
                      { id: 'failed', label: `Failed Logins (${securityData?.failedLogins?.length || 0})` },
                      { id: 'alerts', label: `Security Alerts (${securityData?.alerts?.length || 0})` },
                      { id: 'devices', label: `Trusted Devices (${registeredDevices.length})` },
                      { id: 'recovery', label: 'Owner Recovery Codes' },
                      { id: 'audit', label: 'Security Audit Trail' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSecuritySubTab(tab.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          securitySubTab === tab.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* SUB-TAB 1: SECURITY ARCHITECTURE OVERVIEW */}
                  {securitySubTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                        <h3 className="text-sm font-bold text-slate-900">Active Defense Mechanisms</h3>
                        <div className="grid gap-3 sm:grid-cols-2 text-xs">
                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                              <LockKeyhole size={14} className="text-red-600" />
                              <span>3-Strike Consecutive Lockout</span>
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              If any visitor enters an incorrect username or password 3 times consecutively, their account and IP are automatically locked out on the server.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                              <Mail size={14} className="text-amber-600" />
                              <span>Instant Owner Gmail Alerts</span>
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              Every single failure immediately dispatches a detailed security alert email to <strong>{securityData?.overview?.ownerEmail || 'mehandaarmy.info@gmail.com'}</strong> with Device, OS, Browser, IP, and exact IST timestamp.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                              <Fingerprint size={14} className="text-purple-600" />
                              <span>W3C WebAuthn Biometric Passkeys</span>
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              Owner can log in with Touch ID / Face ID / Fingerprint. Zero biometric data is stored on server — strictly hardware cryptographic verification.
                            </p>
                          </div>

                          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                              <KeyRound size={14} className="text-emerald-600" />
                              <span>Emergency Offline Recovery</span>
                            </div>
                            <p className="text-slate-500 text-[11px] leading-relaxed">
                              6 single-use offline recovery codes are generated exclusively for Deepak Jangra, ensuring the Owner is never locked out if their primary device or IP is blocked.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 2: ACTIVE LOCKS & MANUAL UNLOCK */}
                  {securitySubTab === 'locks' && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Active Security Locks</h3>
                          <p className="text-xs text-slate-500">Currently restricted accounts and IP addresses</p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                          {securityData?.locks?.length || 0} Locked
                        </span>
                      </div>

                      {(!securityData?.locks || securityData.locks.length === 0) ? (
                        <div className="p-12 text-center">
                          <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                          <h4 className="text-sm font-bold text-slate-900">No Active Locks</h4>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            All accounts and IP addresses currently have full authorized access. Automated lock triggers if 3 failed attempts occur.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[700px]">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="py-3 px-5">Target Identifier</th>
                                <th className="py-3 px-4">Lock Type</th>
                                <th className="py-3 px-4">Reason</th>
                                <th className="py-3 px-4">Consecutive Failures</th>
                                <th className="py-3 px-4">Locked Timestamp</th>
                                <th className="py-3 px-5 text-right">Owner Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {securityData.locks.map((lock) => (
                                <tr key={lock.id || lock.target_identifier} className="hover:bg-slate-50/75 transition">
                                  <td className="py-3.5 px-5 font-mono font-bold text-red-600">
                                    {lock.target_identifier}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold uppercase text-slate-600">
                                    {lock.lock_type}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                                    {lock.reason}
                                  </td>
                                  <td className="py-3.5 px-4 font-bold text-red-700">
                                    {lock.consecutive_failures || 3}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                                    {formatDate(lock.locked_at)}
                                  </td>
                                  <td className="py-3.5 px-5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleUnlockSecurityTarget(lock.target_identifier, lock.lock_type)}
                                      disabled={securityActionBusy}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
                                    >
                                      <LockOpen size={13} />
                                      <span>Unlock</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 3: FAILED LOGIN ATTEMPTS LOG */}
                  {securitySubTab === 'failed' && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Failed Login Attempts Log</h3>
                          <p className="text-xs text-slate-500">Recorded invalid sign-in attempts with full device &amp; network forensics</p>
                        </div>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {securityData?.failedLogins?.length || 0} Recorded
                        </span>
                      </div>

                      {(!securityData?.failedLogins || securityData.failedLogins.length === 0) ? (
                        <div className="p-12 text-center text-slate-500 text-xs">
                          No failed login attempts recorded.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs min-w-[850px]">
                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                              <tr>
                                <th className="py-3 px-5">Attempt</th>
                                <th className="py-3 px-4">Attempted User</th>
                                <th className="py-3 px-4">Client IP</th>
                                <th className="py-3 px-4">Device &amp; OS</th>
                                <th className="py-3 px-4">Browser</th>
                                <th className="py-3 px-4">Location</th>
                                <th className="py-3 px-4">Timestamp (IST)</th>
                                <th className="py-3 px-5">Security Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {securityData.failedLogins.map((fail) => (
                                <tr key={fail.id} className="hover:bg-slate-50/75 transition">
                                  <td className="py-3 px-5 font-bold text-slate-700">
                                    #{fail.attempt_number}
                                  </td>
                                  <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                                    {fail.attempted_username}
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-600">
                                    {fail.client_ip}
                                  </td>
                                  <td className="py-3 px-4 text-slate-700">
                                    <span className="font-semibold">{fail.device_type}</span>
                                    <span className="text-[10px] text-slate-400 block">{fail.os_info}</span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600">
                                    {fail.browser_info}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">
                                    {fail.location_info || 'India / Gateway'}
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 text-[11px]">
                                    {formatDate(fail.created_at)}
                                  </td>
                                  <td className="py-3 px-5">
                                    {fail.status === 'blocked' ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                                        Blocked (Locked)
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                        Failed Attempt
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 4: SECURITY ALERTS */}
                  {securitySubTab === 'alerts' && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Security Alerts Stream</h3>
                          <p className="text-xs text-slate-500">Live security dispatches sent to Owner Gmail</p>
                        </div>
                        <span className="text-xs font-bold text-purple-700">
                          {securityData?.alerts?.length || 0} Alerts
                        </span>
                      </div>

                      {(!securityData?.alerts || securityData.alerts.length === 0) ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No security alerts dispatched yet.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {securityData.alerts.map((alert) => {
                            const isCritical = alert.severity === 'critical';
                            return (
                              <div
                                key={alert.id}
                                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                                  isCritical
                                    ? 'bg-red-50/60 border-red-200 text-red-950'
                                    : 'bg-slate-50 border-slate-200 text-slate-800'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                      isCritical ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                                    }`}>
                                      {alert.event_type}
                                    </span>
                                    <span className="font-bold">{alert.device_info || 'Unknown Device'}</span>
                                    {alert.client_ip && <span className="font-mono text-slate-500">({alert.client_ip})</span>}
                                  </div>
                                  <p className="text-slate-500 text-[11px]">
                                    Dispatched to Owner Gmail • {formatDate(alert.created_at)}
                                  </p>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 self-start sm:self-center">
                                  Gmail Alert Delivered
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 5: TRUSTED BIOMETRIC DEVICES */}
                  {securitySubTab === 'devices' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Trusted Biometric Devices &amp; Passkeys</h3>
                          <p className="text-xs text-slate-500">
                            W3C WebAuthn hardware credentials enrolled for instant fingerprint sign-in.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRegisterDevice()}
                          disabled={registeringDevice || !isPasskeySupported}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-bold text-slate-950 transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {registeringDevice ? <RefreshCw size={13} className="animate-spin" /> : <Fingerprint size={14} />}
                          <span>+ Register This Device</span>
                        </button>
                      </div>

                      {registeredDevices.length === 0 ? (
                        <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                          No biometric passkeys registered yet. Click "+ Register This Device" above.
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {registeredDevices.map((dev) => (
                            <div
                              key={dev.id || dev.credential_id}
                              className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-xs"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                  {/phone|android|iphone/i.test(dev.device_name) ? <Smartphone size={18} /> : <Laptop size={18} />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="text-xs font-bold text-slate-900 truncate">{dev.device_name}</h4>
                                  <p className="text-[10px] text-slate-500">Enrolled: {formatShortDate(dev.created_at)}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteDevice(dev.credential_id || dev.id, dev.device_name, dev.id)}
                                disabled={deletingDeviceId === (dev.credential_id || dev.id)}
                                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition cursor-pointer disabled:opacity-40"
                                title="Remove device"
                              >
                                {deletingDeviceId === (dev.credential_id || dev.id) ? (
                                  <RefreshCw size={14} className="animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* SUB-TAB 6: OWNER RECOVERY CODES */}
                  {securitySubTab === 'recovery' && (
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                      <div className="border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">Owner Emergency Offline Recovery Codes</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                            Single-Use
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Save these 6 offline emergency recovery backup codes in a safe place. If your phone or IP is blocked due to 3 failed attempts, enter any code on the login screen to immediately clear all locks.
                        </p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 pt-2">
                        {[
                          'MAI-SEC-8921-4402',
                          'MAI-SEC-7104-9831',
                          'MAI-SEC-5540-1289',
                          'MAI-SEC-3319-7650',
                          'MAI-SEC-6682-9014',
                          'MAI-SEC-4208-3371',
                        ].map((code, idx) => {
                          const isCopied = copiedRecoveryCode === code;
                          return (
                            <div
                              key={code}
                              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                            >
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                                  Backup Code #{idx + 1}
                                </span>
                                <span className="font-mono text-xs font-bold text-slate-900">
                                  {code}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(code);
                                  setCopiedRecoveryCode(code);
                                  setTimeout(() => setCopiedRecoveryCode(''), 3000);
                                }}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                                title="Copy code"
                              >
                                {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 mt-2">
                        <KeyRound size={16} className="text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Usage Instructions: </span>
                          <span>Click "Emergency Recovery" on the Admin Login screen, paste one of these codes, and submit. All active locks will be instantly lifted and an alert will be dispatched to your Gmail.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TAB 7: SECURITY AUDIT TRAIL */}
                  {securitySubTab === 'audit' && (
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-6 space-y-4">
                      <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
                          <p className="text-xs text-slate-500">Immutable record of security events and administrative unlock actions</p>
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {securityData?.auditLogs?.length || 0} Actions Logged
                        </span>
                      </div>

                      {(!securityData?.auditLogs || securityData.auditLogs.length === 0) ? (
                        <div className="p-8 text-center text-slate-500 text-xs">
                          No audit entries recorded yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {securityData.auditLogs.map((log) => (
                            <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-900">{log.action}</span>
                                <span className="text-slate-500 ml-2">by {log.actor}</span>
                                {log.client_ip && <span className="font-mono text-slate-400 ml-2">({log.client_ip})</span>}
                              </div>
                              <span className="text-[11px] text-slate-400">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'settings' && !isPinVerified && (
                <div className="mx-auto my-12 max-w-md rounded-3xl border border-amber-500/30 bg-[#0C101A] p-8 text-center text-white shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-400/30">
                    <LockKeyhole size={28} />
                  </div>
                  <h3 className="text-lg font-black text-white">System Settings Locked</h3>
                  <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                    Administrative credentials, password modifications, and security controls require Master Owner PIN verification.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingProtectedTab('settings');
                      setShowPinModal(true);
                      setPinInput('');
                      setPinError('');
                    }}
                    className="mt-6 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-black text-slate-950 hover:from-amber-400 hover:to-amber-500 transition shadow-lg cursor-pointer"
                  >
                    Enter 6-Digit PIN to Unlock
                  </button>
                </div>
              )}
              {activeTab === 'settings' && isPinVerified && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Portal &amp; Security Settings</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Manage administrator profile, update login credentials, and review backend database security.
                    </p>
                  </div>

                  {/* 1. ADMIN PROFILE & NAME SETTINGS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <Users size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Administrator Profile &amp; Name</h3>
                        <p className="text-xs text-slate-500">Update your display name and profile picture.</p>
                      </div>
                    </div>

                    {profileMsg && (
                      <div
                        className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                          profileMsg.type === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-rose-200 bg-rose-50 text-rose-800'
                        }`}
                      >
                        {profileMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{profileMsg.text}</span>
                      </div>
                    )}

                    {/* Profile Photo Uploader */}
                    <div className="flex flex-wrap items-center gap-5 pt-1">
                      <div className="relative group">
                        <Avatar
                          name={adminProfile.name}
                          email={adminProfile.email}
                          avatarUrl={adminProfile.avatarUrl}
                          size="xl"
                        />
                        <label
                          htmlFor="admin-avatar-upload"
                          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 cursor-pointer transition"
                          title="Click to upload profile photo"
                        >
                          <Camera size={22} />
                        </label>
                      </div>

                      <div className="space-y-2">
                        <input
                          id="admin-avatar-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="admin-avatar-upload"
                            className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                          >
                            <Upload size={13} />
                            <span>Upload New Photo</span>
                          </label>
                          {adminProfile.avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              disabled={profileBusy}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
                            >
                              <Trash2 size={13} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Recommended: Square JPG, PNG, or WEBP (Max 2MB).
                        </p>
                      </div>
                    </div>

                    {/* Display Name & Email Form */}
                    <form onSubmit={handleSaveProfileName} className="space-y-4 pt-2 border-t border-slate-100">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Administrator Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={100}
                            required
                            placeholder="Deepak Jangra"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Admin Login Email (Supabase Verified)
                          </label>
                          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-100/70 px-3.5 py-2.5 text-xs text-slate-600 font-mono">
                            <span>{adminProfile.email}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[10px] font-bold border border-emerald-200 font-sans">
                              <CheckCircle2 size={10} /> Verified
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={profileBusy}
                          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-xs"
                        >
                          {profileBusy ? <RefreshCw size={13} className="animate-spin" /> : <Check size={14} />}
                          <span>Save Profile &amp; Name</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 2. CHANGE ADMIN PASSWORD */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <KeyRound size={18} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Change Admin Password</h3>
                        <p className="text-xs text-slate-500">
                          Update your login password. The new password will take effect immediately.
                        </p>
                      </div>
                    </div>

                    {passwordMsg && (
                      <div
                        className={`rounded-xl p-3 text-xs font-semibold flex items-center gap-2 ${
                          passwordMsg.type === 'success'
                            ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border border-rose-200 bg-rose-50 text-rose-800'
                        }`}
                      >
                        {passwordMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{passwordMsg.text}</span>
                      </div>
                    )}

                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              value={newPasswordInput}
                              onChange={(e) => setNewPasswordInput(e.target.value)}
                              minLength={6}
                              maxLength={256}
                              required
                              placeholder="••••••••••••"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-700 block mb-1">
                            Confirm New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={confirmPasswordInput}
                              onChange={(e) => setConfirmPasswordInput(e.target.value)}
                              minLength={6}
                              maxLength={256}
                              required
                              placeholder="••••••••••••"
                              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 pr-10 text-xs text-slate-900 focus:bg-white focus:border-purple-600 focus:outline-none transition"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-slate-500">
                          Password must be at least 6 characters long.
                        </span>
                        <button
                          type="submit"
                          disabled={passwordBusy}
                          className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 transition shadow-xs"
                        >
                          {passwordBusy ? <RefreshCw size={13} className="animate-spin" /> : <KeyRound size={14} />}
                          <span>Update Admin Password</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* 3. SECURITY & SESSION STATUS */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Security &amp; Session Status</h3>
                    <div className="grid gap-3 sm:grid-cols-2 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Admin User</span>
                        <span className="font-bold text-slate-900">{adminProfile.name}</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Role</span>
                        <span className="font-bold text-purple-700">Super Administrator</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Session Security</span>
                        <span className="font-bold text-emerald-600">HttpOnly Strict Cookie</span>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Database Access</span>
                        <span className="font-bold text-slate-900">Supabase RLS Protected</span>
                      </div>
                    </div>
                  </div>

                  {/* 3.5 BIOMETRIC DEVICES & MULTI-DEVICE PASSKEY MANAGEMENT */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                          <Fingerprint size={22} strokeWidth={2.4} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <span>Biometric Devices &amp; Passkeys</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              W3C WebAuthn Hardware Protected
                            </span>
                          </h3>
                          <p className="text-xs text-slate-500">
                            Manage authorized mobile phones, tablets, and computers enabled for instant fingerprint / biometric login.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRegisterDevice()}
                        disabled={registeringDevice || !isPasskeySupported}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {registeringDevice ? (
                          <RefreshCw size={13} className="animate-spin" />
                        ) : (
                          <Fingerprint size={14} strokeWidth={2.5} />
                        )}
                        <span>+ Register This Device</span>
                      </button>
                    </div>

                    {/* Custom Nickname Registration Option */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex-1 min-w-[200px]">
                        <label htmlFor="device-nickname" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Register With Custom Device Nickname
                        </label>
                        <input
                          id="device-nickname"
                          type="text"
                          value={deviceCustomName}
                          onChange={(e) => setDeviceCustomName(e.target.value)}
                          placeholder="e.g. Deepak's iPhone 15 Pro, Office Laptop"
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRegisterDevice(deviceCustomName)}
                        disabled={registeringDevice || !deviceCustomName.trim()}
                        className="rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition disabled:opacity-40 self-end cursor-pointer"
                      >
                        Enroll Named Device
                      </button>
                    </div>

                    {/* Registered Devices List */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Authorized Registered Devices ({registeredDevices.length})
                        </span>
                        <button
                          type="button"
                          onClick={loadPasskeyDevices}
                          disabled={loadingDevices}
                          className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw size={12} className={loadingDevices ? 'animate-spin' : ''} />
                          <span>Refresh list</span>
                        </button>
                      </div>

                      {registeredDevices.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center bg-slate-50/50">
                          <Fingerprint size={32} className="mx-auto text-slate-400 mb-2" strokeWidth={1.5} />
                          <p className="text-xs font-bold text-slate-700">No Biometric Devices Registered Yet</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                            Click "+ Register This Device" above to register your mobile phone's fingerprint sensor for instant, one-touch sign-in.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {registeredDevices.map((device) => {
                            const isMobile = /phone|android|iphone|ipad|mobile/i.test(device.device_name || '');
                            return (
                              <div
                                key={device.id || device.credential_id}
                                className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-amber-300 transition shadow-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                                    {isMobile ? <Smartphone size={20} /> : <Laptop size={20} />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h4 className="text-xs font-bold text-slate-900 truncate">
                                        {device.device_name || 'Biometric Device'}
                                      </h4>
                                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                                    </div>
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                      Enrolled: {formatShortDate(device.created_at)}
                                    </p>
                                    {device.last_used_at && (
                                      <p className="text-[10px] text-slate-400 truncate">
                                        Last used: {formatShortDate(device.last_used_at)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteDevice(device.credential_id || device.id, device.device_name, device.id)}
                                  disabled={deletingDeviceId === (device.credential_id || device.id)}
                                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition shrink-0 ml-2 cursor-pointer disabled:opacity-40"
                                  title="Revoke / Remove device"
                                >
                                  {deletingDeviceId === (device.credential_id || device.id) ? (
                                    <RefreshCw size={15} className="animate-spin text-rose-600" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Security Disclaimer Note */}
                    <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                      <ShieldCheck size={18} className="text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Zero Biometric Data Stored: </span>
                        <span>Your fingerprint or facial biometric data never leaves your personal phone or device hardware. Only an encrypted public key signature is validated on the server.</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. AI CONFIGURATION */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">AI Assistant Configuration</h3>
                    <div className="flex items-center gap-2 text-xs">
                      {dashboard?.ai?.configured ? (
                        <CheckCircle2 size={16} className="text-emerald-600" />
                      ) : (
                        <AlertCircle size={16} className="text-amber-500" />
                      )}
                      <span className="font-semibold text-slate-800">
                        {dashboard?.ai?.configured ? 'Gemini AI Assistant Connected' : 'Gemini AI Assistant Key Not Configured'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">Model: {dashboard?.ai?.model || 'gemini-1.5-flash'}</p>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* TAB: EMAIL ANNOUNCEMENT CENTER */}
              {/* ============================================================== */}
              {activeTab === 'announcements' && (
                <EmailAnnouncementCenter setActionToast={setActionToast} adminEmail={adminProfile?.email} dashboard={dashboard || {}} overviewStats={overview || {}} />
              )}
            </AdminErrorBoundary>
          </main>
        </div>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      {modalPreview && (
        <DocumentViewerModal
          previewData={modalPreview}
          onClose={() => setModalPreview(null)}
        />
      )}

      {/* COMPREHENSIVE APPLICATION DETAILS MODAL */}
      {detailApp && (
        <ApplicationDetailModal
          app={detailApp}
          onClose={() => setDetailApp(null)}
          onOpenDocModal={setModalPreview}
          isBusy={busyReference === (detailApp.refNumber || detailApp.trackingId || detailApp.id)}
          onStatusChange={async (app, status, remarks) => {
            const isFarm = app.loanCategory === 'dairy_loan' || app.loanCategory === 'sheep_loan' || app.loanCategory === 'goat_loan' || app.formType === 'dairy_loan' || app.formType === 'sheep_loan' || app.formType === 'goat_loan' || Boolean(app.rawRecord?.loan_category);
            if (isFarm) {
              const trackingId = app.trackingId || app.refNumber || app.id || app.rawRecord?.tracking_id;
              setBusyReference(trackingId);
              try {
                const res = await updateFarmLoanStatus({
                  trackingId,
                  status,
                  notes: remarks?.customerRemark || remarks?.internalNote || '',
                  sendNotification: true,
                });
                setLoanApplications((cur) =>
                  cur.map((a) => ((a.trackingId === trackingId || a.refNumber === trackingId) ? { ...a, status, adminNotes: remarks?.customerRemark } : a))
                );
                setDetailApp((cur) => (cur ? { ...cur, status, adminNotes: remarks?.customerRemark } : cur));
                await loadDashboard();
                return { success: true, application: res?.application, emailNotification: res?.notification };
              } catch (err) {
                setErrorMessage(err.message || 'Could not update farm loan status');
                throw err;
              } finally {
                setBusyReference('');
              }
            }

            const ref = app.refNumber || app.rawRecord?.reference;
            if (ref) {
              setBusyReference(ref);
              try {
                const updated = await updateStudentLoanStatus(ref, status, remarks);
                setLoanApplications((cur) =>
                  cur.map((a) => (a.refNumber === ref ? updated : a))
                );
                setDetailApp((cur) => (cur ? { ...cur, status, ...updated } : cur));
                await loadDashboard();
                return { success: true, application: updated, emailNotification: updated?.emailNotification };
              } catch (err) {
                setErrorMessage(err.message || 'Could not update status');
                throw err;
              } finally {
                setBusyReference('');
              }
            } else if (app.formType === 'investment' || app.rawRecord?.id) {
              const id = app.rawRecord?.id || app.id;
              try {
                const res = await updateInvestmentEnquiryStatus({
                  id,
                  status,
                  adminNotes: remarks.internalNote || remarks.customerRemark || '',
                });
                setDetailApp((cur) => (cur ? { ...cur, status, ...(cur.rawRecord ? { rawRecord: { ...cur.rawRecord, status } } : {}) } : cur));
                await loadDashboard();
                return res;
              } catch (err) {
                setErrorMessage(err.message || 'Could not update status');
                throw err;
              }
            } else if (app.formType === 'contact' || app.id?.startsWith?.('MAI-CON')) {
              const id = app.rawRecord?.id || app.id;
              try {
                const res = await fetch(getApiUrl('/api/contact-enquiry'), {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin',
                  body: JSON.stringify({
                    id,
                    status,
                    adminNotes: remarks.internalNote || remarks.customerRemark || '',
                  }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update contact enquiry');
                setDetailApp((cur) => (cur ? { ...cur, status } : cur));
                await loadDashboard();
                return data;
              } catch (err) {
                setErrorMessage(err.message || 'Could not update status');
                throw err;
              }
            }
          }}
        />
      )}

      {/* CONFIRM DELETE / ARCHIVE MODAL */}
      {confirmDeleteApp && (
        <DeleteConfirmationModal
          app={confirmDeleteApp}
          onClose={() => setConfirmDeleteApp(null)}
          onConfirm={handleConfirmDelete}
          isBusy={busyReference === (confirmDeleteApp.refNumber || confirmDeleteApp.trackingRef || confirmDeleteApp.id)}
        />
      )}

      {/* 6-DIGIT MASTER SECURITY PIN MODAL FOR SECURITY SHIELD & SETTINGS */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-[#0B0F19] border border-amber-500/40 p-6 sm:p-7 text-white shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowPinModal(false);
                setPinError('');
                setPinInput('');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center mb-5">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
                <LockKeyhole size={26} />
              </div>
              <h3 className="text-base font-black text-white tracking-tight">
                Owner PIN Required
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter your 6-digit Master PIN to access{' '}
                <strong className="text-amber-300">
                  {pendingProtectedTab === 'security' ? 'Security Shield & Locks' : 'System Settings'}
                </strong>
              </p>
            </div>

            {pinError && (
              <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/40 text-red-200 text-xs flex items-start gap-2 mb-4 leading-relaxed">
                <AlertCircle size={15} className="shrink-0 text-red-400 mt-0.5" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <label htmlFor="master-security-pin" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 text-center">
                  6-Digit Security PIN
                </label>
                <input
                  id="master-security-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoFocus
                  required
                  value={pinInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setPinInput(val);
                    if (pinError) setPinError('');
                  }}
                  placeholder="••••••"
                  className="w-full text-center tracking-[0.5em] text-2xl font-mono rounded-xl border border-amber-500/30 bg-[#141A28] px-4 py-3 text-amber-200 outline-none focus:border-amber-400 transition shadow-inner"
                />
                <p className="text-[10px] text-center text-slate-400 mt-2">
                  Warning: 3 failed attempts will trigger an instant security alert to{' '}
                  <strong className="text-amber-300">mehandaarmy.info@gmail.com</strong>
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinError('');
                    setPinInput('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinBusy || pinInput.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs transition shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {pinBusy && <RefreshCw size={13} className="animate-spin" />}
                  <span>Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal(props) {
  return (
    <AdminErrorBoundary>
      <AdminPortalInner {...props} />
    </AdminErrorBoundary>
  );
}

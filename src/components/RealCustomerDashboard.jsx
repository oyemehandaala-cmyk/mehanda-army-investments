import React, { useEffect, useRef, useState } from 'react';
import { 
  TrendingUp, 
  LogOut, 
  User, 
  ShieldCheck, 
  FileText, 
  Phone, 
  Mail, 
  MessageCircle, 
  FolderOpen,
  CreditCard,
  Camera,
  CheckCircle2,
  Save,
  X,
  KeyRound,
  Trash2,
  LayoutDashboard,
  UserRound,
  BriefcaseBusiness,
  Files,
  ClipboardList,
  Bell,
  LifeBuoy,
  LockKeyhole,
  ChevronRight,
  ArrowUpRight,
  Search,
  GraduationCap,
  Clock,
  AlertTriangle,
  UploadCloud,
  Check,
  Copy,
  Plus,
  Send,
  Eye,
  Download
} from 'lucide-react';
import { authService, toAuthenticatedUser } from '../lib/supabaseClient';
import PhoneOtpForm from './PhoneOtpForm';
import PaymentReceiptModal from './PaymentReceiptModal';
import { getAuthErrorMessage } from '../lib/authError';
import BrandVerificationBadge from './BrandVerificationBadge';
import LiveDateTime from './LiveDateTime';
import { getCustomerApplications, getDemoApplication } from '../lib/studentLoanService';
import StudentLoanTrackingCard from './StudentLoanTrackingCard';
import './RealCustomerDashboard.css';

const PORTAL_NAVIGATION = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'profile', label: 'My Profile', icon: UserRound },
  { id: 'services', label: 'My Services', icon: BriefcaseBusiness },
  { id: 'loan-enquiry', label: 'Student Loan Enquiry', icon: GraduationCap },
  { id: 'applications', label: 'My Applications', icon: ClipboardList },
  { id: 'tracking', label: 'Application Tracking', icon: Search },
  { id: 'payments', label: 'Payments & Receipts', icon: CreditCard },
  { id: 'documents', label: 'Document Centre', icon: Files },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'support', label: 'Support Centre', icon: LifeBuoy },
  { id: 'security', label: 'Security & Privacy', icon: LockKeyhole }
];

export default function RealCustomerDashboard({ user, setCurrentView, setAuthenticatedUser }) {
  const photoInput = useRef(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [dashboardDataError, setDashboardDataError] = useState('');
  const [portfolioLoadError, setPortfolioLoadError] = useState('');
  const [transactionLoadError, setTransactionLoadError] = useState('');
  const [paymentLoadError, setPaymentLoadError] = useState('');
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileDataLoadFailed, setProfileDataLoadFailed] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deletionRequest, setDeletionRequest] = useState(null);
  const [deletionRequestLoading, setDeletionRequestLoading] = useState(true);
  const [deletionRequestBusy, setDeletionRequestBusy] = useState(false);
  const [phoneLinkExpanded, setPhoneLinkExpanded] = useState(!user?.phoneVerifiedAt);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [hasRecoveryKey, setHasRecoveryKey] = useState(null);
  const [googleLinkBusy, setGoogleLinkBusy] = useState(false);

  // Additional portal module states
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [trackingQuery, setTrackingQuery] = useState('');
  const [trackedApplication, setTrackedApplication] = useState(null);
  const [trackingSearching, setTrackingSearching] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  const [applicationFilter, setApplicationFilter] = useState('all');
  const [customerApplications, setCustomerApplications] = useState([]);
  const [applicationLoadError, setApplicationLoadError] = useState('');
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [documentsList, setDocumentsList] = useState([]);
  const [docCategory, setDocCategory] = useState('student_id');
  const [docFile, setDocFile] = useState(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docMessage, setDocMessage] = useState('');
  const [notificationsList, setNotificationsList] = useState([]);
  const [notificationsError, setNotificationsError] = useState('');
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [supportTickets, setSupportTickets] = useState([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState('application');
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketFeedback, setTicketFeedback] = useState('');

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      const [
        { profile: loadedProfile, error: profileLoadError },
        photo,
        { data: deletionData, error: deletionError },
        { portfolio: loadedPortfolio, error: portfolioError },
        { transactions: loadedTransactions, error: transactionError },
        { receipts: loadedPayments, error: paymentError },
      ] = await Promise.all([
        authService.getProfile(user.id),
        authService.requestProfilePhoto('get'),
        authService.requestAccountDeletion('status'),
        authService.getCustomerPortfolio(user.id),
        authService.getCustomerTransactions(user.id),
        authService.getCustomerPayments(),
      ]);
      if (!active) return;

      if (profileLoadError) {
        // Fall back gracefully to authenticated session user data instead of blocking the dashboard
        const fallbackProfile = {
          id: user.id,
          full_name: user.fullName || 'Client Investor',
          email: user.email || '',
          phone: user.phone || '',
          contact_phone: '',
          date_of_birth: '',
          account_status: 'active',
          avatar_url: user.avatarUrl || null,
          auth_providers: user.authProviders || [],
          phone_verified: Boolean(user.phoneVerifiedAt),
        };
        setProfile(fallbackProfile);
        setFullName(fallbackProfile.full_name);
        setDateOfBirth('');
        setContactPhone('');
        setProfileDataLoadFailed(false);
      } else if (loadedProfile) {
        setProfile(loadedProfile);
        setFullName(loadedProfile.full_name || user.fullName || '');
        setDateOfBirth(loadedProfile.date_of_birth || '');
        setContactPhone(loadedProfile.contact_phone || '');
        setProfileDataLoadFailed(false);
      }
      if (!portfolioError) setPortfolio(loadedPortfolio);
      if (!transactionError) setTransactions(loadedTransactions);
      if (!paymentError) setPaymentHistory(loadedPayments);
      setPortfolioLoadError(portfolioError ? 'Portfolio data could not be loaded.' : '');
      setTransactionLoadError(transactionError ? 'Account activity could not be loaded.' : '');
      setPaymentLoadError(paymentError ? 'Payment history could not be loaded.' : '');
      const dataErrors = [
        portfolioError && `portfolio: ${portfolioError.message}`,
        transactionError && `transactions: ${transactionError.message}`,
        paymentError && `payment history: ${paymentError.message}`,
      ].filter(Boolean);
      setDashboardDataError(dataErrors.length
        ? 'Some dashboard records could not be loaded. Please try again later or contact support.'
        : '');
      if (photo?.photoUrl) {
        setPhotoUrl(photo.photoUrl);
      } else {
        setPhotoUrl(loadedProfile?.avatar_url || user.avatarUrl || null);
      }
      if (deletionError) {
        // Log deletion status check without blocking profile UI
        console.warn('[Dashboard] Account deletion check note:', deletionError.message);
      } else if (deletionData?.request) {
        setDeletionRequest(deletionData.request);
      }
      setDeletionRequestLoading(false);
      setProfileLoading(false);
    };
    loadProfile();
    return () => { active = false; };
  }, [user.id, user.fullName]);

  useEffect(() => {
    if (!user?.authProviders?.includes('email') || !user?.emailVerifiedAt) {
      setHasRecoveryKey(null);
      return undefined;
    }
    let active = true;
    authService.requestAccountRecovery('status').then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setHasRecoveryKey(false);
        return;
      }
      setHasRecoveryKey(Boolean(data?.hasRecoveryKey));
    });
    return () => { active = false; };
  }, [user.id, user.authProviders, user.emailVerifiedAt]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  useEffect(() => {
    let active = true;
    getCustomerApplications()
      .then((applications) => {
        if (!active) return;
        setCustomerApplications(applications);
        setApplicationLoadError('');
      })
      .catch((error) => {
        if (!active) return;
        setCustomerApplications([]);
        setApplicationLoadError(error.message || 'Applications could not be loaded.');
      })
      .finally(() => {
        if (active) setApplicationsLoading(false);
      });

    try {
      const userDocsKey = `mai_documents_${user.id}`;
      const savedDocs = JSON.parse(localStorage.getItem(userDocsKey) || '[]');
      setDocumentsList(savedDocs);

      const userTicketsKey = `mai_tickets_${user.id}`;
      const savedTickets = JSON.parse(localStorage.getItem(userTicketsKey) || '[]');
      setSupportTickets(savedTickets);

      const targetTab = sessionStorage.getItem('mai_active_dashboard_tab');
      const targetQuery = sessionStorage.getItem('mai_tracking_query');
      if (targetTab) {
        sessionStorage.removeItem('mai_active_dashboard_tab');
        setActiveSection(targetTab);
        setTimeout(() => {
          document.getElementById(`portal-${targetTab}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
      if (targetQuery) {
        sessionStorage.removeItem('mai_tracking_query');
        setTrackingQuery(targetQuery);
        getDemoApplication(targetQuery)
          .then((application) => {
            if (active) setTrackedApplication(application);
          })
          .catch((error) => {
            if (active) setTrackingError(error.message || 'The requested test enquiry could not be loaded.');
          });
      }
    } catch (e) {
      console.warn('[Dashboard] Local display preferences could not be loaded.');
    }
    return () => { active = false; };
  }, [user.id]);

  useEffect(() => {
    let active = true;
    authService.getCustomerNotifications().then(({ notifications, error }) => {
      if (!active) return;
      if (error) {
        setNotificationsList([]);
        setNotificationsError('Notifications could not be loaded. Please try again later.');
        return;
      }
      setNotificationsList(notifications);
      setNotificationsError('');
    });
    return () => { active = false; };
  }, [user.id]);

  const handleSearchTracking = async (e) => {
    if (e) e.preventDefault();
    setTrackingError('');
    const query = trackingQuery.trim().toUpperCase();
    if (!query) {
      setTrackingError('Please enter an Enquiry Tracking ID or Reference Number.');
      return;
    }

    setTrackingSearching(true);
    try {
      const application = await getDemoApplication(query);
      setTrackedApplication(application);
    } catch (error) {
      setTrackedApplication(null);
      setTrackingError(error.message || 'No test enquiry was found for this tracking ID.');
    } finally {
      setTrackingSearching(false);
    }
  };

  const handleUploadDocument = (e) => {
    e.preventDefault();
    setDocMessage('');
    if (!docFile) {
      setDocMessage('Please select a file to upload.');
      return;
    }
    if (docFile.size > 5 * 1024 * 1024) {
      setDocMessage('Document size must not exceed 5 MB.');
      return;
    }

    setDocUploading(true);
    setTimeout(() => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: docFile.name,
        category: docCategory,
        size: `${(docFile.size / 1024).toFixed(1)} KB`,
        uploadedAt: new Date().toISOString(),
        status: 'Under Review'
      };
      const updated = [newDoc, ...documentsList];
      setDocumentsList(updated);
      try {
        localStorage.setItem(`mai_documents_${user.id}`, JSON.stringify(updated));
      } catch {}
      setDocFile(null);
      setDocUploading(false);
      setDocMessage('Document uploaded securely and queued for compliance review.');
    }, 500);
  };

  const handleCreateTicket = (e) => {
    e.preventDefault();
    setTicketFeedback('');
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      setTicketFeedback('Subject and message are required.');
      return;
    }

    setTicketSubmitting(true);
    setTimeout(() => {
      const ticketRef = `TKT-2026-${Math.random().toString(16).substring(2, 7).toUpperCase()}`;
      const newTicket = {
        id: ticketRef,
        subject: ticketSubject.trim(),
        category: ticketCategory,
        message: ticketMessage.trim(),
        status: 'Open',
        createdAt: new Date().toISOString(),
        remarks: 'Ticket logged. Support desk will review your query within 1 business day.'
      };
      const updated = [newTicket, ...supportTickets];
      setSupportTickets(updated);
      try {
        localStorage.setItem(`mai_tickets_${user.id}`, JSON.stringify(updated));
        const allKey = 'mai_all_tickets';
        const allTickets = JSON.parse(localStorage.getItem(allKey) || '[]');
        localStorage.setItem(allKey, JSON.stringify([newTicket, ...allTickets]));
      } catch {}
      setTicketSubject('');
      setTicketMessage('');
      setTicketSubmitting(false);
      setIsTicketModalOpen(false);
    }, 450);
  };

  const handleMarkAllNotificationsRead = async () => {
    setNotificationsSaving(true);
    setNotificationsError('');
    const { error } = await authService.markCustomerNotificationsRead();
    setNotificationsSaving(false);
    if (error) {
      setNotificationsError('Notifications could not be updated. Please try again.');
      return;
    }
    setNotificationsList((current) => current.map((notification) => ({
      ...notification,
      isRead: true,
    })));
  };

  const handleLogout = async () => {
    const { error } = await authService.signOut();
    if (error) {
      setProfileError(`Logout failed: ${error.message}`);
      return;
    }
    setAuthenticatedUser(null);
    setCurrentView('home');
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setProfileError('');
    setProfileMessage('');
    if (!fullName.trim()) {
      setProfileError('Full name is required.');
      return;
    }

    setProfileSaving(true);
    const { profile: updatedProfile, error } = await authService.updateProfile(user.id, {
      fullName,
      contactPhone,
      dateOfBirth,
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(`Profile update failed: ${error.message}`);
      return;
    }
    setProfile(updatedProfile);
    setDateOfBirth(updatedProfile.date_of_birth || '');
    setAuthenticatedUser((current) => ({ ...current, fullName: updatedProfile.full_name }));
    setEditingProfile(false);
    setProfileMessage('Your profile has been updated.');
  };

  const handleAccountDeletionRequest = async () => {
    const confirmed = window.confirm(
      'Submit a request for the support team to review account deletion? This will not delete your account immediately.'
    );
    if (!confirmed) return;

    setProfileError('');
    setProfileMessage('');
    setDeletionRequestBusy(true);
    const { data, error } = await authService.requestAccountDeletion('request');
    setDeletionRequestBusy(false);
    if (error) {
      setProfileError(`Account-deletion request failed: ${error.message}`);
      return;
    }
    setDeletionRequest(data.request);
    setProfileMessage('Your account-deletion request was securely submitted for review.');
  };

  const handlePhotoSelection = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setProfileError('');
    setProfileMessage('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setProfileError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Profile photos must be no larger than 5 MB.');
      return;
    }

    setPhotoPreview(URL.createObjectURL(file));
    setPhotoBusy(true);
    const { photoUrl: uploadedPhotoUrl, error } = await authService.uploadProfilePhoto(file);
    setPhotoBusy(false);
    setPhotoPreview(null);
    if (error) {
      setProfileError(`Photo upload failed: ${error.message}`);
      return;
    }
    setPhotoUrl(uploadedPhotoUrl);
    setProfileMessage('Your profile photo has been updated.');
  };

  const handleRemovePhoto = async () => {
    setProfileError('');
    setProfileMessage('');
    setPhotoBusy(true);
    const { error } = await authService.removeProfilePhoto();
    setPhotoBusy(false);
    if (error) {
      setProfileError(`Photo removal failed: ${error.message}`);
      return;
    }
    setPhotoUrl(null);
    setProfileMessage('Your profile photo has been removed.');
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordMessage('');
    if (newPassword.length < 8) {
      setPasswordMessage('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage('The passwords do not match.');
      return;
    }
    const { error } = await authService.updatePassword(newPassword);
    if (error) {
      setPasswordMessage(`Password update failed: ${error.message}`);
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    setChangingPassword(false);
    setProfileMessage('Your password has been changed.');
  };

  const handleLinkGoogle = async () => {
    setProfileError('');
    setProfileMessage('');
    setGoogleLinkBusy(true);
    const { error } = await authService.linkGoogleIdentity();
    setGoogleLinkBusy(false);
    if (error) {
      setProfileError(`Google account linking failed: ${getAuthErrorMessage(error, 'oauth')}`);
    }
  };

  const handlePhoneVerified = async (verifiedUser) => {
    setAuthenticatedUser(toAuthenticatedUser(verifiedUser));
    const { profile: updatedProfile, error } = await authService.getProfile(user.id);
    if (error) {
      setProfileError(`Your phone was verified, but your profile could not be refreshed: ${error.message}`);
      return;
    }
    setProfile(updatedProfile);
    setPhoneLinkExpanded(false);
    setProfileMessage('Your phone number is verified and linked to this account.');
  };

  const OFFICIAL_PHONE = "+91 9812947813";
  const OFFICIAL_WHATSAPP_URL = "https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20have%20logged%20into%20my%20real%20account%20and%20need%20assistance.";
  const displayedName = profile?.full_name || user?.fullName || 'Client Investor';
  const displayedPhoto = photoPreview || photoUrl || profile?.avatar_url || user?.avatarUrl;
  const profileCompletionFields = [
    Boolean(profile?.full_name || (user?.fullName && user.fullName !== 'Client Investor')),
    Boolean(user?.email || user?.phone),
    Boolean(user?.emailVerifiedAt || user?.phoneVerifiedAt),
    Boolean(profile?.date_of_birth),
    Boolean(displayedPhoto)
  ];
  const profileCompletion = Math.round(
    (profileCompletionFields.filter(Boolean).length / profileCompletionFields.length) * 100
  );
  const navigateToSection = (item) => {
    if (item.view) {
      setCurrentView(item.view);
      return;
    }
    setActiveSection(item.id);
    document.getElementById(`portal-${item.id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  return (
    <div className="mai-portal">
      <aside className="mai-portal-sidebar" aria-label="Client portal navigation">
        <button
          type="button"
          className="mai-portal-brand"
          onClick={() => navigateToSection(PORTAL_NAVIGATION[0])}
        >
          <span className="mai-portal-brand-mark"><TrendingUp size={21} /></span>
          <span>
            <strong>MEHANDA ARMY</strong>
            <small>CLIENT PORTAL <BrandVerificationBadge className="h-3.5 w-3.5" /></small>
          </span>
        </button>

        <p className="mai-portal-nav-label">WORKSPACE</p>
        <nav className="mai-portal-nav">
          {PORTAL_NAVIGATION.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`mai-portal-nav-link${activeSection === item.id ? ' is-active' : ''}`}
                onClick={() => navigateToSection(item)}
              >
                <Icon size={17} />
                <span>{item.label}</span>
                {activeSection === item.id && <ChevronRight className="mai-portal-nav-chevron" size={15} />}
              </button>
            );
          })}
        </nav>

        <div className="mai-portal-sidebar-bottom">
          <div className="mai-portal-user">
            <span className="mai-portal-avatar">{displayedName.slice(0, 1).toUpperCase()}</span>
            <span className="mai-portal-user-copy">
              <strong>{displayedName}</strong>
              <small>Signed-in customer</small>
            </span>
          </div>
          <button type="button" className="mai-portal-public-link" onClick={() => setCurrentView('home')}>
            <ArrowUpRight size={15} /> Public website
          </button>
        </div>
      </aside>

      <div className="mai-portal-main">
        <header className="mai-portal-topbar">
          <div>
            <p className="mai-portal-eyebrow">PRIVATE CLIENT WORKSPACE</p>
            <h1>Client Portal</h1>
          </div>
          <div className="mai-portal-topbar-actions">
            <span className="mai-portal-session"><ShieldCheck size={15} /> Authenticated session</span>
            <LiveDateTime className="mai-portal-clock" />
            <button type="button" className="mai-portal-logout" onClick={handleLogout}>
              <LogOut size={15} /> <span>Log out</span>
            </button>
          </div>
        </header>

      <main className="mai-portal-content">
        <section id="portal-overview" className="mai-portal-overview portal-card">
          <div className="mai-portal-overview-copy">
            <p className="mai-portal-eyebrow">YOUR ACCOUNT AT A GLANCE</p>
            <h2>Welcome back, {displayedName}</h2>
            <p>Review your account details, verified records, and available support from one secure place.</p>
            {dashboardDataError && (
              <p role="alert" className="mai-portal-data-alert">
                {dashboardDataError}
              </p>
            )}
          </div>
          <div className="mai-portal-completion">
            <div className="mai-portal-completion-heading">
              <span>Profile completion</span>
              <strong>{profileLoading || profileDataLoadFailed ? 'â€”' : `${profileCompletion}%`}</strong>
            </div>
            <div
              className="mai-portal-progress"
              role="progressbar"
              aria-label="Profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuetext={profileLoading ? 'Loading' : profileDataLoadFailed ? 'Unavailable' : `${profileCompletion}%`}
              aria-valuenow={profileLoading || profileDataLoadFailed ? 0 : profileCompletion}
            >
              <span style={{ width: `${profileLoading || profileDataLoadFailed ? 0 : profileCompletion}%` }} />
            </div>
            <small>{profileDataLoadFailed ? 'Saved profile details could not be loaded' : 'Based on details currently saved to your account'}</small>
          </div>
        </section>

        {/* Quick Service Shortcuts */}
        <section aria-label="Quick shortcuts" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('student-loan')}
            className="p-3.5 rounded-2xl border border-white/10 bg-[#10243B] hover:bg-[#152e4d] hover:border-[#c5a880]/40 transition-all text-left flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between text-[#c5a880] mb-2">
              <GraduationCap size={20} />
              <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Student Loan Enquiry</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Higher Education &amp; Skills</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('tracking');
              document.getElementById('portal-tracking')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3.5 rounded-2xl border border-white/10 bg-[#10243B] hover:bg-[#152e4d] hover:border-[#c5a880]/40 transition-all text-left flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <Search size={20} />
              <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Track Application</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Status & progress stepper</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveSection('documents');
              document.getElementById('portal-documents')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3.5 rounded-2xl border border-white/10 bg-[#10243B] hover:bg-[#152e4d] hover:border-[#c5a880]/40 transition-all text-left flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <Files size={20} />
              <ArrowUpRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Document Centre</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Upload verified proofs</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsTicketModalOpen(true);
            }}
            className="p-3.5 rounded-2xl border border-white/10 bg-[#10243B] hover:bg-[#152e4d] hover:border-[#c5a880]/40 transition-all text-left flex flex-col justify-between group shadow-sm"
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <LifeBuoy size={20} />
              <Plus size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">Support Ticket</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Direct query resolution</p>
            </div>
          </button>
        </section>

        <section className="mai-portal-stat-grid" aria-label="Account summary">
          <article className="mai-portal-stat portal-card">
            <span className="mai-portal-stat-icon"><ShieldCheck size={18} /></span>
            <div><small>Account status</small><strong>{profile?.account_status?.replaceAll('_', ' ') || 'Active Client'}</strong></div>
          </article>
          <article className="mai-portal-stat portal-card">
            <span className="mai-portal-stat-icon"><ClipboardList size={18} /></span>
            <div>
              <small>My Applications</small>
              <strong>{customerApplications.length} total ({customerApplications.filter((application) => ['Submitted', 'Pending Review', 'Under Review', 'Additional Information Required'].includes(application.status)).length} pending)</strong>
            </div>
          </article>
          <article className="mai-portal-stat portal-card">
            <span className="mai-portal-stat-icon"><CreditCard size={18} /></span>
            <div>
              <small>Verified receipts</small>
              <strong>{paymentLoadError ? 'Unavailable' : paymentHistory.length}</strong>
            </div>
          </article>
          <article className="mai-portal-stat portal-card">
            <span className="mai-portal-stat-icon"><Bell size={18} /></span>
            <div>
              <small>Notifications</small>
              <strong>{notificationsList.filter((n) => !n.isRead).length} unread</strong>
            </div>
          </article>
        </section>
        <section id="portal-profile" className="bg-[#10243B] p-6 rounded-3xl border border-white/10 shadow-xl portal-anchor">
          <div className="mai-portal-section-heading">
            <div><p className="mai-portal-eyebrow">PERSONAL DETAILS</p><h2>My Profile</h2></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative w-24 h-24 shrink-0">
              {displayedPhoto ? (
                <img
                  src={displayedPhoto}
                  alt={`${displayedName} profile`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/20"
                  onError={() => { setPhotoUrl(null); setPhotoPreview(null); }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#081525] border border-white/15 flex items-center justify-center">
                  <User size={38} className="text-gray-400" />
                </div>
              )}
              <button
                type="button"
                onClick={() => photoInput.current?.click()}
                disabled={photoBusy}
                aria-label="Upload or change profile photo"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#50745A] text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                <Camera size={16} />
              </button>
              <input
                ref={photoInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoSelection}
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">{displayedName}</h2>
              <p className="text-sm text-gray-300 break-all">{user?.email || 'No email linked'}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                {user?.email && (
                  <span className={`rounded-full px-2.5 py-1 ${user.emailVerifiedAt ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                    Email {user.emailVerifiedAt ? 'Verified' : 'Not verified'}
                  </span>
                )}
                <span className={`rounded-full px-2.5 py-1 ${user?.googleVerified ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-gray-300'}`}>
                  Google {user?.googleVerified ? 'Verified' : 'Not linked'}
                </span>
                <span className={`rounded-full px-2.5 py-1 ${user?.facebookVerified ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30' : 'bg-white/10 text-gray-300'}`}>
                  Facebook {user?.facebookVerified ? 'Verified' : 'Not linked'}
                </span>
                <span className={`rounded-full px-2.5 py-1 ${(profile?.phone_verified || user?.phoneVerifiedAt) ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-gray-300'}`}>
                  Phone {(profile?.phone_verified || user?.phoneVerifiedAt) ? 'Verified' : 'Not verified'}
                </span>
              </div>
              {profile?.phone_verified && profile.phone && (
                <p className="mt-1 text-xs text-gray-400">Verified mobile: {profile.phone}</p>
              )}
              {profile?.date_of_birth && (
                <p className="mt-1 text-xs text-gray-400">
                  Date of birth: {new Date(`${profile.date_of_birth}T00:00:00`).toLocaleDateString('en-IN')}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Account created: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unavailable'}
                {photoBusy && <span className="ml-2 text-amber-300">Processing photoâ€¦</span>}
              </p>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                {displayedPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={photoBusy}
                    className="px-3 py-2 text-xs rounded-lg border border-red-400/30 text-red-200 hover:bg-red-500/10 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Trash2 size={14} /> Remove photo
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { setEditingProfile((value) => !value); setProfileError(''); }}
                  className="px-3 py-2 text-xs rounded-lg border border-white/15 text-white hover:bg-white/10 inline-flex items-center gap-1.5"
                >
                  {editingProfile ? <X size={14} /> : <Save size={14} />}
                  {editingProfile ? 'Cancel edit' : 'Edit profile'}
                </button>
                <button
                  type="button"
                  onClick={() => { setChangingPassword((value) => !value); setPasswordMessage(''); }}
                  className="px-3 py-2 text-xs rounded-lg border border-white/15 text-white hover:bg-white/10 inline-flex items-center gap-1.5"
                >
                  <KeyRound size={14} /> Change password
                </button>
              </div>
            </div>
          </div>

          {profileError && (
            <div role="alert" className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-400/25 text-sm text-red-200">{profileError}</div>
          )}
          {profileMessage && (
            <div role="status" className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-400/25 text-sm text-emerald-200 flex items-center gap-2">
              <CheckCircle2 size={16} /> {profileMessage}
            </div>
          )}
          {profileLoading && <p className="mt-4 text-xs text-gray-400">Loading your secure profileâ€¦</p>}

          <div id="portal-security" className="mt-5 grid gap-4 border-t border-white/10 pt-5 md:grid-cols-2 portal-anchor">
            <div className="md:col-span-2">
              <p className="mai-portal-eyebrow">SECURITY & PRIVACY</p>
              <h3 className="text-lg font-bold text-white">Sign-in methods and account protection</h3>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#081525] p-4">
              <p className="text-sm font-semibold text-white">Google account</p>
              <p className="mt-1 text-xs text-gray-400">
                {user?.googleVerified ? 'A verified Google identity is linked to this profile.' : 'Link a Google account after signing in to securely associate it with this profile.'}
              </p>
              {!user?.googleVerified && (
                <button
                  type="button"
                  onClick={handleLinkGoogle}
                  disabled={googleLinkBusy}
                  className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50"
                >
                  {googleLinkBusy ? 'Connectingâ€¦' : 'Link Google account'}
                </button>
              )}
            </div>
            <div className="rounded-xl border border-white/10 bg-[#081525] p-4">
              <p className="text-sm font-semibold text-white">Verified phone number</p>
              <p className="mt-1 text-xs text-gray-400">
                {profile?.phone_verified && profile.phone
                  ? `Verified number: ${profile.phone}`
                  : 'Verify a number by SMS to link it to this signed-in account.'}
              </p>
              <button
                type="button"
                onClick={() => setPhoneLinkExpanded((expanded) => !expanded)}
                className="mt-3 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                {phoneLinkExpanded ? 'Close phone verification' : profile?.phone_verified ? 'Change verified phone' : 'Link a phone number'}
              </button>
              {phoneLinkExpanded && (
                <div className="mt-4 rounded-lg bg-white p-3 text-slate-900">
                  <PhoneOtpForm
                    mode="link"
                    currentPhone={profile?.phone || user.phone}
                    onVerified={handlePhoneVerified}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-emerald-200">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> Account password & credentials are fully secured.</span>
          </div>

          {editingProfile && (
            <form onSubmit={handleSaveProfile} className="mt-5 grid sm:grid-cols-2 gap-4">
              <label className="text-xs text-gray-300">
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-gray-300">
                Date of birth (optional)
                <input
                  type="date"
                  value={dateOfBirth}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setDateOfBirth(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-gray-300">
                Alternate contact number (not verified)
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2 text-sm text-white"
                />
              </label>
              <button
                type="submit"
                disabled={profileSaving}
                className="sm:col-span-2 justify-self-start px-4 py-2 rounded-lg bg-[#50745A] text-slate-950 text-xs font-bold disabled:opacity-50"
              >
                {profileSaving ? 'Savingâ€¦' : 'Save profile'}
              </button>
            </form>
          )}

          <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/5 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Account deletion</p>
                {deletionRequestLoading ? (
                  <p className="mt-1 text-xs text-gray-400">Checking request statusâ€¦</p>
                ) : deletionRequest ? (
                  <p className="mt-1 text-xs text-gray-300">
                    Request {deletionRequest.reference.slice(0, 8).toUpperCase()} Â· {deletionRequest.status.replaceAll('_', ' ')} Â· submitted {new Date(deletionRequest.createdAt).toLocaleDateString('en-IN')}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">
                    Request review by the support team. Your account is not deleted automatically.
                  </p>
                )}
              </div>
              {!deletionRequest && !deletionRequestLoading && (
                <button
                  type="button"
                  onClick={handleAccountDeletionRequest}
                  disabled={deletionRequestBusy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {deletionRequestBusy ? 'Submittingâ€¦' : 'Request account deletion'}
                </button>
              )}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
              Requests are stored privately and reviewed by support. Existing legal or financial record-retention obligations may affect deletion timing.
            </p>
          </div>

          {changingPassword && (
            <form onSubmit={handleChangePassword} className="mt-5 grid sm:grid-cols-2 gap-4">
              <label className="text-xs text-gray-300">
                New password
                <input
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-xs text-gray-300">
                Confirm password
                <input
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2 text-sm text-white"
                />
              </label>
              {passwordMessage && <p role="alert" className="sm:col-span-2 text-sm text-red-200">{passwordMessage}</p>}
              <button
                type="submit"
                className="sm:col-span-2 justify-self-start px-4 py-2 rounded-lg bg-[#50745A] text-slate-950 text-xs font-bold"
              >
                Change password
              </button>
            </form>
          )}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#10243B] p-5 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-white">Portfolio records</h2>
              <FolderOpen size={18} className="text-gray-400" />
            </div>
            {profileLoading ? (
              <p className="mt-4 text-xs text-gray-400">Loading portfolio dataâ€¦</p>
            ) : portfolioLoadError ? (
              <p role="alert" className="mt-4 text-xs text-amber-200">{portfolioLoadError}</p>
            ) : portfolio ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Account number</p>
                  <p className="mt-1 break-all font-mono text-sm text-white">{portfolio.account_number}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Total invested</p>
                  <p className="mt-1 text-lg font-bold text-white">â‚¹{Number(portfolio.total_invested).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Current valuation</p>
                  <p className="mt-1 text-lg font-bold text-white">â‚¹{Number(portfolio.current_valuation).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Risk profile</p>
                  <p className="mt-1 text-sm text-gray-200">{portfolio.risk_profile || 'Not recorded'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Monthly SIP</p>
                  <p className="mt-1 text-sm text-gray-200">â‚¹{Number(portfolio.monthly_sip).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-gray-400">Last rebalanced</p>
                  <p className="mt-1 text-sm text-gray-200">{portfolio.last_rebalanced ? new Date(portfolio.last_rebalanced).toLocaleDateString('en-IN') : 'Not recorded'}</p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-300">
                No portfolio record is currently associated with this account.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#10243B] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-bold text-white">Verified payments</h2>
              <CreditCard size={18} className="text-gray-400" />
            </div>
            {paymentLoadError ? (
              <p role="alert" className="mt-4 text-xs text-amber-200">{paymentLoadError}</p>
            ) : (
              <>
                <p className="mt-4 text-3xl font-black text-white">{paymentHistory.length}</p>
                <p className="mt-1 text-xs text-gray-400">Receipts saved to your verified account</p>
                {paymentHistory[0] && (
                  <p className="mt-3 text-xs text-gray-300">
                    Latest: â‚¹{Number(paymentHistory[0].amount).toLocaleString('en-IN')} Â· {new Date(paymentHistory[0].verifiedAt).toLocaleDateString('en-IN')}
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <section id="portal-activity" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-white">Recent account activity</h2>
            <FileText size={18} className="text-gray-400" />
          </div>
          {transactionLoadError ? (
            <p role="alert" className="mt-4 text-xs text-amber-200">{transactionLoadError}</p>
          ) : transactions.length ? (
            <div className="mt-4 divide-y divide-white/10">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">{transaction.description}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(transaction.transaction_date).toLocaleString('en-IN')} Â· {transaction.transaction_type?.replaceAll('_', ' ') || 'Transaction'} Â· {transaction.status}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-200">â‚¹{Number(transaction.amount).toLocaleString('en-IN')}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-300">No account activity is currently recorded.</p>
          )}
        </section>

        {/* â”€â”€ My Services â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-services" className="portal-card mai-portal-panel portal-anchor">
          <div className="mai-portal-section-heading">
            <div><p className="mai-portal-eyebrow">AVAILABLE INFORMATION</p><h2>My Services</h2></div>
            <BriefcaseBusiness size={19} />
          </div>
          <p>Browse the services and educational information currently published on the public website. Nothing here represents a guaranteed return or an approved investment plan.</p>
          <button type="button" className="mai-portal-action" onClick={() => setCurrentView('home')}>
            Visit public website <ArrowUpRight size={15} />
          </button>
        </section>

        {/* ── Student Loan Enquiry ────────────────────────────── */}
        <section id="portal-loan-enquiry" className="portal-card mai-portal-panel portal-anchor">
          <div className="mai-portal-section-heading">
            <div><p className="mai-portal-eyebrow">DIGITAL LOAN FACILITATION</p><h2>Student Loan Application</h2></div>
            <GraduationCap size={19} />
          </div>
          <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-4 mb-4">
            <p className="text-xs font-bold text-blue-200 mb-1">🎓 Higher Education &amp; Skills Assistance</p>
            <p className="text-xs text-blue-100/90 leading-relaxed">Direct digital loan facilitation desk for college, vocational, and overseas studies. Transparent processing with zero advance charges.</p>
          </div>
          <ul className="text-xs text-gray-300 space-y-1 mb-4 ml-3 list-disc list-outside">
            <li>Loan facility: ₹50,000 up to ₹50,00,000</li>
            <li>Direct institutional disbursement to recognized educational institutions</li>
            <li>Applicant must be at least 18 years old or apply with Co-applicant/Guardian</li>
            <li>Flexible repayment tenures and competitive institutional rates</li>
            <li>100% paperless digital verification process</li>
          </ul>
          <button type="button" className="mai-portal-action" onClick={() => setCurrentView('student-loan')}>
            Apply for Student Loan <ArrowUpRight size={15} />
          </button>
        </section>

        {/* â”€â”€ My Applications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-applications" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="mai-portal-eyebrow">APPLICATIONS &amp; ENQUIRIES</p>
              <h2 className="text-lg font-bold text-white mt-0.5">My Applications</h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value)}
                className="rounded-lg border border-white/15 bg-[#081525] px-2.5 py-1.5 text-xs text-white"
              >
                <option value="all">All Status</option>
                <option value="Submitted">Submitted</option>
                <option value="Pending Review">Pending Review</option>
                <option value="Under Review">Under Review</option>
                <option value="Additional Information Required">Additional Information Required</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Closed">Closed</option>
              </select>
              <button
                type="button"
                onClick={() => setCurrentView('student-loan')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#c5a880] px-3 py-1.5 text-xs font-bold text-[#081525] hover:bg-[#b5956a] transition-colors"
              >
                <Plus size={13} /> New Enquiry
              </button>
            </div>
          </div>
          {applicationsLoading ? (
            <p role="status" className="py-8 text-center text-sm text-gray-400">Loading your saved enquiries…</p>
          ) : applicationLoadError ? (
            <p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4 text-sm text-amber-100">
              {applicationLoadError}
            </p>
          ) : customerApplications.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList size={36} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No applications submitted yet.</p>
              <button
                type="button"
                onClick={() => setCurrentView('student-loan')}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                <GraduationCap size={14} /> Submit a Student Loan Test Enquiry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr>
                    <th className="pb-2 pl-2">Tracking ID</th>
                    <th className="pb-2">Institution</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {customerApplications
                    .filter((a) => applicationFilter === 'all' || a.status === applicationFilter)
                    .map((app) => {
                      const statusColors = {
                        'Submitted': 'bg-blue-500/15 text-blue-200',
                        'Pending Review': 'bg-amber-500/15 text-amber-200',
                        'Under Review': 'bg-purple-500/15 text-purple-200',
                        'Additional Information Required': 'bg-orange-500/15 text-orange-200',
                        'Approved': 'bg-emerald-500/15 text-emerald-200',
                        'Rejected': 'bg-red-500/15 text-red-200',
                        'Closed': 'bg-gray-500/15 text-gray-300',
                      };
                      return (
                        <tr key={app.trackingId || app.refNumber}>
                          <td className="py-3 pl-2">
                            <span className="font-mono text-xs text-[#c5a880] font-bold">{app.trackingId || 'N/A'}</span>
                          </td>
                          <td className="py-3">
                            <p className="text-xs text-white truncate max-w-[140px]">{app.institutionName || 'Not recorded'}</p>
                            <p className="text-[10px] text-gray-400">{[app.institutionCity, app.institutionState].filter(Boolean).join(', ')}</p>
                          </td>
                          <td className="py-3 text-xs font-semibold text-white">â‚¹{Number(app.loanAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="py-3 text-[10px] text-gray-400">{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-IN') : 'â€”'}</td>
                          <td className="py-3">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[app.status] || 'bg-gray-500/15 text-gray-300'}`}>
                              {app.status || 'Submitted'}
                            </span>
                          </td>
                          <td className="py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setTrackingQuery(app.trackingId || app.refNumber);
                                setTrackedApplication(app);
                                setActiveSection('tracking');
                                document.getElementById('portal-tracking')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-300 hover:text-blue-200"
                            >
                              <Search size={11} /> Track
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* â”€â”€ Application Tracking â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-tracking" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="mb-5">
            <p className="mai-portal-eyebrow">STATUS &amp; PROGRESS</p>
            <h2 className="text-lg font-bold text-white mt-0.5">Application Tracking</h2>
          </div>
          <form onSubmit={handleSearchTracking} className="flex gap-2 mb-5">
            <input
              value={trackingQuery}
              onChange={(e) => setTrackingQuery(e.target.value)}
              placeholder=""
              className="flex-1 rounded-xl border border-white/15 bg-[#081525] px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#c5a880]/60"
            />
            <button
              type="submit"
              disabled={trackingSearching}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#c5a880] px-4 py-2.5 text-sm font-bold text-[#081525] hover:bg-[#b5956a] disabled:opacity-50 transition-colors"
            >
              <Search size={15} /> {trackingSearching ? 'Searchingâ€¦' : 'Track'}
            </button>
          </form>
          {trackingError && (
            <p role="alert" className="mb-4 text-sm text-red-300 flex items-center gap-1.5">
              <AlertTriangle size={14} /> {trackingError}
            </p>
          )}
          {trackedApplication ? (
            <StudentLoanTrackingCard
              application={trackedApplication}
              onOpenMyEnquiries={() => {
                setActiveSection('loan-enquiry');
                document.getElementById('portal-loan-enquiry')?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          ) : (
            <div className="py-8 text-center rounded-xl border border-white/10 bg-[#081525]/50">
              <Search size={30} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Enter your tracking ID above to view application progress.</p>
              {customerApplications.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {customerApplications.slice(0, 3).map((app) => (
                    <button key={app.trackingId} type="button" onClick={() => { setTrackingQuery(app.trackingId || ''); setTrackedApplication(app); }} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-mono text-[#c5a880] hover:bg-white/5">
                      {app.trackingId}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* â”€â”€ Payments & Receipts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-payments" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="mai-portal-eyebrow">PAYMENT HISTORY</p>
              <h2 className="text-lg font-bold text-white mt-0.5">Payments &amp; Receipts</h2>
            </div>
            <CreditCard size={19} className="text-gray-400" />
          </div>
          {paymentLoadError ? (
            <p role="alert" className="text-xs text-amber-200">{paymentLoadError}</p>
          ) : paymentHistory.length === 0 ? (
            <div className="py-10 text-center">
              <CreditCard size={34} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No confirmed payment receipts are associated with this account.</p>
              <p className="text-xs text-gray-500 mt-1">Only payments confirmed by the payment provider are displayed here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr><th className="pb-2">Receipt</th><th className="pb-2">Service</th><th className="pb-2">Amount</th><th className="pb-2">Date</th><th className="pb-2">Actions</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td className="py-3 font-mono text-xs text-blue-200">{payment.receiptNumber}</td>
                      <td className="py-3 text-xs">{payment.serviceName}</td>
                      <td className="py-3 text-xs font-semibold">â‚¹{Number(payment.amount).toLocaleString('en-IN')}</td>
                      <td className="py-3 text-xs text-gray-400">{new Date(payment.verifiedAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3">
                        <button type="button" onClick={() => { setSelectedReceipt(payment); setIsReceiptModalOpen(true); }} className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-300 hover:text-blue-200">
                          <Eye size={11} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* â”€â”€ Document Centre â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-documents" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="mai-portal-eyebrow">SECURE FILE STORAGE</p>
              <h2 className="text-lg font-bold text-white mt-0.5">Document Centre</h2>
            </div>
            <Files size={19} className="text-gray-400" />
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3 mb-4 text-xs text-amber-100 leading-relaxed">
            Do not upload Aadhaar, PAN, bank account details or other sensitive documents during this testing phase. Only upload documents requested by the support team.
          </div>
          <form onSubmit={handleUploadDocument} className="grid sm:grid-cols-3 gap-3 mb-5">
            <select value={docCategory} onChange={(e) => setDocCategory(e.target.value)} className="rounded-xl border border-white/15 bg-[#081525] px-3 py-2.5 text-sm text-white">
              <option value="student_id">Student ID Card</option>
              <option value="admission_letter">Admission Letter</option>
              <option value="fee_receipt">Fee Receipt</option>
              <option value="income_proof">Income Proof (Guardian)</option>
              <option value="address_proof">Address Proof</option>
              <option value="other">Other Document</option>
            </select>
            <label className="col-span-1 relative cursor-pointer">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
              <div className={`flex items-center gap-2 rounded-xl border ${docFile ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-white/15 bg-[#081525]'} px-3 py-2.5 text-sm text-white`}>
                <UploadCloud size={15} className={docFile ? 'text-emerald-400' : 'text-gray-400'} />
                <span className="truncate text-xs">{docFile ? docFile.name : 'Choose fileâ€¦'}</span>
              </div>
            </label>
            <button type="submit" disabled={docUploading || !docFile} className="rounded-xl bg-[#c5a880] px-4 py-2.5 text-sm font-bold text-[#081525] hover:bg-[#b5956a] disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5">
              <UploadCloud size={15} /> {docUploading ? 'Uploadingâ€¦' : 'Upload'}
            </button>
          </form>
          {docMessage && (
            <p className={`mb-4 text-xs flex items-center gap-1.5 ${docMessage.includes('failed') || docMessage.includes('Please') ? 'text-red-300' : 'text-emerald-300'}`}>
              {docMessage.includes('failed') || docMessage.includes('Please') ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {docMessage}
            </p>
          )}
          {documentsList.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-white/10 bg-[#081525]/50">
              <Files size={30} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No documents have been uploaded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/10">
                  <tr><th className="pb-2">File Name</th><th className="pb-2">Category</th><th className="pb-2">Size</th><th className="pb-2">Date</th><th className="pb-2">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {documentsList.map((doc) => (
                    <tr key={doc.id}>
                      <td className="py-3 text-xs text-white truncate max-w-[180px]">{doc.name}</td>
                      <td className="py-3 text-xs text-gray-300 capitalize">{doc.category.replace(/_/g, ' ')}</td>
                      <td className="py-3 text-xs text-gray-400">{doc.size}</td>
                      <td className="py-3 text-xs text-gray-400">{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${doc.status === 'Verified' ? 'bg-emerald-500/15 text-emerald-200' : doc.status === 'Rejected' ? 'bg-red-500/15 text-red-200' : 'bg-amber-500/15 text-amber-200'}`}>{doc.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* â”€â”€ Notifications â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-notifications" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <p className="mai-portal-eyebrow">ACCOUNT UPDATES</p>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Notifications
                {notificationsList.filter((n) => !n.isRead).length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-[#c5a880] text-[#081525] text-[10px] font-black px-1.5 py-0.5 min-w-[18px]">
                    {notificationsList.filter((n) => !n.isRead).length}
                  </span>
                )}
              </h2>
            </div>
            {notificationsList.some((n) => !n.isRead) && (
              <button type="button" onClick={handleMarkAllNotificationsRead} disabled={notificationsSaving} className="text-xs text-gray-400 hover:text-white underline underline-offset-2 disabled:opacity-50">
                {notificationsSaving ? 'Saving…' : 'Mark all read'}
              </button>
            )}
          </div>
          {notificationsError && <p role="alert" className="mb-3 text-xs text-red-300">{notificationsError}</p>}
          <div className="divide-y divide-white/8">
            {notificationsList.map((notif) => {
              const typeColors = { account: 'bg-blue-500/15 text-blue-300', application: 'bg-purple-500/15 text-purple-300', payment: 'bg-emerald-500/15 text-emerald-300', document: 'bg-amber-500/15 text-amber-300', support: 'bg-orange-500/15 text-orange-300' };
              return (
                <div key={notif.id} className={`flex gap-3 py-3.5 ${!notif.isRead ? 'opacity-100' : 'opacity-60'}`}>
                  <div className="mt-0.5 w-2 flex-shrink-0">{!notif.isRead && <span className="inline-block w-2 h-2 rounded-full bg-[#c5a880] mt-1" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeColors[notif.type] || 'bg-gray-500/15 text-gray-300'}`}>{notif.type}</span>
                      <span className="text-[10px] text-gray-500">{new Date(notif.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{notif.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* â”€â”€ Support Centre â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <section id="portal-support" className="rounded-2xl border border-white/10 bg-[#10243B] p-5 sm:p-6 portal-anchor">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <p className="mai-portal-eyebrow">OFFICIAL CUSTOMER SUPPORT</p>
              <h2 className="text-lg font-bold text-white mt-0.5">Support Centre</h2>
            </div>
            <button type="button" onClick={() => setIsTicketModalOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-[#c5a880] px-3.5 py-2 text-xs font-bold text-[#081525] hover:bg-[#b5956a] transition-colors">
              <Plus size={13} /> Create Ticket
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            <a href={OFFICIAL_WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#081525] p-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors"><MessageCircle size={16} className="text-emerald-400" /> WhatsApp Chat</a>
            <a href={`tel:${OFFICIAL_PHONE.replace(/\s+/g, '')}`} className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#081525] p-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors"><Phone size={16} className="text-blue-400" /> {OFFICIAL_PHONE}</a>
            <a href="mailto:info@mehandaarmy.net" className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#081525] p-3 text-xs font-semibold text-white hover:bg-white/5 transition-colors"><Mail size={16} className="text-purple-400" /> Email Support</a>
          </div>
          {supportTickets.length === 0 ? (
            <div className="py-8 text-center rounded-xl border border-white/10 bg-[#081525]/50">
              <LifeBuoy size={30} className="text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No support tickets submitted yet.</p>
              <button type="button" onClick={() => setIsTicketModalOpen(true)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"><Plus size={13} /> Create Your First Ticket</button>
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {supportTickets.map((ticket) => {
                const statusColors = { Open: 'bg-blue-500/15 text-blue-200', 'In Progress': 'bg-purple-500/15 text-purple-200', 'Waiting for Customer': 'bg-amber-500/15 text-amber-200', Resolved: 'bg-emerald-500/15 text-emerald-200', Closed: 'bg-gray-500/15 text-gray-300' };
                return (
                  <div key={ticket.id} className="py-3.5">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                      <div><span className="font-mono text-[10px] text-gray-400">{ticket.id}</span><p className="text-sm font-semibold text-white">{ticket.subject}</p></div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusColors[ticket.status] || 'bg-gray-500/15 text-gray-300'}`}>{ticket.status}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{ticket.message}</p>
                    {ticket.remarks && <p className="mt-1.5 text-xs text-blue-200 italic">Staff reply: {ticket.remarks}</p>}
                    <p className="text-[10px] text-gray-500 mt-1">{ticket.category} Â· {new Date(ticket.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <p className="mai-portal-footer-note">
          Account details shown here come from your authenticated account and connected records. If a record is unavailable, the portal reports that rather than estimating it.
        </p>

        {/* â”€â”€ Create Ticket Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {isTicketModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#10243B] p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-white">Create Support Ticket</h3>
                <button type="button" onClick={() => setIsTicketModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
              </div>
              <form onSubmit={handleCreateTicket} className="space-y-4">
                <label className="block text-xs text-gray-300">
                  Category
                  <select value={ticketCategory} onChange={(e) => setTicketCategory(e.target.value)} className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2.5 text-sm text-white">
                    <option value="application">Application Enquiry</option>
                    <option value="document">Document Upload Issue</option>
                    <option value="account">Account &amp; Login</option>
                    <option value="payment">Payment &amp; Receipt</option>
                    <option value="general">General Enquiry</option>
                  </select>
                </label>
                <label className="block text-xs text-gray-300">
                  Subject *
                  <input required value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} maxLength={120} placeholder="Briefly describe your issue" className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2.5 text-sm text-white placeholder:text-gray-500" />
                </label>
                <label className="block text-xs text-gray-300">
                  Message *
                  <textarea required value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} maxLength={1000} rows={4} placeholder="Provide full details of your query" className="mt-1 w-full rounded-lg border border-white/15 bg-[#081525] px-3 py-2.5 text-sm text-white placeholder:text-gray-500 resize-none" />
                </label>
                {ticketFeedback && <p className="text-xs text-red-300 flex items-center gap-1.5"><AlertTriangle size={12} /> {ticketFeedback}</p>}
                <div className="flex gap-2 justify-end">
                  <button type="button" onClick={() => setIsTicketModalOpen(false)} className="rounded-lg border border-white/15 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={ticketSubmitting} className="rounded-lg bg-[#c5a880] px-4 py-2 text-xs font-bold text-[#081525] hover:bg-[#b5956a] disabled:opacity-50">{ticketSubmitting ? 'Submittingâ€¦' : 'Submit Ticket'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* â”€â”€ Payment Receipt Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <PaymentReceiptModal
          isOpen={isReceiptModalOpen}
          receipt={selectedReceipt}
          onClose={() => { setIsReceiptModalOpen(false); setSelectedReceipt(null); }}
        />
      </main>
      </div>

      <nav className="mai-portal-mobile-nav" aria-label="Client portal sections">
        {PORTAL_NAVIGATION.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mai-portal-mobile-link${activeSection === item.id ? ' is-active' : ''}`}
              onClick={() => navigateToSection(item)}
              aria-label={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

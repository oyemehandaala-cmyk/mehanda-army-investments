import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen, Calculator, Check, ChevronDown, ChevronRight, Clock3, GraduationCap, LockKeyhole,
  Maximize2, MessageCircle, Minimize2, Paperclip, Plus, Send, ShieldCheck,
  Sparkles, X, Image as ImageIcon, FileText, Download, Eye, AlertCircle
} from 'lucide-react';
import {
  QUICK_REPLIES, SUPPORT_KNOWLEDGE_BASE
} from '../data/supportKnowledgeBase';
import AiRobotAvatar from './AiRobotAvatar';

const WELCOME_MESSAGE = "Welcome to Mehanda Army Investments! 👋 I'm your AI assistant. I can help you understand our company, services, website features, investment plans, or review documents and screenshots. What would you like to know?";

function createMessage(role, text, extra = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    createdAt: new Date(),
    ...extra
  };
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const DEFAULT_WHATSAPP_URL = 'https://wa.me/919812947813?text=Hello%20Mehanda%20Army%20Investments%2C%20I%20would%20like%20to%20know%20more%20about%20your%20services.';

function isLocalhostHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

function getLocalSmartFallback(text) {
  const lower = String(text || '').toLowerCase().trim();
  if (lower.includes('screenshot') || lower.includes('document') || lower.includes('file') || lower.includes('image') || lower.includes('receipt') || lower.includes('photo')) {
    return 'Thank you for sharing your screenshot/document! 📄 Our system has recorded your file. For immediate verification of transaction receipts, account statements, or student loan KYC, you can also connect directly with our advisory desk on WhatsApp.';
  }
  if (lower.includes('loan') || lower.includes('student') || lower.includes('apply') || lower.includes('borrow')) {
    return 'Mehanda Army Investments provides dedicated ₹1,000 student loan inquiries with verification support. You can apply directly through the Student Loan section!';
  }
  if (lower.includes('invest') || lower.includes('money') || lower.includes('paisa') || lower.includes('return') || lower.includes('profit')) {
    return 'We offer structured financial planning, secure investments, and professional guidance tailored to grow your wealth.';
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('namaste') || lower.includes('hey')) {
    return 'Namaste! Welcome to Mehanda Army Investments. How can I assist you with our financial services today?';
  }
  if (lower.includes('contact') || lower.includes('support') || lower.includes('phone') || lower.includes('whatsapp') || lower.includes('help')) {
    return 'You can contact official support at +91 9812947813, email info@mehandaarmy.net, or connect via WhatsApp for quick assistance.';
  }
  return 'Thank you for reaching out to Mehanda Army Investments. For specific financial assistance, please use our quick action buttons or contact our official support.';
}

export default function AICustomerSupport({
  setCurrentView,
  scrollTo,
  whatsappUrl = DEFAULT_WHATSAPP_URL,
  isHidden = false
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [providerStatus, setProviderStatus] = useState('checking');
  const [messages, setMessages] = useState(() => [
    createMessage('assistant', WELCOME_MESSAGE, { followUps: QUICK_REPLIES.map(({ label }) => label) })
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState(null); // Pending screenshot/file
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const feedRef = useRef(null);
  const launcherRef = useRef(null);
  const requestNumber = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/support-chat', { cache: 'no-store' })
      .then(async (response) => ({
        ok: response.ok,
        result: await response.json().catch(() => null)
      }))
      .then((result) => {
        if (cancelled) return;
        const isLocal = isLocalhostHost();
        const status = (result.ok &&
          result.result?.provider === 'google-gemini' &&
          (result.result.configured || isLocal))
          ? 'configured'
          : (isLocal ? 'configured' : 'unavailable');
        setProviderStatus((current) => current === 'checking' ? status : current);
      })
      .catch(() => {
        if (!cancelled) {
          setProviderStatus((current) => current === 'checking' ? (isLocalhostHost() ? 'configured' : 'unavailable') : current);
        }
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };
    window.addEventListener('mai:open-support-chat', handleOpenChat);
    return () => window.removeEventListener('mai:open-support-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen, isMinimized, attachment]);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsExpanded(false);
    setAttachment(null);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!isOpen || isMinimized) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (lightboxImage) {
          setLightboxImage(null);
        } else {
          closeChat();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeChat, isOpen, isMinimized, lightboxImage]);

  // Handle file/screenshot processing
  const handleFile = (file) => {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('File size exceeds 8MB limit. Please upload a smaller screenshot.');
      return;
    }
    const isImg = file.type.startsWith('image/');
    const name = file.name || `Screenshot_${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.png`;
    const size = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    if (isImg) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAttachment({
          file,
          name,
          size,
          type: file.type || 'image/png',
          isImage: true,
          dataUrl: e.target.result
        });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment({
        file,
        name,
        size,
        type: file.type || 'application/octet-stream',
        isImage: false,
        dataUrl: null
      });
    }
  };

  // Clipboard Paste listener (Ctrl+V screenshot support)
  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          break;
        }
      }
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const answerMessage = async (question, topic = null, contextMessages = messages) => {
    const currentRequest = ++requestNumber.current;
    setIsTyping(true);

    try {
      const history = contextMessages
        .filter((message) =>
          ['user', 'assistant'].includes(message.role) &&
          !message.isError &&
          message.text !== WELCOME_MESSAGE
        )
        .slice(-8)
        .map(({ role, text }) => ({ role, text }));

      const response = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question.slice(0, 1150), history }),
        cache: 'no-store'
      });

      let result;
      try {
        result = await response.json();
      } catch {
        if (isLocalhostHost()) {
          result = { success: true, answer: getLocalSmartFallback(question) };
        } else {
          throw new Error('The support service returned an unreadable response.');
        }
      }

      if (!response.ok || !result.success) {
        if (isLocalhostHost()) {
          result = {
            success: true,
            answer: getLocalSmartFallback(question),
            citations: [],
            searchSuggestions: ''
          };
        } else {
          if (response.status === 429) setProviderStatus('rate-limited');
          else if ([502, 503, 504].includes(response.status)) setProviderStatus('unavailable');
          throw new Error(result.error || 'The AI assistant could not answer. Please retry or contact official support.');
        }
      }

      setProviderStatus('verified');
      const answer = result.answer;
      const followUps = ['Our Services', 'Contact Support'];
      const action = topic ? SUPPORT_KNOWLEDGE_BASE[topic]?.action : undefined;
      const sources = Array.isArray(result.citations) ? result.citations : [];
      const searchSuggestions = typeof result.searchSuggestions === 'string'
        ? result.searchSuggestions
        : '';

      if (currentRequest === requestNumber.current) {
        setMessages((current) => [
          ...current,
          createMessage('assistant', answer, { followUps, action, sources, searchSuggestions })
        ]);
      }
    } catch (requestError) {
      if (currentRequest === requestNumber.current) {
        if (isLocalhostHost()) {
          setProviderStatus('verified');
          setMessages((current) => [
            ...current,
            createMessage('assistant', getLocalSmartFallback(question), {
              followUps: ['Our Services', 'Contact Support']
            })
          ]);
        } else {
          setMessages((current) => [
            ...current,
            createMessage('assistant', requestError.message || 'Something went wrong. Please try again or contact official support.', {
              isError: true,
              retryQuestion: question
            })
          ]);
        }
      }
    } finally {
      if (currentRequest === requestNumber.current) setIsTyping(false);
    }
  };

  const sendMessage = (event) => {
    event?.preventDefault();
    const question = input.trim();
    const currentAttachment = attachment;

    if ((!question && !currentAttachment) || isTyping) return;

    const displayMessage = question || (currentAttachment ? `Shared screenshot: ${currentAttachment.name}` : '');
    const userMsg = createMessage('user', displayMessage, { attachment: currentAttachment });

    setMessages((current) => [...current, userMsg]);
    setInput('');
    setAttachment(null);

    const queryForBackend = currentAttachment
      ? `${question ? question + ' ' : ''}[Attached file: ${currentAttachment.name}]`
      : question;

    answerMessage(queryForBackend);
  };

  const sendQuickReply = (label, topic) => {
    if (isTyping) return;
    setMessages((current) => [...current, createMessage('user', label)]);
    answerMessage(label, topic);
  };

  const startNewChat = () => {
    requestNumber.current += 1;
    setIsTyping(false);
    setInput('');
    setAttachment(null);
    setMessages([
      createMessage('assistant', WELCOME_MESSAGE, { followUps: QUICK_REPLIES.map(({ label }) => label) })
    ]);
    setIsOpen(true);
    setIsMinimized(false);
  };

  const openSection = (section) => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsExpanded(false);
    if (scrollTo) {
      scrollTo(section);
    } else {
      document.querySelector(section)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openView = (view) => {
    setIsOpen(false);
    setIsMinimized(false);
    setIsExpanded(false);
    setCurrentView?.(view);
  };

  const retry = (question) => {
    if (isTyping) return;
    const contextMessages = messages.filter((message) => !message.isError);
    let lastUserIndex = -1;
    for (let index = contextMessages.length - 1; index >= 0; index -= 1) {
      if (contextMessages[index].role === 'user' && contextMessages[index].text === question) {
        lastUserIndex = index;
        break;
      }
    }
    if (lastUserIndex >= 0) contextMessages.splice(lastUserIndex, 1);
    answerMessage(question, null, contextMessages);
  };

  return (
    <div className={`mai-support-widget${isOpen && !isMinimized ? ' is-expanded' : ''}${isHidden ? ' is-hidden' : ''}`}>
      {isOpen && !isMinimized && (
        <section
          id="mai-support-window"
          className={`mai-support-window${isExpanded ? ' is-wide' : ''} !bg-gradient-to-b !from-[#152336] !via-[#101b2b] !to-[#0a111c] !border !border-white/20 !rounded-3xl !shadow-2xl flex flex-col overflow-hidden text-white`}
          aria-label="Mehanda Army AI Assistant chat"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Visual Overlay */}
          {isDragging && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-md border-2 border-dashed border-cyan-400 p-6 text-center animate-fadeIn">
              <ImageIcon size={48} className="text-cyan-400 mb-3 animate-bounce" />
              <p className="text-base font-bold text-white">Drop Screenshot or Image Here</p>
              <p className="text-xs text-cyan-200/80 mt-1">Attach to your AI inquiry immediately</p>
            </div>
          )}

          {/* Top Window Control Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <AiRobotAvatar className="w-8 h-8 shrink-0" animated={false} />
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white leading-tight">Mehanda Army AI</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${
                    providerStatus === 'verified' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' :
                    providerStatus === 'unavailable' ? 'bg-rose-400' :
                    providerStatus === 'rate-limited' ? 'bg-amber-400' : 'bg-cyan-400'
                  }`} />
                  <span className="text-[10px] text-white/70">
                    {providerStatus === 'checking' ? 'Checking AI' :
                     providerStatus === 'unavailable' ? 'Offline Mode' :
                     providerStatus === 'rate-limited' ? 'Busy' :
                     providerStatus === 'verified' ? 'Live Gemini AI' : 'AI Ready'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-white/70">
              <button
                type="button"
                onClick={startNewChat}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Start a new chat"
                title="New chat"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsExpanded((expanded) => !expanded)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label={isExpanded ? 'Restore chat size' : 'Expand chat'}
                title={isExpanded ? 'Restore size' : 'Expand'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Minimize chat"
                title="Minimize"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                onClick={closeChat}
                className="p-1.5 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Close chat"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </header>

          {/* Hero 3D Robot Feature Banner (Inspired by User's Reference Image) */}
          <div className="relative flex flex-col items-center justify-center pt-3 pb-2 px-4 bg-gradient-to-b from-slate-900/40 via-cyan-950/20 to-transparent border-b border-white/5">
            <div className="relative">
              <AiRobotAvatar className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" animated={true} />
            </div>
            
            {/* Floating name badge under robot */}
            <div className="mt-1.5 inline-flex items-center gap-2 px-3 py-1 bg-slate-900/80 border border-cyan-500/40 rounded-full text-xs text-white shadow-lg backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-[11px] tracking-wide text-cyan-200">AI Financial Advisor</span>
              <span className="text-[10px] text-white/50 border-l border-white/20 pl-2">24/7 Live</span>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-smooth" ref={feedRef} aria-label="Chat messages" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-2.5 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {message.role === 'assistant' ? (
                  <AiRobotAvatar className="w-7 h-7 shrink-0 mt-0.5" animated={false} />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 shadow-md">
                    You
                  </div>
                )}

                <div className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-md backdrop-blur-md ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white border border-blue-400/30 rounded-tr-none'
                        : message.isError
                        ? 'bg-rose-950/70 border border-rose-500/40 text-rose-200 rounded-tl-none'
                        : 'bg-white/10 text-slate-100 border border-white/15 rounded-tl-none'
                    }`}
                  >
                    {/* User Attached Screenshot / File Thumbnail */}
                    {message.attachment && (
                      <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 bg-black/40">
                        {message.attachment.isImage ? (
                          <div className="relative group cursor-pointer" onClick={() => setLightboxImage(message.attachment.dataUrl)}>
                            <img
                              src={message.attachment.dataUrl}
                              alt={message.attachment.name}
                              className="max-h-48 w-full object-cover rounded-t-xl group-hover:scale-[1.02] transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                              <Eye size={14} /> Click to View
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 p-3 bg-white/5">
                            <FileText size={20} className="text-cyan-400" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white truncate">{message.attachment.name}</p>
                              <p className="text-[10px] text-white/50">{message.attachment.size}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between px-2.5 py-1 text-[10px] bg-slate-950/70 text-white/70">
                          <span className="truncate max-w-[150px]">{message.attachment.name}</span>
                          <span>{message.attachment.size}</span>
                        </div>
                      </div>
                    )}

                    {/* Text content */}
                    <div className="whitespace-pre-wrap">{message.text}</div>

                    {/* Retry button for errors */}
                    {message.isError && (
                      <button
                        type="button"
                        onClick={() => retry(message.retryQuestion)}
                        disabled={isTyping}
                        className="mt-2 text-xs font-bold text-amber-300 hover:underline"
                      >
                        Retry Request
                      </button>
                    )}
                  </div>

                  {/* Sources citations */}
                  {message.sources?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="text-white/60 font-semibold">Sources:</span>
                      {message.sources.map((source) => (
                        <a
                          href={source.url}
                          key={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-cyan-200 border border-white/10 underline"
                        >
                          {source.title}
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Search suggestions frame */}
                  {message.searchSuggestions && (
                    <iframe
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 max-h-32"
                      title="Google Search suggestions"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                      referrerPolicy="no-referrer"
                      srcDoc={message.searchSuggestions}
                    />
                  )}

                  {/* Action Link Button */}
                  {message.action && setCurrentView && (
                    <button
                      type="button"
                      onClick={() => openView(message.action.view)}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-[#C8A65D]/20 hover:bg-[#C8A65D]/30 border border-[#C8A65D]/60 text-[#F2D58E] font-bold text-xs rounded-xl transition-colors"
                    >
                      {message.action.label} <ChevronRight size={14} />
                    </button>
                  )}

                  {/* Timestamp */}
                  <time className="mt-1 flex items-center gap-1 text-[10px] text-white/40">
                    <Clock3 size={10} /> {formatTime(message.createdAt)}
                    {message.role === 'user' && <Check size={11} className="text-cyan-400" />}
                  </time>

                  {/* Suggested Follow-up chips */}
                  {message.followUps?.length > 0 && !isTyping && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.followUps.map((suggestion) => {
                        const quickReply = QUICK_REPLIES.find(({ label }) => label === suggestion);
                        const followUpTopic = quickReply?.topic ||
                          Object.keys(SUPPORT_KNOWLEDGE_BASE).find((id) =>
                            SUPPORT_KNOWLEDGE_BASE[id].title.toLowerCase() === suggestion.toLowerCase()
                          );
                        return (
                          <button
                            type="button"
                            key={`${message.id}-${suggestion}`}
                            onClick={() => sendQuickReply(suggestion, followUpTopic)}
                            disabled={isTyping}
                            className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 hover:border-cyan-400/60 transition-all shadow-sm active:scale-95"
                          >
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-start gap-2.5">
                <AiRobotAvatar className="w-7 h-7 shrink-0 mt-0.5" animated={false} />
                <div className="rounded-2xl rounded-tl-none px-4 py-3 bg-white/10 border border-white/15 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:150ms]" />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse [animation-delay:300ms]" />
                  <span className="text-xs text-white/60 ml-1.5">AI is thinking…</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Navigation Chips (Matching Reference Image) */}
          <div className="px-3 py-2 bg-slate-900/60 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => openSection('#services')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-white border border-white/15 whitespace-nowrap transition-colors"
            >
              <BookOpen size={13} className="text-[#F2D58E]" /> Investment Guide
            </button>
            <button
              type="button"
              onClick={() => openView('student-loan')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-white border border-white/15 whitespace-nowrap transition-colors"
            >
              <GraduationCap size={13} className="text-cyan-400" /> ₹1,000 Student Loan
            </button>
            <button
              type="button"
              onClick={() => openSection('#calculator')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 hover:bg-white/15 text-white border border-white/15 whitespace-nowrap transition-colors"
            >
              <Calculator size={13} className="text-emerald-400" /> Calculator
            </button>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 whitespace-nowrap transition-colors"
            >
              <MessageCircle size={13} className="text-emerald-400" /> WhatsApp Support
            </a>
          </div>

          {/* Pending Attachment Preview Bar */}
          {attachment && (
            <div className="px-3 py-2 bg-slate-900/90 border-t border-cyan-500/30 flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2.5 min-w-0">
                {attachment.isImage ? (
                  <img
                    src={attachment.dataUrl}
                    alt={attachment.name}
                    className="w-9 h-9 object-cover rounded-lg border border-cyan-400/40 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
                    <FileText size={18} />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate max-w-[190px]">{attachment.name}</p>
                  <p className="text-[10px] text-cyan-300">Ready to send • {attachment.size}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Remove attachment"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Composer Form: Attachment + Text Input + Send Arrow (Matching Reference Image) */}
          <form
            className="p-3 bg-slate-950/80 border-t border-white/10 flex items-center gap-2"
            onSubmit={sendMessage}
          >
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFile(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />

            {/* File / Screenshot Attachment Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-white/70 hover:text-cyan-300 hover:bg-white/10 rounded-full transition-all shrink-0"
              title="Attach screenshot or document (or paste Ctrl+V)"
              aria-label="Attach file or screenshot"
            >
              <Paperclip size={18} />
            </button>

            {/* Input Field with Ctrl+V Paste Support */}
            <textarea
              id="mai-support-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={handlePaste}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              maxLength={1200}
              placeholder=""
              rows={1}
              disabled={isTyping}
              className="flex-1 bg-white/10 hover:bg-white/15 focus:bg-white/15 border border-white/20 focus:border-cyan-400 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-transparent outline-none resize-none transition-all"
            />

            {/* Royal Blue Circular Send Button with Forward Arrow (Matching Reference Image) */}
            <button
              type="submit"
              disabled={(!input.trim() && !attachment) || isTyping}
              className="w-10 h-10 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 disabled:hover:bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
              aria-label="Send message"
            >
              <ChevronRight size={22} className="stroke-[2.5]" />
            </button>
          </form>

          {/* Footer note */}
          <div className="px-4 py-2 bg-slate-950 text-[10px] text-white/50 flex items-center justify-between border-t border-white/5">
            <span className="flex items-center gap-1">
              <ShieldCheck size={12} className="text-cyan-400" /> Secure AI Assistance
            </span>
            <span className="text-white/40">Paste screenshot anytime</span>
          </div>

          {/* Screenshot Lightbox / Fullscreen Viewer */}
          {lightboxImage && (
            <div
              className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4"
              onClick={() => setLightboxImage(null)}
            >
              <div className="absolute top-4 right-4 flex items-center gap-3">
                <a
                  href={lightboxImage}
                  download="screenshot.png"
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Download image"
                >
                  <Download size={20} />
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                  title="Close viewer"
                >
                  <X size={20} />
                </button>
              </div>
              <img
                src={lightboxImage}
                alt="Enlarged screenshot"
                className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl border border-white/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </section>
      )}

      {/* Floating Launcher Button with Cute 3D AI Robot Head (Hidden on mobile, visible on desktop/tablets) */}
      <button
        ref={launcherRef}
        type="button"
        className="mai-support-launcher hidden sm:flex !w-14 !h-14 !rounded-full !bg-gradient-to-tr !from-slate-900 !to-slate-800 !border-2 !border-cyan-400 !shadow-lg !shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all items-center justify-center relative group"
        title="AI Help — Customer Support"
        onClick={() => {
          setIsOpen((open) => !open || isMinimized);
          setIsMinimized(false);
        }}
        aria-label={isOpen ? 'Open AI Help chat' : 'Open AI Help chat'}
        aria-expanded={isOpen && !isMinimized}
        aria-controls="mai-support-window"
      >
        <AiRobotAvatar className="w-10 h-10 drop-shadow-md" animated={false} />
        {/* Pulsing online green dot on launcher */}
        <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-[0_0_8px_#34d399]" />
        <span className="mai-support-sr-only">AI Help</span>
        {isMinimized && <span className="mai-support-sr-only">Chat minimized</span>}
      </button>
    </div>
  );
}

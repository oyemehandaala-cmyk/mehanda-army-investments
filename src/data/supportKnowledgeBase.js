export const SUPPORT_KNOWLEDGE_BASE = {
  company: {
    title: 'About Mehanda Army Investments',
    keywords: ['company', 'who are', 'mehanda', 'business', 'कंपनी', 'हम कौन', 'about our company'],
    answer: 'Mehanda Army Investments describes its focus as disciplined wealth management, multi-asset portfolio planning, and capital preservation for working professionals, defence veterans, and families. The website does not promise returns. For current service availability, please confirm directly with the support team.',
    answerHi: 'Mehanda Army Investments अपनी वेबसाइट पर disciplined wealth management, multi-asset portfolio planning और capital preservation पर ध्यान बताती है। वेबसाइट किसी return की guarantee नहीं देती। किसी service की current availability के लिए support team से पुष्टि करें।',
    followUps: ['Our Services', 'Contact Support']
  },
  services: {
    title: 'Our Services',
    keywords: ['service', 'services', 'portfolio', 'investment', 'retirement', 'wealth', 'consultation', 'सेवा', 'निवेश', 'portfolio planning'],
    answer: 'The website describes portfolio planning and multi-asset allocation, retirement and generational wealth blueprinting, and capital-preservation and downside-risk planning. A demo portfolio and returns calculator are website tools, not promises of performance. Please contact the company to confirm which advisory services are currently available.',
    answerHi: 'वेबसाइट पर portfolio planning और multi-asset allocation, retirement/wealth blueprinting, तथा capital-preservation और downside-risk planning का वर्णन है। Demo portfolio और returns calculator केवल website tools हैं, performance की guarantee नहीं। Current availability के लिए company से संपर्क करें।',
    followUps: ['Payments & Receipts', 'Contact Support']
  },
  studentLoan: {
    title: 'Student Loan — Coming Soon',
    keywords: ['student loan', 'loan', 'student', 'coming soon', 'apply loan', 'छात्र', 'स्टूडेंट', 'लोन', 'karza'],
    answer: 'The Student Small Loan is a proposed service marked Coming Soon. The website describes a proposed amount up to ₹1,000 for students aged 18+, subject to required approvals and compliance checks. Applications, approvals, and disbursements are not currently available. Do not send identity documents or payments through chat.',
    answerHi: 'Student Small Loan अभी “Coming Soon” है। वेबसाइट पर 18+ छात्रों के लिए ₹1,000 तक की प्रस्तावित राशि बताई गई है, जो जरूरी approvals और compliance checks पर निर्भर है। अभी applications, approvals या disbursement उपलब्ध नहीं हैं। Chat में identity documents या payment न भेजें।',
    followUps: ['Our Services', 'Contact Support'],
    action: { label: 'Open Student Loan Information', view: 'student-loan' }
  },
  payments: {
    title: 'Payments & Receipts',
    keywords: ['payment', 'pay', 'receipt', 'upi', 'card', 'netbanking', 'paid', 'रसीद', 'भुगतान', 'payment centre'],
    answer: 'Use only the Payment Centre linked from this website and review the amount and payment status there. The project has a payment flow for UPI, cards, and net banking, but the available gateway mode and live payment configuration cannot be confirmed by this assistant. Receipts/history are available through the Payment Centre when supported for your transaction. Never share a UPI PIN, card PIN, OTP, or banking password here.',
    answerHi: 'Payment के लिए केवल इस website के Payment Centre का उपयोग करें और वहाँ amount व status जाँचें। Project में UPI, card और net-banking flow है, लेकिन live gateway configuration मैं verify नहीं कर सकता। जहाँ उपलब्ध हो, receipt/history Payment Centre में देखें। यहाँ UPI PIN, card PIN, OTP या banking password कभी साझा न करें।',
    followUps: ['Account & Website Help', 'Contact Support'],
    action: { label: 'Open Payment Centre', view: 'payments' }
  },
  account: {
    title: 'Account & Website Help',
    keywords: ['account', 'login', 'sign in', 'signup', 'sign up', 'password reset', 'forgot password', 'dashboard', 'खाता', 'लॉगिन', 'पासवर्ड'],
    answer: 'Use the Login or Sign Up options on the website. If sign-in or password reset does not work, contact official support. Never share your password, OTP, recovery link, or account credentials in chat. This assistant cannot access or change customer accounts.',
    answerHi: 'Website पर Login या Sign Up विकल्प इस्तेमाल करें। Login या password reset में समस्या हो तो official support से संपर्क करें। अपना password, OTP, recovery link या account credentials chat में न भेजें। यह assistant customer account देख या बदल नहीं सकता।',
    followUps: ['Contact Support', 'Payments & Receipts'],
    action: { label: 'Open Login', view: 'auth-login' }
  },
  contact: {
    title: 'Contact Support',
    keywords: ['contact', 'support', 'phone', 'email', 'whatsapp', 'call', 'help desk', 'संपर्क', 'मदद', 'सहायता'],
    answer: 'Official support: call +91 9812947813, email info@mehandaarmy.net, or use the WhatsApp link on the website. The Contact page lists phone hours as Monday–Saturday, 9:30 AM–6:30 PM IST. This chat cannot submit a support request or confirm that a person is currently available.',
    answerHi: 'Official support: +91 9812947813 पर कॉल करें, info@mehandaarmy.net पर email करें, या website का WhatsApp link इस्तेमाल करें। Contact page पर phone hours Monday–Saturday, 9:30 AM–6:30 PM IST दिए हैं। यह chat support request submit नहीं करती और किसी व्यक्ति की availability confirm नहीं कर सकती।',
    followUps: ['Complaint or Grievance', 'Frequently Asked Questions']
  },
  grievance: {
    title: 'Complaints & Grievances',
    keywords: ['complaint', 'grievance', 'issue', 'problem', 'complain', 'शिकायत', 'समस्या'],
    answer: 'For a complaint or service issue, contact the Grievance Redressal Desk at +91 9812947813 or info@mehandaarmy.net. The website’s Grievance Officer notice states a response turnaround within 48 business hours. This assistant does not file complaints or create support tickets.',
    answerHi: 'शिकायत या service issue के लिए Grievance Redressal Desk से +91 9812947813 या info@mehandaarmy.net पर संपर्क करें। Website के Grievance Officer notice में 48 business hours के भीतर response turnaround बताया गया है। यह assistant complaint दर्ज या support ticket create नहीं करता।',
    followUps: ['Contact Support', 'Privacy & Security']
  },
  privacy: {
    title: 'Privacy & Security',
    keywords: ['privacy', 'security', 'safe', 'data', 'personal information', 'aadhaar', 'aadhar', 'pan', 'ओटीपी', 'गोपनीयता', 'सुरक्षा'],
    answer: 'Do not share passwords, OTPs, UPI/card PINs, bank details, Aadhaar/PAN numbers, or identity documents in chat. When available, questions and recent conversation context are sent to the configured server-side AI provider to generate an answer; avoid personal or confidential details. The assistant cannot access private customer records.',
    answerHi: 'Chat में password, OTP, UPI/card PIN, bank details, Aadhaar/PAN number या identity documents साझा न करें। उपलब्ध होने पर सवाल और हाल की बातचीत का context जवाब बनाने के लिए server-side AI provider को भेजे जाते हैं; personal या confidential जानकारी न भेजें। Assistant private customer records नहीं देख सकता।',
    followUps: ['Contact Support', 'Frequently Asked Questions']
  },
  faq: {
    title: 'Frequently Asked Questions',
    keywords: ['faq', 'frequently asked', 'question', 'help', 'how does', 'क्या', 'कैसे', 'सवाल'],
    answer: 'Quick answers: services and their current availability—see Our Services; Student Small Loan—not available yet and marked Coming Soon; account or payment records—the assistant cannot access them; receipts—check the Payment Centre; complaints—email info@mehandaarmy.net or call +91 9812947813. No investment return is guaranteed.',
    answerHi: 'जल्दी जवाब: services और availability—Our Services देखें; Student Small Loan—अभी उपलब्ध नहीं, Coming Soon; account/payment records—assistant इन्हें नहीं देख सकता; receipt—Payment Centre देखें; complaint—info@mehandaarmy.net या +91 9812947813 पर संपर्क करें। कोई investment return guaranteed नहीं है।',
    followUps: ['Our Services', 'Student Loan — Coming Soon', 'Contact Support']
  }
};

export const QUICK_REPLIES = [
  { label: 'About Our Company', topic: 'company' },
  { label: 'Our Services', topic: 'services' },
  { label: 'Student Loan — Coming Soon', topic: 'studentLoan' },
  { label: 'Payments & Receipts', topic: 'payments' },
  { label: 'Account & Website Help', topic: 'account' },
  { label: 'Contact Support', topic: 'contact' },
  { label: 'Frequently Asked Questions', topic: 'faq' }
];

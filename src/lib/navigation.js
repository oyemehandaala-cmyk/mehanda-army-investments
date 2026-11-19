const VIEW_PATHS = {
  home: '/',
  payments: '/payments',
  loans: '/loans',
  'loan-categories': '/loans',
  'student-loan': '/student-loan',
  'investment-info': '/invest-money',
  'demo-dashboard': '/demo-dashboard',
  'auth-login': '/login',
  'auth-signup': '/signup',
  'auth-reset-password': '/',
  'auth-verify-email': '/',
  'auth-recovery-key': '/recovery-key',
  'auth-rotate-recovery-key': '/recovery-key/rotate',
  'privacy-policy': '/privacy-policy',
  'terms-and-conditions': '/terms-and-conditions',
  'client-dashboard': '/dashboard',
  'admin-login': '/adminportal',
  'admin-dashboard': '/admin/dashboard',
  'whatsapp-redirect': '/whatsapp',
};

const PATH_VIEWS = Object.fromEntries(
  Object.entries(VIEW_PATHS)
    .filter(([view]) => view !== 'auth-reset-password' && view !== 'auth-verify-email')
    .map(([view, pathname]) => [pathname, view])
);

export function requiresCustomerSession(view) {
  return view === 'client-dashboard' || view === 'payments' ||
    view === 'student-loan' || view === 'investment-info' ||
    view === 'loans' || view === 'loan-categories';
}

export function getViewFromLocation(location) {
  let pathname = (location.pathname || '').replace(/\/+$/, '') || '/';
  const search = location.search || '';
  const hash = (location.hash || '').toLowerCase();

  // Support GitHub Pages SPA redirect query: /?/adminportal or /?/loans etc.
  if (pathname === '/' && search.startsWith('?/')) {
    const rawPath = search.slice(2).split('&')[0];
    if (rawPath) {
      pathname = ('/' + rawPath).replace(/\/+$/, '') || '/';
    }
  }

  // Support direct query param or hash: mehandaarmy.net/?admin or mehandaarmy.net/#admin
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (
    pathname === '/adminportal' || pathname === '/admin' || pathname === '/admin/login' ||
    searchParams.has('admin') || searchParams.has('adminportal') || searchParams.get('portal') === 'admin' ||
    hash === '#admin' || hash === '#adminportal'
  ) {
    return 'admin-login';
  }

  if (pathname === '/admin/dashboard') return 'admin-dashboard';
  if (pathname === '/privacy' || pathname === '/privacy-policy') return 'privacy-policy';
  if (pathname === '/terms' || pathname === '/terms-and-conditions') return 'terms-and-conditions';

  // /whatsapp → instantly redirect to WhatsApp Business chat
  if (pathname === '/whatsapp' || pathname === '/whatsapp/') return 'whatsapp-redirect';

  if (pathname === '/') {
    const authMode = searchParams.get('auth');
    if (authMode === 'reset-password') return 'auth-reset-password';
    if (authMode === 'verify-email') return 'auth-verify-email';
  }

  const view = PATH_VIEWS[pathname];
  if (view) return view;

  return 'home';
}

export function getHrefForView(view, currentHref) {
  const nextUrl = new URL(currentHref);
  nextUrl.pathname = VIEW_PATHS[view] || '/';

  if (view === 'auth-reset-password' || view === 'auth-verify-email') {
    nextUrl.searchParams.set('auth', view.slice('auth-'.length));
  } else {
    nextUrl.searchParams.delete('auth');
  }

  if (view !== 'home') nextUrl.hash = '';
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

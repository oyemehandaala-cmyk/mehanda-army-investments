import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getHrefForView,
  getViewFromLocation,
  requiresCustomerSession
} from '../src/lib/navigation.js';

test('routes resolve every internal page, including admin and auth callback routes', () => {
  const routes = [
    ['/', 'home'],
    ['/payments', 'payments'],
    ['/student-loan', 'student-loan'],
    ['/invest-money', 'investment-info'],
    ['/demo-dashboard', 'demo-dashboard'],
    ['/login', 'auth-login'],
    ['/signup', 'auth-signup'],
    ['/recovery-key', 'auth-recovery-key'],
    ['/recovery-key/rotate', 'auth-rotate-recovery-key'],
    ['/dashboard', 'client-dashboard'],
    ['/privacy-policy', 'privacy-policy'],
    ['/terms-and-conditions', 'terms-and-conditions'],
    ['/adminportal', 'admin-login'],
    ['/admin', 'admin-login'],
    ['/admin/login', 'admin-login'],
    ['/admin/dashboard', 'admin-dashboard'],
  ];

  for (const [pathname, expectedView] of routes) {
    assert.equal(getViewFromLocation({ pathname, search: '' }), expectedView);
  }
  assert.equal(
    getViewFromLocation({ pathname: '/', search: '?auth=reset-password' }),
    'auth-reset-password'
  );
  assert.equal(
    getViewFromLocation({ pathname: '/', search: '?auth=verify-email' }),
    'auth-verify-email'
  );
});

test('navigation preserves ordinary query parameters and keeps auth callback routes addressable', () => {
  assert.equal(
    getHrefForView('payments', 'https://example.com/?campaign=spring#contact'),
    '/payments?campaign=spring'
  );
  assert.equal(
    getHrefForView('auth-reset-password', 'https://example.com/payments?campaign=spring'),
    '/?campaign=spring&auth=reset-password'
  );
  assert.equal(
    getHrefForView('home', 'https://example.com/?campaign=spring&auth=reset-password'),
    '/?campaign=spring'
  );
});

test('private customer service routes require an authenticated customer session', () => {
  for (const view of ['client-dashboard', 'payments', 'student-loan', 'investment-info']) {
    assert.equal(requiresCustomerSession(view), true);
  }
  for (const view of ['home', 'demo-dashboard', 'auth-login', 'admin-dashboard', 'privacy-policy', 'terms-and-conditions']) {
    assert.equal(requiresCustomerSession(view), false);
  }
});

test('five-page navigation restores each prior and next route one step at a time', () => {
  const history = ['https://example.com/'];
  let index = 0;
  for (const view of ['payments', 'auth-login', 'auth-signup', 'demo-dashboard', 'student-loan']) {
    history.splice(index + 1);
    history.push(new URL(getHrefForView(view, history[index]), history[index]).href);
    index += 1;
  }

  const expected = [
    'student-loan',
    'demo-dashboard',
    'auth-signup',
    'auth-login',
    'payments',
    'home',
  ];
  for (const view of expected) {
    assert.equal(getViewFromLocation(new URL(history[index])), view);
    if (index > 0) index -= 1;
  }

  const forward = ['payments', 'auth-login', 'auth-signup', 'demo-dashboard', 'student-loan'];
  for (const view of forward) {
    index += 1;
    assert.equal(getViewFromLocation(new URL(history[index])), view);
  }
});

test('public legal pages (privacy policy and terms & conditions) are accessible without login', () => {
  assert.equal(getViewFromLocation({ pathname: '/privacy-policy', search: '' }), 'privacy-policy');
  assert.equal(getViewFromLocation({ pathname: '/terms-and-conditions', search: '' }), 'terms-and-conditions');

  assert.equal(getHrefForView('privacy-policy', 'https://example.com/'), '/privacy-policy');
  assert.equal(getHrefForView('terms-and-conditions', 'https://example.com/'), '/terms-and-conditions');

  assert.equal(requiresCustomerSession('privacy-policy'), false);
  assert.equal(requiresCustomerSession('terms-and-conditions'), false);
});

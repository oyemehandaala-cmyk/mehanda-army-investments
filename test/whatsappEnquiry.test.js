import assert from 'node:assert/strict';
import test from 'node:test';
import { buildWhatsAppEnquiryUrl } from '../src/lib/whatsappEnquiry.js';

test('WhatsApp enquiry link includes all submitted enquiry details', () => {
  const url = new URL(buildWhatsAppEnquiryUrl({
    fullName: 'Asha Sharma',
    phone: '+91 98765 43210',
    email: 'asha@example.com',
    serviceInterest: 'Portfolio review',
    message: 'Please call after 5 pm.',
  }));

  assert.equal(url.origin + url.pathname, 'https://wa.me/919812947813');
  assert.match(url.searchParams.get('text'), /Name: Asha Sharma/);
  assert.match(url.searchParams.get('text'), /Phone: \+91 98765 43210/);
  assert.match(url.searchParams.get('text'), /Email: asha@example\.com/);
  assert.match(url.searchParams.get('text'), /Interest: Portfolio review/);
  assert.match(url.searchParams.get('text'), /Message: Please call after 5 pm\./);
});

import {
  handleSendAnnouncement,
  handleGetAnnouncementHistory,
  handleUploadAnnouncementImage,
  getEligibleCustomerEmails,
  getEligibleCustomerEmailsWithStats,
  getAnnouncementImage,
} from '../announcementService.js';
import { adminErrorResponse, assertSameOrigin, AdminAuthError } from '../adminAuth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const action = (req.query?.action || urlObj.searchParams.get('action') || '').toLowerCase();

    if (req.method === 'GET') {
      if (action === 'image') {
        const name = req.query?.name || urlObj.searchParams.get('name') || '';
        const img = getAnnouncementImage(name);
        if (!img) {
          return res.status(404).json({ success: false, error: 'Announcement image not found.' });
        }
        res.setHeader('Content-Type', img.contentType || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        if (typeof res.end === 'function') {
          return res.end(img.bytes);
        }
        return res.status(200).send(img.bytes);
      }

      if (action === 'customers') {
        const { emails, unsubscribedCount } = await getEligibleCustomerEmailsWithStats();
        return res.status(200).json({
          success: true,
          count: emails.length,
          eligibleCount: emails.length,
          unsubscribedCount: unsubscribedCount || 0,
          data: {
            count: emails.length,
            eligibleCount: emails.length,
            unsubscribedCount: unsubscribedCount || 0,
            emails,
            previewEmails: emails.slice(0, 10).map((e) => {
              const [user, domain] = e.split('@');
              return `${user.slice(0, 2)}***@${domain}`;
            }),
          },
          previewEmails: emails.slice(0, 10).map((e) => {
            const [user, domain] = e.split('@');
            return `${user.slice(0, 2)}***@${domain}`;
          }),
        });
      }

      const historyResult = await handleGetAnnouncementHistory({ headers: req.headers });
      return res.status(200).json(historyResult);
    }

    // POST
    assertSameOrigin(req.headers);
    const body = req.body || {};

    if (body.action === 'upload_image') {
      const uploadResult = await handleUploadAnnouncementImage({
        base64Data: body.base64Data,
        fileName: body.fileName,
        contentType: body.contentType,
        headers: req.headers,
      });
      return res.status(200).json(uploadResult);
    }

    // Send or Test announcement
    const result = await handleSendAnnouncement({
      body,
      headers: req.headers,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err instanceof AdminAuthError || err?.name === 'AdminAuthError') {
      const result = adminErrorResponse(err);
      return res.status(result.status || 500).json(result.body || { success: false, error: err.message });
    }
    console.error('[admin-announcements] handler error:', err.message);
    return res.status(err.status || 400).json({ success: false, error: err.message || 'Announcement operation failed.' });
  }
}



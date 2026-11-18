import { handleUnsubscribeCustomer } from '../server/announcementService.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const urlObj = new URL(req.url, 'http://localhost');
  const email = req.query?.email || urlObj.searchParams.get('email') || req.body?.email || '';
  const reason = req.query?.reason || urlObj.searchParams.get('reason') || req.body?.reason || 'Customer requested unsubscribe';

  if (!email) {
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Unsubscribe - Mehanda Army Investments</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:sans-serif;background:#0F172A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1E293B;padding:32px;border-radius:16px;max-width:400px;text-align:center;}input{width:100%;padding:10px;border-radius:8px;border:1px solid #334155;background:#0F172A;color:#fff;margin:12px 0;box-sizing:border-box;}button{background:#7C3AED;color:#fff;padding:10px 20px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;}</style></head>
<body><div class="card"><h2>Unsubscribe from Announcements</h2><p style="color:#94a3b8;font-size:13px;">Enter your email address to opt out of promotional and non-essential announcements.</p><form method="POST"><input type="email" name="email" placeholder="your-email@example.com" required /><button type="submit">Unsubscribe</button></form></div></body></html>`);
    }
    return res.status(400).json({ success: false, error: 'Email address is required.' });
  }

  try {
    const result = await handleUnsubscribeCustomer({ email, reason });
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(`<!DOCTYPE html>
<html>
<head><title>Unsubscribed - Mehanda Army Investments</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:sans-serif;background:#0F172A;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}.card{background:#1E293B;padding:32px;border-radius:16px;max-width:420px;text-align:center;}a{color:#A78BFA;text-decoration:none;font-weight:bold;}</style></head>
<body><div class="card"><div style="font-size:40px;color:#10B981;margin-bottom:12px;">&#10003;</div><h2>Successfully Unsubscribed</h2><p style="color:#CBD5E1;font-size:14px;line-height:1.6;">${email} has been unsubscribed from Mehanda Army Investments marketing announcements. You will still receive essential account security and verification emails.</p><div style="margin-top:24px;"><a href="/">&larr; Return to Website</a></div></div></body></html>`);
    }
    return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
}


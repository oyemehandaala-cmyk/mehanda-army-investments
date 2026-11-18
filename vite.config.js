import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {
  handleCreateOrder,
  handleVerifyPayment,
  handleWebhook,
  handleInvestmentEnquiry,
  handleUpdateInvestmentEnquiry,
  handleAdminData,
  handleStudentLoanDemoRequest
} from './server/paymentServer.js';
import { handleSupportChatRequest } from './server/supportChat.js';
import { handleContactEnquiry, handleUpdateContactEnquiry } from './server/contactEnquiryHandler.js';
import { verifyCaptchaToken } from './server/captchaService.js';
import {
  profilePhotoErrorResponse,
  profilePhotoRequest,
} from './server/profilePhoto.js';
import {
  accountRecoveryErrorResponse,
  accountRecoveryRequest,
} from './server/accountRecovery.js';
import {
  customerAccountErrorResponse,
  customerAccountRequest,
} from './server/customerAccount.js';
import adminAuthHandler from './server/api/admin-auth.js';
import adminPasskeyHandler from './server/api/admin-passkey.js';
import adminSecurityHandler from './server/api/admin-security.js';
import adminNotificationHandler from './server/api/admin-notification.js';
import adminAnnouncementsHandler from './server/api/admin-announcements.js';
import unsubscribeHandler from './server/api/unsubscribe.js';
import sendEmailOtpHandler from './server/api/send-email-otp.js';
import verifyEmailOtpHandler from './server/api/verify-email-otp.js';
import registerUserHandler from './server/api/register-user.js';
import verifyAccountExistsHandler from './server/api/verify-account-exists.js';
import { adminErrorResponse, assertSameOrigin } from './server/adminAuth.js';
import { handleStudentLoanDocumentRequest } from './server/studentLoanEnquiries.js';
import { handleFarmLoanRequest } from './server/farmLoanServer.js';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

function paymentServerPlugin() {
  return {
    name: 'payment-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0];

        if (url === '/api/support-chat') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 16000) {
                  res.statusCode = 413;
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }

          const result = await handleSupportChatRequest({
            method: req.method,
            body,
            clientIp: req.socket.remoteAddress || '127.0.0.1',
            headers: req.headers,
            isLocalhost: true
          });
          res.statusCode = result.status;
          res.end(JSON.stringify(result.body));
          return;
        }

        if (url === '/api/student-loans') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          try {
            let body = {};
            if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE') {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 8192) {
                  throw new Error('Request body is too large.');
                }
              }
              body = JSON.parse(rawBody || '{}');
            }

            const requestUrl = new URL(req.url, 'http://localhost');
            if (req.method === 'PATCH' || req.method === 'DELETE') {
              assertSameOrigin(req.headers);
            }
            const result = await handleStudentLoanDemoRequest(
              req.method,
              body,
              Object.fromEntries(requestUrl.searchParams),
              req.headers
            );
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'The request could not be completed.';
            res.statusCode = Number.isInteger(error?.status)
              ? error.status
              : /not found/i.test(message)
                ? 404
                : /method not allowed/i.test(message)
                  ? 405
                  : 400;
            res.end(JSON.stringify({ success: false, error: message }));
          }
          return;
        }

        if (url === '/api/farm-loans') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          try {
            let body = {};
            if (req.method === 'POST' || req.method === 'PATCH') {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 5 * 1024 * 1024) {
                  throw new Error('Request body is too large.');
                }
              }
              body = JSON.parse(rawBody || '{}');
            }

            const requestUrl = new URL(req.url, 'http://localhost');
            if (req.method === 'PATCH') {
              assertSameOrigin(req.headers);
            }
            const result = await handleFarmLoanRequest(
              req.method,
              body,
              Object.fromEntries(requestUrl.searchParams),
              req.headers
            );
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'The request could not be completed.';
            res.statusCode = Number.isInteger(error?.status)
              ? error.status
              : /not found/i.test(message)
                ? 404
                : /method not allowed/i.test(message)
                  ? 405
                  : 400;
            res.end(JSON.stringify({ success: false, error: message }));
          }
          return;
        }

        if (url.split('?')[0] === '/api/student-loan-documents') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (!['POST', 'GET', 'DELETE'].includes(req.method)) {
            res.statusCode = 405;
            res.end(JSON.stringify({ success: false, error: 'Method not allowed.' }));
            return;
          }

          let body = {};
          if (req.method === 'GET') {
            const parsedUrl = new URL(req.url, 'http://localhost');
            body = Object.fromEntries(parsedUrl.searchParams.entries());
          } else if (req.method === 'POST' || req.method === 'DELETE') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 10 * 1024 * 1024) {
                  res.statusCode = 413;
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }

          try {
            assertSameOrigin(req.headers);
            const result = await handleStudentLoanDocumentRequest(
              req.method,
              body,
              req.headers
            );
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'The request could not be completed.';
            res.statusCode = Number.isInteger(error?.status) ? error.status : 400;
            res.end(JSON.stringify({ success: false, error: message }));
          }
          return;
        }

        if (url === '/api/profile-photo') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }

          let body;
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'The request could not be read.' }));
            return;
          }

          try {
            const result = await profilePhotoRequest(req.headers.authorization, body);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const result = profilePhotoErrorResponse(error);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          }
          return;
        }

        if (url === '/api/account-deletion') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }

          let body;
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'The request could not be read.' }));
            return;
          }

          try {
            const result = await customerAccountRequest(req.headers.authorization, body);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const result = customerAccountErrorResponse(error);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          }
          return;
        }

        if (url === '/api/account-recovery') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method not allowed.' }));
            return;
          }

          let body;
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'The request could not be read.' }));
            return;
          }

          try {
            const result = await accountRecoveryRequest(req.headers.authorization, body);
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (error) {
            const result = accountRecoveryErrorResponse(error);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          }
          return;
        }

        if (url === '/api/create-order' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await handleCreateOrder(data, req.headers);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/verify-payment' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await handleVerifyPayment(data, req.headers);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/webhook' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const signature = req.headers['x-razorpay-signature'];
              const result = await handleWebhook(body, signature);
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-store');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/investment-enquiry' && (req.method === 'POST' || req.method === 'PATCH')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = req.method === 'PATCH'
                ? await handleUpdateInvestmentEnquiry(data, req.headers)
                : await handleInvestmentEnquiry(data, req.headers);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/contact-enquiry' && (req.method === 'POST' || req.method === 'PATCH')) {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = req.method === 'PATCH'
                ? await handleUpdateContactEnquiry(data, req.headers)
                : await handleContactEnquiry(data, req.headers);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/verify-captcha' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const data = JSON.parse(body || '{}');
              const result = await verifyCaptchaToken(data, req.headers);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify(result));
            } catch (err) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = err.status || 400;
              res.end(JSON.stringify({ success: false, error: err.message }));
            }
          });
          return;
        }

        if (url === '/api/admin-auth') {
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 8192) {
                  res.statusCode = 413;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }

          const response = {
            statusCode: 200,
            headers: {},
            status(code) {
              this.statusCode = code;
              return this;
            },
            setHeader(name, value) {
              this.headers[name] = value;
            },
            json(value) {
              this.body = value;
              return this;
            },
          };
          await adminAuthHandler({
            method: req.method,
            headers: req.headers,
            body,
            socket: req.socket,
          }, response);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          Object.entries(response.headers).forEach(([name, value]) => res.setHeader(name, value));
          res.end(JSON.stringify(response.body || {}));
          return;
        }

        if (url === '/api/admin-passkey') {
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 16384) {
                  res.statusCode = 413;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }

          const response = {
            statusCode: 200,
            headers: {},
            status(code) {
              this.statusCode = code;
              return this;
            },
            setHeader(name, value) {
              this.headers[name] = value;
            },
            json(value) {
              this.body = value;
              return this;
            },
          };
          await adminPasskeyHandler({
            method: req.method,
            headers: req.headers,
            body,
            socket: req.socket,
          }, response);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          Object.entries(response.headers).forEach(([name, value]) => res.setHeader(name, value));
          res.end(JSON.stringify(response.body || {}));
          return;
        }

        if (url === '/api/admin-security') {
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 16384) {
                  res.statusCode = 413;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }

          const response = {
            statusCode: 200,
            headers: {},
            status(code) {
              this.statusCode = code;
              return this;
            },
            setHeader(name, value) {
              this.headers[name] = value;
            },
            json(value) {
              this.body = value;
              return this;
            },
          };
          await adminSecurityHandler({
            method: req.method,
            headers: req.headers,
            body,
            socket: req.socket,
            url: req.url,
          }, response);
          res.statusCode = response.statusCode;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          Object.entries(response.headers).forEach(([name, value]) => res.setHeader(name, value));
          res.end(JSON.stringify(response.body || {}));
          return;
        }

        if (url === '/api/send-email-otp') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ success: false, error: 'Method not allowed.' }));
            return;
          }
          let body = {};
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
            return;
          }

          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await sendEmailOtpHandler({ method: req.method, headers: req.headers, body, socket: req.socket }, response);
          return;
        }

        if (url === '/api/verify-email-otp') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ success: false, error: 'Method not allowed.' }));
            return;
          }
          let body = {};
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
            return;
          }

          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await verifyEmailOtpHandler({ method: req.method, headers: req.headers, body, socket: req.socket }, response);
          return;
        }

        if (url === '/api/register-user') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ success: false, error: 'Method not allowed.' }));
            return;
          }
          let body = {};
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
            return;
          }

          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await registerUserHandler({ method: req.method, headers: req.headers, body, socket: req.socket }, response);
          return;
        }

        if (url === '/api/verify-account-exists') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ success: false, error: 'Method not allowed.' }));
            return;
          }
          let body = {};
          try {
            let rawBody = '';
            for await (const chunk of req) {
              rawBody += chunk.toString();
              if (rawBody.length > 8192) {
                res.statusCode = 413;
                res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                return;
              }
            }
            body = JSON.parse(rawBody || '{}');
          } catch {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
            return;
          }

          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await verifyAccountExistsHandler({ method: req.method, headers: req.headers, body, socket: req.socket }, response);
          return;
        }

        if (url === '/api/admin-notification') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 16384) {
                  res.statusCode = 413;
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }
          const requestUrl = new URL(req.url, 'http://localhost');
          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await adminNotificationHandler({
            method: req.method,
            headers: req.headers,
            query: Object.fromEntries(requestUrl.searchParams),
            body,
            socket: req.socket,
          }, response);
          return;
        }

        if (url === '/api/admin-announcements') {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
                if (rawBody.length > 10 * 1024 * 1024) {
                  res.statusCode = 413;
                  res.end(JSON.stringify({ success: false, error: 'Request body is too large.' }));
                  return;
                }
              }
              body = JSON.parse(rawBody || '{}');
            } catch {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'The request could not be read.' }));
              return;
            }
          }
          const requestUrl = new URL(req.url, 'http://localhost');
          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
          };
          await adminAnnouncementsHandler({
            method: req.method,
            headers: req.headers,
            query: Object.fromEntries(requestUrl.searchParams),
            url: req.url,
            body,
            socket: req.socket,
          }, response);
          return;
        }

        if (url === '/api/unsubscribe') {
          let body = {};
          if (req.method === 'POST') {
            try {
              let rawBody = '';
              for await (const chunk of req) {
                rawBody += chunk.toString();
              }
              body = JSON.parse(rawBody || '{}');
            } catch (_) {}
          }
          const requestUrl = new URL(req.url, 'http://localhost');
          const response = {
            statusCode: 200,
            status(code) { this.statusCode = code; return this; },
            setHeader(n, v) { res.setHeader(n, v); },
            json(val) { res.setHeader('Content-Type', 'application/json'); res.statusCode = this.statusCode; res.end(JSON.stringify(val)); },
            send(html) { res.statusCode = this.statusCode; res.end(html); },
          };
          await unsubscribeHandler({
            method: req.method,
            headers: req.headers,
            query: Object.fromEntries(requestUrl.searchParams),
            url: req.url,
            body,
          }, response);
          return;
        }

        if (url === '/api/admin' && req.method === 'GET') {
          try {
            const result = await handleAdminData(req.headers);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            res.statusCode = 200;
            res.end(JSON.stringify(result));
          } catch (err) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Cache-Control', 'no-store');
            const result = adminErrorResponse(err);
            res.statusCode = result.status;
            res.end(JSON.stringify(result.body));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, val] of Object.entries(env)) {
    if (val && !process.env[key]) {
      process.env[key] = val;
    }
  }
  for (const key of [
    'ADMIN_LOGIN_EMAIL',
    'ADMIN_USER_ID',
    'OWNER_ALERT_PHONE',
    'PAYMENT_GATEWAY_MODE',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'SMS_API_KEY',
    'SMS_SENDER_ID',
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
    'GEMINI_MODEL',
    'VITE_SUPABASE_URL',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'EMAIL_OTP_SECRET',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD'
  ]) {
    if (env[key]) {
      process.env[key] = env[key];
    }
  }

  return {
    plugins: [react(), paymentServerPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(projectDirectory, './src'),
      },
    },
    server: {
      host: true,
      port: 3000,
      open: true,
      allowedHosts: true
    }
  };
});

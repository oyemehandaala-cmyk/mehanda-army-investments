import apiHandler from '../../api/verify-email-otp.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);


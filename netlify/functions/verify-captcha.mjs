import apiHandler from '../../api/verify-captcha.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);


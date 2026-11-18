import apiHandler from '../../api/verify-account-exists.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);


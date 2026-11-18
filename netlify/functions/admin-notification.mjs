import apiHandler from '../../server/api/admin-notification.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);



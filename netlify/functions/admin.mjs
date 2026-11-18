import apiHandler from '../../api/admin.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);

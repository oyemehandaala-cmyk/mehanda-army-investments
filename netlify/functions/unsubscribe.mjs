import apiHandler from '../../server/api/unsubscribe.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);



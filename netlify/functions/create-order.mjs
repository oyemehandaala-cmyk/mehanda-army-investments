import apiHandler from '../../api/create-order.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);

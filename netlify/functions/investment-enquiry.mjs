import apiHandler from '../../api/investment-enquiry.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);

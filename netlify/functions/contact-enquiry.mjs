import apiHandler from '../../server/api/contact-enquiry.js';
import { createApiHandler } from '../api-handler-adapter.mjs';

export const handler = createApiHandler(apiHandler);



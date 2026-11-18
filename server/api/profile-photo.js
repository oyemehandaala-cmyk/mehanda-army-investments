import {
  profilePhotoErrorResponse,
  profilePhotoRequest,
} from '../profilePhoto.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  try {
    const result = await profilePhotoRequest(req.headers.authorization, req.body);
    return res.status(200).json(result);
  } catch (error) {
    const result = profilePhotoErrorResponse(error);
    return res.status(result.status).json(result.body);
  }
}


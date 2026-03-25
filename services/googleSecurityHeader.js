import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const getServiceAccountAuth = () => {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    ? process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!email || !key) {
    throw new Error('Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_KEY environment variables.');
  }

  return new JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
};

export { getServiceAccountAuth };

let _serviceAccountAuth;
export const serviceAccountAuth = new Proxy({}, {
  get(target, prop) {
    if (!_serviceAccountAuth) {
      _serviceAccountAuth = getServiceAccountAuth();
    }
    return _serviceAccountAuth[prop];
  }
});

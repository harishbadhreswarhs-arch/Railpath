// Server-side Firebase Admin initialization stub
import admin from 'firebase-admin';
import fs from 'fs';

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './serviceAccount.json';
  if (fs.existsSync(path)) {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  }
  throw new Error('Firebase service account not found. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH');
}

if (!admin.apps.length) {
  const svc = getServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(svc as admin.ServiceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

export default admin;

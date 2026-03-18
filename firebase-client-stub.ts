// Client-side Firebase initialization stub (for use in Next.js browser code)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  // Add other NEXT_PUBLIC_ keys if needed (apiKey, authDomain) for client SDK use
};

export function initFirebaseClient() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return {
    auth: getAuth(),
    db: getFirestore()
  };
}

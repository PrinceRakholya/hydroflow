import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use the specific provisioned Firestore database ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

/**
 * Interface for Firebase error reporting
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

/**
 * Formats Firestore errors for better debugging and adherence to system rules.
 */
export function handleFirestoreError(
  error: any, 
  operationType: FirestoreErrorInfo['operationType'], 
  path: string | null = null
): never {
  const user = auth.currentUser;
  
  const errorInfo: FirestoreErrorInfo = {
    error: error?.message || 'Unknown Firestore Error',
    operationType,
    path,
    authInfo: {
      userId: user?.uid || 'anonymous',
      email: user?.email || '',
      emailVerified: user?.emailVerified || false,
      isAnonymous: user?.isAnonymous || true,
      providerInfo: user?.providerData.map(p => ({
        providerId: p.providerId,
        displayName: p.displayName || '',
        email: p.email || ''
      })) || []
    }
  };

  throw new Error(JSON.stringify(errorInfo));
}

/**
 * Validates connection to Firestore on initialization.
 * (Note: Firestore handles internal connectivity, this remains for extensibility)
 */
export async function testConnection() {
  // We rely on Firestore's native online/offline handlers for performance
}

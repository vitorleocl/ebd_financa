/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy
} from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

// Mapeia e permite sobrescrever as credenciais do Firebase com variáveis de ambiente personalizadas
const dynamicFirebaseConfig = {
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfig.measurementId,
};

const customDatabaseId = (import.meta as any).env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (firebaseConfig as any).firestoreDatabaseId;

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(dynamicFirebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
};
export type { FirebaseUser };

/**
 * Saves the entire application state (excluding currentUser session) to Firestore for any authenticated user.
 */
export async function saveStateToFirestore(userId: string, stateData: any) {
  try {
    const userDocRef = doc(db, "ebd_states", "shared_church_ebd");
    // Ensure currentUser is null so credentials/local sessions are kept local
    const stateToSave = {
      ...stateData,
      currentUser: null,
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, stateToSave);
    console.log("State durably persisted to Google Firestore (shared_church_ebd)!");
  } catch (err) {
    console.error("Error saving state to Firestore:", err);
  }
}

/**
 * Loads the application state from Firestore.
 */
export async function loadStateFromFirestore(userId: string) {
  try {
    const userDocRef = doc(db, "ebd_states", "shared_church_ebd");
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Error loading state from Firestore:", err);
  }
  return null;
}

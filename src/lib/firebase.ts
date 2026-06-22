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

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);

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

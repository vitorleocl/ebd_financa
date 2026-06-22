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
  User as FirebaseUser
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
  onAuthStateChanged
};
export type { FirebaseUser };

/**
 * Saves the entire application state (excluding currentUser session) to Firestore for the authenticated user.
 */
export async function saveStateToFirestore(userId: string, stateData: any) {
  try {
    const userDocRef = doc(db, "ebd_states", userId);
    // Delete sensitive credentials before saving state list
    const stateToSave = {
      ...stateData,
      currentUser: null, // Keep session local
      updatedAt: new Date().toISOString()
    };
    await setDoc(userDocRef, stateToSave);
    console.log("State durably persisted to Google Firestore!");
  } catch (err) {
    console.error("Error saving state to Firestore:", err);
  }
}

/**
 * Loads the application state from Firestore.
 */
export async function loadStateFromFirestore(userId: string) {
  try {
    const userDocRef = doc(db, "ebd_states", userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
  } catch (err) {
    console.error("Error loading state from Firestore:", err);
  }
  return null;
}

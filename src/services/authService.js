/**
 * Authentication Service
 * Decouples Firebase Auth primitives from React UI components.
 */

import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { getFriendlyErrorMessage } from '../firebase/errorHandler';

/**
 * Sync user profile details to Firestore users/{userId}
 */
async function syncUserProfile(user, additionalData = {}) {
  if (!user) return;
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || additionalData.displayName || '',
        photoURL: user.photoURL || '',
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    // Non-blocking sync failure warning
    console.warn('Could not sync user profile document:', error);
  }
}

/**
 * Sign in using Google OAuth Popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return { user: result.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getFriendlyErrorMessage(error),
      rawError: error,
    };
  }
}

/**
 * Sign in with Email and Password
 */
export async function loginWithEmail(email, password) {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return { user: result.user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getFriendlyErrorMessage(error),
      rawError: error,
    };
  }
}

/**
 * Register new user with Email, Password and optional Display Name
 */
export async function registerWithEmail(email, password, displayName = '') {
  try {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const user = result.user;

    if (displayName.trim()) {
      await updateProfile(user, { displayName: displayName.trim() });
    }

    await syncUserProfile(user, { displayName: displayName.trim() });

    return { user, error: null };
  } catch (error) {
    return {
      user: null,
      error: getFriendlyErrorMessage(error),
      rawError: error,
    };
  }
}

/**
 * Sign out current authenticated user
 */
export async function logout() {
  try {
    await signOut(auth);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Get current user snapshot
 */
export function getCurrentUser() {
  return auth.currentUser;
}

/**
 * Get user profile data from Firestore users/{userId}
 */
export async function getUserProfileData(userId) {
  try {
    if (!userId) return { profile: null, error: 'No user ID provided' };
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      return { profile: snap.data(), error: null };
    }
    return { profile: null, error: null };
  } catch (error) {
    return { profile: null, error: getFriendlyErrorMessage(error) };
  }
}

/**
 * Update user profile details in Firestore and Firebase Auth
 */
export async function updateUserProfileData(userId, profileData) {
  try {
    if (!userId) throw new Error('User not authenticated.');
    const user = auth.currentUser;

    if (profileData.displayName && user && user.displayName !== profileData.displayName) {
      await updateProfile(user, { displayName: profileData.displayName });
    }

    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        displayName: profileData.displayName || '',
        targetRole: profileData.targetRole || '',
        targetSalary: profileData.targetSalary || '',
        workMode: profileData.workMode || 'Remote',
        preferredLocation: profileData.preferredLocation || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
        portfolioUrl: profileData.portfolioUrl || '',
        linkedinUrl: profileData.linkedinUrl || '',
        jobSearchStatus: profileData.jobSearchStatus || 'Actively Looking',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}


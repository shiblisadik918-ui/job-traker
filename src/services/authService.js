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
  GoogleAuthProvider,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase/config';
import { getFriendlyErrorMessage } from '../firebase/errorHandler';
import { calculateProfileCompleteness } from '../utils/profileVerification';

// In-memory token cache for Google Workspace APIs (Drive)
let cachedGoogleAccessToken = null;
const MANUAL_DRIVE_TOKEN_KEY = 'jobtrack_manual_google_drive_token';
const MANUAL_DRIVE_INFO_KEY = 'jobtrack_manual_google_drive_info';

export function getCachedGoogleAccessToken() {
  if (cachedGoogleAccessToken) {
    return cachedGoogleAccessToken;
  }
  try {
    const stored = sessionStorage.getItem(MANUAL_DRIVE_TOKEN_KEY);
    if (stored) {
      cachedGoogleAccessToken = stored;
      return stored;
    }
  } catch (e) {
    // sessionStorage not available
  }
  return null;
}

export function setCachedGoogleAccessToken(token) {
  cachedGoogleAccessToken = token;
}

/**
 * Validate and set manual Google Access Token for Google Drive.
 * Directly verifies against Google Drive API v3 to confirm authorization.
 */
export async function setManualGoogleAccessToken(token, customEmail = null) {
  if (!token || !token.trim()) {
    return { success: false, error: 'অনুগ্রহ করে একটি বৈধ Google Access Token দিন।' };
  }

  const cleanToken = token.trim();

  try {
    // Verify token directly with Google Drive API
    const testRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress,photoLink),storageQuota', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
      },
    });

    if (!testRes.ok) {
      const errJson = await testRes.json().catch(() => ({}));
      const msg = errJson?.error?.message || `টোকেন যাচাই ব্যর্থ হয়েছে (Status: ${testRes.status})`;
      if (testRes.status === 401) {
        return {
          success: false,
          error: 'টোকেনটি অবৈধ অথবা মেয়াদ শেষ হয়ে গেছে (Invalid or Expired Token)। নতুন Access Token দিন।',
        };
      }
      return { success: false, error: msg };
    }

    const driveInfo = await testRes.json();
    const driveUser = driveInfo.user || {};
    const storageQuota = driveInfo.storageQuota || {};

    const accountInfo = {
      isConnected: true,
      email: driveUser.emailAddress || customEmail || auth.currentUser?.email || '',
      displayName: driveUser.displayName || auth.currentUser?.displayName || 'Google Account',
      photoLink: driveUser.photoLink || auth.currentUser?.photoURL || '',
      storageQuota,
      connectedAt: new Date().toISOString(),
      method: 'manual',
    };

    cachedGoogleAccessToken = cleanToken;
    try {
      sessionStorage.setItem(MANUAL_DRIVE_TOKEN_KEY, cleanToken);
      sessionStorage.setItem(MANUAL_DRIVE_INFO_KEY, JSON.stringify(accountInfo));
    } catch (e) {
      console.warn('Could not cache token in sessionStorage:', e);
    }

    window.dispatchEvent(new CustomEvent('jobtrack:drive-auth-changed', { detail: { isConnected: true, accountInfo } }));

    return { success: true, accountInfo, accessToken: cleanToken, error: null };
  } catch (err) {
    return {
      success: false,
      error: err?.message || 'Google Drive API সার্ভারের সাথে সংযোগ করা যায়নি।',
    };
  }
}

/**
 * Retrieve current Google Drive connection details
 */
export function getGoogleDriveConnectionInfo() {
  try {
    const raw = sessionStorage.getItem(MANUAL_DRIVE_INFO_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.isConnected) return parsed;
    }
  } catch (e) {}

  if (cachedGoogleAccessToken) {
    return {
      isConnected: true,
      email: auth.currentUser?.email || '',
      displayName: auth.currentUser?.displayName || 'Google Account',
      photoLink: auth.currentUser?.photoURL || '',
      method: 'popup',
    };
  }

  return {
    isConnected: false,
    email: '',
    displayName: '',
    photoLink: '',
    method: null,
  };
}

/**
 * Disconnect Google Drive account and clear cached tokens
 */
export function disconnectGoogleDriveAccount() {
  cachedGoogleAccessToken = null;
  try {
    sessionStorage.removeItem(MANUAL_DRIVE_TOKEN_KEY);
    sessionStorage.removeItem(MANUAL_DRIVE_INFO_KEY);
  } catch (e) {}

  window.dispatchEvent(new CustomEvent('jobtrack:drive-auth-changed', { detail: { isConnected: false } }));
  return { success: true };
}

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
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
    }
    await syncUserProfile(result.user);
    return { user: result.user, accessToken: cachedGoogleAccessToken, error: null };
  } catch (error) {
    return {
      user: null,
      accessToken: null,
      error: getFriendlyErrorMessage(error),
      rawError: error,
    };
  }
}

/**
 * Explicitly connect / re-authorize Google Drive for personal direct file storage
 */
export async function connectGoogleDriveAccount() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedGoogleAccessToken = credential.accessToken;
      return { accessToken: cachedGoogleAccessToken, error: null };
    }
    return { accessToken: null, error: 'Could not obtain Google Drive access token.' };
  } catch (error) {
    return {
      accessToken: null,
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
    cachedGoogleAccessToken = null;
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

    const profileUpdates = {};
    if (profileData.displayName && user && user.displayName !== profileData.displayName) {
      profileUpdates.displayName = profileData.displayName;
    }
    if (profileData.photoURL && user && user.photoURL !== profileData.photoURL && !profileData.photoURL.startsWith('data:')) {
      // Firebase Auth photoURL requires valid URL (not huge base64)
      profileUpdates.photoURL = profileData.photoURL;
    }

    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateProfile(user, profileUpdates);
      } catch (authErr) {
        console.warn('Could not update Firebase Auth profile:', authErr);
      }
    }

    // Compute completeness and verification
    const { percentage, isVerified } = calculateProfileCompleteness(profileData);

    const userRef = doc(db, 'users', userId);
    await setDoc(
      userRef,
      {
        displayName: profileData.displayName || '',
        photoURL: profileData.photoURL || user?.photoURL || '',
        targetRole: profileData.targetRole || '',
        targetSalary: profileData.targetSalary || '',
        workMode: profileData.workMode || 'Remote',
        preferredLocation: profileData.preferredLocation || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
        email: profileData.email || user?.email || '',
        address: profileData.address || '',
        careerObjective: profileData.careerObjective || '',
        careerSummary: profileData.careerSummary || '',
        workExperience: profileData.workExperience || '',
        specialQualifications: profileData.specialQualifications || '',
        languageProficiency: profileData.languageProficiency || '',
        personalDetails: profileData.personalDetails || '',
        portfolioUrl: profileData.portfolioUrl || '',
        linkedinUrl: profileData.linkedinUrl || '',
        jobSearchStatus: profileData.jobSearchStatus || 'Actively Looking',
        isVerified,
        profileCompleteness: percentage,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, error: null, isVerified, profileCompleteness: percentage };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}


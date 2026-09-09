/**
 * Friendly Error Handler for Firebase Authentication & Firestore
 * Ensures no raw internal exceptions or cryptic codes leak to user UI.
 */

export function getFriendlyErrorMessage(error) {
  if (!error) return 'An unexpected error occurred. Please try again.';

  const code = error.code || '';
  const message = error.message || '';

  // Firebase Authentication Error Codes
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password. Please verify your credentials.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists.';
    case 'auth/weak-password':
      return 'Your password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please provide a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please enable popups.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Access temporarily disabled due to too many failed attempts. Try again shortly.';
    case 'auth/requires-recent-login':
      return 'Please re-authenticate to perform this action.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled. Please use another method.';

    // Firestore Error Codes
    case 'permission-denied':
      return 'You do not have permission to access or modify this record.';
    case 'not-found':
      return 'The requested record could not be found.';
    case 'already-exists':
      return 'A record with this identifier already exists.';
    case 'resource-exhausted':
      return 'Quota exceeded. Please try again later.';
    case 'cancelled':
      return 'The operation was cancelled.';
    case 'deadline-exceeded':
      return 'Request timed out. Please check your connection and try again.';
    case 'unavailable':
      return 'Service is temporarily unavailable. Please try again in a moment.';

    default:
      if (message.toLowerCase().includes('network') || message.toLowerCase().includes('offline')) {
        return 'Network error: could not connect to server.';
      }
      return 'Something went wrong. Please try again.';
  }
}

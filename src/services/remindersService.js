/**
 * Reminders Service
 * Manages reminders and follow-up tasks under users/{userId}/reminders/{reminderId}
 */

import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFriendlyErrorMessage } from '../firebase/errorHandler';

function getAuthenticatedUserId() {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.uid) {
    throw new Error('You must be signed in to perform this action.');
  }
  return currentUser.uid;
}

function getRemindersRef(userId) {
  return collection(db, 'users', userId, 'reminders');
}

/**
 * Create a new reminder record
 */
export async function createReminder(reminderData) {
  try {
    const userId = getAuthenticatedUserId();
    const reminderRef = doc(getRemindersRef(userId));

    const newDoc = {
      id: reminderRef.id,
      userId,
      applicationId: reminderData.applicationId || null,
      title: reminderData.title?.trim() || 'Untitled Reminder',
      date: reminderData.date || reminderData.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      time: reminderData.time || '09:00',
      type: reminderData.type || 'Follow-up',
      completed: Boolean(reminderData.completed),
      notes: reminderData.notes?.trim() || '',
      // Backward compatibility field
      dueDate: reminderData.dueDate || `${reminderData.date || new Date().toISOString().split('T')[0]}T${reminderData.time || '09:00'}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(reminderRef, newDoc);

    return {
      data: { ...newDoc, id: reminderRef.id },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Get all reminders for current user
 */
export async function getReminders() {
  try {
    const userId = getAuthenticatedUserId();
    const q = query(getRemindersRef(userId));
    const querySnapshot = await getDocs(q);

    const reminders = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Sort: upcoming pending first, then by date/time
    reminders.sort((a, b) => {
      const dateA = a.date || a.dueDate || '';
      const dateB = b.date || b.dueDate || '';
      return dateA.localeCompare(dateB);
    });

    return { data: reminders, error: null };
  } catch (error) {
    return {
      data: [],
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update an existing reminder
 */
export async function updateReminder(reminderId, updateData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);

    const sanitizedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    delete sanitizedData.userId;
    delete sanitizedData.id;

    await updateDoc(docRef, sanitizedData);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete a reminder record
 */
export async function deleteReminder(reminderId) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'reminders', reminderId);
    await deleteDoc(docRef);
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete all completed reminders
 */
export async function deleteCompletedReminders() {
  try {
    const userId = getAuthenticatedUserId();
    const q = query(getRemindersRef(userId));
    const querySnapshot = await getDocs(q);

    const completedDocs = querySnapshot.docs.filter((docSnap) => docSnap.data().completed);
    
    await Promise.all(
      completedDocs.map((docSnap) => deleteDoc(docSnap.ref))
    );

    return { success: true, count: completedDocs.length, error: null };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: getFriendlyErrorMessage(error),
    };
  }
}

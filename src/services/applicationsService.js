/**
 * Applications Service
 * Encapsulates all Firestore queries and mutations for Job Applications.
 * Scoped strictly to users/{userId}/applications/{applicationId}
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getFriendlyErrorMessage } from '../firebase/errorHandler';
import {
  DEFAULT_GOVT_EXAM_STAGES,
  DEFAULT_PRIVATE_INTERVIEW_ROUNDS,
} from '../utils/constants';

/**
 * Helper to ensure user is authenticated before performing operations
 */
function getAuthenticatedUserId() {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.uid) {
    throw new Error('You must be signed in to perform this action.');
  }
  return currentUser.uid;
}

/**
 * Reference helper for applications subcollection
 */
function getApplicationsRef(userId) {
  return collection(db, 'users', userId, 'applications');
}

/**
 * Create a new job application record
 */
export async function createApplication(applicationData) {
  try {
    const userId = getAuthenticatedUserId();
    const appRef = doc(getApplicationsRef(userId));

    const todayDateStr = new Date().toISOString().split('T')[0];
    const initialStatus = applicationData.status || 'Applied';
    const initialTimeline = applicationData.timeline && applicationData.timeline.length > 0
      ? applicationData.timeline
      : [
          {
            status: initialStatus,
            date: applicationData.applicationDate || todayDateStr,
            timestamp: Date.now(),
            notes: 'Application created.',
          },
        ];

    const jobType = applicationData.job_type || (applicationData.ministryDepartment ? 'Government' : 'Private');
    const companyOrMinistry = jobType === 'Government'
      ? (applicationData.ministryDepartment?.trim() || applicationData.companyName?.trim() || 'Bangladesh Government')
      : (applicationData.companyName?.trim() || '');

    const newDoc = {
      id: appRef.id,
      userId,
      job_type: jobType,
      companyName: companyOrMinistry,
      companyLogo: applicationData.companyLogo?.trim() || '',
      jobTitle: applicationData.jobTitle?.trim() || '',
      location: applicationData.location?.trim() || '',
      jobType: applicationData.jobType || 'Full-time',
      applicationDate: applicationData.applicationDate || todayDateStr,
      deadline: applicationData.deadline || '',
      applicationSource: applicationData.applicationSource || (jobType === 'Government' ? 'Govt Official Gazette / Circular' : 'LinkedIn'),
      salary: applicationData.salary?.trim() || '',
      jobUrl: applicationData.jobUrl?.trim() || '',
      fileUrl: applicationData.fileUrl?.trim() || '',
      fileName: applicationData.fileName?.trim() || '',
      status: initialStatus,
      priority: applicationData.priority || 'Medium',
      notes: applicationData.notes?.trim() || '',

      // Government Job Specific Fields
      ministryDepartment: applicationData.ministryDepartment?.trim() || (jobType === 'Government' ? companyOrMinistry : ''),
      jobGrade: applicationData.jobGrade?.trim() || '',
      circularId: applicationData.circularId?.trim() || '',
      applicationFee: applicationData.applicationFee?.trim() || '',
      paymentStatus: applicationData.paymentStatus || 'Pending',
      admitCardStatus: applicationData.admitCardStatus || 'Not Published',
      userRollNumber: applicationData.userRollNumber?.trim() || '',
      govtExamStages: Array.isArray(applicationData.govtExamStages) && applicationData.govtExamStages.length > 0
        ? applicationData.govtExamStages
        : (jobType === 'Government' ? DEFAULT_GOVT_EXAM_STAGES : []),

      // Private Job Specific Fields
      recruiterName: applicationData.recruiterName?.trim() || '',
      recruiterEmail: applicationData.recruiterEmail?.trim() || '',
      recruiterRole: applicationData.recruiterRole?.trim() || '',
      recruiterPhone: applicationData.recruiterPhone?.trim() || '',
      privateInterviewRounds: Array.isArray(applicationData.privateInterviewRounds) && applicationData.privateInterviewRounds.length > 0
        ? applicationData.privateInterviewRounds
        : (jobType === 'Private' ? DEFAULT_PRIVATE_INTERVIEW_ROUNDS : []),

      timeline: initialTimeline,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(appRef, newDoc);

    return {
      data: { ...newDoc, id: appRef.id },
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
 * Fetch all applications for current authenticated user
 * Supports optional status filter and order
 */
export async function getApplications(filters = {}) {
  try {
    const userId = getAuthenticatedUserId();
    let q = query(getApplicationsRef(userId), orderBy('createdAt', 'desc'));

    if (filters.status && filters.status !== 'All') {
      q = query(
        getApplicationsRef(userId),
        where('status', '==', filters.status),
        orderBy('createdAt', 'desc')
      );
    }

    const querySnapshot = await getDocs(q);
    const applications = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    return { data: applications, error: null };
  } catch (error) {
    return {
      data: [],
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Fetch a single application by its ID
 */
export async function getApplication(applicationId) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { data: null, error: 'Application not found.' };
    }

    return {
      data: { id: docSnap.id, ...docSnap.data() },
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
 * Update an existing job application
 */
export async function updateApplication(applicationId, updateData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);

    const sanitizedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };

    // Prevent overwriting userId or id
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
 * Update the status of an application and append an entry to its timeline
 */
export async function updateApplicationStatus(applicationId, newStatus, note = '') {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const currentData = docSnap.data();
    if (currentData.status === newStatus) {
      return { success: true, unchanged: true, error: null };
    }

    const existingTimeline = Array.isArray(currentData.timeline) ? currentData.timeline : [];

    const newTimelineEntry = {
      status: newStatus,
      date: new Date().toISOString(),
      timestamp: Date.now(),
      notes: note.trim() || `Status updated to ${newStatus}`,
    };

    await updateDoc(docRef, {
      status: newStatus,
      timeline: [...existingTimeline, newTimelineEntry],
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Add a new timeline event to an application
 */
export async function addTimelineEvent(applicationId, eventData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const currentData = docSnap.data();
    const existingTimeline = Array.isArray(currentData.timeline) ? currentData.timeline : [];

    const newEntry = {
      status: eventData.status || 'Update',
      date: eventData.date || new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      notes: eventData.notes?.trim() || '',
    };

    await updateDoc(docRef, {
      timeline: [...existingTimeline, newEntry],
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update a specific timeline event by index
 */
export async function updateTimelineEvent(applicationId, eventIndex, updatedEventData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const currentData = docSnap.data();
    const timeline = Array.isArray(currentData.timeline) ? [...currentData.timeline] : [];

    if (eventIndex < 0 || eventIndex >= timeline.length) {
      return { success: false, error: 'Timeline event not found.' };
    }

    timeline[eventIndex] = {
      ...timeline[eventIndex],
      ...updatedEventData,
      notes: updatedEventData.notes?.trim() || '',
    };

    await updateDoc(docRef, {
      timeline,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete a specific timeline event by index
 */
export async function deleteTimelineEvent(applicationId, eventIndex) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const currentData = docSnap.data();
    const timeline = Array.isArray(currentData.timeline) ? [...currentData.timeline] : [];

    if (eventIndex < 0 || eventIndex >= timeline.length) {
      return { success: false, error: 'Timeline event not found.' };
    }

    timeline.splice(eventIndex, 1);

    await updateDoc(docRef, {
      timeline,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update recruiter contact info for an application
 */
export async function updateRecruiterInfo(applicationId, recruiterData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);

    await updateDoc(docRef, {
      recruiterName: recruiterData.recruiterName?.trim() || '',
      recruiterEmail: recruiterData.recruiterEmail?.trim() || '',
      recruiterRole: recruiterData.recruiterRole?.trim() || '',
      recruiterPhone: recruiterData.recruiterPhone?.trim() || '',
      recruiterNotes: recruiterData.recruiterNotes?.trim() || '',
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete recruiter contact info for an application
 */
export async function deleteRecruiterInfo(applicationId) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);

    await updateDoc(docRef, {
      recruiterName: '',
      recruiterEmail: '',
      recruiterRole: '',
      recruiterPhone: '',
      recruiterNotes: '',
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update a specific Government Exam Stage (Prelims, Written, Viva, Final Result)
 */
export async function updateGovtExamStage(applicationId, stageId, stageUpdate) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const appData = docSnap.data();
    const currentStages = Array.isArray(appData.govtExamStages) && appData.govtExamStages.length > 0
      ? [...appData.govtExamStages]
      : [...DEFAULT_GOVT_EXAM_STAGES];

    const updatedStages = currentStages.map((stage) => {
      if (stage.id === stageId) {
        return { ...stage, ...stageUpdate };
      }
      return stage;
    });

    await updateDoc(docRef, {
      govtExamStages: updatedStages,
      updatedAt: serverTimestamp(),
    });

    return { success: true, stages: updatedStages, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update a specific Private Job Interview Round (Phone Screen, Tech, HR, Final Offer)
 */
export async function updatePrivateInterviewRound(applicationId, roundId, roundUpdate) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, error: 'Application record not found.' };
    }

    const appData = docSnap.data();
    const currentRounds = Array.isArray(appData.privateInterviewRounds) && appData.privateInterviewRounds.length > 0
      ? [...appData.privateInterviewRounds]
      : [...DEFAULT_PRIVATE_INTERVIEW_ROUNDS];

    const updatedRounds = currentRounds.map((round) => {
      if (round.id === roundId) {
        return { ...round, ...roundUpdate };
      }
      return round;
    });

    await updateDoc(docRef, {
      privateInterviewRounds: updatedRounds,
      updatedAt: serverTimestamp(),
    });

    return { success: true, rounds: updatedRounds, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete an application record
 */
export async function deleteApplication(applicationId) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
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
 * Batch create multiple applications (e.g. from CSV import)
 */
export async function createApplicationsBatch(applicationsList) {
  try {
    const userId = getAuthenticatedUserId();
    const batch = writeBatch(db);
    const todayDateStr = new Date().toISOString().split('T')[0];

    const createdIds = [];

    applicationsList.forEach((item) => {
      const appRef = doc(getApplicationsRef(userId));
      const status = item.status || 'Applied';
      const appDate = item.applicationDate || todayDateStr;

      const newDocData = {
        companyName: item.companyName || '',
        jobTitle: item.jobTitle || '',
        status: status,
        location: item.location || '',
        salary: item.salary || '',
        jobType: item.jobType || 'Full-time',
        applicationSource: item.applicationSource || 'Other',
        applicationDate: appDate,
        notes: item.notes || '',
        url: item.url || '',
        priority: item.priority || 'Medium',
        recruiterName: item.recruiterName || '',
        recruiterEmail: item.recruiterEmail || '',
        recruiterRole: item.recruiterRole || '',
        recruiterPhone: item.recruiterPhone || '',
        recruiterNotes: item.recruiterNotes || '',
        documents: item.documents || [],
        timeline: [
          {
            status: status,
            date: appDate,
            timestamp: Date.now(),
            notes: 'Imported via CSV batch.',
          },
        ],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      batch.set(appRef, newDocData);
      createdIds.push(appRef.id);
    });

    await batch.commit();
    return { success: true, count: createdIds.length, error: null };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Add a document or resume attachment to an application
 */
export async function addDocumentAttachment(applicationId, documentData) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('Application not found.');
    }

    const currentData = snap.data();
    const currentDocs = currentData.documents || [];

    const newDoc = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: documentData.name || 'Resume / Document',
      type: documentData.type || 'Resume', // Resume, Cover Letter, Portfolio, Offer Letter, Other
      url: documentData.url || '',
      notes: documentData.notes || '',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedDocs = [newDoc, ...currentDocs];

    await updateDoc(docRef, {
      documents: updatedDocs,
      updatedAt: serverTimestamp(),
    });

    return { success: true, document: newDoc, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update an existing document attachment
 */
export async function updateDocumentAttachment(applicationId, documentId, updatedFields) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('Application not found.');
    }

    const currentData = snap.data();
    const currentDocs = currentData.documents || [];

    const updatedDocs = currentDocs.map((item) => {
      if (item.id === documentId) {
        return {
          ...item,
          ...updatedFields,
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      return item;
    });

    await updateDoc(docRef, {
      documents: updatedDocs,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Delete a document attachment
 */
export async function deleteDocumentAttachment(applicationId, documentId) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      throw new Error('Application not found.');
    }

    const currentData = snap.data();
    const currentDocs = currentData.documents || [];
    const updatedDocs = currentDocs.filter((item) => item.id !== documentId);

    await updateDoc(docRef, {
      documents: updatedDocs,
      updatedAt: serverTimestamp(),
    });

    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}

/**
 * Update the interview preparation checklist for an application
 */
export async function updateInterviewChecklist(applicationId, checklist) {
  try {
    const userId = getAuthenticatedUserId();
    const docRef = doc(db, 'users', userId, 'applications', applicationId);
    await updateDoc(docRef, {
      interviewChecklist: checklist,
      updatedAt: serverTimestamp(),
    });
    return { success: true, error: null };
  } catch (error) {
    return {
      success: false,
      error: getFriendlyErrorMessage(error),
    };
  }
}


/**
 * Google Drive Storage Service
 * Provides direct user-owned cloud storage via Google Drive API v3.
 * All files (CVs, documents, certificates) are saved directly into
 * the user's personal Google Drive without touching any server or admin storage.
 */

/**
 * Upload a binary file or Blob directly into the user's Google Drive.
 *
 * @param {string} accessToken - Valid Google OAuth access token
 * @param {Blob|File} fileBlob - The file data
 * @param {string} fileName - File name to show in Google Drive
 * @param {string} [mimeType='application/pdf'] - MIME type of the file
 * @returns {Promise<Object>} Metadata of uploaded Drive file
 */
export async function uploadFileToDrive(accessToken, fileBlob, fileName, mimeType = 'application/pdf') {
  if (!accessToken) {
    throw new Error('Google Drive authorization is required. Please connect your Google account.');
  }

  const metadata = {
    name: fileName,
    mimeType: mimeType || fileBlob.type || 'application/octet-stream',
    description: 'Uploaded directly via JobTrack into your personal Google Drive storage.',
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append('file', fileBlob);

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,createdTime,size,iconLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Drive upload failed with status: ${response.status}`;
    if (response.status === 401) {
      throw new Error('Google session expired. Please re-authorize Google Drive.');
    }
    throw new Error(message);
  }

  const result = await response.json();
  return result;
}

/**
 * Fetch the list of files uploaded into the user's Google Drive via this app.
 *
 * @param {string} accessToken - Valid Google OAuth access token
 * @returns {Promise<Array>} List of Drive file items
 */
export async function listDriveFiles(accessToken) {
  if (!accessToken) {
    throw new Error('Google Drive authorization required.');
  }

  const params = new URLSearchParams({
    pageSize: '25',
    orderBy: 'createdTime desc',
    fields: 'files(id,name,mimeType,webViewLink,webContentLink,createdTime,size,iconLink,thumbnailLink)',
    q: 'trashed = false',
  });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `Failed to fetch files (${response.status})`;
    if (response.status === 401) {
      throw new Error('Google session expired. Please re-authorize Google Drive.');
    }
    throw new Error(message);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Delete a file permanently from the user's Google Drive.
 *
 * @param {string} accessToken - Valid Google OAuth access token
 * @param {string} fileId - Google Drive file ID
 * @returns {Promise<boolean>}
 */
export async function deleteDriveFile(accessToken, fileId) {
  if (!accessToken || !fileId) {
    throw new Error('Token and File ID are required to delete a Drive file.');
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204 && response.status !== 404) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Failed to delete file from Google Drive (${response.status})`);
  }

  return true;
}

/**
 * Format bytes to readable size (e.g. 1.2 MB)
 */
export function formatDriveFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Cloudinary Upload Service
 * Allows users to upload CVs, Cover Letters, Certificates, and Photos
 * using Cloudinary direct unauthenticated preset uploads.
 */

const DEFAULT_CLOUD_NAME = 'qxtvijke';
const DEFAULT_UPLOAD_PRESET = 'ml_default';

/**
 * Upload any file (PDF, Docx, Image) to Cloudinary
 * @param {File} file - Browser File object
 * @param {Object} options - Optional config { folder, onProgress }
 * @returns {Promise<{ url: string, publicId: string, format: string, bytes: number, originalFilename: string }>}
 */
export async function uploadToCloudinary(file, options = {}) {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  const cloudName = options.cloudName || DEFAULT_CLOUD_NAME;
  const uploadPreset = options.uploadPreset || DEFAULT_UPLOAD_PRESET;
  const folder = options.folder || 'job_tracker_files';

  // Cloudinary direct upload endpoint
  // Use 'auto' resource type so it automatically handles both images and raw/pdf documents
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMsg = data.error?.message || 'Failed to upload to Cloudinary';
      console.error('Cloudinary upload error:', data.error);
      throw new Error(errorMsg);
    }

    return {
      url: data.secure_url || data.url,
      publicId: data.public_id,
      format: data.format,
      bytes: data.bytes,
      originalFilename: data.original_filename || file.name,
    };
  } catch (err) {
    console.error('Cloudinary upload network exception:', err);
    throw err;
  }
}

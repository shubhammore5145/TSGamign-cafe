import { storage } from './config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Upload a file to Firebase Storage and return its download URL.
 * @param {File} file - The file object to upload
 * @param {string} path - Storage path, e.g. 'profiles/uid123/avatar.jpg'
 */
export const uploadFile = async (file, path) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};

/**
 * Upload a user profile image
 */
export const uploadProfileImage = async (file, uid) => {
  const ext = file.name.split('.').pop();
  const path = `profiles/${uid}/avatar.${ext}`;
  return uploadFile(file, path);
};

/**
 * Upload a gaming setup image
 */
export const uploadSetupImage = async (file, setupId) => {
  const ext = file.name.split('.').pop();
  const path = `setups/${setupId}/${Date.now()}.${ext}`;
  return uploadFile(file, path);
};

/**
 * Upload a tournament banner
 */
export const uploadTournamentBanner = async (file, tournamentId) => {
  const ext = file.name.split('.').pop();
  const path = `tournaments/${tournamentId}/banner.${ext}`;
  return uploadFile(file, path);
};

/**
 * Delete a file from Storage given its full download URL
 */
export const deleteFile = async (url) => {
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
  } catch (e) {
    console.warn('Could not delete file:', e.message);
  }
};

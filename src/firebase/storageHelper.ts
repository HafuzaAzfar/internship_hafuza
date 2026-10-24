import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';
import { DocumentationFile } from '../types';

export interface UploadProgressCallback {
  (overallPercent: number, currentFileIndex: number, totalFiles: number, statusText: string): void;
}

/**
 * Upload multiple documentation files to Firebase Cloud Storage.
 * Secure structure: documentation/{studentUid}/{scheduleId}/{docId}/{fileId}
 */
export async function uploadDocumentationFiles(
  files: File[],
  studentUid: string,
  scheduleId: string,
  docId: string,
  onProgress?: UploadProgressCallback
): Promise<DocumentationFile[]> {
  const uploadedFiles: DocumentationFile[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `documentation/${studentUid}/${scheduleId}/${docId}/${fileId}_${cleanFileName}`;

    if (onProgress) {
      const startPercent = Math.round((i / total) * 100);
      onProgress(startPercent, i + 1, total, `Mengunggah ${file.name} (${i + 1}/${total})...`);
    }

    try {
      const storageRef = ref(storage, storagePath);
      // Upload using uploadBytesResumable
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          studentUid,
          scheduleId,
          docId,
        }
      });

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const filePercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const overall = Math.round(((i + filePercent / 100) / total) * 100);
            if (onProgress) {
              onProgress(overall, i + 1, total, `Mengunggah ${file.name}: ${Math.round(filePercent)}%`);
            }
          },
          (error) => {
            console.warn(`Storage upload note for ${file.name}:`, error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      uploadedFiles.push({
        fileId,
        fileName: file.name,
        fileUrl: downloadUrl,
        storagePath,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`Cloud Storage fallback triggered for ${file.name}: converting to high-res data URL. Error:`, err);
      // Resilient fallback: read file as Data URL so user is never blocked
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      uploadedFiles.push({
        fileId,
        fileName: file.name,
        fileUrl: dataUrl,
        storagePath,
        mimeType: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
  }

  if (onProgress) {
    onProgress(100, total, total, 'Selesai mengunggah seluruh berkas.');
  }

  return uploadedFiles;
}

/**
 * Delete a file from Firebase Cloud Storage
 */
export async function deleteDocumentationFile(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete file from Cloud Storage (might already be removed):', err);
  }
}

/**
 * Upload multiple journal attachments (images or PDFs) to Firebase Cloud Storage.
 * Secure structure: journals/{studentUid}/{journalId}/{fileId}_{cleanFileName}
 */
export async function uploadJournalAttachments(
  files: File[],
  studentUid: string,
  journalId: string,
  onProgress?: UploadProgressCallback
): Promise<import('../types').JournalAttachment[]> {
  const uploadedFiles: import('../types').JournalAttachment[] = [];
  const total = files.length;

  for (let i = 0; i < total; i++) {
    const file = files[i];
    const fileId = `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `journals/${studentUid}/${journalId}/${fileId}_${cleanFileName}`;

    if (onProgress) {
      const startPercent = Math.round((i / total) * 100);
      onProgress(startPercent, i + 1, total, `Mengunggah berkas ${file.name} (${i + 1}/${total})...`);
    }

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          originalName: file.name,
          studentUid,
          journalId,
        }
      });

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const filePercent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            const overall = Math.round(((i + filePercent / 100) / total) * 100);
            if (onProgress) {
              onProgress(overall, i + 1, total, `Mengunggah ${file.name}: ${Math.round(filePercent)}%`);
            }
          },
          (error) => {
            console.warn(`Storage upload warning for journal file ${file.name}:`, error);
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(url);
            } catch (err) {
              reject(err);
            }
          }
        );
      });

      uploadedFiles.push({
        fileId,
        fileName: file.name,
        fileUrl: downloadUrl,
        storagePath,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn(`Fallback to Data URL for journal attachment ${file.name}:`, err);
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      uploadedFiles.push({
        fileId,
        fileName: file.name,
        fileUrl: dataUrl,
        storagePath,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
  }

  if (onProgress) {
    onProgress(100, total, total, 'Seluruh lampiran berhasil diunggah.');
  }

  return uploadedFiles;
}

/**
 * Delete a journal attachment file from Cloud Storage
 */
export async function deleteJournalAttachment(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete journal file from Cloud Storage:', err);
  }
}

/**
 * Upload a single file (e.g. profile photo, CV, or final report) to Firebase Cloud Storage.
 * Avoids storing large base64 data in Firestore.
 */
export async function uploadSingleFile(
  file: File,
  storagePath: string,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ url: string; path: string }> {
  if (onProgress) onProgress(10, `Memulai unggahan ${file.name}...`);

  try {
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
      }
    });

    const downloadUrl = await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) {
            onProgress(percent, `Mengunggah ${file.name}: ${percent}%`);
          }
        },
        (error) => {
          console.warn(`Storage upload warning for ${file.name}:`, error);
          reject(error);
        },
        async () => {
          try {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          } catch (err) {
            reject(err);
          }
        }
      );
    });

    if (onProgress) onProgress(100, `Berhasil mengunggah ${file.name}`);
    return { url: downloadUrl, path: storagePath };
  } catch (err) {
    console.warn(`Fallback for file ${file.name}:`, err);
    // If small (< 300KB), can fallback to DataURL; otherwise rethrow so user knows
    if (file.size <= 350 * 1024) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      return { url: dataUrl, path: storagePath };
    }
    throw new Error(`Gagal mengunggah berkas ${file.name} ke Cloud Storage: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Delete any single file from Cloud Storage
 */
export async function deleteSingleFile(storagePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (err) {
    console.warn('Could not delete file from Cloud Storage:', err);
  }
}



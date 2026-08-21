import { errorMessage } from '@/lib/utils';
import { validateJsonUpload } from '@/lib/upload-guard';
import { supabase } from '@/integrations/supabase/client';
import {
  getProfile, saveProfile, getAllLessonPlans, saveLessonPlan,
  getAllSOW, saveSOW, getAllAINotes, saveAINote,
  type TeacherProfile, type LessonPlan, type SchemeOfWork, type AINote,
} from './db';

export interface BackupData {
  version: number;
  createdAt: string;
  profile?: TeacherProfile;
  lessonPlans: LessonPlan[];
  schemesOfWork: SchemeOfWork[];
  aiNotes: AINote[];
}

const BACKUP_FILE = 'backup.json';

function backupPath(userId: string) {
  return `${userId}/${BACKUP_FILE}`;
}

/** Collect all local data into a backup object */
export async function collectBackup(): Promise<BackupData> {
  const [profile, lessonPlans, schemesOfWork, aiNotes] = await Promise.all([
    getProfile(),
    getAllLessonPlans(),
    getAllSOW(),
    getAllAINotes(),
  ]);
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    profile,
    lessonPlans,
    schemesOfWork,
    aiNotes,
  };
}

/**
 * Upload backup to private cloud storage through the `secure-upload` service.
 * The service re-validates size, magic bytes and envelope shape server-side and
 * derives the storage path from the JWT, so the client cannot target other users.
 */
export async function uploadBackup(): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in to backup your data' };

  const backup = await collectBackup();
  const content = JSON.stringify(backup);
  if (new Blob([content]).size > 5 * 1024 * 1024) {
    return { success: false, error: 'Your data exceeds the 5 MB backup limit.' };
  }

  const { data, error } = await supabase.functions.invoke('secure-upload', {
    body: { action: 'upload', content },
  });
  if (error) return { success: false, error: errorMessage(error) || 'Backup failed' };
  if (data && (data as { error?: string }).error) {
    return { success: false, error: (data as { error?: string }).error };
  }
  return { success: true };
}

/**
 * Restore from the cloud using a short-lived signed URL that is issued with
 * Content-Disposition: attachment (never rendered inline in our origin).
 */
export async function downloadAndRestore(): Promise<{ success: boolean; error?: string; stats?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in to restore your data' };

  const { data, error } = await supabase.functions.invoke('secure-upload', {
    body: { action: 'download' },
  });
  if (error) return { success: false, error: 'No backup found' };

  const url = (data as { url?: string })?.url;
  if (!url) return { success: false, error: 'No backup found' };

  const res = await fetch(url);
  if (!res.ok) return { success: false, error: 'Could not download backup' };

  const text = await res.text();
  if (text.length > 5 * 1024 * 1024) return { success: false, error: 'Backup file is too large' };

  try {
    const backup: BackupData = JSON.parse(text);
    if (typeof backup.version !== 'number') return { success: false, error: 'Invalid backup file' };
    return applyBackup(backup);
  } catch {
    return { success: false, error: 'Invalid backup file' };
  }
}

/** Apply a backup object to local IndexedDB */
async function applyBackup(backup: BackupData): Promise<{ success: boolean; error?: string; stats?: string }> {
  try {
    if (backup.profile) {
      await saveProfile(backup.profile);
    }

    const existingPlans = await getAllLessonPlans();
    const existingIds = new Set(existingPlans.map(p => p.id));
    let plansRestored = 0;
    for (const plan of backup.lessonPlans) {
      if (!existingIds.has(plan.id)) {
        await saveLessonPlan(plan);
        plansRestored++;
      }
    }

    const existingSOWs = await getAllSOW();
    const sowIds = new Set(existingSOWs.map(s => s.id));
    let sowsRestored = 0;
    for (const sow of backup.schemesOfWork) {
      if (!sowIds.has(sow.id)) {
        await saveSOW(sow);
        sowsRestored++;
      }
    }

    const existingNotes = await getAllAINotes();
    const noteIds = new Set(existingNotes.map(n => n.id));
    let notesRestored = 0;
    for (const note of backup.aiNotes) {
      if (!noteIds.has(note.id)) {
        await saveAINote(note);
        notesRestored++;
      }
    }

    const stats = `Restored: ${plansRestored} plans, ${sowsRestored} schemes, ${notesRestored} notes`;
    return { success: true, stats };
  } catch (e) {
    return { success: false, error: errorMessage(e) || 'Restore failed' };
  }
}

/** Restore from a local JSON file (size + magic-byte validated first) */
export async function restoreFromFile(file: File): Promise<{ success: boolean; error?: string; stats?: string }> {
  const check = await validateJsonUpload(file);
  if (!check.ok) return { success: false, error: check.error };
  try {
    const text = await file.text();
    const backup: BackupData = JSON.parse(text);
    if (!backup.version || !backup.createdAt) {
      return { success: false, error: 'Invalid backup file' };
    }
    return applyBackup(backup);
  } catch {
    return { success: false, error: 'Could not read backup file' };
  }
}

/** Download backup as a local file */
export async function downloadBackupFile(): Promise<void> {
  const backup = await collectBackup();
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `syllabix-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Check when the last cloud backup was made */
export async function getLastBackupDate(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.storage
    .from('user-backups')
    .list(user.id, { limit: 1, search: BACKUP_FILE });

  if (data && data.length > 0) {
    return data[0].updated_at || data[0].created_at;
  }
  return null;
}
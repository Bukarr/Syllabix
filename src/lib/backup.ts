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

/** Upload backup to cloud storage */
export async function uploadBackup(): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in to backup your data' };

  const backup = await collectBackup();
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });

  const { error } = await supabase.storage
    .from('user-backups')
    .upload(backupPath(user.id), blob, { upsert: true });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/** Download and restore backup from cloud */
export async function downloadAndRestore(): Promise<{ success: boolean; error?: string; stats?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in to restore your data' };

  const { data, error } = await supabase.storage
    .from('user-backups')
    .download(backupPath(user.id));

  if (error) return { success: false, error: error.message };
  if (!data) return { success: false, error: 'No backup found' };

  const text = await data.text();
  const backup: BackupData = JSON.parse(text);
  return applyBackup(backup);
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
  } catch (e: any) {
    return { success: false, error: e.message || 'Restore failed' };
  }
}

/** Restore from a local JSON file */
export async function restoreFromFile(file: File): Promise<{ success: boolean; error?: string; stats?: string }> {
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
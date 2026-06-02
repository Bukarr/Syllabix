import { openDB, DBSchema } from 'idb';

interface TeacherProfile {
  id: string;
  name: string;
  schoolName: string;
  schoolType: 'public' | 'private';
  zone: string;
  state: string;
  subjects: string[];
  classes: { subject: string; level: string }[];
  classSizes: Record<string, number>;
  resources: string[];
  language: 'en' | 'yo' | 'ig' | 'ha';
  onboardingComplete: boolean;
}

interface LessonPlan {
  id: string;
  subject: string;
  classLevel: string;
  term: number;
  week: number;
  date: string;
  duration: string;
  topic: string;
  subTopic: string;
  objectives: string[];
  entryBehaviour: string;
  materials: string[];
  references: string;
  steps: { teacherActivity: string; studentActivity: string }[];
  evaluation: string;
  assignment: string;
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
}

interface SchemeOfWork {
  id: string;
  subject: string;
  classLevel: string;
  term: number;
  year: string;
  weeks: {
    week: number;
    topic: string;
    subTopic: string;
    objectives: string[];
    materials: string[];
  }[];
  status: 'draft' | 'confirmed';
  createdAt: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface NoteVersion {
  content: string;
  timestamp: string;
}

interface AINote {
  id: string;
  subject: string;
  classLevel: string;
  term: number;
  year: string;
  topic: string;
  content: string;
  editedContent?: string;
  conversations: ChatMessage[];
  versions: NoteVersion[];
  status: 'draft' | 'saved';
  createdAt: string;
  updatedAt: string;
}

interface SupportMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  synced: boolean;
  createdAt: string;
}

interface NaijaLessonDB extends DBSchema {
  profile: {
    key: string;
    value: TeacherProfile;
  };
  lessonPlans: {
    key: string;
    value: LessonPlan;
    indexes: {
      'by-subject': string;
      'by-term': number;
      'by-week': number;
      'by-status': string;
    };
  };
  schemesOfWork: {
    key: string;
    value: SchemeOfWork;
    indexes: {
      'by-subject': string;
      'by-term': number;
    };
  };
  aiNotes: {
    key: string;
    value: AINote;
    indexes: {
      'by-subject': string;
      'by-classLevel': string;
      'by-term': number;
      'by-status': string;
    };
  };
  supportMessages: {
    key: string;
    value: SupportMessage;
    indexes: {
      'by-synced': string;
    };
  };
}

const DB_NAME = 'naijalesson-db';
const DB_VERSION = 4;
const PROFILE_BACKUP_KEY = 'syllabix:profile-backup';

function normalizeProfile(profile: Partial<TeacherProfile>): TeacherProfile {
  return {
    id: 'default',
    name: profile.name ?? '',
    schoolName: profile.schoolName ?? '',
    schoolType: profile.schoolType === 'private' ? 'private' : 'public',
    zone: profile.zone ?? '',
    state: profile.state ?? '',
    subjects: Array.isArray(profile.subjects) ? profile.subjects : [],
    classes: Array.isArray(profile.classes) ? profile.classes : [],
    classSizes: profile.classSizes ?? {},
    resources: Array.isArray(profile.resources) ? profile.resources : [],
    language:
      profile.language === 'yo' || profile.language === 'ig' || profile.language === 'ha'
        ? profile.language
        : 'en',
    onboardingComplete: Boolean(profile.onboardingComplete),
  };
}

function readProfileBackup(): TeacherProfile | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = window.localStorage.getItem(PROFILE_BACKUP_KEY);
    if (!raw) return undefined;
    return normalizeProfile(JSON.parse(raw) as Partial<TeacherProfile>);
  } catch {
    return undefined;
  }
}

function writeProfileBackup(profile: TeacherProfile) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PROFILE_BACKUP_KEY, JSON.stringify(normalizeProfile(profile)));
  } catch {
    // Ignore storage write failures and keep IndexedDB as the primary store.
  }
}

export async function getDB() {
  return openDB<NaijaLessonDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }

      // Lesson plans store
      if (!db.objectStoreNames.contains('lessonPlans')) {
        const lpStore = db.createObjectStore('lessonPlans', { keyPath: 'id' });
        lpStore.createIndex('by-subject', 'subject');
        lpStore.createIndex('by-term', 'term');
        lpStore.createIndex('by-week', 'week');
        lpStore.createIndex('by-status', 'status');
      }

      // Schemes of work store
      if (!db.objectStoreNames.contains('schemesOfWork')) {
        const sowStore = db.createObjectStore('schemesOfWork', { keyPath: 'id' });
        sowStore.createIndex('by-subject', 'subject');
        sowStore.createIndex('by-term', 'term');
      }

      // AI Notes store
      if (!db.objectStoreNames.contains('aiNotes')) {
        const aiStore = db.createObjectStore('aiNotes', { keyPath: 'id' });
        aiStore.createIndex('by-subject', 'subject');
        aiStore.createIndex('by-classLevel', 'classLevel');
        aiStore.createIndex('by-term', 'term');
        aiStore.createIndex('by-status', 'status');
      }

      // Support messages store (offline-first contact form)
      if (!db.objectStoreNames.contains('supportMessages')) {
        const smStore = db.createObjectStore('supportMessages', { keyPath: 'id' });
        smStore.createIndex('by-synced', 'synced');
      }
    },
  });
}

// Profile operations
export async function getProfile(): Promise<TeacherProfile | undefined> {
  const backup = readProfileBackup();
  try {
    const db = await getDB();
    const profile = await db.get('profile', 'default');

    if (profile) {
      const normalizedProfile = normalizeProfile(profile);
      writeProfileBackup(normalizedProfile);
      return normalizedProfile;
    }

    if (backup) {
      await db.put('profile', backup);
    }

    return backup;
  } catch {
    return backup;
  }
}

export async function saveProfile(profile: TeacherProfile): Promise<void> {
  const normalizedProfile = normalizeProfile(profile);
  writeProfileBackup(normalizedProfile);

  try {
    const db = await getDB();
    await db.put('profile', normalizedProfile);
  } catch {
    // Keep the local backup so onboarding state survives app reloads.
  }
}

// Lesson plan operations
export async function getAllLessonPlans(): Promise<LessonPlan[]> {
  const db = await getDB();
  return db.getAll('lessonPlans');
}

export async function saveLessonPlan(plan: LessonPlan): Promise<void> {
  const db = await getDB();
  await db.put('lessonPlans', plan);
}

export async function deleteLessonPlan(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('lessonPlans', id);
}

// SOW operations
export async function getAllSOW(): Promise<SchemeOfWork[]> {
  const db = await getDB();
  return db.getAll('schemesOfWork');
}

export async function saveSOW(sow: SchemeOfWork): Promise<void> {
  const db = await getDB();
  await db.put('schemesOfWork', sow);
}

export async function deleteSOW(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('schemesOfWork', id);
}

// AI Notes operations
export async function getAllAINotes(): Promise<AINote[]> {
  const db = await getDB();
  return db.getAll('aiNotes');
}

export async function saveAINote(note: AINote): Promise<void> {
  const db = await getDB();
  await db.put('aiNotes', note);
}

export async function deleteAINote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('aiNotes', id);
}

// Support message operations
export async function saveSupportMessage(msg: SupportMessage): Promise<void> {
  const db = await getDB();
  await db.put('supportMessages', msg);
}

export async function getPendingSupportMessages(): Promise<SupportMessage[]> {
  const db = await getDB();
  const all = await db.getAll('supportMessages');
  return all.filter(m => !m.synced);
}

export async function markSupportMessageSynced(id: string): Promise<void> {
  const db = await getDB();
  const msg = await db.get('supportMessages', id);
  if (msg) {
    await db.put('supportMessages', { ...msg, synced: true });
  }
}

export type { TeacherProfile, LessonPlan, SchemeOfWork, AINote, ChatMessage, NoteVersion, SupportMessage };

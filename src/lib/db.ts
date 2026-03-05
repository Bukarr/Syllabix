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

interface AINote {
  id: string;
  subject: string;
  classLevel: string;
  term: number;
  year: string;
  topic: string;
  content: string;
  status: 'draft' | 'saved';
  createdAt: string;
  updatedAt: string;
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
}

const DB_NAME = 'naijalesson-db';
const DB_VERSION = 2;

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
    },
  });
}

// Profile operations
export async function getProfile(): Promise<TeacherProfile | undefined> {
  const db = await getDB();
  return db.get('profile', 'default');
}

export async function saveProfile(profile: TeacherProfile): Promise<void> {
  const db = await getDB();
  await db.put('profile', { ...profile, id: 'default' });
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

export type { TeacherProfile, LessonPlan, SchemeOfWork, AINote };

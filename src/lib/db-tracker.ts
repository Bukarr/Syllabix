import { openDB, DBSchema } from 'idb';

export interface ClassStudent {
  id: string;
  name: string;
}

export interface ScoreEntry {
  studentId: string;
  topic: string;
  type: string;
  score: number;
  maxScore: number;
  date: string;
}

export interface AttendanceEntry {
  studentId: string;
  date: string;
  present: boolean;
}

export interface ClassGroup {
  id: string;
  name: string;
  subject: string;
  classLevel: string;
  students: ClassStudent[];
  scores: ScoreEntry[];
  attendance: AttendanceEntry[];
  createdAt: string;
}

interface TrackerDB extends DBSchema {
  classGroups: {
    key: string;
    value: ClassGroup;
  };
}

async function getTrackerDB() {
  return openDB<TrackerDB>('syllabix-tracker', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('classGroups')) {
        db.createObjectStore('classGroups', { keyPath: 'id' });
      }
    },
  });
}

export async function getAllClassGroups(): Promise<ClassGroup[]> {
  const db = await getTrackerDB();
  return db.getAll('classGroups');
}

export async function getClassGroup(id: string): Promise<ClassGroup | undefined> {
  const db = await getTrackerDB();
  return db.get('classGroups', id);
}

export async function saveClassGroup(group: ClassGroup): Promise<void> {
  const db = await getTrackerDB();
  await db.put('classGroups', group);
}

export async function deleteClassGroup(id: string): Promise<void> {
  const db = await getTrackerDB();
  await db.delete('classGroups', id);
}

// Analytics helpers
export function getTopicAverages(group: ClassGroup): { topic: string; average: number; count: number }[] {
  const topicMap = new Map<string, { total: number; max: number; count: number }>();
  for (const s of group.scores) {
    const existing = topicMap.get(s.topic) || { total: 0, max: 0, count: 0 };
    existing.total += s.score;
    existing.max += s.maxScore;
    existing.count += 1;
    topicMap.set(s.topic, existing);
  }
  return Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    average: data.max > 0 ? Math.round((data.total / data.max) * 100) : 0,
    count: data.count,
  }));
}

export function getWeakTopics(group: ClassGroup): string[] {
  return getTopicAverages(group)
    .filter(t => t.average < 50)
    .map(t => t.topic);
}

export function getAtRiskStudents(group: ClassGroup): { studentId: string; name: string; reasons: string[] }[] {
  const atRisk: { studentId: string; name: string; reasons: string[] }[] = [];

  for (const student of group.students) {
    const reasons: string[] = [];

    // Check absences > 3
    const absences = group.attendance.filter(a => a.studentId === student.id && !a.present).length;
    if (absences > 3) reasons.push(`Absent ${absences} times`);

    // Check consecutive low scores (below 40% on 2+ consecutive topics)
    const studentScores = group.scores
      .filter(s => s.studentId === student.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    let consecutiveLow = 0;
    for (const sc of studentScores) {
      const pct = sc.maxScore > 0 ? (sc.score / sc.maxScore) * 100 : 0;
      if (pct < 40) {
        consecutiveLow++;
        if (consecutiveLow >= 2) {
          reasons.push('Scored below 40% on 2+ consecutive topics');
          break;
        }
      } else {
        consecutiveLow = 0;
      }
    }

    if (reasons.length > 0) {
      atRisk.push({ studentId: student.id, name: student.name, reasons });
    }
  }

  return atRisk;
}

export function getStudentPerformance(group: ClassGroup, studentId: string) {
  const scores = group.scores
    .filter(s => s.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));

  const attendance = group.attendance.filter(a => a.studentId === studentId);
  const present = attendance.filter(a => a.present).length;
  const total = attendance.length;

  return {
    scores: scores.map(s => ({
      topic: s.topic,
      type: s.type,
      percentage: s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0,
      score: s.score,
      maxScore: s.maxScore,
      date: s.date,
    })),
    attendanceRate: total > 0 ? Math.round((present / total) * 100) : 100,
    totalPresent: present,
    totalSessions: total,
  };
}

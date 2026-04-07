import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus, Users, BarChart3, Calendar, Trash2, AlertTriangle,
  UserPlus, Check, X as XIcon, ChevronDown, ChevronUp, TrendingDown
} from 'lucide-react';
import {
  getAllClassGroups, saveClassGroup, deleteClassGroup,
  getTopicAverages, getWeakTopics, getAtRiskStudents, getStudentPerformance,
  type ClassGroup
} from '@/lib/db-tracker';
import { getProfile, type TeacherProfile } from '@/lib/db';
import { SUBJECTS, CLASSES } from '@/lib/curriculum';
import { toast } from 'sonner';

export default function ClassTracker() {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Create group state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newClass, setNewClass] = useState('');

  // Active group for scores/attendance
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  // Add student
  const [addStudentName, setAddStudentName] = useState('');
  const [addStudentGroupId, setAddStudentGroupId] = useState<string | null>(null);

  // Score entry
  const [scoreTopic, setScoreTopic] = useState('');
  const [scoreType, setScoreType] = useState('CA1');
  const [scoreMax, setScoreMax] = useState('20');
  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});

  // Attendance entry
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});

  // Insights
  const [insightGroupId, setInsightGroupId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [g, p] = await Promise.all([getAllClassGroups(), getProfile()]);
    setGroups(g);
    if (p) setProfile(p);
    if (g.length > 0 && !activeGroupId) setActiveGroupId(g[0].id);
    if (g.length > 0 && !insightGroupId) setInsightGroupId(g[0].id);
    setLoading(false);
  }

  const handleCreateGroup = async () => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName.length > 100 || !newSubject || !newClass) {
      toast.error(!trimmedName ? 'Fill in all fields' : 'Group name must be under 100 characters');
      return;
    }
    const group: ClassGroup = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      subject: newSubject,
      classLevel: newClass,
      students: [],
      scores: [],
      attendance: [],
      createdAt: new Date().toISOString(),
    };
    await saveClassGroup(group);
    toast.success('Class group created');
    setShowCreate(false);
    setNewName('');
    setNewSubject('');
    setNewClass('');
    await loadData();
  };

  const handleAddStudent = async (groupId: string) => {
    const trimmed = addStudentName.trim();
    if (!trimmed || trimmed.length > 100) {
      if (trimmed.length > 100) toast.error('Name must be under 100 characters');
      return;
    }
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const updated = {
      ...group,
      students: [...group.students, { id: crypto.randomUUID(), name: trimmed }],
    };
    await saveClassGroup(updated);
    setAddStudentName('');
    setAddStudentGroupId(null);
    toast.success('Student added');
    await loadData();
  };

  const handleRemoveStudent = async (groupId: string, studentId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const updated = {
      ...group,
      students: group.students.filter(s => s.id !== studentId),
      scores: group.scores.filter(s => s.studentId !== studentId),
      attendance: group.attendance.filter(a => a.studentId !== studentId),
    };
    await saveClassGroup(updated);
    toast.success('Student removed');
    await loadData();
  };

  const handleSaveScores = async () => {
    if (!activeGroupId || !scoreTopic.trim()) {
      toast.error('Select a class and enter a topic');
      return;
    }
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const maxScore = parseInt(scoreMax) || 20;
    const newScores = Object.entries(scoreInputs)
      .filter(([, v]) => v.trim() !== '')
      .map(([studentId, value]) => ({
        studentId,
        topic: scoreTopic.trim(),
        type: scoreType,
        score: Math.min(parseFloat(value) || 0, maxScore),
        maxScore,
        date: new Date().toISOString().split('T')[0],
      }));

    if (newScores.length === 0) {
      toast.error('Enter at least one score');
      return;
    }

    const updated = { ...group, scores: [...group.scores, ...newScores] };
    await saveClassGroup(updated);
    toast.success(`${newScores.length} scores recorded`);
    setScoreInputs({});
    setScoreTopic('');
    await loadData();
  };

  const handleSaveAttendance = async () => {
    if (!activeGroupId) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    // Remove old attendance for this date, add new
    const otherAttendance = group.attendance.filter(a => a.date !== attendanceDate);
    const newAttendance = group.students.map(s => ({
      studentId: s.id,
      date: attendanceDate,
      present: attendanceState[s.id] !== false,
    }));

    const updated = { ...group, attendance: [...otherAttendance, ...newAttendance] };
    await saveClassGroup(updated);
    toast.success('Attendance saved');
    await loadData();
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Delete this class group and all its data?')) return;
    await deleteClassGroup(id);
    toast.success('Class group deleted');
    await loadData();
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);
  const insightGroup = groups.find(g => g.id === insightGroupId);

  const subjects = profile?.subjects?.length
    ? profile.subjects
    : Object.values(SUBJECTS).flat().filter((s, i, a) => a.indexOf(s) === i);
  const classes = Object.values(CLASSES).flat();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Class Tracker</h2>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-1" /> New Class
          </Button>
        </div>

        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="classes" className="text-xs"><Users className="h-3 w-3 mr-1" />Classes</TabsTrigger>
            <TabsTrigger value="scores" className="text-xs"><BarChart3 className="h-3 w-3 mr-1" />Scores</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs"><Calendar className="h-3 w-3 mr-1" />Attend.</TabsTrigger>
            <TabsTrigger value="insights" className="text-xs"><TrendingDown className="h-3 w-3 mr-1" />Insights</TabsTrigger>
          </TabsList>

          {/* ── CLASSES TAB ── */}
          <TabsContent value="classes" className="space-y-4 mt-4">
            {showCreate && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold">Create Class Group</h3>
                <Input placeholder="e.g. JSS2A — Basic Science" maxLength={100} value={newName} onChange={e => setNewName(e.target.value)} className="text-sm h-9" />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newSubject} onChange={e => setNewSubject(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <option value="">Subject</option>
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={newClass} onChange={e => setNewClass(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
                    <option value="">Class</option>
                    {classes.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateGroup} className="flex-1">Create</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                </div>
              </motion.div>
            )}

            {groups.length === 0 && !showCreate && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-heading font-semibold mb-2">No Classes Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create a class group to start tracking student performance.</p>
                <Button onClick={() => setShowCreate(true)}>Create Class Group</Button>
              </div>
            )}

            {groups.map(group => {
              const isExpanded = expandedGroup === group.id;
              return (
                <div key={group.id} className="glass-card rounded-xl overflow-hidden">
                  <button onClick={() => setExpandedGroup(isExpanded ? null : group.id)} className="w-full p-4 text-left">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.subject} • {group.classLevel} • {group.students.length} students</p>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4 space-y-3">
                      {/* Student list */}
                      {group.students.map(s => (
                        <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30">
                          <span className="text-xs">{s.name}</span>
                          <button onClick={() => handleRemoveStudent(group.id, s.id)} className="text-destructive/60 hover:text-destructive">
                            <XIcon className="h-3 w-3" />
                          </button>
                        </div>
                      ))}

                      {/* Add student */}
                      {addStudentGroupId === group.id ? (
                        <div className="flex gap-2">
                          <Input placeholder="Student name" maxLength={100} value={addStudentName} onChange={e => setAddStudentName(e.target.value)} className="text-xs h-8 flex-1" onKeyDown={e => e.key === 'Enter' && handleAddStudent(group.id)} />
                          <Button size="sm" className="h-8 px-3" onClick={() => handleAddStudent(group.id)}>
                            <Check className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => setAddStudentGroupId(group.id)}>
                          <UserPlus className="h-3 w-3 mr-1" /> Add Student
                        </Button>
                      )}

                      <Button size="sm" variant="outline" className="w-full text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGroup(group.id)}>
                        <Trash2 className="h-3 w-3 mr-1" /> Delete Group
                      </Button>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </TabsContent>

          {/* ── SCORES TAB ── */}
          <TabsContent value="scores" className="space-y-4 mt-4">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Create a class group first</p>
            ) : (
              <>
                <select value={activeGroupId || ''} onChange={e => setActiveGroupId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                {activeGroup && activeGroup.students.length > 0 && (
                  <div className="space-y-3">
                    <Input placeholder="Topic (e.g. Photosynthesis)" maxLength={200} value={scoreTopic} onChange={e => setScoreTopic(e.target.value)} className="text-sm" />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Score Type</Label>
                        <select value={scoreType} onChange={e => setScoreType(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs mt-1">
                          {['CA1', 'CA2', 'CA3', 'Test', 'Exam'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <Label className="text-xs">Max Score</Label>
                        <Input type="number" value={scoreMax} onChange={e => setScoreMax(e.target.value)} className="text-xs mt-1 h-9" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {activeGroup.students.map(s => (
                        <div key={s.id} className="flex items-center gap-3 glass-card rounded-lg px-3 py-2">
                          <span className="text-xs flex-1 truncate">{s.name}</span>
                          <Input
                            type="number"
                            placeholder="Score"
                            value={scoreInputs[s.id] || ''}
                            onChange={e => setScoreInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                            className="w-20 text-xs h-8 text-right"
                            max={parseInt(scoreMax)}
                            min={0}
                          />
                        </div>
                      ))}
                    </div>

                    <Button className="w-full" onClick={handleSaveScores}>Save Scores</Button>
                  </div>
                )}

                {activeGroup && activeGroup.students.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">Add students to this class first</p>
                )}
              </>
            )}
          </TabsContent>

          {/* ── ATTENDANCE TAB ── */}
          <TabsContent value="attendance" className="space-y-4 mt-4">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Create a class group first</p>
            ) : (
              <>
                <select value={activeGroupId || ''} onChange={e => setActiveGroupId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                <Input type="date" value={attendanceDate} onChange={e => setAttendanceDate(e.target.value)} className="text-sm" />

                {activeGroup && activeGroup.students.length > 0 && (
                  <div className="space-y-1.5">
                    {activeGroup.students.map(s => {
                      const isPresent = attendanceState[s.id] !== false;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setAttendanceState(prev => ({ ...prev, [s.id]: !isPresent }))}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                            isPresent ? 'border-primary/30 bg-primary/5' : 'border-destructive/30 bg-destructive/5'
                          }`}
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isPresent ? 'bg-primary/20 text-primary' : 'bg-destructive/20 text-destructive'}`}>
                            {isPresent ? <Check className="h-3 w-3" /> : <XIcon className="h-3 w-3" />}
                          </div>
                          <span className="text-xs font-medium flex-1 text-left">{s.name}</span>
                          <span className="text-[10px] text-muted-foreground">{isPresent ? 'Present' : 'Absent'}</span>
                        </button>
                      );
                    })}
                    <Button className="w-full mt-3" onClick={handleSaveAttendance}>Save Attendance</Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── INSIGHTS TAB ── */}
          <TabsContent value="insights" className="space-y-4 mt-4">
            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Create a class group and add data first</p>
            ) : (
              <>
                <select value={insightGroupId || ''} onChange={e => setInsightGroupId(e.target.value)} className="w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>

                {insightGroup && (
                  <div className="space-y-4">
                    {/* Summary cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="glass-card rounded-xl p-3 text-center">
                        <p className="text-lg font-bold">{insightGroup.students.length}</p>
                        <p className="text-[10px] text-muted-foreground">Students</p>
                      </div>
                      <div className="glass-card rounded-xl p-3 text-center">
                        <p className="text-lg font-bold">{getTopicAverages(insightGroup).length}</p>
                        <p className="text-[10px] text-muted-foreground">Topics</p>
                      </div>
                      <div className="glass-card rounded-xl p-3 text-center">
                        <p className="text-lg font-bold">{new Set(insightGroup.attendance.map(a => a.date)).size}</p>
                        <p className="text-[10px] text-muted-foreground">Sessions</p>
                      </div>
                    </div>

                    {/* Topic averages */}
                    {getTopicAverages(insightGroup).length > 0 && (
                      <div className="glass-card rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Topic Performance</h3>
                        {getTopicAverages(insightGroup).map(t => (
                          <div key={t.topic} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs">{t.topic}</span>
                              <span className={`text-xs font-bold ${t.average < 50 ? 'text-destructive' : 'text-primary'}`}>{t.average}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${t.average < 50 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${t.average}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Weak topics */}
                    {getWeakTopics(insightGroup).length > 0 && (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          <h3 className="text-sm font-semibold text-destructive">Weak Topics (below 50%)</h3>
                        </div>
                        {getWeakTopics(insightGroup).map(t => (
                          <p key={t} className="text-xs text-destructive/80">• {t}</p>
                        ))}
                      </div>
                    )}

                    {/* At-risk students */}
                    {getAtRiskStudents(insightGroup).length > 0 && (
                      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-warning" />
                          <h3 className="text-sm font-semibold" style={{ color: 'hsl(var(--warning))' }}>At-Risk Students</h3>
                        </div>
                        {getAtRiskStudents(insightGroup).map(s => (
                          <div key={s.studentId} className="text-xs space-y-0.5">
                            <p className="font-medium">{s.name}</p>
                            {s.reasons.map((r, i) => <p key={i} className="text-muted-foreground ml-3">— {r}</p>)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Student-level view */}
                    {insightGroup.students.length > 0 && (
                      <div className="glass-card rounded-xl p-4 space-y-3">
                        <h3 className="text-sm font-semibold">Individual Student Performance</h3>
                        {insightGroup.students.map(s => {
                          const perf = getStudentPerformance(insightGroup, s.id);
                          const avgScore = perf.scores.length > 0
                            ? Math.round(perf.scores.reduce((sum, sc) => sum + sc.percentage, 0) / perf.scores.length)
                            : null;
                          return (
                            <div key={s.id} className="border border-border/50 rounded-lg p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium">{s.name}</span>
                                <div className="flex items-center gap-2">
                                  {avgScore !== null && (
                                    <span className={`text-xs font-bold ${avgScore < 40 ? 'text-destructive' : avgScore < 60 ? 'text-warning' : 'text-primary'}`}>
                                      {avgScore}% avg
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">{perf.attendanceRate}% attend.</span>
                                </div>
                              </div>
                              {perf.scores.length > 0 && (
                                <div className="flex gap-1 flex-wrap">
                                  {perf.scores.map((sc, i) => (
                                    <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${sc.percentage < 40 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                      {sc.topic.slice(0, 8)}: {sc.percentage}%
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, Trash2, Edit2, ChevronDown, ChevronUp, Save, Calendar, MessageSquare } from 'lucide-react';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getProfile, getAllSOW, saveSOW, deleteSOW,
  type TeacherProfile, type SchemeOfWork as SOWType
} from '@/lib/db';
import { SUBJECTS, CLASSES } from '@/lib/curriculum';
import { exportSOWToPDF } from '@/lib/export';
import { toast } from 'sonner';

type WeekEntry = SOWType['weeks'][number] & { comment?: string };

const emptyWeek = (weekNum: number): WeekEntry => ({
  week: weekNum,
  topic: '',
  subTopic: '',
  objectives: [''],
  materials: [''],
  comment: '',
});

export default function SchemeOfWork() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sows, setSows] = useState<SOWType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [allWeeks, setAllWeeks] = useState<WeekEntry[]>([]); // 39 weeks across 3 terms
  const [showForm, setShowForm] = useState(false);
  const [expandedSOW, setExpandedSOW] = useState<string | null>(null);
  const [activeTerm, setActiveTerm] = useState(1);
  const [viewMode, setViewMode] = useState<'term' | 'full'>('term');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const p = await getProfile();
    if (p) setProfile(p);
    const s = await getAllSOW();
    setSows(s);
    setLoading(false);
  }

  const initAllWeeks = () => {
    // 39 weeks: 13 per term
    setAllWeeks(Array.from({ length: 39 }, (_, i) => emptyWeek(i + 1)));
  };

  const getTermWeeks = (term: number) => {
    const start = (term - 1) * 13;
    return allWeeks.slice(start, start + 13);
  };

  const getTermWeekIndex = (term: number, weekInTerm: number) => {
    return (term - 1) * 13 + weekInTerm;
  };

  const updateWeek = (globalIndex: number, field: string, value: any) => {
    setAllWeeks(prev => {
      const copy = [...prev];
      copy[globalIndex] = { ...copy[globalIndex], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!subject || !classLevel) {
      toast.error('Please select subject and class level');
      return;
    }
    const hasContent = allWeeks.some(w => w.topic.trim() !== '');
    if (!hasContent) {
      toast.error('Please enter at least one topic');
      return;
    }

    // Save as 3 separate SOWs (one per term) for backward compatibility
    for (let term = 1; term <= 3; term++) {
      const termWeeks = getTermWeeks(term);
      const hasTermContent = termWeeks.some(w => w.topic.trim());
      if (!hasTermContent) continue;

      const existingSow = editingId
        ? sows.find(s => s.id === editingId && s.term === term)
        : undefined;

      const sow: SOWType = {
        id: existingSow?.id || crypto.randomUUID(),
        subject,
        classLevel,
        term,
        year,
        weeks: termWeeks.map((w, i) => ({
          week: i + 1,
          topic: w.topic,
          subTopic: w.subTopic,
          objectives: w.objectives,
          materials: w.materials,
          ...(w.comment ? { comment: w.comment } : {}),
        })) as any,
        status: 'confirmed',
        createdAt: existingSow?.createdAt || new Date().toISOString(),
      };
      await saveSOW(sow);
    }

    toast.success('Full-year Scheme of Work saved!');
    await loadData();
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setSubject('');
    setClassLevel('');
    setYear(new Date().getFullYear().toString());
    setAllWeeks([]);
    setShowForm(false);
    setActiveTerm(1);
  };

  const startNew = () => {
    resetForm();
    initAllWeeks();
    setShowForm(true);
  };

  const startEditFullYear = (subj: string, cls: string, yr: string) => {
    // Load all 3 terms for this subject/class/year
    const matching = sows.filter(s => s.subject === subj && s.classLevel === cls && s.year === yr);
    const weeks: WeekEntry[] = [];
    for (let term = 1; term <= 3; term++) {
      const termSOW = matching.find(s => s.term === term);
      for (let w = 0; w < 13; w++) {
        const existing = termSOW?.weeks[w];
        weeks.push({
          week: (term - 1) * 13 + w + 1,
          topic: existing?.topic || '',
          subTopic: existing?.subTopic || '',
          objectives: existing?.objectives || [''],
          materials: existing?.materials || [''],
          comment: (existing as any)?.comment || '',
        });
      }
    }
    setSubject(subj);
    setClassLevel(cls);
    setYear(yr);
    setAllWeeks(weeks);
    setEditingId('edit-group');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExport = async (sow: SOWType) => {
    await exportSOWToPDF(sow);
    toast.success('PDF exported');
  };

  const handleDelete = async (sow: SOWType) => {
    await deleteSOW(sow.id);
    toast.success('Scheme of Work deleted');
    await loadData();
  };

  // Group SOWs by subject+class+year
  const sowGroups = sows.reduce((acc, sow) => {
    const key = `${sow.subject}|${sow.classLevel}|${sow.year}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(sow);
    return acc;
  }, {} as Record<string, SOWType[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Scheme of Work</h2>
          {!showForm && (
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4 mr-1" /> Full Year
            </Button>
          )}
        </div>

        {/* ── Input Form ── */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-semibold">
                  {editingId ? 'Edit Full Year' : '39-Week Scheme (3 Terms)'}
                </h3>
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs">Cancel</Button>
              </div>

              {/* Subject */}
              <div>
                <Label className="text-xs font-medium">Subject</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {(profile?.subjects && profile.subjects.length > 0
                    ? profile.subjects
                    : Object.values(SUBJECTS).flat().filter((s, i, a) => a.indexOf(s) === i)
                  ).map(s => (
                    <button
                      key={s}
                      onClick={() => { setSubject(s); setClassLevel(''); }}
                      className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                        subject === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Class Level */}
              {subject && (
                <div>
                  <Label className="text-xs font-medium">Class Level</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(() => {
                      const profileClasses = (profile?.classes || [])
                        .filter(c => c.subject === subject)
                        .map(c => c.level);
                      const fallbackClasses = Object.values(CLASSES).flat();
                      const classOptions = profileClasses.length > 0 ? profileClasses : fallbackClasses;
                      return classOptions.map(level => (
                        <button
                          key={level}
                          onClick={() => setClassLevel(level)}
                          className={`py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                            classLevel === level ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          {level}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}

              {/* Year */}
              <div>
                <Label className="text-xs font-medium">Academic Year</Label>
                <Input value={year} onChange={e => setYear(e.target.value)} className="mt-1.5 h-9 text-sm" />
              </div>
            </div>

            {/* Term tabs + Weekly inputs */}
            {subject && classLevel && (
              <>
                {/* View mode toggle */}
                <div className="flex gap-2">
                  <Button
                    variant={viewMode === 'term' ? 'default' : 'outline'}
                    size="sm" className="text-xs flex-1"
                    onClick={() => setViewMode('term')}
                  >
                    Term by Term
                  </Button>
                  <Button
                    variant={viewMode === 'full' ? 'default' : 'outline'}
                    size="sm" className="text-xs flex-1"
                    onClick={() => setViewMode('full')}
                  >
                    <Calendar className="h-3 w-3 mr-1" /> Full Year Table
                  </Button>
                </div>

                {viewMode === 'term' ? (
                  <>
                    {/* Term selector */}
                    <div className="flex gap-2">
                      {[1, 2, 3].map(t => (
                        <button
                          key={t}
                          onClick={() => setActiveTerm(t)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            activeTerm === t
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-card text-muted-foreground'
                          }`}
                        >
                          Term {t}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground px-1">
                      {subject}, {classLevel} — Term {activeTerm}, {year}
                    </p>

                    <div className="space-y-2">
                      {getTermWeeks(activeTerm).map((w, i) => {
                        const globalIdx = getTermWeekIndex(activeTerm, i);
                        return (
                          <div key={globalIdx} className="glass-card rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
                              </div>
                              <span className="text-xs font-semibold">Week {i + 1}</span>
                            </div>
                            <Input
                              placeholder="Topic *"
                              value={w.topic}
                              onChange={e => updateWeek(globalIdx, 'topic', e.target.value)}
                              className="text-sm h-9"
                            />
                            <Input
                              placeholder="Sub-topic"
                              value={w.subTopic}
                              onChange={e => updateWeek(globalIdx, 'subTopic', e.target.value)}
                              className="text-sm h-9"
                            />
                            <Textarea
                              placeholder="Objectives (one per line)"
                              value={w.objectives.join('\n')}
                              onChange={e => updateWeek(globalIdx, 'objectives', e.target.value.split('\n'))}
                              rows={2}
                              className="text-sm"
                            />
                            <Input
                              placeholder="Materials (comma separated)"
                              value={w.materials.join(', ')}
                              onChange={e => updateWeek(globalIdx, 'materials', e.target.value.split(',').map(s => s.trim()))}
                              className="text-sm h-9"
                            />
                            <div className="flex items-start gap-2">
                              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-2.5 shrink-0" />
                              <Input
                                placeholder="Comment / note for this week..."
                                value={w.comment || ''}
                                onChange={e => updateWeek(globalIdx, 'comment', e.target.value)}
                                className="text-xs h-8"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Full Year Table View — 39 weeks at a glance */
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground px-1">
                      {subject}, {classLevel} — Full Year {year}
                    </p>
                    {[1, 2, 3].map(term => (
                      <div key={term} className="glass-card rounded-xl overflow-hidden">
                        <div className="px-4 py-2.5 bg-primary/10 border-b border-border/30">
                          <span className="text-xs font-bold text-primary">Term {term}</span>
                        </div>
                        <div className="divide-y divide-border/20">
                          {getTermWeeks(term).map((w, i) => {
                            const globalIdx = getTermWeekIndex(term, i);
                            return (
                              <div key={globalIdx} className="px-3 py-2 flex items-center gap-2">
                                <span className="text-[10px] font-bold text-muted-foreground w-6 shrink-0">W{i + 1}</span>
                                <Input
                                  placeholder="Topic"
                                  value={w.topic}
                                  onChange={e => updateWeek(globalIdx, 'topic', e.target.value)}
                                  className="text-xs h-7 flex-1 border-0 bg-transparent px-1 focus-visible:ring-1"
                                />
                                <Input
                                  placeholder="Sub-topic"
                                  value={w.subTopic}
                                  onChange={e => updateWeek(globalIdx, 'subTopic', e.target.value)}
                                  className="text-xs h-7 flex-1 border-0 bg-transparent px-1 focus-visible:ring-1"
                                />
                                <Input
                                  placeholder="💬"
                                  value={w.comment || ''}
                                  onChange={e => updateWeek(globalIdx, 'comment', e.target.value)}
                                  className="text-[10px] h-7 w-20 border-0 bg-transparent px-1 focus-visible:ring-1"
                                  title="Comment"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Save button */}
                <div className="fixed bottom-[6.5rem] left-0 right-0 px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border safe-bottom z-40">
                  <Button className="w-full touch-target" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" /> {editingId ? 'Update Full Year' : 'Save Full Year Scheme'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Saved Schemes (grouped by subject/class/year) ── */}
        {!showForm && Object.keys(sowGroups).length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <AppLogo size="xl" className="mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">No Schemes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a full-year Scheme of Work covering all 3 terms (39 weeks).
            </p>
            <Button onClick={startNew}>Create Full Year Scheme</Button>
          </div>
        )}

        {!showForm && Object.entries(sowGroups).map(([key, groupSows]) => {
          const [subj, cls, yr] = key.split('|');
          const isExpanded = expandedSOW === key;
          const totalWeeks = groupSows.reduce((sum, s) => sum + s.weeks.filter(w => w.topic.trim()).length, 0);
          const terms = groupSows.map(s => s.term).sort();

          return (
            <div key={key} className="glass-card rounded-xl overflow-hidden">
              <button onClick={() => setExpandedSOW(isExpanded ? null : key)} className="w-full p-4 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <AppLogo size="xs" />
                  <span className="text-sm font-semibold">{subj}</span>
                  <span className="ml-auto">
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{cls} • {yr}</p>
                <p className="text-xs text-muted-foreground">
                  Terms: {terms.join(', ')} • {totalWeeks} of {terms.length * 13} weeks filled
                </p>
              </button>

              {isExpanded && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4 space-y-3">
                  {groupSows.sort((a, b) => a.term - b.term).map(sow => (
                    <div key={sow.id}>
                      <p className="text-xs font-bold text-primary mb-2">Term {sow.term}</p>
                      <div className="space-y-1">
                        {sow.weeks.map(w => (
                          <div key={w.week} className="flex gap-2 text-xs py-1 border-b border-border/20 last:border-0">
                            <span className="text-muted-foreground w-8 shrink-0">W{w.week}</span>
                            <span className="flex-1">{w.topic || '—'}</span>
                            <span className="text-muted-foreground truncate max-w-[80px]">{w.subTopic || ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => startEditFullYear(subj, cls, yr)}>
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleExport(groupSows[0])}>
                      <Download className="h-3 w-3 mr-1" /> PDF
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      className="text-xs text-destructive hover:bg-destructive/10"
                      onClick={async () => {
                        for (const s of groupSows) await handleDelete(s);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

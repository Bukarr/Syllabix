import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, Trash2, Check, Edit2, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getProfile, getAllSOW, saveSOW, deleteSOW,
  type TeacherProfile, type SchemeOfWork as SOWType
} from '@/lib/db';
import { SUBJECTS, CLASSES, SCHOOL_LEVELS } from '@/lib/curriculum';
import { exportSOWToPDF } from '@/lib/export';
import { toast } from 'sonner';

type WeekEntry = SOWType['weeks'][number];

const emptyWeek = (weekNum: number): WeekEntry => ({
  week: weekNum,
  topic: '',
  subTopic: '',
  objectives: [''],
  materials: [''],
});

export default function SchemeOfWork() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sows, setSows] = useState<SOWType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedSOW, setExpandedSOW] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const p = await getProfile();
    if (p) setProfile(p);
    const s = await getAllSOW();
    setSows(s);
    setLoading(false);
  }

  const initWeeks = () => {
    setWeeks(Array.from({ length: 13 }, (_, i) => emptyWeek(i + 1)));
  };

  const updateWeek = (index: number, field: string, value: any) => {
    setWeeks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!subject || !classLevel) {
      toast.error('Please select subject and class level');
      return;
    }
    const hasContent = weeks.some(w => w.topic.trim() !== '');
    if (!hasContent) {
      toast.error('Please enter at least one topic');
      return;
    }
    const sow: SOWType = {
      id: editingId || crypto.randomUUID(),
      subject,
      classLevel,
      term,
      year,
      weeks,
      status: 'confirmed',
      createdAt: editingId
        ? (sows.find(s => s.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
    };
    await saveSOW(sow);
    toast.success(editingId ? 'Scheme of Work updated!' : 'Scheme of Work saved!');
    await loadData();
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setSubject('');
    setClassLevel('');
    setTerm(1);
    setYear(new Date().getFullYear().toString());
    setWeeks([]);
    setShowForm(false);
  };

  const startNew = () => {
    resetForm();
    initWeeks();
    setShowForm(true);
  };

  const startEdit = (sow: SOWType) => {
    setEditingId(sow.id);
    setSubject(sow.subject);
    setClassLevel(sow.classLevel);
    setTerm(sow.term);
    setYear(sow.year);
    setWeeks(sow.weeks.length === 13 ? sow.weeks : Array.from({ length: 13 }, (_, i) => sow.weeks[i] || emptyWeek(i + 1)));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Scheme of Work</h2>
          {!showForm && (
            <Button size="sm" onClick={startNew}>
              <Plus className="h-4 w-4 mr-1" /> New
            </Button>
          )}
        </div>

        {/* ── Input Form ── */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="glass-card rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-heading font-semibold">
                  {editingId ? 'Edit Scheme' : 'Create New Scheme'}
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
              {/* Term & Year */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Term</Label>
                  <div className="flex gap-2 mt-1.5">
                    {[1, 2, 3].map(t => (
                      <button
                        key={t}
                        onClick={() => setTerm(t)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                          term === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium">Year</Label>
                  <Input value={year} onChange={e => setYear(e.target.value)} className="mt-1.5 h-9 text-sm" />
                </div>
              </div>
            </div>

            {/* Weekly topic inputs */}
            {subject && classLevel && (
              <>
                <p className="text-xs text-muted-foreground px-1">
                  Enter topics for each week — {subject}, {classLevel}, Term {term}
                </p>

                <div className="space-y-2">
                  {weeks.map((w, i) => (
                    <div key={i} className="glass-card rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-primary">{w.week}</span>
                        </div>
                        <span className="text-xs font-semibold">Week {w.week}</span>
                      </div>
                      <Input
                        placeholder="Topic *"
                        value={w.topic}
                        onChange={e => updateWeek(i, 'topic', e.target.value)}
                        className="text-sm h-9"
                      />
                      <Input
                        placeholder="Sub-topic"
                        value={w.subTopic}
                        onChange={e => updateWeek(i, 'subTopic', e.target.value)}
                        className="text-sm h-9"
                      />
                      <Textarea
                        placeholder="Objectives (one per line)"
                        value={w.objectives.join('\n')}
                        onChange={e => updateWeek(i, 'objectives', e.target.value.split('\n'))}
                        rows={2}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Materials (comma separated)"
                        value={w.materials.join(', ')}
                        onChange={e => updateWeek(i, 'materials', e.target.value.split(',').map(s => s.trim()))}
                        className="text-sm h-9"
                      />
                    </div>
                  ))}
                </div>

                {/* Save button — fixed at bottom */}
                <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border safe-bottom z-10">
                  <Button className="w-full touch-target" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-1" /> {editingId ? 'Update Scheme' : 'Save Scheme'}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── Saved Schemes ── */}
        {!showForm && sows.length === 0 && (
          <div className="glass-card rounded-2xl p-8 text-center">
            <img src="/icon-512.png" alt="NaijaLesson" className="h-10 w-10 mx-auto mb-3 rounded-lg" />
            <h3 className="font-heading font-semibold mb-2">No Schemes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a Scheme of Work by entering your topics for each week of the term.
            </p>
            <Button onClick={startNew}>Create Scheme</Button>
          </div>
        )}

        {!showForm && sows.length > 0 && (
          <div className="space-y-3">
            {sows.map(sow => {
              const isExpanded = expandedSOW === sow.id;
              const filledWeeks = sow.weeks.filter(w => w.topic.trim()).length;
              return (
                <div key={sow.id} className="glass-card rounded-xl overflow-hidden">
                  {/* Summary row */}
                  <button
                    onClick={() => setExpandedSOW(isExpanded ? null : sow.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <img src="/icon-512.png" alt="NaijaLesson" className="h-4 w-4 shrink-0 rounded-sm" />
                      <span className="text-sm font-semibold">{sow.subject}</span>
                      <span className="ml-auto">
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{sow.classLevel} • Term {sow.term} • {sow.year}</p>
                    <p className="text-xs text-muted-foreground">{filledWeeks} of {sow.weeks.length} weeks filled</p>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="px-4 pb-4 space-y-3">
                      {sow.weeks.map(w => (
                        <div key={w.week} className="border border-border rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-primary">{w.week}</span>
                            </div>
                            <span className="text-xs font-semibold">Week {w.week}</span>
                          </div>
                          <p className="text-xs"><span className="text-muted-foreground">Topic:</span> {w.topic || '—'}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Sub-topic:</span> {w.subTopic || '—'}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Objectives:</span> {w.objectives.filter(Boolean).join('; ') || '—'}</p>
                          <p className="text-xs"><span className="text-muted-foreground">Materials:</span> {w.materials.filter(Boolean).join(', ') || '—'}</p>
                        </div>
                      ))}

                      <div className="flex gap-2 pt-1">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => startEdit(sow)}>
                          <Edit2 className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleExport(sow)}>
                          <Download className="h-3 w-3 mr-1" /> PDF
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(sow)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Plus, Trash2, Check, Edit2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  getProfile, getAllSOW, saveSOW,
  type TeacherProfile, type SchemeOfWork as SOWType
} from '@/lib/db';
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
  const [mode, setMode] = useState<'list' | 'create' | 'edit' | 'review'>('list');
  const [selectedSOW, setSelectedSOW] = useState<SOWType | null>(null);

  // Create/edit form state
  const [subject, setSubject] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [term, setTerm] = useState(1);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [weeks, setWeeks] = useState<WeekEntry[]>([]);
  const [setupDone, setSetupDone] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const p = await getProfile();
    if (p) setProfile(p);
    const s = await getAllSOW();
    setSows(s);
    setLoading(false);
  }

  const startBlankWeeks = () => {
    setWeeks(Array.from({ length: 13 }, (_, i) => emptyWeek(i + 1)));
    setSetupDone(true);
  };

  const addWeek = () => {
    setWeeks(prev => [...prev, emptyWeek(prev.length + 1)]);
  };

  const removeWeek = (index: number) => {
    setWeeks(prev => prev.filter((_, i) => i !== index).map((w, i) => ({ ...w, week: i + 1 })));
  };

  const updateWeek = (index: number, field: string, value: any) => {
    setWeeks(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async (status: 'draft' | 'confirmed') => {
    const hasContent = weeks.some(w => w.topic.trim() !== '');
    if (!hasContent) {
      toast.error('Please enter at least one topic before saving');
      return;
    }
    const sow: SOWType = {
      id: selectedSOW?.id || crypto.randomUUID(),
      subject,
      classLevel,
      term,
      year,
      weeks,
      status,
      createdAt: selectedSOW?.createdAt || new Date().toISOString(),
    };
    await saveSOW(sow);
    toast.success(status === 'confirmed' ? 'Scheme of Work confirmed!' : 'Draft saved');
    await loadData();
    resetForm();
  };

  const resetForm = () => {
    setMode('list');
    setSelectedSOW(null);
    setSubject('');
    setClassLevel('');
    setTerm(1);
    setYear(new Date().getFullYear().toString());
    setWeeks([]);
    setSetupDone(false);
  };

  const openForEdit = (sow: SOWType) => {
    setSelectedSOW(sow);
    setSubject(sow.subject);
    setClassLevel(sow.classLevel);
    setTerm(sow.term);
    setYear(sow.year);
    setWeeks(sow.weeks);
    setSetupDone(true);
    setMode('edit');
  };

  const openForReview = (sow: SOWType) => {
    setSelectedSOW(sow);
    setMode('review');
  };

  const handleExport = async (sow: SOWType) => {
    await exportSOWToPDF(sow);
    toast.success('PDF exported');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Review mode — read-only view
  if (mode === 'review' && selectedSOW) {
    return (
      <div className="pb-24 px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold">Review Scheme</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => openForEdit(selectedSOW)}>
                <Edit2 className="h-3 w-3 mr-1" /> Edit
              </Button>
              <Button variant="outline" size="sm" onClick={resetForm}>Back</Button>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-1">
            <p className="text-sm font-semibold">{selectedSOW.subject}</p>
            <p className="text-xs text-muted-foreground">{selectedSOW.classLevel} • Term {selectedSOW.term} • {selectedSOW.year}</p>
            <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full mt-1 ${
              selectedSOW.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'
            }`}>
              {selectedSOW.status}
            </span>
          </div>

          {selectedSOW.weeks.map((w) => (
            <div key={w.week} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{w.week}</span>
                </div>
                <span className="text-sm font-semibold">Week {w.week}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Topic:</span> {w.topic || '—'}</p>
                <p><span className="text-muted-foreground">Sub-topic:</span> {w.subTopic || '—'}</p>
                <p><span className="text-muted-foreground">Objectives:</span> {w.objectives.filter(Boolean).join('; ') || '—'}</p>
                <p><span className="text-muted-foreground">Materials:</span> {w.materials.filter(Boolean).join(', ') || '—'}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleExport(selectedSOW)}>
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            <Button className="flex-1" onClick={() => openForEdit(selectedSOW)}>
              <Edit2 className="h-4 w-4 mr-1" /> Edit
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Create / Edit mode
  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="pb-24 px-4 pt-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-heading font-bold">
              {mode === 'create' ? 'New Scheme of Work' : 'Edit Scheme'}
            </h2>
            <Button variant="outline" size="sm" onClick={resetForm}>Back</Button>
          </div>

          {/* Subject & class selection — only show when creating and not yet set up */}
          {!setupDone && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {(profile?.subjects || []).map(s => (
                    <button
                      key={s}
                      onClick={() => setSubject(s)}
                      className={`py-3 px-3 rounded-lg border text-xs font-medium transition-all touch-target text-left ${
                        subject === s ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Class Level</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {(profile?.classes || [])
                    .filter(c => c.subject === subject)
                    .map(c => (
                      <button
                        key={c.level}
                        onClick={() => setClassLevel(c.level)}
                        className={`py-3 px-3 rounded-lg border text-xs font-medium transition-all touch-target ${
                          classLevel === c.level ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {c.level}
                      </button>
                    ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Term</Label>
                  <div className="flex gap-2 mt-1.5">
                    {[1, 2, 3].map(t => (
                      <button
                        key={t}
                        onClick={() => setTerm(t)}
                        className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          term === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Year</Label>
                  <Input value={year} onChange={e => setYear(e.target.value)} className="mt-1.5 touch-target" />
                </div>
              </div>
              <Button
                className="w-full touch-target"
                disabled={!subject || !classLevel}
                onClick={startBlankWeeks}
              >
                Start Entering Topics
              </Button>
            </div>
          )}

          {/* Weeks — manual entry */}
          {setupDone && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Enter your topics for each week. {subject} — {classLevel} — Term {term}
              </p>
              {weeks.map((w, i) => (
                <div key={i} className="glass-card rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">{w.week}</span>
                      </div>
                      <span className="text-sm font-semibold">Week {w.week}</span>
                    </div>
                    {weeks.length > 1 && (
                      <button onClick={() => removeWeek(i)} className="text-destructive/60 hover:text-destructive p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Input
                    placeholder="Topic *"
                    value={w.topic}
                    onChange={e => updateWeek(i, 'topic', e.target.value)}
                    className="text-sm"
                  />
                  <Input
                    placeholder="Sub-topic"
                    value={w.subTopic}
                    onChange={e => updateWeek(i, 'subTopic', e.target.value)}
                    className="text-sm"
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
                    className="text-sm"
                  />
                </div>
              ))}

              <Button variant="outline" className="w-full touch-target" onClick={addWeek}>
                <Plus className="h-4 w-4 mr-1" /> Add Week
              </Button>

              <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 touch-target" onClick={() => handleSave('draft')}>
                    Save Draft
                  </Button>
                  <Button className="flex-1 touch-target" onClick={() => handleSave('confirmed')}>
                    <Check className="h-4 w-4 mr-1" /> Confirm
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // List mode
  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Scheme of Work</h2>
          <Button size="sm" onClick={() => { resetForm(); setMode('create'); }}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        {sows.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">No Schemes Yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a Scheme of Work by entering your topics for each week of the term.
            </p>
            <Button onClick={() => { resetForm(); setMode('create'); }}>Create Scheme</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sows.map(sow => (
              <div key={sow.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{sow.subject}</span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${
                    sow.status === 'confirmed' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'
                  }`}>
                    {sow.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{sow.classLevel} • Term {sow.term} • {sow.year}</p>
                <p className="text-xs text-muted-foreground">{sow.weeks.filter(w => w.topic).length} of {sow.weeks.length} weeks filled</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openForReview(sow)}>
                    <Eye className="h-3 w-3 mr-1" /> Review
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openForEdit(sow)}>
                    <Edit2 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleExport(sow)}>
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

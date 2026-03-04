import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, ChevronUp, BookOpen, ArrowLeft, Download, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAllSOW, getProfile, saveLessonPlan, type SchemeOfWork, type TeacherProfile, type LessonPlan } from '@/lib/db';
import { generateLessonContent, type GeneratedLesson } from '@/lib/ai';
import { CLASSES, SCHOOL_LEVELS } from '@/lib/curriculum';
import { exportLessonPlanToPDF } from '@/lib/export';
import { toast } from 'sonner';

export default function GenerateNotes() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sows, setSows] = useState<SchemeOfWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSOW, setSelectedSOW] = useState<SchemeOfWork | null>(null);
  const [expandedSOW, setExpandedSOW] = useState<string | null>(null);
  const [selectedClassLevel, setSelectedClassLevel] = useState('');
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [pendingWeek, setPendingWeek] = useState<{ week: number; topic: string; subTopic: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState<GeneratedLesson | null>(null);
  const [generatedMeta, setGeneratedMeta] = useState<{ subject: string; classLevel: string; topic: string; subTopic: string; term: number; week: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([getProfile(), getAllSOW()]).then(([p, s]) => {
      if (p) setProfile(p);
      setSows(s);
      setLoading(false);
    });
  }, []);

  const handleWeekClick = (sow: SchemeOfWork, weekEntry: { week: number; topic: string; subTopic: string }) => {
    setSelectedSOW(sow);
    setPendingWeek(weekEntry);
    setSelectedClassLevel(sow.classLevel || '');
    setShowClassPicker(true);
    setGeneratedNote(null);
  };

  const handleGenerate = async () => {
    if (!selectedSOW || !pendingWeek || !selectedClassLevel) {
      toast.error('Please select a class level');
      return;
    }

    setShowClassPicker(false);
    setIsGenerating(true);

    try {
      const generated = await generateLessonContent({
        subject: selectedSOW.subject,
        classLevel: selectedClassLevel,
        topic: pendingWeek.topic,
        subTopic: pendingWeek.subTopic,
        term: selectedSOW.term,
        week: pendingWeek.week,
        resources: profile?.resources?.map(String),
      });
      setGeneratedNote(generated);
      setGeneratedMeta({
        subject: selectedSOW.subject,
        classLevel: selectedClassLevel,
        topic: pendingWeek.topic,
        subTopic: pendingWeek.subTopic,
        term: selectedSOW.term,
        week: pendingWeek.week,
      });
      toast.success('Lesson copy note generated!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate note');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveNote = async () => {
    if (!generatedNote || !generatedMeta) return;
    const plan: LessonPlan = {
      id: crypto.randomUUID(),
      subject: generatedMeta.subject,
      classLevel: generatedMeta.classLevel,
      term: generatedMeta.term,
      week: generatedMeta.week,
      date: new Date().toISOString().split('T')[0],
      duration: '40 minutes',
      topic: generatedMeta.topic,
      subTopic: generatedMeta.subTopic,
      objectives: generatedNote.objectives || [],
      entryBehaviour: generatedNote.entryBehaviour || '',
      materials: generatedNote.materials || [],
      references: generatedNote.references || '',
      steps: generatedNote.steps || [],
      evaluation: generatedNote.evaluation || '',
      assignment: generatedNote.assignment || '',
      status: 'complete',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLessonPlan(plan);
    toast.success('Note saved to My Notes!');
  };

  const handleExportPDF = () => {
    if (!generatedNote || !generatedMeta) return;
    const plan: LessonPlan = {
      id: crypto.randomUUID(),
      subject: generatedMeta.subject,
      classLevel: generatedMeta.classLevel,
      term: generatedMeta.term,
      week: generatedMeta.week,
      date: new Date().toISOString().split('T')[0],
      duration: '40 minutes',
      topic: generatedMeta.topic,
      subTopic: generatedMeta.subTopic,
      objectives: generatedNote.objectives || [],
      entryBehaviour: generatedNote.entryBehaviour || '',
      materials: generatedNote.materials || [],
      references: generatedNote.references || '',
      steps: generatedNote.steps || [],
      evaluation: generatedNote.evaluation || '',
      assignment: generatedNote.assignment || '',
      status: 'complete',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    exportLessonPlanToPDF(plan);
  };

  const handleCopyText = () => {
    if (!generatedNote || !generatedMeta) return;
    let text = `${generatedMeta.topic}\n`;
    if (generatedMeta.subTopic) text += `${generatedMeta.subTopic}\n`;
    text += `\nSubject: ${generatedMeta.subject} | Class: ${generatedMeta.classLevel}\n`;
    text += `Term ${generatedMeta.term}, Week ${generatedMeta.week}\n\n`;
    text += `OBJECTIVES:\n${generatedNote.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n`;
    generatedNote.steps.forEach((s, i) => {
      text += `--- Section ${i + 1} ---\n${s.teacherActivity}\n\n`;
    });
    text += `CLASSWORK / EXERCISES:\n${generatedNote.evaluation}\n\n`;
    text += `ASSIGNMENT:\n${generatedNote.assignment}\n`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard!');
  };

  // Get all available class levels
  const allClasses = SCHOOL_LEVELS.flatMap(level => CLASSES[level] || []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show generated note view
  if (generatedNote && generatedMeta) {
    return (
      <div className="pb-24 px-4 pt-4">
        <Button variant="ghost" size="sm" onClick={() => setGeneratedNote(null)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Schemes
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="glass-card rounded-xl p-4 mb-4">
            <h2 className="text-lg font-heading font-bold text-foreground">{generatedMeta.topic}</h2>
            {generatedMeta.subTopic && <p className="text-sm text-muted-foreground">{generatedMeta.subTopic}</p>}
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary font-medium">{generatedMeta.subject}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary font-medium">{generatedMeta.classLevel}</span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Term {generatedMeta.term}, Week {generatedMeta.week}</span>
            </div>
          </div>

          {/* Objectives */}
          <div className="glass-card rounded-xl p-4 mb-3">
            <h3 className="text-sm font-heading font-bold text-primary mb-2">OBJECTIVES</h3>
            <ul className="space-y-1">
              {generatedNote.objectives.map((obj, i) => (
                <li key={i} className="text-sm text-foreground flex gap-2">
                  <span className="text-primary font-bold">{i + 1}.</span> {obj}
                </li>
              ))}
            </ul>
          </div>

          {/* Entry Behaviour */}
          <div className="glass-card rounded-xl p-4 mb-3">
            <h3 className="text-sm font-heading font-bold text-primary mb-2">PREVIOUS KNOWLEDGE</h3>
            <p className="text-sm text-foreground">{generatedNote.entryBehaviour}</p>
          </div>

          {/* Materials & Reference */}
          <div className="glass-card rounded-xl p-4 mb-3">
            <h3 className="text-sm font-heading font-bold text-primary mb-2">MATERIALS</h3>
            <p className="text-sm text-foreground">{generatedNote.materials.join(', ')}</p>
            {generatedNote.references && (
              <>
                <h3 className="text-sm font-heading font-bold text-primary mb-2 mt-3">REFERENCE</h3>
                <p className="text-sm text-foreground">{generatedNote.references}</p>
              </>
            )}
          </div>

          {/* Note Content Sections */}
          {generatedNote.steps.map((step, i) => (
            <div key={i} className="glass-card rounded-xl p-4 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <h3 className="text-sm font-heading font-bold text-foreground">Section {i + 1}</h3>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{step.teacherActivity}</div>
              {step.studentActivity && (
                <p className="text-xs text-muted-foreground mt-2 italic">📝 {step.studentActivity}</p>
              )}
            </div>
          ))}

          {/* Evaluation */}
          <div className="glass-card rounded-xl p-4 mb-3">
            <h3 className="text-sm font-heading font-bold text-primary mb-2">CLASSWORK / EXERCISES</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{generatedNote.evaluation}</p>
          </div>

          {/* Assignment */}
          <div className="glass-card rounded-xl p-4 mb-3">
            <h3 className="text-sm font-heading font-bold text-primary mb-2">ASSIGNMENT</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap">{generatedNote.assignment}</p>
          </div>
        </motion.div>

        {/* Action buttons */}
        <div className="fixed bottom-16 left-0 right-0 px-4 py-3 bg-card/95 backdrop-blur-md border-t border-border safe-bottom">
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 touch-target" onClick={handleCopyText}>
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button variant="outline" className="flex-1 touch-target" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button className="flex-1 touch-target font-semibold" onClick={handleSaveNote}>
              <BookOpen className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Copy Note Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a week from your Scheme of Work to generate a detailed pupil copy note
        </p>
      </div>

      {/* Generating overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <div className="glass-card rounded-2xl p-8 text-center max-w-xs mx-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
              <h3 className="font-heading font-bold text-foreground mb-1">Generating Copy Note</h3>
              <p className="text-sm text-muted-foreground">Creating NERDC-aligned content for your pupils…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Class Level Picker Modal */}
      <AnimatePresence>
        {showClassPicker && pendingWeek && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-background/60 backdrop-blur-sm"
            onClick={() => setShowClassPicker(false)}
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              className="w-full max-w-lg bg-card rounded-t-2xl border-t border-border p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
              <h3 className="font-heading font-bold text-foreground mb-1">Select Class Level</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generating note for: <span className="text-primary font-medium">{pendingWeek.topic}</span>
              </p>

              <ScrollArea className="max-h-60">
                <div className="grid grid-cols-2 gap-2">
                  {allClasses.map(cls => (
                    <button
                      key={cls}
                      onClick={() => setSelectedClassLevel(cls)}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all text-left ${
                        selectedClassLevel === cls
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
              </ScrollArea>

              <Button
                onClick={handleGenerate}
                disabled={!selectedClassLevel}
                className="w-full mt-4 touch-target font-semibold"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Copy Note
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOW List */}
      {sows.length === 0 ? (
        <Card className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-bold text-foreground mb-1">No Schemes of Work</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create a Scheme of Work first, then come back here to generate copy notes for each week.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/scheme'}>
            Go to Schemes
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {sows.map(sow => {
            const isExpanded = expandedSOW === sow.id;
            return (
              <Card key={sow.id} className="overflow-hidden">
                <button
                  onClick={() => setExpandedSOW(isExpanded ? null : sow.id)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div>
                    <h3 className="font-heading font-bold text-foreground text-sm">{sow.subject}</h3>
                    <p className="text-xs text-muted-foreground">
                      {sow.classLevel} · Term {sow.term} · {sow.year}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      {sow.weeks.filter(w => w.topic).length} weeks
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2">
                        {sow.weeks.map(week => {
                          if (!week.topic) return null;
                          return (
                            <button
                              key={week.week}
                              onClick={() => handleWeekClick(sow, week)}
                              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                            >
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="text-xs font-bold text-primary">{week.week}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{week.topic}</p>
                                {week.subTopic && <p className="text-xs text-muted-foreground truncate">{week.subTopic}</p>}
                              </div>
                              <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Save, BookOpen, Loader2, WifiOff, FileQuestion, MapPin, Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { getProfile, saveLessonPlan, getAllSOW, getAllLessonPlans, type LessonPlan, type TeacherProfile, type SchemeOfWork } from '@/lib/db';
import { getAllClassGroups, getWeakTopics, type ClassGroup } from '@/lib/db-tracker';
import { toast } from 'sonner';
import { lessonPlanSchema, type ValidationErrors, validateAll } from '@/lib/validation';
import { VoiceInput } from '@/components/VoiceInput';
import { AssessmentGenerator } from '@/components/AssessmentGenerator';
import { ResourceRecommendations } from '@/components/ResourceRecommendations';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { trackActivity } from '@/lib/ai-personalization';
import { supabase } from '@/integrations/supabase/client';

const STEPS = ['Details', 'Objectives', 'Note Content', 'Classwork'];

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson`;
const DRAFT_KEY = 'syllabix:current-lesson-draft-id';

export default function LessonPlanForm() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sows, setSows] = useState<SchemeOfWork[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Partial<LessonPlan>>({
    subject: '',
    classLevel: '',
    term: 1,
    week: 1,
    date: new Date().toISOString().split('T')[0],
    duration: '40 minutes',
    topic: '',
    subTopic: '',
    objectives: [''],
    entryBehaviour: '',
    materials: [],
    references: '',
    steps: [{ teacherActivity: '', studentActivity: '' }],
    evaluation: '',
    assignment: '',
    status: 'draft',
  });

  // AI generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [curriculumPosition, setCurriculumPosition] = useState('');

  // AI review modal
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  
  // Assessment modal
  const [showAssessment, setShowAssessment] = useState(false);
  const [showResources, setShowResources] = useState(false);
  
  // Weak topics from Class Tracker
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [classGroups, setClassGroups] = useState<ClassGroup[]>([]);

  useEffect(() => {
    Promise.all([getProfile(), getAllSOW(), getAllLessonPlans(), getAllClassGroups()]).then(([p, s, plans, groups]) => {
      if (p) setProfile(p);
      setSows(s);
      setClassGroups(groups);
      // 1. Explicit edit param wins
      if (editId) {
        const existing = plans.find(lp => lp.id === editId);
        if (existing) {
          setPlan(existing);
          setPlanId(existing.id);
        }
        return;
      }
      // 2. Otherwise resume the last in-progress draft (works for anonymous users too)
      const resumeId = localStorage.getItem(DRAFT_KEY);
      if (resumeId) {
        const existing = plans.find(lp => lp.id === resumeId && lp.status === 'draft');
        if (existing) {
          setPlan(existing);
          setPlanId(existing.id);
        } else {
          localStorage.removeItem(DRAFT_KEY);
        }
      }
    });
  }, [editId]);

  // Update weak topics when subject/class changes
  useEffect(() => {
    if (!plan.subject || !plan.classLevel) {
      setWeakTopics([]);
      return;
    }
    const matching = classGroups.find(
      g => g.subject === plan.subject && g.classLevel === plan.classLevel
    );
    if (matching) {
      setWeakTopics(getWeakTopics(matching));
    } else {
      setWeakTopics([]);
    }
  }, [plan.subject, plan.classLevel, classGroups]);

  // Auto-fill from SOW
  useEffect(() => {
    if (!plan.subject || !plan.classLevel || !plan.term || !plan.week) return;
    const matchingSOW = sows.find(
      s => s.subject === plan.subject && s.classLevel === plan.classLevel && s.term === plan.term
    );
    if (!matchingSOW) return;
    const weekEntry = matchingSOW.weeks.find(w => w.week === plan.week);
    if (weekEntry && weekEntry.topic) {
      setPlan(prev => ({
        ...prev,
        topic: weekEntry.topic,
        subTopic: weekEntry.subTopic,
        objectives: weekEntry.objectives.filter(Boolean).length > 0 ? weekEntry.objectives.filter(Boolean) : prev.objectives,
        materials: weekEntry.materials.filter(Boolean).length > 0 ? weekEntry.materials.filter(Boolean) : prev.materials,
      }));
    }
  }, [plan.subject, plan.classLevel, plan.term, plan.week, sows]);

  // Update curriculum position display
  useEffect(() => {
    if (plan.subject && plan.classLevel && plan.term && plan.week) {
      const termLabel = plan.term === 1 ? '1st' : plan.term === 2 ? '2nd' : '3rd';
      setCurriculumPosition(`Week ${plan.week}, ${termLabel} Term content for ${plan.classLevel} ${plan.subject}`);
    } else {
      setCurriculumPosition('');
    }
  }, [plan.subject, plan.classLevel, plan.term, plan.week]);

  const updatePlan = (field: string, value: any) => {
    setPlan(p => ({ ...p, [field]: value }));
  };

  const addStep = () => {
    setPlan(p => ({
      ...p,
      steps: [...(p.steps || []), { teacherActivity: '', studentActivity: '' }],
    }));
  };

  const updateStep = (index: number, field: 'teacherActivity' | 'studentActivity', value: string) => {
    setPlan(p => {
      const newSteps = [...(p.steps || [])];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return { ...p, steps: newSteps };
    });
  };

  const addObjective = () => {
    setPlan(p => ({ ...p, objectives: [...(p.objectives || []), ''] }));
  };

  const updateObjective = (index: number, value: string) => {
    setPlan(p => {
      const newObj = [...(p.objectives || [])];
      newObj[index] = value;
      return { ...p, objectives: newObj };
    });
  };

  const handleAIGenerate = async () => {
    const hasObjective = (plan.objectives || []).some(o => o.trim().length > 0);
    if (!plan.subject || !plan.classLevel || !plan.topic || !hasObjective) {
      toast.error('Please enter subject, class level, topic, and at least one objective');
      return;
    }
    if (!isOnline) {
      toast.error('Internet connection required for AI generation');
      return;
    }
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          subject: plan.subject,
          classLevel: plan.classLevel,
          topic: plan.topic,
          subTopic: plan.subTopic,
          term: plan.term,
          week: plan.week,
          resources: plan.materials,
          weakTopics: weakTopics.length > 0 ? weakTopics : undefined,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Generation failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const data = await resp.json();
      setAiDraft(data);
      if (data.curriculumPosition) setCurriculumPosition(data.curriculumPosition);
      toast.success('AI plan ready — review it before accepting');
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate lesson note');
    } finally {
      setIsGenerating(false);
    }
  };

  const acceptAIDraft = () => {
    if (!aiDraft) return;
    setPlan(prev => ({
      ...prev,
      objectives: aiDraft.objectives?.length ? aiDraft.objectives : prev.objectives,
      entryBehaviour: aiDraft.entryBehaviour || prev.entryBehaviour,
      materials: aiDraft.materials || prev.materials,
      references: aiDraft.references || prev.references,
      steps: aiDraft.steps || prev.steps,
      evaluation: aiDraft.evaluation || prev.evaluation,
      assignment: aiDraft.assignment || prev.assignment,
    }));
    setAiDraft(null);
    setShowResources(true);
    setStep(1);
    toast.success('Plan accepted — edit any section as needed');
  };

  const discardAIDraft = () => {
    setAiDraft(null);
    toast.info('AI plan discarded');
  };

  const handleVoiceTranscription = (text: string) => {
    updatePlan('topic', text);
    toast.success('Topic set from voice input');
  };

  const handleSave = async (status: 'draft' | 'complete' = 'draft') => {
    if (status === 'complete') {
      const errs = validateAll(lessonPlanSchema, {
        subject: plan.subject,
        classLevel: plan.classLevel,
        topic: plan.topic,
        subTopic: plan.subTopic,
        duration: plan.duration,
        objectives: plan.objectives,
        entryBehaviour: plan.entryBehaviour,
        references: plan.references,
        evaluation: plan.evaluation,
        assignment: plan.assignment,
        steps: plan.steps,
      });
      if (Object.keys(errs).length > 0) {
        const firstErr = Object.values(errs)[0];
        toast.error(firstErr || 'Please fix validation errors before saving');
        return;
      }
    }
    const fullPlan: LessonPlan = {
      id: editId || planId || plan.id || crypto.randomUUID(),
      subject: plan.subject || '',
      classLevel: plan.classLevel || '',
      term: plan.term || 1,
      week: plan.week || 1,
      date: plan.date || '',
      duration: plan.duration || '',
      topic: plan.topic || '',
      subTopic: plan.subTopic || '',
      objectives: plan.objectives?.filter(Boolean) || [],
      entryBehaviour: plan.entryBehaviour || '',
      materials: plan.materials || [],
      references: plan.references || '',
      steps: plan.steps || [],
      evaluation: plan.evaluation || '',
      assignment: plan.assignment || '',
      status,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLessonPlan(fullPlan);
    setPlanId(fullPlan.id);
    if (status === 'draft') {
      localStorage.setItem(DRAFT_KEY, fullPlan.id);
    } else {
      localStorage.removeItem(DRAFT_KEY);
    }
    trackActivity({ feature: 'lesson-plan', subject: plan.subject as string, classLevel: plan.classLevel as string, topic: plan.topic as string });
    toast.success(status === 'complete' ? 'Lesson note saved!' : 'Draft saved');
    if (status === 'complete') navigate('/');
  };

  // Autosave every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      if (plan.topic) {
        handleSave('draft');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [plan]);

  const availableSubjects = profile?.subjects || [];

  return (
    <div className="pb-32 px-4 pt-4">
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-colors ${
              i <= step ? 'bg-primary' : 'bg-muted'
            }`} />
            <span className={`text-[10px] font-medium ${
              i === step ? 'text-primary' : 'text-muted-foreground'
            }`}>{s}</span>
          </div>
        ))}
      </div>

      <motion.div
        key={step}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-5"
      >
        {step === 0 && (
          <>
            <h2 className="text-xl font-heading font-bold">Lesson Details</h2>

            {/* Curriculum Position Banner */}
            {curriculumPosition && (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs text-primary font-medium">{curriculumPosition}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {availableSubjects.map(s => (
                    <button
                      key={s}
                      onClick={() => updatePlan('subject', s)}
                      className={`py-3 px-3 rounded-lg border text-xs font-medium transition-all touch-target text-left ${
                        plan.subject === s
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {s}
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
                        onClick={() => updatePlan('term', t)}
                        className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          plan.term === t ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Week (1–13)</Label>
                  <Input
                    type="number"
                    min={1} max={13}
                    value={plan.week}
                    onChange={e => updatePlan('week', parseInt(e.target.value) || 1)}
                    className="mt-1.5 touch-target"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Topic</Label>
                <Input
                  placeholder="e.g. Whole Numbers"
                  maxLength={200}
                  value={plan.topic}
                  onChange={e => updatePlan('topic', e.target.value)}
                  className="mt-1.5 touch-target"
                />
                {/* Voice Input */}
                <div className="mt-2">
                  <VoiceInput onTranscriptionReady={handleVoiceTranscription} disabled={isGenerating} />
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Sub-topic</Label>
                <Input
                  placeholder="e.g. Addition of 2-digit numbers"
                  maxLength={200}
                  value={plan.subTopic}
                  onChange={e => updatePlan('subTopic', e.target.value)}
                  className="mt-1.5 touch-target"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <Input
                    type="date"
                    value={plan.date}
                    onChange={e => updatePlan('date', e.target.value)}
                    className="mt-1.5 touch-target"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration</Label>
                  <Input
                    value={plan.duration}
                    maxLength={50}
                    onChange={e => updatePlan('duration', e.target.value)}
                    className="mt-1.5 touch-target"
                  />
                </div>
              </div>

              {/* Weak Topics Alert */}
              {weakTopics.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-warning/30 bg-warning/5 p-3 space-y-1"
                >
                  <p className="text-xs font-semibold" style={{ color: 'hsl(var(--warning))' }}>
                    ⚠ Weak Topics Detected ({plan.classLevel})
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Your Class Tracker shows students struggling with: <strong>{weakTopics.join(', ')}</strong>.
                    AI generation will include scaffolding for these areas.
                  </p>
                </motion.div>
              )}

              {/* AI Generate Button — requires subject, class level, and topic */}
              {plan.subject && plan.classLevel && plan.topic && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  {!isOnline && (
                    <div className="flex items-center gap-2 p-2 mb-2 rounded-lg bg-muted/50 border border-border">
                      <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">AI generation requires internet connection</p>
                    </div>
                  )}
                  <Button
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !isOnline}
                    className="w-full touch-target font-semibold"
                    variant="default"
                    size="lg"
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating plan for {plan.classLevel}...</>
                    ) : (
                      <><BookOpen className="h-4 w-4 mr-2" />Generate Plan with AI for {plan.classLevel}</>
                    )}
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1">AI-generated content. Review before use in class.</p>
                </motion.div>
              )}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-heading font-bold">Objectives & Materials</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Performance Objectives</Label>
                <p className="text-xs text-muted-foreground mb-2">What pupils should be able to do by end of lesson</p>
                {plan.objectives?.map((obj, i) => (
                  <Input
                    key={i}
                    placeholder={`Objective ${i + 1}`}
                    value={obj}
                    onChange={e => updateObjective(i, e.target.value)}
                    className="mb-2 touch-target"
                  />
                ))}
                <Button variant="outline" size="sm" onClick={addObjective}>+ Add Objective</Button>
              </div>
              <div>
                <Label className="text-sm font-medium">Entry Behaviour</Label>
                <p className="text-xs text-muted-foreground mb-1">Prior knowledge pupils should have</p>
                <Textarea
                  placeholder="Pupils have previously learned..."
                  value={plan.entryBehaviour}
                  onChange={e => updatePlan('entryBehaviour', e.target.value)}
                  className="touch-target"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Instructional Materials</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  {profile?.resources?.includes('Chalkboard only')
                    ? 'Suggestions: chalkboard, cardboard charts, realia, locally available objects'
                    : 'List all materials needed'}
                </p>
                <Textarea
                  placeholder="Chalkboard, charts, textbooks..."
                  value={plan.materials?.join(', ')}
                  onChange={e => updatePlan('materials', e.target.value.split(',').map(s => s.trim()))}
                  className="touch-target"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Reference</Label>
                <Input
                  placeholder="e.g. New General Mathematics, Chapter 3, pg. 45"
                  maxLength={500}
                  value={plan.references}
                  onChange={e => updatePlan('references', e.target.value)}
                  className="touch-target"
                />
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-heading font-bold">Lesson Note Content</h2>
            <p className="text-xs text-muted-foreground">Add the note sections that pupils will copy into their books</p>
            <div className="space-y-4">
              {plan.steps?.map((s, i) => (
                <div key={i} className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{i + 1}</span>
                    </div>
                    <span className="text-sm font-medium">Section {i + 1}</span>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Note Content</Label>
                    <Textarea
                      placeholder="Content pupils will copy..."
                      value={s.teacherActivity}
                      onChange={e => updateStep(i, 'teacherActivity', e.target.value)}
                      className="mt-1 touch-target"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Pupil Activity</Label>
                    <Textarea
                      placeholder="Pupils will..."
                      value={s.studentActivity}
                      onChange={e => updateStep(i, 'studentActivity', e.target.value)}
                      className="mt-1 touch-target"
                      rows={2}
                    />
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={addStep} className="w-full touch-target">
                + Add Section
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-xl font-heading font-bold">Classwork & Assignment</h2>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Classwork / Exercises</Label>
                <p className="text-xs text-muted-foreground mb-1">Questions or exercises for pupils to attempt in class</p>
                <Textarea
                  placeholder="1. What is...?&#10;2. List three...&#10;3. Explain how..."
                  value={plan.evaluation}
                  onChange={e => updatePlan('evaluation', e.target.value)}
                  className="touch-target"
                  rows={4}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Take-Home Assignment</Label>
                <p className="text-xs text-muted-foreground mb-1">Homework for pupils to complete at home</p>
                <Textarea
                  placeholder="Solve questions 1-5 on page..."
                  value={plan.assignment}
                  onChange={e => updatePlan('assignment', e.target.value)}
                  className="touch-target"
                  rows={3}
                />
              </div>

              {/* Assessment Generator Button */}
              {plan.topic && (
                <Button
                  variant="outline"
                  onClick={() => setShowAssessment(true)}
                  className="w-full touch-target"
                  size="lg"
                >
                  <FileQuestion className="h-4 w-4 mr-2" />
                  Generate Assessment for This Lesson
                </Button>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Resource Recommendations */}
      <ResourceRecommendations
        subject={plan.subject || ''}
        classLevel={plan.classLevel || ''}
        topic={plan.topic || ''}
        visible={showResources && !!plan.topic}
      />

      {/* Bottom navigation */}
      <div className="sticky bottom-[6.5rem] z-40 mx-4 mb-4 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md safe-bottom">
        <div className="flex gap-3 overflow-x-auto">
          {step > 0 && (
            <Button variant="outline" className="touch-target" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="flex-1 touch-target font-semibold" onClick={() => setStep(s => s + 1)}>
              Continue <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex-1 flex gap-2">
              <Button variant="outline" className="flex-1 touch-target" onClick={() => handleSave('draft')}>
                <Save className="h-4 w-4 mr-1" /> Draft
              </Button>
              <Button className="flex-1 touch-target font-semibold" onClick={() => handleSave('complete')}>
                Complete <BookOpen className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Generator Modal */}
      <AssessmentGenerator
        open={showAssessment}
        onOpenChange={setShowAssessment}
        subject={plan.subject || ''}
        classLevel={plan.classLevel || ''}
        topic={plan.topic || ''}
        subTopic={plan.subTopic}
      />
    </div>
  );
}

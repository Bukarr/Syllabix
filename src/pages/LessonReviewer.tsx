import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardCheck, Loader2, Send, Star, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CLASSES, SCHOOL_LEVELS, SUBJECTS } from '@/lib/curriculum';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const REVIEW_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/review-lesson`;

interface ReviewCriteria {
  name: string;
  rating: 'Strong' | 'Adequate' | 'Needs Work';
  explanation: string;
}

interface ReviewResult {
  overallScore: number;
  summary: string;
  criteria: ReviewCriteria[];
  suggestedImprovements: string[];
}

export default function LessonReviewer() {
  const isOnline = useOnlineStatus();
  const [lessonPlan, setLessonPlan] = useState('');
  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [improvedPlan, setImprovedPlan] = useState('');

  const allClasses = SCHOOL_LEVELS.flatMap(level => CLASSES[level] || []);
  const getSchoolLevel = (cls: string) => {
    if (cls.startsWith('Primary')) return 'Primary';
    if (cls.startsWith('JSS')) return 'Junior Secondary';
    return 'Senior Secondary';
  };
  const availableSubjects = classLevel ? SUBJECTS[getSchoolLevel(classLevel)] || [] : [];

  const handleReview = async () => {
    if (!lessonPlan.trim()) { toast.error('Please paste a lesson plan to review'); return; }
    if (!isOnline) { toast.error('Internet connection required for AI review'); return; }

    setIsReviewing(true);
    setReview(null);
    setImprovedPlan('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please sign in to use AI features'); return; }
      const token = session.access_token;
      const resp = await fetch(REVIEW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ lessonPlan, classLevel, subject }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Review failed' }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      const result = await resp.json();
      setReview(result);
      toast.success('Review complete!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to review lesson plan');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleImprove = async () => {
    if (!lessonPlan.trim() || !review) return;
    if (!isOnline) { toast.error('Internet connection required'); return; }

    setIsImproving(true);
    setImprovedPlan('');

    const fullInput = `${lessonPlan}\n\n--- AI REVIEW ---\n${review.summary}\n\nSuggested Improvements:\n${review.suggestedImprovements.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { toast.error('Please sign in to use AI features'); return; }
      const token = session.access_token;
      const resp = await fetch(REVIEW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ lessonPlan: fullInput, classLevel, subject, action: 'improve' }),
      });

      if (!resp.ok || !resp.body) throw new Error('Failed to generate improved plan');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let content = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              setImprovedPlan(content);
            }
          } catch { /* partial */ }
        }
      }
      toast.success('Improved lesson plan generated!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to improve lesson plan');
    } finally {
      setIsImproving(false);
    }
  };

  const ratingIcon = (rating: string) => {
    if (rating === 'Strong') return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (rating === 'Adequate') return <Star className="h-4 w-4 text-secondary" />;
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  };

  const ratingColor = (rating: string) => {
    if (rating === 'Strong') return 'text-primary';
    if (rating === 'Adequate') return 'text-secondary';
    return 'text-destructive';
  };

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="mb-6">
        <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          Lesson Reviewer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Paste a lesson plan for AI-powered quality review</p>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-lg border border-border bg-muted/50">
          <WifiOff className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">You're offline. This feature requires internet.</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm font-medium">Class Level (optional)</Label>
            <Select value={classLevel} onValueChange={v => { setClassLevel(v); setSubject(''); }}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {allClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Subject (optional)</Label>
            <Select value={subject} onValueChange={setSubject} disabled={!classLevel}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                {availableSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Lesson Plan</Label>
          <p className="text-xs text-muted-foreground mb-2">Paste or type an existing lesson plan for review</p>
          <Textarea
            placeholder="Paste your lesson plan here..."
            value={lessonPlan}
            onChange={e => setLessonPlan(e.target.value)}
            className="min-h-[200px] touch-target"
            rows={10}
          />
        </div>

        <Button
          onClick={handleReview}
          disabled={!lessonPlan.trim() || isReviewing || !isOnline}
          className="w-full touch-target font-semibold"
          size="lg"
        >
          {isReviewing ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Reviewing...</>
          ) : (
            <><Send className="h-4 w-4 mr-2" />Review Lesson Plan</>
          )}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">AI-generated content. Review before use in class.</p>
      </div>

      {/* Review Results */}
      {review && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-4">
          {/* Overall Score */}
          <div className="glass-card rounded-2xl p-5 text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Overall Score</p>
            <div className="flex items-center justify-center gap-1">
              <span className="text-4xl font-heading font-bold text-foreground">{review.overallScore}</span>
              <span className="text-lg text-muted-foreground">/10</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mt-3 max-w-xs mx-auto">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(review.overallScore / 10) * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-bold text-foreground mb-2">Summary</h3>
            <p className="text-sm text-foreground leading-relaxed">{review.summary}</p>
          </div>

          {/* Criteria */}
          <div className="space-y-2">
            <h3 className="text-sm font-heading font-bold text-foreground">Criteria Breakdown</h3>
            {review.criteria?.map((c, i) => (
              <div key={i} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">{c.name}</span>
                  <div className="flex items-center gap-1">
                    {ratingIcon(c.rating)}
                    <span className={`text-xs font-medium ${ratingColor(c.rating)}`}>{c.rating}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{c.explanation}</p>
              </div>
            ))}
          </div>

          {/* Improvements */}
          {review.suggestedImprovements?.length > 0 && (
            <div className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-heading font-bold text-foreground mb-2">Suggested Improvements</h3>
              <ol className="space-y-2">
                {review.suggestedImprovements.map((imp, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Improve Button */}
          <Button
            onClick={handleImprove}
            disabled={isImproving || !isOnline}
            className="w-full touch-target font-semibold"
            variant="outline"
            size="lg"
          >
            {isImproving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating improved plan...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" />Improve This Lesson Plan</>
            )}
          </Button>
        </motion.div>
      )}

      {/* Improved Plan */}
      {improvedPlan && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-sm font-heading font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Improved Lesson Plan
            </h3>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{improvedPlan}</div>
            <p className="text-[10px] text-muted-foreground mt-4">AI-generated content. Review before use in class.</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}

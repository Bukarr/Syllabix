import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen, FileText, CheckCircle2, Clock, TrendingUp,
  Plus, ChevronRight, Flame, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getProfile, getAllLessonPlans, type TeacherProfile, type LessonPlan } from '@/lib/db';

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const p = await getProfile();
      if (!p || !p.onboardingComplete) {
        navigate('/onboarding');
        return;
      }
      setProfile(p);
      const lps = await getAllLessonPlans();
      setPlans(lps);
      setLoading(false);
    }
    load();
  }, [navigate]);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentWeek = 3; // Would calculate from term dates
  const totalWeeks = 13;
  const completedPlans = plans.filter(p => p.status === 'complete').length;
  const totalSubjects = profile.subjects.length;
  const weeklyTarget = totalSubjects;
  const weeklyCompleted = plans.filter(p => p.week === currentWeek && p.status === 'complete').length;
  // Calculate streak from actual data
  const calculateStreak = () => {
    if (plans.length === 0) return 0;
    let streak = 0;
    for (let w = currentWeek; w >= 1; w--) {
      const weekPlans = plans.filter(p => p.week === w && p.status === 'complete');
      if (weekPlans.length >= totalSubjects) {
        streak++;
      } else if (w < currentWeek) {
        break;
      } else {
        break;
      }
    }
    return streak;
  };
  const streak = calculateStreak();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">
        {/* Greeting */}
        <motion.div variants={itemVariants}>
          <p className="text-muted-foreground text-sm">Good morning,</p>
          <h2 className="text-2xl font-heading font-bold">{profile.name.split(' ').pop()}</h2>
        </motion.div>

        {/* Term progress card */}
        <motion.div variants={itemVariants} className="glass-card rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Term 1 Progress</span>
            </div>
            <span className="text-xs text-muted-foreground">Week {currentWeek}/{totalWeeks}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(currentWeek / totalWeeks) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedPlans} plans created</span>
            <span>{Math.round((currentWeek / totalWeeks) * 100)}% of term</span>
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl p-4 text-center">
            <Flame className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="text-xl font-heading font-bold">{streak}</p>
            <p className="text-[10px] text-muted-foreground">Week Streak</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-xl font-heading font-bold">{completedPlans}</p>
            <p className="text-[10px] text-muted-foreground">Plans Done</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <BookOpen className="h-5 w-5 text-info mx-auto mb-1" />
            <p className="text-xl font-heading font-bold">{totalSubjects}</p>
            <p className="text-[10px] text-muted-foreground">Subjects</p>
          </div>
        </motion.div>

        {/* Weekly checklist */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-semibold">This Week's Plans</h3>
            <span className="text-xs text-primary font-medium">{weeklyCompleted}/{weeklyTarget}</span>
          </div>
          <div className="space-y-2">
            {profile.subjects.map(subject => {
              const hasPlan = plans.some(p => p.subject === subject && p.week === currentWeek);
              return (
                <button
                  key={subject}
                  onClick={() => !hasPlan && navigate('/lesson-plan')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all touch-target ${
                    hasPlan
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/50'
                  }`}
                >
                  {hasPlan ? (
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <span className={`text-sm font-medium flex-1 text-left ${hasPlan ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {subject}
                  </span>
                  {!hasPlan && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Quick actions */}
        <motion.div variants={itemVariants}>
          <h3 className="text-sm font-heading font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 rounded-xl touch-target"
              onClick={() => navigate('/lesson-plan')}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">New Lesson Plan</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2 rounded-xl touch-target"
              onClick={() => navigate('/scheme')}
            >
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">View Scheme</span>
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

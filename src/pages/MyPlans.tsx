import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Filter, Search, Trash2, Download, Eye,
  CheckCircle2, Clock, ChevronRight, Edit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllLessonPlans, deleteLessonPlan, type LessonPlan } from '@/lib/db';
import { exportLessonPlanToPDF } from '@/lib/export';
import { toast } from 'sonner';

export default function MyPlans() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [filter, setFilter] = useState<'all' | 'draft' | 'complete'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    const lps = await getAllLessonPlans();
    setPlans(lps.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    setLoading(false);
  }

  const filtered = plans.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search && !p.topic.toLowerCase().includes(search.toLowerCase()) &&
        !p.subject.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleDelete = async (id: string) => {
    await deleteLessonPlan(id);
    toast.success('Lesson plan deleted');
    loadPlans();
  };

  const handleExport = async (plan: LessonPlan) => {
    try {
      await exportLessonPlanToPDF(plan);
      toast.success('PDF exported successfully');
    } catch {
      toast.error('Export failed');
    }
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
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">My Lesson Notes</h2>
          <Button size="sm" onClick={() => navigate('/lesson-plan')}>
            + New
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by topic or subject..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 touch-target"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['all', 'draft', 'complete'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {f} ({f === 'all' ? plans.length : plans.filter(p => p.status === f).length})
            </button>
          ))}
        </div>

        {/* Plans list */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No lesson notes found</p>
            <Button className="mt-4" onClick={() => navigate('/lesson-plan')}>
              Create Your First Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(plan => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {plan.status === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">{plan.topic || 'Untitled'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.subject} • {plan.classLevel} • Term {plan.term}, Week {plan.week}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {plan.status === 'draft' ? 'Draft' : 'Complete'} • Updated {new Date(plan.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => navigate(`/lesson-plan?edit=${plan.id}`)}
                  >
                    <Edit2 className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleExport(plan)}
                  >
                    <Download className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

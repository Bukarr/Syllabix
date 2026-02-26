import { motion } from 'framer-motion';
import { BookOpen, Clock } from 'lucide-react';

export default function SchemeOfWork() {
  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <h2 className="text-xl font-heading font-bold">Scheme of Work</h2>
        <p className="text-sm text-muted-foreground">
          Generate and manage your term's Scheme of Work for each subject.
        </p>

        <div className="glass-card rounded-2xl p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-heading font-semibold mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Auto-generate a full term's Scheme of Work by distributing curriculum topics across 13 teaching weeks.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>This feature is being built</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

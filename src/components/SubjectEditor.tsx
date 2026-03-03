import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Check, Plus, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SCHOOL_LEVELS, SUBJECTS } from '@/lib/curriculum';
import { toast } from 'sonner';

interface SubjectEditorProps {
  subjects: string[];
  onUpdate: (subjects: string[]) => void;
}

export function SubjectEditor({ subjects, onUpdate }: SubjectEditorProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');

  const toggleSubject = (subject: string) => {
    const updated = subjects.includes(subject)
      ? subjects.filter(s => s !== subject)
      : [...subjects, subject];
    if (updated.length === 0) {
      toast.error('You must have at least one subject');
      return;
    }
    onUpdate(updated);
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed) return;
    if (trimmed.length > 100) {
      toast.error('Subject name must be under 100 characters');
      return;
    }
    if (subjects.includes(trimmed)) {
      toast.error('Subject already added');
      return;
    }
    onUpdate([...subjects, trimmed]);
    setCustomSubject('');
    toast.success(`Added "${trimmed}"`);
  };

  return (
    <div className="space-y-4">
      {/* Current subjects */}
      <div>
        <Label className="text-xs font-medium mb-2 block">Your Subjects ({subjects.length})</Label>
        <div className="flex flex-wrap gap-2">
          {subjects.map(subject => (
            <span
              key={subject}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
            >
              {subject}
              <button
                onClick={() => toggleSubject(subject)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${subject}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Add from curriculum */}
      <div>
        <Label className="text-xs font-medium mb-2 block">Add from Curriculum</Label>
        <div className="flex gap-2 mb-3">
          {SCHOOL_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => setSelectedLevel(prev => prev === level ? '' : level)}
              className={`flex-1 py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                selectedLevel === level
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/50'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {selectedLevel && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {SUBJECTS[selectedLevel]?.map(subject => {
                const isSelected = subjects.includes(subject);
                return (
                  <button
                    key={subject}
                    onClick={() => toggleSubject(subject)}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {isSelected && <Check className="h-3 w-3 shrink-0" />}
                      <span>{subject}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Custom subject */}
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Add Custom Subject</Label>
        <div className="flex gap-2">
          <Input
            value={customSubject}
            onChange={e => setCustomSubject(e.target.value)}
            placeholder="e.g. Robotics"
            maxLength={100}
            className="text-sm"
            onKeyDown={e => e.key === 'Enter' && addCustomSubject()}
          />
          <Button size="sm" variant="outline" onClick={addCustomSubject} disabled={!customSubject.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

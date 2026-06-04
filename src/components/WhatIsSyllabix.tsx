import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Info, BookOpen, FileText, Sparkles, ClipboardCheck, Calendar,
  Users, BarChart3, FolderHeart, Award, WifiOff, Bot, Languages, ChevronRight,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';

const coreFeatures = [
  {
    icon: FileText,
    title: 'Lesson Plan Generator',
    body: 'Auto-generate professional, curriculum-aligned lesson notes in seconds. Pick a subject, class and topic and Syllabix drafts objectives, content, activities, assessment and teaching aids for you — even by voice.',
  },
  {
    icon: Calendar,
    title: 'Schemes of Work',
    body: 'Build a full 39-week academic-year scheme aligned to the NERDC curriculum, view it by term or full year, and turn any week straight into ready lesson notes.',
  },
  {
    icon: Bot,
    title: 'AI Copy Notes & Chat',
    body: 'A teacher-first AI workspace that produces clean, plain-text copy notes pupils can write down, and answers your teaching questions on demand.',
  },
  {
    icon: ClipboardCheck,
    title: 'Assessment Generator',
    body: 'Create WAEC / NECO / UBE-style tests and exams with matching answer keys — objective, theory and practical questions in the right format.',
  },
  {
    icon: Sparkles,
    title: 'Lesson Reviewer',
    body: 'Get any lesson plan scored out of 10 with clear critiques, then improve it instantly with one tap.',
  },
];

const moreFeatures = [
  { icon: WifiOff, title: 'Works fully offline', body: 'Built offline-first. Create, edit and save everything without data; it syncs automatically the moment you are back online.' },
  { icon: BarChart3, title: 'Class Tracker', body: 'Keep student rosters and scores, and spot at-risk pupils with simple analytics.' },
  { icon: Award, title: 'Teacher Portfolio', body: 'Your activity is aggregated into a professional appraisal you can export to PDF.' },
  { icon: Users, title: 'Collaboration', body: 'Share schemes with your school, fork colleagues’ work, comment, and let admins review and approve.' },
  { icon: FolderHeart, title: 'Resources & Templates', body: 'Curated free teaching resources plus a searchable template library you can fork.' },
  { icon: Languages, title: 'Multilingual', body: 'Use the app in English, Yoruba, Igbo or Hausa.' },
];

export default function WhatIsSyllabix() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="lg"
          className="w-full max-w-sm mt-3 touch-target text-base font-semibold"
        >
          <Info className="mr-2 h-5 w-5 text-primary" />
          What is Syllabix?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            What is Syllabix?
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="px-6 py-5 space-y-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="text-foreground font-medium">Syllabix</span> is an offline-first
              assistant built for Nigerian teachers. It takes the heavy lifting out of lesson
              preparation by auto-generating curriculum-aligned lesson notes, schemes of work,
              copy notes and assessments — so you spend less time on paperwork and more time
              teaching. Everything works without internet and syncs safely once you are back online.
            </p>

            <div>
              <h3 className="text-sm font-heading font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Core features
              </h3>
              <div className="space-y-3">
                {coreFeatures.map((f, i) => (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <f.icon className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.body}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-heading font-semibold mb-3 flex items-center gap-2">
                <FolderHeart className="h-4 w-4 text-primary" /> And much more
              </h3>
              <div className="grid gap-3">
                {moreFeatures.map((f) => (
                  <div key={f.title} className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <f.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{f.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
              <h3 className="text-sm font-heading font-semibold mb-2">How to get going</h3>
              <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>Finish the quick setup — your name, school, location and subjects.</li>
                <li>From your dashboard, tap <span className="text-foreground font-medium">New Lesson Note</span> to generate your first plan.</li>
                <li>Build a full <span className="text-foreground font-medium">Scheme of Work</span> for the term, then turn any week into notes.</li>
                <li>Use <span className="text-foreground font-medium">AI Notes</span> for copy notes and the <span className="text-foreground font-medium">Assessment</span> tool for tests.</li>
                <li>Track classes, build your portfolio, and collaborate with your school.</li>
              </ol>
            </div>

            <Button className="w-full touch-target font-semibold" onClick={() => setOpen(false)}>
              Got it, let’s start
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
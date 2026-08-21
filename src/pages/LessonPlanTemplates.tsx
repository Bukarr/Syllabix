import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Download, Check, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import Seo from '@/components/Seo';

interface PlanTemplate {
  id: string;
  title: string;
  level: string;
  subject: string;
  description: string;
  body: string;
}

const TEMPLATE_SECTIONS = (subject: string, level: string) => `${subject} Lesson Plan Template — ${level}

School: __________________________  Teacher: __________________________
Class: ${level}   Subject: ${subject}   Term: ______   Week: ______
Date: ______________   Duration: ____ minutes   Number on Roll: ______

TOPIC: __________________________________________________________
SUB-TOPIC: ______________________________________________________

LEARNING OBJECTIVES (by the end of the lesson, pupils should be able to):
1. ______________________________________________________________
2. ______________________________________________________________
3. ______________________________________________________________

ENTRY BEHAVIOUR / PREVIOUS KNOWLEDGE:
________________________________________________________________

INSTRUCTIONAL MATERIALS:
________________________________________________________________

REFERENCE MATERIALS:
________________________________________________________________

PRESENTATION (Step-by-step):
Step 1 — Teacher's Activity: ____________________  Pupils' Activity: ____________________
Step 2 — Teacher's Activity: ____________________  Pupils' Activity: ____________________
Step 3 — Teacher's Activity: ____________________  Pupils' Activity: ____________________

EVALUATION (questions to assess objectives):
1. ______________________________________________________________
2. ______________________________________________________________
3. ______________________________________________________________

SUMMARY / CONCLUSION:
________________________________________________________________

ASSIGNMENT / HOMEWORK:
________________________________________________________________
`;

const TEMPLATES: PlanTemplate[] = [
  {
    id: 'primary-science',
    title: 'Primary Science Lesson Plan Template',
    level: 'Primary 1–6',
    subject: 'Basic Science',
    description: 'Ready-to-use format for primary science lessons, aligned to the Nigerian NERDC curriculum.',
    body: TEMPLATE_SECTIONS('Basic Science', 'Primary 1–6'),
  },
  {
    id: 'jss-math',
    title: 'Junior Secondary Math Lesson Plan Template',
    level: 'JSS 1–3',
    subject: 'Mathematics',
    description: 'Structured weekly lesson plan format for junior secondary mathematics teachers.',
    body: TEMPLATE_SECTIONS('Mathematics', 'JSS 1–3'),
  },
  {
    id: 'primary-english',
    title: 'Primary English Lesson Plan Template',
    level: 'Primary 1–6',
    subject: 'English Language',
    description: 'Phonics, reading and grammar lesson plan format for primary English classes.',
    body: TEMPLATE_SECTIONS('English Language', 'Primary 1–6'),
  },
  {
    id: 'sss-biology',
    title: 'Senior Secondary Biology Lesson Plan Template',
    level: 'SS 1–3',
    subject: 'Biology',
    description: 'WAEC/NECO-aligned lesson plan format for senior secondary biology.',
    body: TEMPLATE_SECTIONS('Biology', 'SS 1–3'),
  },
  {
    id: 'weekly-generic',
    title: 'Weekly Lesson Plan Template (Any Subject)',
    level: 'All levels',
    subject: 'General',
    description: 'A flexible weekly lesson plan format that works for any subject and class level.',
    body: TEMPLATE_SECTIONS('__________', 'All levels'),
  },
];

const FAQS = [
  {
    q: 'What is a lesson plan template?',
    a: 'A lesson plan template is a ready-made format that organises a lesson into sections — objectives, materials, presentation steps, evaluation and assignment — so teachers can prepare faster and more consistently.',
  },
  {
    q: 'What should a good lesson plan format include?',
    a: 'A complete lesson plan format includes the topic and sub-topic, learning objectives, entry behaviour, instructional materials, reference materials, step-by-step presentation, evaluation questions, a summary and an assignment.',
  },
  {
    q: 'Can I use these templates in Google Docs or Word?',
    a: 'Yes. Copy any template with one tap or download it as a text file, then paste it into Google Docs, Microsoft Word or any editor to customise it for your class.',
  },
];

export default function LessonPlanTemplates() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = async (t: PlanTemplate) => {
    try {
      await navigator.clipboard.writeText(t.body);
      setCopiedId(t.id);
      toast.success('Template copied — paste it into Google Docs or Word');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Could not copy. Try the download button instead.');
    }
  };

  const downloadTemplate = (t: PlanTemplate) => {
    const blob = new Blob([t.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  return (
    <div className="pb-24 px-4 pt-4">
      <Seo
        title="Lesson Plan Templates — Free, Ready-to-Use Formats"
        description="Free lesson plan templates and formats for Nigerian teachers. Copy or download ready-to-use primary and secondary lesson plan templates for any subject."
        path="/templates/lesson-plans"
      />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
        <header className="space-y-2">
          <h1 className="text-2xl font-heading font-bold">Lesson Plan Templates</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Free, ready-to-use lesson plan templates and formats for Nigerian teachers. Choose a
            template below, then copy it into Google Docs or Word — or download it — and customise it
            for your subject and class level. Prefer auto-generated plans?{' '}
            <Link to="/lesson-plan" className="text-primary underline underline-offset-2">
              Generate a lesson plan with AI
            </Link>
            .
          </p>
        </header>

        <section className="space-y-3" aria-label="Lesson plan templates">
          {TEMPLATES.map((t) => (
            <article key={t.id} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold">{t.title}</h2>
                  <p className="text-xs text-muted-foreground">{t.subject} • {t.level}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 text-xs touch-target" onClick={() => copyTemplate(t)}>
                  {copiedId === t.id ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedId === t.id ? 'Copied' : 'Copy template'}
                </Button>
                <Button variant="outline" size="sm" className="flex-1 text-xs touch-target" onClick={() => downloadTemplate(t)}>
                  <Download className="h-3 w-3 mr-1" /> Download
                </Button>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3" aria-label="Frequently asked questions">
          <h2 className="text-lg font-heading font-bold">Lesson plan template FAQs</h2>
          {FAQS.map((f) => (
            <div key={f.q} className="glass-card rounded-xl p-4">
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: FAQS.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            }),
          }}
        />
      </motion.div>
    </div>
  );
}
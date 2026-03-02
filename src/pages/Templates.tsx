import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Library, Search, BookOpen, Copy, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllLessonPlans, saveLessonPlan, type LessonPlan } from '@/lib/db';
import { toast } from 'sonner';

interface Template {
  id: string;
  title: string;
  subject: string;
  classLevel: string;
  topic: string;
  subTopic: string;
  isBuiltIn: boolean;
  plan: Partial<LessonPlan>;
}

const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'tmpl-math-pri1-counting',
    title: 'Counting 1-20',
    subject: 'Mathematics',
    classLevel: 'Primary 1',
    topic: 'Whole Numbers',
    subTopic: 'Counting 1-20',
    isBuiltIn: true,
    plan: {
      subject: 'Mathematics',
      classLevel: 'Primary 1',
      topic: 'Whole Numbers',
      subTopic: 'Counting 1-20',
      duration: '40 minutes',
      objectives: [
        'Count from 1 to 20 correctly',
        'Identify and write numbers 1-20',
        'Arrange numbers in order',
      ],
      entryBehaviour: 'Students can recite numbers orally with help',
      materials: ['Number chart 1-20', 'Bottle caps', 'Stones for counting', 'Chalkboard'],
      references: 'New Numeracy Book 1, Chapter 1',
      steps: [
        { teacherActivity: 'Displays number chart and points to each number while counting aloud', studentActivity: 'Observe and repeat counting after the teacher' },
        { teacherActivity: 'Distributes bottle caps and asks students to count them in groups', studentActivity: 'Count bottle caps in groups and report their totals' },
        { teacherActivity: 'Writes numbers 1-20 on the board and calls students to identify specific numbers', studentActivity: 'Come forward and point to numbers called by the teacher' },
      ],
      evaluation: '1. Count from 1 to 20\n2. Write numbers 5, 10, 15, 20\n3. Arrange these numbers in order: 8, 3, 15, 1',
      assignment: 'Write numbers 1-20 in your exercise book twice',
    }
  },
  {
    id: 'tmpl-eng-pri1-phonics',
    title: 'Letter Sounds (a-m)',
    subject: 'English Language',
    classLevel: 'Primary 1',
    topic: 'Phonics',
    subTopic: 'Letter sounds a-m',
    isBuiltIn: true,
    plan: {
      subject: 'English Language',
      classLevel: 'Primary 1',
      topic: 'Phonics',
      subTopic: 'Letter sounds a-m',
      duration: '35 minutes',
      objectives: [
        'Identify letters a to m',
        'Produce correct sounds for each letter',
        'Associate letter sounds with familiar objects',
      ],
      entryBehaviour: 'Students can sing the alphabet song',
      materials: ['Letter cards', 'Picture charts', 'Chalkboard'],
      references: 'Primary English Book 1, Unit 1',
      steps: [
        { teacherActivity: 'Shows letter cards one at a time and produces the sound', studentActivity: 'Repeat each letter sound after the teacher' },
        { teacherActivity: 'Points to objects in the classroom starting with each letter', studentActivity: 'Name objects and identify the starting letter' },
        { teacherActivity: 'Writes letters on chalkboard and demonstrates formation', studentActivity: 'Practice writing each letter in their exercise books' },
      ],
      evaluation: '1. Produce the sounds for: a, b, c, d, e\n2. What letter does "mango" start with?\n3. Identify 3 letters from the flashcards',
      assignment: 'Write letters a to m five times each in your exercise book',
    }
  },
  {
    id: 'tmpl-bsc-jss1-living',
    title: 'Classification of Living Things',
    subject: 'Basic Science',
    classLevel: 'JSS 1',
    topic: 'Living Things',
    subTopic: 'Classification of Living Things',
    isBuiltIn: true,
    plan: {
      subject: 'Basic Science',
      classLevel: 'JSS 1',
      topic: 'Living Things',
      subTopic: 'Classification of Living Things',
      duration: '40 minutes',
      objectives: [
        'Define classification of living things',
        'State the five kingdoms of living things',
        'Give two examples of organisms in each kingdom',
      ],
      entryBehaviour: 'Students can differentiate between living and non-living things',
      materials: ['Charts of the five kingdoms', 'Specimens (leaves, insects)', 'Textbook'],
      references: 'Basic Science for JSS 1, Chapter 4, pg. 30-35',
      steps: [
        { teacherActivity: 'Asks students to name living things they know and writes them on the board', studentActivity: 'Mention different living things they are familiar with' },
        { teacherActivity: 'Introduces the concept of classification and the five kingdoms with chart', studentActivity: 'Copy the five kingdoms and listen attentively' },
        { teacherActivity: 'Shows specimens and asks students to classify them into kingdoms', studentActivity: 'Examine specimens and attempt to place them in correct kingdoms' },
        { teacherActivity: 'Summarizes the lesson and corrects misconceptions', studentActivity: 'Ask questions for clarification' },
      ],
      evaluation: '1. What is classification?\n2. List the five kingdoms of living things\n3. Give two examples of organisms in the plant kingdom',
      assignment: 'Draw and label two organisms from each kingdom in your notebook',
    }
  },
  {
    id: 'tmpl-gov-ss2-democracy',
    title: 'Features of Democracy',
    subject: 'Government',
    classLevel: 'SS 2',
    topic: 'Democracy',
    subTopic: 'Features of Democracy',
    isBuiltIn: true,
    plan: {
      subject: 'Government',
      classLevel: 'SS 2',
      topic: 'Democracy',
      subTopic: 'Features of Democracy',
      duration: '40 minutes',
      objectives: [
        'Define democracy',
        'Explain at least five features of democracy',
        'Distinguish between democracy and other forms of government',
      ],
      entryBehaviour: 'Students have learnt about forms of government',
      materials: ['Textbook', 'Chalkboard', 'Newspaper cuttings on elections'],
      references: 'Essential Government, Chapter 8, pg. 95-100',
      steps: [
        { teacherActivity: 'Asks students what they understand by democracy and writes responses', studentActivity: 'Share their understanding of democracy' },
        { teacherActivity: 'Explains the definition and features of democracy systematically', studentActivity: 'Listen, take notes, and ask questions' },
        { teacherActivity: 'Uses Nigerian examples to illustrate each feature', studentActivity: 'Relate features to real-life Nigerian experiences' },
        { teacherActivity: 'Engages class in comparison between democracy and military rule', studentActivity: 'Discuss and contribute to the comparison' },
      ],
      evaluation: '1. Define democracy\n2. List five features of democracy\n3. Differentiate between democracy and autocracy\n4. (WAEC style) In what ways does the 1999 constitution promote democratic governance?',
      assignment: 'Read Chapter 8 and answer questions 1-5 on page 100',
    }
  },
];

export default function Templates() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [tab, setTab] = useState<'builtin' | 'mine'>('builtin');

  useEffect(() => {
    loadUserTemplates();
  }, []);

  async function loadUserTemplates() {
    const plans = await getAllLessonPlans();
    const templates: Template[] = plans
      .filter(p => p.status === 'complete')
      .map(p => ({
        id: `user-${p.id}`,
        title: p.topic,
        subject: p.subject,
        classLevel: p.classLevel,
        topic: p.topic,
        subTopic: p.subTopic,
        isBuiltIn: false,
        plan: p,
      }));
    setUserTemplates(templates);
  }

  const allTemplates = tab === 'builtin' ? BUILT_IN_TEMPLATES : userTemplates;
  const filtered = allTemplates.filter(t =>
    !search ||
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.topic.toLowerCase().includes(search.toLowerCase())
  );

  const useTemplate = async (template: Template) => {
    const plan: LessonPlan = {
      id: crypto.randomUUID(),
      subject: template.plan.subject || '',
      classLevel: template.plan.classLevel || '',
      term: template.plan.term || 1,
      week: template.plan.week || 1,
      date: new Date().toISOString().split('T')[0],
      duration: template.plan.duration || '40 minutes',
      topic: template.plan.topic || '',
      subTopic: template.plan.subTopic || '',
      objectives: template.plan.objectives || [],
      entryBehaviour: template.plan.entryBehaviour || '',
      materials: template.plan.materials || [],
      references: template.plan.references || '',
      steps: template.plan.steps || [],
      evaluation: template.plan.evaluation || '',
      assignment: template.plan.assignment || '',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveLessonPlan(plan);
    toast.success('Template copied as new lesson plan');
    navigate('/my-plans');
  };

  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <h2 className="text-xl font-heading font-bold">Template Library</h2>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setTab('builtin')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === 'builtin' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            Built-in ({BUILT_IN_TEMPLATES.length})
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === 'mine' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            My Templates ({userTemplates.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 touch-target"
          />
        </div>

        {/* Templates list */}
        {filtered.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Library className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === 'mine' ? 'Complete a lesson plan to see it here as a reusable template' : 'No templates match your search'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(template => (
              <div key={template.id} className="glass-card rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg overflow-hidden shrink-0">
                    <img src="/icon-512.png" alt="NaijaLesson" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{template.title}</p>
                    <p className="text-xs text-muted-foreground">{template.subject} • {template.classLevel}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{template.subTopic}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-3 text-xs"
                  onClick={() => useTemplate(template)}
                >
                  <Copy className="h-3 w-3 mr-1" /> Use This Template
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

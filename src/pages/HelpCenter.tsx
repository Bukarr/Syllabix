import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, LifeBuoy, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQ {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  items: FAQ[];
}

const SECTIONS: FAQSection[] = [
  {
    title: 'Installing the App (PWA)',
    items: [
      {
        q: 'How do I install Syllabix on my phone for offline use?',
        a: 'On Android Chrome, open the app, tap the menu (⋮) and choose "Install app" or "Add to Home screen". On iPhone Safari, tap the Share icon, then "Add to Home Screen". Once installed, the app opens like a native app and works offline.',
      },
      {
        q: 'It says "Installing" then changes to "Add to Home" — why won\'t it install fully?',
        a: 'This usually happens when the page hasn\'t finished loading the offline files, or you\'re on a slow connection. Make sure you are online the first time, give it a few seconds to finish caching, then try installing again. Using Chrome (Android) or Safari (iPhone) gives the most reliable install.',
      },
      {
        q: 'Does the app work without internet?',
        a: 'Yes. Once installed, your lesson plans, notes and schemes are saved on your device and remain available offline. Anything you create offline syncs automatically when you reconnect.',
      },
    ],
  },
  {
    title: 'Login & Accounts',
    items: [
      {
        q: 'Do I need an account to use Syllabix?',
        a: 'No. You can use most features — lesson plans, notes and schemes — without signing in. An account is only needed for school collaboration (workspaces) and cloud backup.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the sign-in screen, tap "Forgot password?", enter your email and we\'ll send you a reset link. Open the link and choose a new password (at least 8 characters).',
      },
      {
        q: 'I didn\'t receive the password reset email.',
        a: 'Check your spam or promotions folder, and confirm you entered the same email you signed up with. Reset links expire after a while — request a new one if it has been a while.',
      },
    ],
  },
  {
    title: 'Generating Lessons',
    items: [
      {
        q: 'The "Generate Lesson Plan with AI" button is greyed out. Why?',
        a: 'The button only enables once you\'ve entered the subject, class level, topic, and at least one objective. The message under the button tells you exactly what is still missing. AI generation also requires an internet connection.',
      },
      {
        q: 'Can I generate a lesson plan offline?',
        a: 'AI generation needs internet because it runs in the cloud. You can still write and save lesson plans manually while offline; they\'ll be there when you return.',
      },
      {
        q: 'Can I edit what the AI generates?',
        a: 'Yes. The AI produces a structured draft and asks you to review it before applying. You can edit any field afterwards — always review generated content before using it in class.',
      },
    ],
  },
];

const WHATSAPP_GREETING = "Hello Syllabix Support, I need help with the app.";
const whatsappLink = `https://wa.me/2348027957871?text=${encodeURIComponent(WHATSAPP_GREETING)}`;

export default function HelpCenter() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <LifeBuoy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Help Center</h1>
            <p className="text-sm text-muted-foreground">Answers to common questions.</p>
          </div>
        </header>

        {SECTIONS.map(section => (
          <div key={section.title} className="glass-card rounded-2xl p-5">
            <h2 className="font-heading font-semibold mb-2">{section.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {section.items.map((item, i) => (
                <AccordionItem key={i} value={`${section.title}-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h2 className="font-heading font-semibold">Still need help?</h2>
          <p className="text-sm text-muted-foreground">Reach our team directly and we'll get back to you.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/contact')} className="w-full touch-target">
              Contact Us
            </Button>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 transition-all touch-target text-sm font-medium"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" /> Chat on WhatsApp
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
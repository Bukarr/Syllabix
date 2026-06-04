import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MessageCircle, Send, Loader2, CloudOff, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { queueSupportMessage, supportMessageSchema } from '@/lib/support';
import { getProfile } from '@/lib/db';
import { type ValidationErrors } from '@/lib/validation';
import Seo from '@/components/Seo';

const SUPPORT_EMAIL = 'syllabixng@gmail.com';
const WHATSAPP_NUMBER = '2348027957871'; // international format, no +, no spaces
const WHATSAPP_GREETING = "Hello Syllabix Support, I need help with the app.";
const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_GREETING)}`;

export default function Contact() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [sending, setSending] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    getProfile().then(p => { if (p?.name) setName(p.name); });
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const handleSubmit = async () => {
    const result = supportMessageSchema.safeParse({ name, email, message });
    if (!result.success) {
      const errs: ValidationErrors = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      toast.error(result.error.errors[0]?.message || 'Please fix the form');
      return;
    }
    setErrors({});
    setSending(true);
    try {
      await queueSupportMessage({ name, email, message });
      if (isOnline) {
        toast.success('Message sent to support!');
      } else {
        toast.success('Saved offline — it will send automatically when you reconnect.');
      }
      setMessage('');
    } catch {
      toast.error('Could not save your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32">
      <Seo
        title="Contact Us — Syllabix Support"
        description="Get help with Syllabix. Send us a message or chat on WhatsApp — we respond fast, even when you're offline."
        path="/contact"
      />
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-heading font-bold">Contact Us</h1>
          <p className="text-sm text-muted-foreground">Send us a message — we're here to help.</p>
        </header>

        {!isOnline && (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <CloudOff className="h-4 w-4 shrink-0" />
            You're offline. Your message will be saved and sent automatically once you're back online.
          </div>
        )}

        {/* Message form */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div>
            <Label className="text-sm font-medium">Name</Label>
            <Input
              value={name}
              maxLength={200}
              onChange={e => setName(e.target.value)}
              className="mt-1 touch-target"
              placeholder="Your name"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium">Email</Label>
            <Input
              type="email"
              value={email}
              maxLength={320}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 touch-target"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium">Message</Label>
            <Textarea
              value={message}
              maxLength={5000}
              onChange={e => setMessage(e.target.value)}
              className="mt-1 min-h-[120px]"
              placeholder="How can we help you?"
            />
            {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
          </div>
          <Button className="w-full touch-target" onClick={handleSubmit} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Send Message
          </Button>
        </div>

        {/* Direct channels */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm">Other ways to reach us</h3>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all touch-target"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground truncate">{SUPPORT_EMAIL}</p>
            </div>
          </a>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all touch-target"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <MessageCircle className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Chat on WhatsApp</p>
              <p className="text-xs text-muted-foreground truncate">+234 802 795 7871</p>
            </div>
          </a>
          <button
            onClick={() => navigate('/help')}
            className="flex items-center gap-3 w-full p-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all touch-target"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium">Help Center</p>
              <p className="text-xs text-muted-foreground truncate">Browse answers to common questions</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
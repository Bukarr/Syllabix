import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Send, Copy, Check, RefreshCw, Loader2, BookOpen, ChevronRight, Download, Save, Trash2, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import { getProfile, getAllSOW, getAllAINotes, saveAINote, deleteAINote, type SchemeOfWork, type TeacherProfile, type AINote } from '@/lib/db';
import { exportAINoteToPDF, exportAINotesBulkToPDF } from '@/lib/export';
import { CLASSES, SCHOOL_LEVELS, SUBJECTS, TERMS } from '@/lib/curriculum';
import { toast } from 'sonner';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copy-note-chat`;

async function streamChat({
  messages, classLevel, subject, onDelta, onDone, onError,
}: {
  messages: ChatMessage[]; classLevel: string; subject: string;
  onDelta: (text: string) => void; onDone: () => void; onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ messages, classLevel, subject }),
  });

  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({ error: 'Request failed' }));
    onError(errData.error || `Error ${resp.status}`);
    return;
  }
  if (!resp.body) { onError('No response body'); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = '';
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });
    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === '[DONE]') { streamDone = true; break; }
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + '\n' + textBuffer;
        break;
      }
    }
  }

  if (textBuffer.trim()) {
    for (let raw of textBuffer.split('\n')) {
      if (!raw) continue;
      if (raw.endsWith('\r')) raw = raw.slice(0, -1);
      if (raw.startsWith(':') || raw.trim() === '') continue;
      if (!raw.startsWith('data: ')) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }
  onDone();
}

export default function CopyNoteGenerator() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [sows, setSows] = useState<SchemeOfWork[]>([]);
  const [aiNotes, setAiNotes] = useState<AINote[]>([]);
  const [loading, setLoading] = useState(true);

  const [classLevel, setClassLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [setupDone, setSetupDone] = useState(false);
  const [activeTab, setActiveTab] = useState('generator');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [topicDrawerOpen, setTopicDrawerOpen] = useState(false);

  // Saved notes filters
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const chatEndRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    const [p, s, notes] = await Promise.all([getProfile(), getAllSOW(), getAllAINotes()]);
    if (p) setProfile(p);
    setSows(s);
    setAiNotes(notes);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const getSchoolLevel = (cls: string) => {
    if (cls.startsWith('Primary')) return 'Primary';
    if (cls.startsWith('JSS')) return 'Junior Secondary';
    return 'Senior Secondary';
  };

  const availableSubjects = classLevel ? SUBJECTS[getSchoolLevel(classLevel)] || [] : [];
  const filteredSOWs = sows.filter(s => s.subject === subject && (!classLevel || s.classLevel === classLevel || !s.classLevel));
  const allClasses = SCHOOL_LEVELS.flatMap(level => CLASSES[level] || []);

  // Unique values for saved notes filters
  const uniqueSubjects = [...new Set(aiNotes.map(n => n.subject))];
  const uniqueClasses = [...new Set(aiNotes.map(n => n.classLevel))];
  const uniqueTerms = [...new Set(aiNotes.map(n => n.term))];
  const uniqueYears = [...new Set(aiNotes.map(n => n.year))];

  const filteredNotes = aiNotes.filter(n => {
    if (filterSubject !== 'all' && n.subject !== filterSubject) return false;
    if (filterClass !== 'all' && n.classLevel !== filterClass) return false;
    if (filterTerm !== 'all' && n.term !== Number(filterTerm)) return false;
    if (filterYear !== 'all' && n.year !== filterYear) return false;
    if (filterStatus !== 'all' && n.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group notes by subject > class > term
  const groupedNotes: Record<string, AINote[]> = {};
  filteredNotes.forEach(n => {
    const key = `${n.subject} · ${n.classLevel} · Term ${n.term} · ${n.year}`;
    if (!groupedNotes[key]) groupedNotes[key] = [];
    groupedNotes[key].push(n);
  });

  const handleSetup = () => {
    if (!classLevel || !subject) { toast.error('Please select both class level and subject'); return; }
    setSetupDone(true);
    setMessages([]);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    let assistantContent = '';
    const updateAssistant = (chunk: string) => {
      assistantContent += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
        }
        return [...prev, { role: 'assistant', content: assistantContent }];
      });
    };

    try {
      await streamChat({
        messages: newMessages, classLevel, subject,
        onDelta: updateAssistant,
        onDone: async () => {
          setIsStreaming(false);
          // Auto-save as draft
          if (assistantContent.trim()) {
            const topicMatch = text.match(/topic:\s*"([^"]+)"/i);
            const topic = topicMatch ? topicMatch[1] : currentTopic || text.slice(0, 80);
            const currentYear = new Date().getFullYear().toString();
            const currentSOW = filteredSOWs[0];
            const note: AINote = {
              id: crypto.randomUUID(),
              subject,
              classLevel,
              term: currentSOW?.term || 1,
              year: currentSOW?.year || `${currentYear}/${Number(currentYear) + 1}`,
              topic,
              content: assistantContent,
              status: 'draft',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await saveAINote(note);
            const notes = await getAllAINotes();
            setAiNotes(notes);
            toast.success('Note saved as draft');
          }
        },
        onError: (err) => { toast.error(err); setIsStreaming(false); },
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate note');
      setIsStreaming(false);
    }
  }, [messages, isStreaming, classLevel, subject, currentTopic, filteredSOWs]);

  const handleTopicClick = (topic: string, subTopic?: string) => {
    const prompt = `Generate a student copy note for the topic: "${topic}"${subTopic ? ` — Sub-topic: "${subTopic}"` : ''}`;
    setCurrentTopic(topic);
    setTopicDrawerOpen(false);
    sendMessage(prompt);
  };

  const handleCopyNote = (index: number) => {
    const msg = messages[index];
    if (!msg) return;
    navigator.clipboard.writeText(msg.content);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleSaveNote = async (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;
    // Find matching draft and mark as saved
    const matchingNote = aiNotes.find(n => n.content === msg.content && n.status === 'draft');
    if (matchingNote) {
      await saveAINote({ ...matchingNote, status: 'saved', updatedAt: new Date().toISOString() });
      const notes = await getAllAINotes();
      setAiNotes(notes);
      toast.success('Note saved!');
    } else {
      toast.info('Note already saved or not found as draft');
    }
  };

  const handleDownloadNote = async (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;
    const matchingNote = aiNotes.find(n => n.content === msg.content);
    if (matchingNote) {
      await exportAINoteToPDF(matchingNote);
      toast.success('PDF downloaded!');
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteAINote(id);
    const notes = await getAllAINotes();
    setAiNotes(notes);
    toast.success('Note deleted');
  };

  const handleDownloadSavedNote = async (note: AINote) => {
    await exportAINoteToPDF(note);
    toast.success('PDF downloaded!');
  };

  const handleBulkDownload = async () => {
    if (filteredNotes.length === 0) { toast.error('No notes to download'); return; }
    await exportAINotesBulkToPDF(filteredNotes);
    toast.success(`Downloaded ${filteredNotes.length} notes as PDF`);
  };

  const handleRegenerate = () => {
    if (messages.length < 2) return;
    const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIdx === -1) return;
    const lastUserMsg = messages[messages.length - 1 - lastUserIdx];
    const trimmed = messages.slice(0, messages.length - 1 - lastUserIdx);
    setMessages(trimmed);
    setTimeout(() => sendMessage(lastUserMsg.content), 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Setup screen
  if (!setupDone) {
    return (
      <div className="pb-24 px-4 pt-4">
        <div className="mb-6">
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            <PenLine className="h-5 w-5 text-primary" />
            AI Notes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Generate student copy notes or manage saved notes</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="generator">Generator</TabsTrigger>
            <TabsTrigger value="saved">Saved Notes ({aiNotes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="mt-4">
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium mb-2 block">Class Level</Label>
                <div className="grid grid-cols-2 gap-2">
                  {allClasses.map(cls => (
                    <button key={cls} onClick={() => { setClassLevel(cls); setSubject(''); }}
                      className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all text-left ${classLevel === cls ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'}`}>
                      {cls}
                    </button>
                  ))}
                </div>
              </div>
              {classLevel && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Label className="text-sm font-medium mb-2 block">Subject</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {availableSubjects.map(sub => (
                      <button key={sub} onClick={() => setSubject(sub)}
                        className={`py-3 px-3 rounded-lg border text-sm font-medium transition-all text-left ${subject === sub ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-muted-foreground'}`}>
                        {sub}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
              {classLevel && subject && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button onClick={handleSetup} className="w-full touch-target font-semibold" size="lg">
                    <PenLine className="h-4 w-4 mr-2" />Start Generating Notes
                  </Button>
                </motion.div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="saved" className="mt-4">
            <SavedNotesView
              aiNotes={aiNotes}
              groupedNotes={groupedNotes}
              filteredNotes={filteredNotes}
              uniqueSubjects={uniqueSubjects}
              uniqueClasses={uniqueClasses}
              uniqueTerms={uniqueTerms}
              uniqueYears={uniqueYears}
              filterSubject={filterSubject} setFilterSubject={setFilterSubject}
              filterClass={filterClass} setFilterClass={setFilterClass}
              filterTerm={filterTerm} setFilterTerm={setFilterTerm}
              filterYear={filterYear} setFilterYear={setFilterYear}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              onDelete={handleDeleteNote}
              onDownload={handleDownloadSavedNote}
              onBulkDownload={handleBulkDownload}
              onSaveStatus={async (note, status) => {
                await saveAINote({ ...note, status, updatedAt: new Date().toISOString() });
                const notes = await getAllAINotes();
                setAiNotes(notes);
                toast.success(status === 'saved' ? 'Note saved!' : 'Moved to drafts');
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => { setSetupDone(false); setMessages([]); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <div className="flex gap-1.5 overflow-hidden">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium truncate">{classLevel}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground font-medium truncate">{subject}</span>
          </div>
        </div>
        <Sheet open={topicDrawerOpen} onOpenChange={setTopicDrawerOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0"><BookOpen className="h-4 w-4 mr-1" />Topics</Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[400px] p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-left font-heading">Quick Topics</SheetTitle>
              <p className="text-xs text-muted-foreground text-left">Tap any topic to generate a copy note instantly</p>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4 space-y-3">
                {filteredSOWs.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No schemes found for {subject} ({classLevel}).</p>
                    <p className="text-xs text-muted-foreground mt-1">Create a Scheme of Work first to use quick topics.</p>
                  </div>
                ) : (
                  filteredSOWs.map(sow => (
                    <div key={sow.id} className="space-y-1.5">
                      <p className="text-xs text-muted-foreground font-medium px-1">Term {sow.term} · {sow.year}</p>
                      {sow.weeks.map(week => {
                        if (!week.topic) return null;
                        return (
                          <button key={week.week} onClick={() => handleTopicClick(week.topic, week.subTopic)} disabled={isStreaming}
                            className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group disabled:opacity-50">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-primary">W{week.week}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{week.topic}</p>
                              {week.subTopic && <p className="text-xs text-muted-foreground truncate">{week.subTopic}</p>}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <PenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-foreground mb-1">Ready to generate</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Type a topic below or tap <strong>Topics</strong> to pick from your scheme of work</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/60 text-foreground rounded-bl-md border border-border'}`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.role === 'assistant' && !isStreaming && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border/50">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCopyNote(i)}>
                      {copied === i ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copied === i ? 'Copied' : 'Copy'}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleSaveNote(i)}>
                      <Save className="h-3 w-3 mr-1" />Save
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleDownloadNote(i)}>
                      <Download className="h-3 w-3 mr-1" />PDF
                    </Button>
                    {i === messages.length - 1 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleRegenerate}>
                        <RefreshCw className="h-3 w-3 mr-1" />Regenerate
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex justify-start">
              <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t border-border bg-card/95 backdrop-blur-md safe-bottom">
        <div className="flex gap-2 items-end">
          <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Type a topic or follow-up instruction..."
            className="min-h-[44px] max-h-[120px] resize-none touch-target flex-1" rows={1} disabled={isStreaming} />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming} className="touch-target shrink-0 h-11 w-11 p-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Saved Notes sub-component
function SavedNotesView({
  aiNotes, groupedNotes, filteredNotes, uniqueSubjects, uniqueClasses, uniqueTerms, uniqueYears,
  filterSubject, setFilterSubject, filterClass, setFilterClass,
  filterTerm, setFilterTerm, filterYear, setFilterYear,
  filterStatus, setFilterStatus,
  onDelete, onDownload, onBulkDownload, onSaveStatus,
}: {
  aiNotes: AINote[];
  groupedNotes: Record<string, AINote[]>;
  filteredNotes: AINote[];
  uniqueSubjects: string[]; uniqueClasses: string[]; uniqueTerms: number[]; uniqueYears: string[];
  filterSubject: string; setFilterSubject: (v: string) => void;
  filterClass: string; setFilterClass: (v: string) => void;
  filterTerm: string; setFilterTerm: (v: string) => void;
  filterYear: string; setFilterYear: (v: string) => void;
  filterStatus: string; setFilterStatus: (v: string) => void;
  onDelete: (id: string) => void;
  onDownload: (note: AINote) => void;
  onBulkDownload: () => void;
  onSaveStatus: (note: AINote, status: 'draft' | 'saved') => void;
}) {
  if (aiNotes.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-heading font-bold text-foreground mb-1">No saved notes yet</h3>
        <p className="text-sm text-muted-foreground">Generated notes will appear here automatically as drafts</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <Select value={filterSubject} onValueChange={setFilterSubject}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {uniqueSubjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {uniqueClasses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTerm} onValueChange={setFilterTerm}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Term" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {uniqueTerms.map(t => <SelectItem key={t} value={String(t)}>Term {t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 text-xs w-32"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
            <SelectItem value="saved">Saved</SelectItem>
          </SelectContent>
        </Select>
        {filteredNotes.length > 0 && (
          <Button variant="outline" size="sm" className="text-xs" onClick={onBulkDownload}>
            <Download className="h-3 w-3 mr-1" />Download All ({filteredNotes.length})
          </Button>
        )}
      </div>

      {/* Grouped notes */}
      <div className="space-y-4">
        {Object.entries(groupedNotes).map(([group, notes]) => (
          <div key={group}>
            <h3 className="text-xs font-semibold text-muted-foreground mb-2 px-1">{group}</h3>
            <div className="space-y-2">
              {notes.map(note => (
                <div key={note.id} className="p-3 rounded-lg border border-border bg-card/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{note.topic}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${note.status === 'saved' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary-foreground'}`}>
                          {note.status === 'saved' ? 'Saved' : 'Draft'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{note.content.slice(0, 150)}...</p>
                  <div className="flex gap-1.5 pt-1">
                    {note.status === 'draft' ? (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSaveStatus(note, 'saved')}>
                        <Save className="h-3 w-3 mr-1" />Save
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onSaveStatus(note, 'draft')}>
                        Move to Draft
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onDownload(note)}>
                      <Download className="h-3 w-3 mr-1" />PDF
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                          <Trash2 className="h-3 w-3 mr-1" />Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDelete(note.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

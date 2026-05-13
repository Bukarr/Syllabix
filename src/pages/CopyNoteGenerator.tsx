import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PenLine, Send, Copy, Check, RefreshCw, Loader2, BookOpen, ChevronRight, Download, Save, Trash2, Filter, FileText, Edit3, History, ChevronDown, ChevronUp, Eye, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getProfile, getAllSOW, getAllAINotes, saveAINote, deleteAINote, type SchemeOfWork, type TeacherProfile, type AINote, type ChatMessage } from '@/lib/db';
import { exportAINoteToPDF, exportAINotesBulkToPDF } from '@/lib/export';
import { parseNoteToSections, sectionsToPlainText, stripMarkdown } from '@/lib/note-formatter';
import { CLASSES, SCHOOL_LEVELS, SUBJECTS, TERMS } from '@/lib/curriculum';
import { toast } from 'sonner';
import { trackActivity } from '@/lib/ai-personalization';
import { supabase } from '@/integrations/supabase/client';

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/copy-note-chat`;

async function streamChat({
  messages, classLevel, subject, onDelta, onDone, onError,
}: {
  messages: ChatMessage[]; classLevel: string; subject: string;
  onDelta: (text: string) => void; onDone: () => void; onError: (err: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { onError('Please sign in to use AI'); return; }
  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
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

/** Renders parsed note sections as clean structured HTML */
function CleanNoteDisplay({ content }: { content: string }) {
  const sections = parseNoteToSections(content);
  if (sections.length === 0) return <p className="text-sm text-muted-foreground">No content</p>;

  return (
    <div className="space-y-3">
      {sections.map((s, i) => {
        switch (s.type) {
          case 'heading':
            return <h2 key={i} className="text-base font-bold text-foreground uppercase tracking-wide">{s.content}</h2>;
          case 'subheading':
            return <h3 key={i} className="text-sm font-bold text-foreground mt-2">{s.content}</h3>;
          case 'numbered-list':
            return (
              <ol key={i} className="list-decimal list-inside space-y-1 text-sm text-foreground pl-1">
                {s.items?.map((item, j) => <li key={j}>{item}</li>)}
              </ol>
            );
          case 'paragraph':
          case 'text':
          default:
            return <p key={i} className="text-sm text-foreground leading-relaxed">{s.content}</p>;
        }
      })}
    </div>
  );
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

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTopic, setCurrentTopic] = useState('');
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [topicDrawerOpen, setTopicDrawerOpen] = useState(false);

  // Editor state
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Version history dialog
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versionNoteId, setVersionNoteId] = useState<string | null>(null);

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
    setCurrentNoteId(null);
    setIsEditing(false);
    setEditingContent('');
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
          if (assistantContent.trim()) {
            const topicMatch = text.match(/topic:\s*"([^"]+)"/i);
            const topic = topicMatch ? topicMatch[1] : currentTopic || text.slice(0, 80);
            const currentYear = new Date().getFullYear().toString();
            const currentSOW = filteredSOWs[0];
            const now = new Date().toISOString();
            const finalMessages: ChatMessage[] = [...newMessages, { role: 'assistant', content: assistantContent }];

            if (currentNoteId) {
              // Update existing note with new conversation + version
              const existing = aiNotes.find(n => n.id === currentNoteId);
              if (existing) {
                const updatedNote: AINote = {
                  ...existing,
                  content: assistantContent,
                  conversations: finalMessages,
                  versions: [...(existing.versions || []), { content: assistantContent, timestamp: now }],
                  updatedAt: now,
                };
                await saveAINote(updatedNote);
                const notes = await getAllAINotes();
                setAiNotes(notes);
              }
            } else {
              // Create new draft
              const noteId = crypto.randomUUID();
              const note: AINote = {
                id: noteId,
                subject,
                classLevel,
                term: currentSOW?.term || 1,
                year: currentSOW?.year || `${currentYear}/${Number(currentYear) + 1}`,
                topic,
                content: assistantContent,
                conversations: finalMessages,
                versions: [{ content: assistantContent, timestamp: now }],
                status: 'draft',
                createdAt: now,
                updatedAt: now,
              };
              await saveAINote(note);
              trackActivity({ feature: 'ai-notes', subject, classLevel });
              setCurrentNoteId(noteId);
              const notes = await getAllAINotes();
              setAiNotes(notes);
              toast.success('Note saved as draft');
            }
          }
        },
        onError: (err) => { toast.error(err); setIsStreaming(false); },
      });
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate note');
      setIsStreaming(false);
    }
  }, [messages, isStreaming, classLevel, subject, currentTopic, filteredSOWs, currentNoteId, aiNotes]);

  const handleTopicClick = (topic: string, subTopic?: string) => {
    const prompt = `Generate a student copy note for the topic: "${topic}"${subTopic ? ` — Sub-topic: "${subTopic}"` : ''}`;
    setCurrentTopic(topic);
    setCurrentNoteId(null);
    setTopicDrawerOpen(false);
    sendMessage(prompt);
  };

  const handleCopyNote = (index: number) => {
    const msg = messages[index];
    if (!msg) return;
    const cleanText = sectionsToPlainText(parseNoteToSections(msg.content));
    navigator.clipboard.writeText(cleanText);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const handleSaveNote = async (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;
    const matchingNote = aiNotes.find(n => n.id === currentNoteId || (n.content === msg.content && n.status === 'draft'));
    if (matchingNote) {
      await saveAINote({ ...matchingNote, status: 'saved', updatedAt: new Date().toISOString() });
      const notes = await getAllAINotes();
      setAiNotes(notes);
      toast.success('Note saved!');
    } else {
      toast.info('Note not found');
    }
  };

  const handleDownloadNote = async (index: number) => {
    const msg = messages[index];
    if (!msg || msg.role !== 'assistant') return;
    const matchingNote = aiNotes.find(n => n.id === currentNoteId || n.content === msg.content);
    if (matchingNote) {
      await exportAINoteToPDF(matchingNote);
      toast.success('PDF downloaded!');
    }
  };

  const handleShareNote = async (content: string, topic?: string) => {
    const cleanText = sectionsToPlainText(parseNoteToSections(content));
    const shareData = {
      title: topic ? `Copy Note: ${topic}` : 'Student Copy Note',
      text: cleanText,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        toast.success('Note shared!');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          await navigator.clipboard.writeText(cleanText);
          toast.success('Copied to clipboard for sharing!');
        }
      }
    } else {
      await navigator.clipboard.writeText(cleanText);
      toast.success('Copied to clipboard for sharing!');
    }
  };

  const handleDeleteNote = async (id: string) => {
    await deleteAINote(id);
    const notes = await getAllAINotes();
    setAiNotes(notes);
    toast.success('Note deleted');
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

  const handleOpenNote = (note: AINote) => {
    setClassLevel(note.classLevel);
    setSubject(note.subject);
    setCurrentNoteId(note.id);
    setCurrentTopic(note.topic);
    setMessages(note.conversations?.length ? note.conversations : [
      { role: 'user', content: `Generate a student copy note for the topic: "${note.topic}"` },
      { role: 'assistant', content: note.editedContent || note.content },
    ]);
    setIsEditing(false);
    setEditingContent('');
    setSetupDone(true);
    setActiveTab('generator');
  };

  const handleStartEditing = (content: string) => {
    setEditingContent(stripMarkdown(content));
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!currentNoteId) return;
    const note = aiNotes.find(n => n.id === currentNoteId);
    if (!note) return;
    const now = new Date().toISOString();
    const updated: AINote = {
      ...note,
      editedContent: editingContent,
      versions: [...(note.versions || []), { content: editingContent, timestamp: now }],
      updatedAt: now,
    };
    await saveAINote(updated);
    const notes = await getAllAINotes();
    setAiNotes(notes);
    setIsEditing(false);
    toast.success('Edits saved!');
  };

  const handleRevertVersion = async (noteId: string, versionContent: string) => {
    const note = aiNotes.find(n => n.id === noteId);
    if (!note) return;
    const now = new Date().toISOString();
    const updated: AINote = {
      ...note,
      editedContent: versionContent,
      content: versionContent,
      versions: [...(note.versions || []), { content: versionContent, timestamp: now }],
      updatedAt: now,
    };
    await saveAINote(updated);
    const notes = await getAllAINotes();
    setAiNotes(notes);
    if (currentNoteId === noteId) {
      // Update chat view
      setMessages(prev => {
        const newMsgs = [...prev];
        let lastAssistant = -1;
        for (let i = newMsgs.length - 1; i >= 0; i--) {
          if (newMsgs[i].role === 'assistant') { lastAssistant = i; break; }
        }
        if (lastAssistant >= 0) newMsgs[lastAssistant] = { ...newMsgs[lastAssistant], content: versionContent };
        return newMsgs;
      });
    }
    setVersionDialogOpen(false);
    toast.success('Reverted to selected version');
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
      <div className="pb-32 px-4 pt-4">
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
              aiNotes={aiNotes} groupedNotes={groupedNotes} filteredNotes={filteredNotes}
              uniqueSubjects={uniqueSubjects} uniqueClasses={uniqueClasses}
              uniqueTerms={uniqueTerms} uniqueYears={uniqueYears}
              filterSubject={filterSubject} setFilterSubject={setFilterSubject}
              filterClass={filterClass} setFilterClass={setFilterClass}
              filterTerm={filterTerm} setFilterTerm={setFilterTerm}
              filterYear={filterYear} setFilterYear={setFilterYear}
              filterStatus={filterStatus} setFilterStatus={setFilterStatus}
              onDelete={handleDeleteNote}
              onDownload={async (note) => { await exportAINoteToPDF(note); toast.success('PDF downloaded!'); }}
              onBulkDownload={async () => {
                if (filteredNotes.length === 0) { toast.error('No notes to download'); return; }
                await exportAINotesBulkToPDF(filteredNotes);
                toast.success(`Downloaded ${filteredNotes.length} notes as PDF`);
              }}
              onSaveStatus={async (note, status) => {
                await saveAINote({ ...note, status, updatedAt: new Date().toISOString() });
                const notes = await getAllAINotes();
                setAiNotes(notes);
                toast.success(status === 'saved' ? 'Note saved!' : 'Moved to drafts');
              }}
              onOpen={handleOpenNote}
              onShare={(note) => handleShareNote(note.editedContent || note.content, note.topic)}
              onViewVersions={(noteId) => { setVersionNoteId(noteId); setVersionDialogOpen(true); }}
            />
          </TabsContent>
        </Tabs>

        {/* Version History Dialog */}
        <VersionHistoryDialog
          open={versionDialogOpen}
          onOpenChange={setVersionDialogOpen}
          note={aiNotes.find(n => n.id === versionNoteId) || null}
          onRevert={handleRevertVersion}
        />
      </div>
    );
  }

  // Chat interface with editor
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => { setSetupDone(false); setMessages([]); setCurrentNoteId(null); setIsEditing(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</button>
          <div className="flex gap-1.5 overflow-hidden">
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-medium truncate">{classLevel}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground font-medium truncate">{subject}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {currentNoteId && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setVersionNoteId(currentNoteId); setVersionDialogOpen(true); }}>
              <History className="h-3.5 w-3.5 mr-1" />Versions
            </Button>
          )}
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
      </div>

      {/* Main content area */}
      <ScrollArea className="min-h-0 flex-1 px-4">
        <div className="space-y-4 py-4 pb-36">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <PenLine className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-heading font-bold text-foreground mb-1">Ready to generate</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">Type a topic below or tap <strong>Topics</strong> to pick from your scheme of work</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[95%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted/60 text-foreground rounded-bl-md border border-border'}`}>
                {msg.role === 'assistant' ? (
                  isEditing && i === messages.length - 1 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Editing Note</span>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditing(false)}>Cancel</Button>
                          <Button size="sm" className="h-7 text-xs" onClick={handleSaveEdit}>Save Edits</Button>
                        </div>
                      </div>
                      <textarea
                        value={editingContent}
                        onChange={e => setEditingContent(e.target.value)}
                        className="w-full min-h-[300px] text-sm bg-background border border-border rounded-lg p-3 focus:ring-2 focus:ring-primary focus:outline-none resize-y font-mono leading-relaxed"
                      />
                    </div>
                  ) : (
                    <CleanNoteDisplay content={msg.content} />
                  )
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                {msg.role === 'assistant' && !isStreaming && !isEditing && (
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleStartEditing(msg.content)}>
                      <Edit3 className="h-3 w-3 mr-1" />Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleShareNote(msg.content, currentTopic)}>
                      <Share2 className="h-3 w-3 mr-1" />Share
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

      {/* Chat input */}
      <div className="sticky bottom-[6.5rem] z-40 mx-4 mb-4 rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md safe-bottom">
        <div className="flex items-end gap-2 overflow-x-auto">
          <Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isEditing ? "Ask AI to improve your note..." : "Type a topic or follow-up instruction..."}
            className="min-h-[44px] min-w-0 max-h-[120px] resize-none touch-target flex-1" rows={1} disabled={isStreaming} />
          <Button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming} className="touch-target shrink-0 h-11 w-11 p-0">
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Version History Dialog */}
      <VersionHistoryDialog
        open={versionDialogOpen}
        onOpenChange={setVersionDialogOpen}
        note={aiNotes.find(n => n.id === versionNoteId) || null}
        onRevert={handleRevertVersion}
      />
    </div>
  );
}

/* ─── Version History Dialog ─── */
function VersionHistoryDialog({ open, onOpenChange, note, onRevert }: {
  open: boolean; onOpenChange: (v: boolean) => void; note: AINote | null;
  onRevert: (noteId: string, content: string) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  if (!note) return null;
  const versions = note.versions || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading">Version History</DialogTitle>
          <p className="text-xs text-muted-foreground">{note.topic} — {versions.length} version(s)</p>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {versions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No versions saved yet</p>
            ) : (
              versions.slice().reverse().map((v, i) => {
                const realIdx = versions.length - 1 - i;
                const isExpanded = expandedIdx === realIdx;
                return (
                  <div key={realIdx} className="border border-border rounded-lg overflow-hidden">
                    <button onClick={() => setExpandedIdx(isExpanded ? null : realIdx)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-foreground">Version {realIdx + 1}</p>
                        <p className="text-xs text-muted-foreground">{new Date(v.timestamp).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {realIdx === versions.length - 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">Current</span>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-border">
                        <div className="mt-2 p-2 rounded bg-muted/30 max-h-40 overflow-auto">
                          <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-[12]">{stripMarkdown(v.content).slice(0, 500)}...</p>
                        </div>
                        {realIdx !== versions.length - 1 && (
                          <Button variant="outline" size="sm" className="mt-2 text-xs w-full" onClick={() => onRevert(note.id, v.content)}>
                            <History className="h-3 w-3 mr-1" />Revert to this version
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Saved Notes View ─── */
function SavedNotesView({
  aiNotes, groupedNotes, filteredNotes, uniqueSubjects, uniqueClasses, uniqueTerms, uniqueYears,
  filterSubject, setFilterSubject, filterClass, setFilterClass,
  filterTerm, setFilterTerm, filterYear, setFilterYear,
  filterStatus, setFilterStatus,
  onDelete, onDownload, onBulkDownload, onSaveStatus, onOpen, onShare, onViewVersions,
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
  onOpen: (note: AINote) => void;
  onShare: (note: AINote) => void;
  onViewVersions: (noteId: string) => void;
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
                    <button onClick={() => onOpen(note)} className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity">
                      <p className="text-sm font-medium text-foreground truncate">{note.topic}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${note.status === 'saved' ? 'bg-primary/15 text-primary' : 'bg-secondary/15 text-secondary-foreground'}`}>
                          {note.status === 'saved' ? 'Saved' : 'Draft'}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</span>
                        {(note.versions?.length || 0) > 1 && (
                          <span className="text-[10px] text-muted-foreground">· {note.versions.length} versions</span>
                        )}
                      </div>
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{stripMarkdown((note.editedContent || note.content) || '').slice(0, 150)}...</p>
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onOpen(note)}>
                      <Edit3 className="h-3 w-3 mr-1" />Open
                    </Button>
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onShare(note)}>
                      <Share2 className="h-3 w-3 mr-1" />Share
                    </Button>
                    {(note.versions?.length || 0) > 1 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onViewVersions(note.id)}>
                        <History className="h-3 w-3 mr-1" />History
                      </Button>
                    )}
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

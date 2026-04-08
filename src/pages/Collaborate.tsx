import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Share2, MessageSquare, Send, Trash2, Copy, Users,
  BookOpen, ChevronDown, ChevronUp, Loader2, LogIn, Shield,
  Plus, Clipboard, Check, CloudOff, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { getAllSOW, type SchemeOfWork as SOWType } from '@/lib/db';
import { enqueueSync } from '@/lib/sync-queue';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useSyncQueue } from '@/hooks/use-sync-queue';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

interface SharedScheme {
  id: string;
  user_id: string;
  school_code: string;
  subject: string;
  class_level: string;
  term: number;
  year: string;
  weeks: any[];
  status: string;
  created_at: string;
  updated_at: string;
}

interface SchemeComment {
  id: string;
  scheme_id: string;
  user_id: string;
  comment: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  display_name: string;
  school_code: string;
  role: string;
}

function generateWorkspaceCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = [4, 3, 3];
  return segments
    .map(len =>
      Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    )
    .join('-');
}

export default function Collaborate() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const { pendingCount, syncing, processQueue, refreshCount } = useSyncQueue();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [sharedSchemes, setSharedSchemes] = useState<SharedScheme[]>([]);
  const [localSOWs, setLocalSOWs] = useState<SOWType[]>([]);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, SchemeComment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [sharing, setSharing] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        await loadProfile(u.id);
        const sows = await getAllSOW();
        setLocalSOWs(sows);
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (data) {
      setProfile(data as Profile);
      setJoinCode(data.school_code || '');
      if (data.school_code) {
        await loadSharedSchemes();
      }
    }
  };

  const loadSharedSchemes = async () => {
    const { data } = await supabase
      .from('shared_schemes')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) {
      setSharedSchemes(data as SharedScheme[]);
      const userIds = [...new Set(data.map((s: any) => s.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.display_name || 'Teacher'; });
          setProfiles(map);
        }
      }
    }
  };

  const loadComments = async (schemeId: string) => {
    const { data } = await supabase
      .from('scheme_comments')
      .select('*')
      .eq('scheme_id', schemeId)
      .order('created_at', { ascending: true });
    if (data) {
      setComments(prev => ({ ...prev, [schemeId]: data as SchemeComment[] }));
      const userIds = [...new Set(data.map((c: any) => c.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, display_name')
          .in('user_id', userIds);
        if (profs) {
          const map: Record<string, string> = {};
          profs.forEach((p: any) => { map[p.user_id] = p.display_name || 'Teacher'; });
          setProfiles(prev => ({ ...prev, ...map }));
        }
      }
    }
  };

  const handleCreateWorkspace = async () => {
    if (!user) return;
    const code = generateWorkspaceCode();
    const { error } = await supabase
      .from('profiles')
      .update({ school_code: code })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to create workspace');
      return;
    }
    setGeneratedCode(code);
    toast.success('Workspace created! Share the code with colleagues.');
    await loadProfile(user.id);
    await loadSharedSchemes();
  };

  const handleJoinSchool = async () => {
    if (!joinCode.trim() || !user) return;
    const code = joinCode.trim().toUpperCase();
    const { error } = await supabase
      .from('profiles')
      .update({ school_code: code })
      .eq('user_id', user.id);
    if (error) {
      toast.error('Failed to join workspace');
      return;
    }
    toast.success(`Joined workspace: ${code}`);
    await loadProfile(user.id);
    await loadSharedSchemes();
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCodeCopied(true);
    toast.success('Code copied to clipboard!');
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleShareSOW = async (sow: SOWType) => {
    if (!user || !profile?.school_code) return;
    setSharing(true);
    const payload = {
      user_id: user.id,
      school_code: profile.school_code,
      subject: sow.subject,
      class_level: sow.classLevel,
      term: sow.term,
      year: sow.year,
      weeks: sow.weeks as any,
      status: 'shared',
    };

    if (!isOnline) {
      await enqueueSync({ table: 'shared_schemes', action: 'insert', payload });
      toast.info('You\'re offline — change queued for sync');
      await refreshCount();
    } else {
      const { error } = await supabase.from('shared_schemes').insert(payload);
      if (error) {
        toast.error('Failed to share scheme');
      } else {
        toast.success('Scheme shared with your school!');
        await loadSharedSchemes();
      }
    }
    setSharing(false);
  };

  const handleAddComment = async (schemeId: string) => {
    if (!commentText.trim() || !user) return;
    const { error } = await supabase.from('scheme_comments').insert({
      scheme_id: schemeId,
      user_id: user.id,
      comment: commentText.trim(),
    });
    if (error) {
      toast.error('Failed to add comment');
    } else {
      setCommentText('');
      await loadComments(schemeId);
    }
  };

  const handleDeleteComment = async (commentId: string, schemeId: string) => {
    await supabase.from('scheme_comments').delete().eq('id', commentId);
    await loadComments(schemeId);
  };

  const handleForkScheme = async (scheme: SharedScheme) => {
    const { saveSOW } = await import('@/lib/db');
    await saveSOW({
      id: crypto.randomUUID(),
      subject: scheme.subject,
      classLevel: scheme.class_level,
      term: scheme.term,
      year: scheme.year,
      weeks: scheme.weeks as any,
      status: 'draft',
      createdAt: new Date().toISOString(),
    });
    toast.success('Scheme copied to your local plans!');
    navigate('/scheme');
  };

  const handleDeleteScheme = async (schemeId: string) => {
    const { error } = await supabase.from('shared_schemes').delete().eq('id', schemeId);
    if (error) {
      toast.error('Failed to delete scheme');
    } else {
      toast.success('Scheme deleted');
      await loadSharedSchemes();
    }
  };

  const handleApprove = async (schemeId: string) => {
    if (profile?.role !== 'admin') return;
    await supabase
      .from('shared_schemes')
      .update({ status: 'approved' })
      .eq('id', schemeId);
    toast.success('Scheme approved!');
    await loadSharedSchemes();
  };

  const toggleExpand = async (schemeId: string) => {
    const isExpanding = expandedScheme !== schemeId;
    setExpandedScheme(isExpanding ? schemeId : null);
    if (isExpanding && !comments[schemeId]) {
      await loadComments(schemeId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="pb-32 px-4 pt-4">
        <div className="glass-card rounded-2xl p-8 text-center space-y-4">
          <Share2 className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-heading font-bold">School Collaboration</h2>
          <p className="text-sm text-muted-foreground">
            Sign in to share Schemes of Work with colleagues, leave feedback, and collaborate within your school workspace.
          </p>
          <Button onClick={() => navigate('/auth')} size="lg">
            <LogIn className="h-4 w-4 mr-2" /> Sign In to Collaborate
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-heading font-bold">Collaborate</h2>
          {profile?.role === 'admin' && (
            <Badge variant="secondary" className="text-[10px]">
              <Shield className="h-3 w-3 mr-1" /> Admin
            </Badge>
          )}
        </div>

        {/* No workspace yet — Create or Join */}
        {!profile?.school_code && (
          <div className="space-y-4">
            {/* Create Workspace */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Plus className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Create a Workspace</h3>
                  <p className="text-[11px] text-muted-foreground">Generate a unique code and invite colleagues</p>
                </div>
              </div>

              {!generatedCode ? (
                <Button onClick={handleCreateWorkspace} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Create New Workspace
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <p className="text-xs text-muted-foreground">Your workspace code:</p>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="flex-1 font-mono text-lg font-bold text-primary tracking-wider">{generatedCode}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleCopyCode(generatedCode)}
                    >
                      {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Share this code with your colleagues so they can join the same workspace.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border/50" />
              <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">OR</span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            {/* Join Workspace */}
            <div className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Join a Workspace</h3>
                  <p className="text-[11px] text-muted-foreground">Enter a code from your colleague</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. ABCD-123-XYZ"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  className="text-sm h-10 font-mono"
                  maxLength={30}
                />
                <Button onClick={handleJoinSchool} disabled={!joinCode.trim()}>Join</Button>
              </div>
            </div>
          </div>
        )}

        {profile?.school_code && (
          <>
            {/* School info */}
            <div className="flex items-center gap-3 glass-card rounded-xl p-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">Workspace: {profile.school_code}</p>
                <p className="text-xs text-muted-foreground">{profile.display_name || 'Teacher'} • {profile.role}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 shrink-0"
                onClick={() => handleCopyCode(profile.school_code)}
              >
                {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
              </Button>
            </div>

            <Tabs defaultValue="shared" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="shared" className="text-xs"><BookOpen className="h-3 w-3 mr-1" />Shared Schemes</TabsTrigger>
                <TabsTrigger value="share" className="text-xs"><Share2 className="h-3 w-3 mr-1" />Share Yours</TabsTrigger>
              </TabsList>

              {/* Shared Schemes */}
              <TabsContent value="shared" className="space-y-3 mt-4">
                {sharedSchemes.length === 0 && (
                  <div className="text-center py-8">
                    <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No shared schemes yet. Be the first to share!</p>
                  </div>
                )}

                {sharedSchemes.map(scheme => {
                  const isExpanded = expandedScheme === scheme.id;
                  const schemeComments = comments[scheme.id] || [];
                  const filledWeeks = (scheme.weeks as any[]).filter((w: any) => w.topic?.trim()).length;
                  return (
                    <div key={scheme.id} className="glass-card rounded-xl overflow-hidden">
                      <button onClick={() => toggleExpand(scheme.id)} className="w-full p-4 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold">{scheme.subject}</span>
                          <Badge variant={scheme.status === 'approved' ? 'default' : 'secondary'} className="text-[9px]">
                            {scheme.status}
                          </Badge>
                          <span className="ml-auto">
                            {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {scheme.class_level} • Term {scheme.term} • {scheme.year} • {filledWeeks} weeks
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          by {profiles[scheme.user_id] || 'Teacher'}
                        </p>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="px-4 pb-4 space-y-3"
                          >
                            {/* Week preview */}
                            <div className="max-h-48 overflow-y-auto space-y-1.5">
                              {(scheme.weeks as any[]).map((w: any, i: number) => (
                                <div key={i} className="flex gap-2 text-xs py-1 border-b border-border/30 last:border-0">
                                  <span className="text-muted-foreground w-10 shrink-0">Wk {w.week}</span>
                                  <span className="flex-1">{w.topic || '—'}</span>
                                </div>
                              ))}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleForkScheme(scheme)}>
                                <Copy className="h-3 w-3 mr-1" /> Fork & Adapt
                              </Button>
                              {profile?.role === 'admin' && scheme.status !== 'approved' && (
                                <Button size="sm" className="text-xs" onClick={() => handleApprove(scheme.id)}>
                                  Approve
                                </Button>
                              )}
                              {scheme.user_id === user.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteScheme(scheme.id)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                              )}
                            </div>

                            {/* Comments */}
                            <div className="border-t border-border/30 pt-3 space-y-2">
                              <h4 className="text-xs font-semibold flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Feedback ({schemeComments.length})
                              </h4>
                              {schemeComments.map(c => (
                                <div key={c.id} className="bg-muted/30 rounded-lg p-2.5 space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold">{profiles[c.user_id] || 'Teacher'}</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9px] text-muted-foreground">
                                        {new Date(c.created_at).toLocaleDateString()}
                                      </span>
                                      {c.user_id === user.id && (
                                        <button onClick={() => handleDeleteComment(c.id, scheme.id)} className="text-destructive/50 hover:text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-foreground/80">{c.comment}</p>
                                </div>
                              ))}
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Add feedback..."
                                  value={commentText}
                                  onChange={e => setCommentText(e.target.value)}
                                  className="text-xs h-8 flex-1"
                                  maxLength={500}
                                  onKeyDown={e => e.key === 'Enter' && handleAddComment(scheme.id)}
                                />
                                <Button size="sm" className="h-8 px-3" onClick={() => handleAddComment(scheme.id)} disabled={!commentText.trim()}>
                                  <Send className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </TabsContent>

              {/* Share Your SOWs */}
              <TabsContent value="share" className="space-y-3 mt-4">
                {localSOWs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No local schemes to share. Create one in the Scheme of Work page first.</p>
                    <Button variant="outline" className="mt-3" onClick={() => navigate('/scheme')}>
                      Go to Scheme of Work
                    </Button>
                  </div>
                ) : (
                  localSOWs.map(sow => (
                    <div key={sow.id} className="glass-card rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{sow.subject}</p>
                          <p className="text-xs text-muted-foreground">{sow.classLevel} • Term {sow.term} • {sow.year}</p>
                        </div>
                        <Button size="sm" onClick={() => handleShareSOW(sow)} disabled={sharing}>
                          {sharing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3 mr-1" />}
                          Share
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </motion.div>
    </div>
  );
}

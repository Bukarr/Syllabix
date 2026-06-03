import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, Video, FileText, BookOpen, Bookmark, Loader2, WifiOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { saveResource, type SavedResource } from '@/lib/db-resources';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Resource {
  title: string;
  type: string;
  source: string;
  url: string;
  description: string;
}

interface ResourceRecommendationsProps {
  subject: string;
  classLevel: string;
  topic: string;
  visible: boolean;
}

const RESOURCES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-resources`;

const typeIcons: Record<string, any> = {
  Video: Video,
  Article: FileText,
  Worksheet: BookOpen,
};

export function ResourceRecommendations({ subject, classLevel, topic, visible }: ResourceRecommendationsProps) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (visible && !fetched && isOnline && topic) {
      fetchResources();
    }
  }, [visible, topic]);

  async function fetchResources() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setLoading(false); return; }
      const token = session.access_token;
      const resp = await fetch(RESOURCES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ subject, classLevel, topic }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setResources(data.resources || []);
      }
    } catch {
      // Silently fail - resources are optional
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  const handleSave = async (r: Resource) => {
    const resource: SavedResource = {
      id: crypto.randomUUID(),
      title: r.title,
      type: r.type,
      source: r.source,
      url: r.url,
      description: r.description,
      subject,
      topic,
      savedAt: new Date().toISOString(),
    };
    await saveResource(resource);
    setSavedIds(prev => new Set([...prev, r.title]));
    toast.success('Saved to My Resources');
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3 mt-6"
    >
      <div className="flex items-center gap-2">
        <LinkIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-heading font-semibold">Recommended Resources</h3>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border">
          <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">Resource recommendations require internet</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 p-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Finding resources...</span>
        </div>
      )}

      {!loading && resources.length === 0 && fetched && (
        <p className="text-xs text-muted-foreground text-center py-4">No resource recommendations available for this topic.</p>
      )}

      {resources.map((r, i) => {
        const Icon = typeIcons[r.type] || LinkIcon;
        const isSaved = savedIds.has(r.title);
        return (
          <div key={i} className="glass-card rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{r.title}</p>
                <p className="text-[10px] text-muted-foreground">{r.type} • {r.source}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{r.description}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-[10px] h-7">
                  <ExternalLink className="h-3 w-3 mr-1" /> Open Link
                </Button>
              </a>
              <Button
                variant="outline"
                size="sm"
                className={`text-[10px] h-7 ${isSaved ? 'text-primary border-primary/30' : ''}`}
                onClick={() => handleSave(r)}
                disabled={isSaved}
              >
                <Bookmark className={`h-3 w-3 mr-1 ${isSaved ? 'fill-primary' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
            <p className="text-[8px] text-muted-foreground">
              Tip: Download this resource on Wi-Fi and save it offline for use in class.
            </p>
          </div>
        );
      })}

      <p className="text-[9px] text-muted-foreground text-center">
        AI-generated recommendations. Verify links before use in class.
      </p>
    </motion.div>
  );
}

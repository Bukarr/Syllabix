import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, Trash2, ExternalLink, Video, FileText, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getAllSavedResources, deleteResource, type SavedResource } from '@/lib/db-resources';
import { toast } from 'sonner';

const typeIcons: Record<string, any> = {
  Video: Video,
  Article: FileText,
  Worksheet: BookOpen,
};

export default function MyResources() {
  const [resources, setResources] = useState<SavedResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    const r = await getAllSavedResources();
    setResources(r.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    setLoading(false);
  }

  const handleDelete = async (id: string) => {
    await deleteResource(id);
    toast.success('Resource removed');
    await loadResources();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-28 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <h2 className="text-xl font-heading font-bold">My Resources</h2>

        {resources.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <LinkIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">No Saved Resources</h3>
            <p className="text-sm text-muted-foreground">
              Resources recommended after lesson plan generation will appear here when you save them.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map(r => {
              const Icon = typeIcons[r.type] || LinkIcon;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">{r.type} • {r.source}</p>
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">For: {r.subject} — {r.topic}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        <ExternalLink className="h-3 w-3 mr-1" /> Open
                      </Button>
                    </a>
                    <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-[9px] text-muted-foreground">Tip: Download this resource on Wi-Fi and save it offline for use in class.</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

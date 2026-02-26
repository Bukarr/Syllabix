import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Globe, Trash2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProfile, saveProfile, type TeacherProfile } from '@/lib/db';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);

  useEffect(() => {
    getProfile().then(p => p && setProfile(p));
  }, []);

  const handleSave = async () => {
    if (profile) {
      await saveProfile(profile);
      toast.success('Settings saved');
    }
  };

  if (!profile) return null;

  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h2 className="text-xl font-heading font-bold">Settings</h2>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold">Profile</h3>
          </div>
          <div>
            <Label className="text-sm font-medium">Name</Label>
            <Input
              value={profile.name}
              onChange={e => setProfile(p => p ? { ...p, name: e.target.value } : p)}
              className="mt-1 touch-target"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">School</Label>
            <Input
              value={profile.schoolName}
              onChange={e => setProfile(p => p ? { ...p, schoolName: e.target.value } : p)}
              className="mt-1 touch-target"
            />
          </div>
          <Button className="w-full touch-target" onClick={handleSave}>Save Changes</Button>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold">Language</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { code: 'en', label: 'English' },
              { code: 'yo', label: 'Yorùbá' },
              { code: 'ig', label: 'Igbo' },
              { code: 'ha', label: 'Hausa' },
            ] as const).map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  setProfile(p => p ? { ...p, language: lang.code } : p);
                  toast.info(`Language support for ${lang.label} coming soon`);
                }}
                className={`py-3 px-4 rounded-lg border text-sm font-medium transition-all touch-target ${
                  profile.language === lang.code
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 space-y-3">
          <Button variant="outline" className="w-full touch-target">
            <Download className="h-4 w-4 mr-2" /> Export All Data
          </Button>
          <Button variant="outline" className="w-full touch-target text-destructive border-destructive/20 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4 mr-2" /> Delete All Data
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Globe, Trash2, Download, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getProfile, saveProfile, getAllLessonPlans, getAllSOW,
  type TeacherProfile
} from '@/lib/db';
import { exportLessonPlanToPDF } from '@/lib/export';
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

  const handleExportAll = async () => {
    try {
      const plans = await getAllLessonPlans();
      if (plans.length === 0) {
        toast.info('No lesson plans to export');
        return;
      }
      for (const plan of plans) {
        await exportLessonPlanToPDF(plan);
      }
      toast.success(`Exported ${plans.length} lesson plan(s) as PDF`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleDeleteAll = async () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone.')) {
      const { getDB } = await import('@/lib/db');
      const db = await getDB();
      await db.clear('lessonPlans');
      await db.clear('schemesOfWork');
      toast.success('All lesson plans and schemes deleted');
    }
  };

  const handleRequestNotifications = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications enabled! You\'ll get weekly reminders.');
      } else {
        toast.error('Notification permission denied');
      }
    } else {
      toast.info('Notifications not supported on this device');
    }
  };

  if (!profile) return null;

  return (
    <div className="pb-24 px-4 pt-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <h2 className="text-xl font-heading font-bold">Settings</h2>

        {/* Profile */}
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

        {/* Language */}
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
                  if (lang.code !== 'en') toast.info(`Language support for ${lang.label} coming soon`);
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

        {/* Notifications */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold">Reminders</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Get reminded to create your weekly lesson plans every Friday at 4 PM.
          </p>
          <Button variant="outline" className="w-full touch-target" onClick={handleRequestNotifications}>
            <Bell className="h-4 w-4 mr-2" /> Enable Notifications
          </Button>
        </div>

        {/* Data management */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <Button variant="outline" className="w-full touch-target" onClick={handleExportAll}>
            <Download className="h-4 w-4 mr-2" /> Export All Plans as PDF
          </Button>
          <Button
            variant="outline"
            className="w-full touch-target text-destructive border-destructive/20 hover:bg-destructive/10"
            onClick={handleDeleteAll}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete All Data
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

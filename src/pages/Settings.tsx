import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Globe, Trash2, Download, Bell, Clock, BookOpen, CloudUpload, CloudDownload, FileUp, FileDown, Loader2, Shield, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  getProfile, saveProfile, getAllLessonPlans, getAllSOW,
  type TeacherProfile
} from '@/lib/db';
import { exportLessonPlanToPDF } from '@/lib/export';
import { toast } from 'sonner';
import { profileSchema, type ValidationErrors } from '@/lib/validation';
import {
  getNotificationSettings, saveNotificationSettings, requestNotificationPermission,
  getPermissionStatus, type NotificationSettings
} from '@/lib/notifications';
import { SubjectEditor } from '@/components/SubjectEditor';
import {
  uploadBackup, downloadAndRestore, downloadBackupFile,
  restoreFromFile, getLastBackupDate,
} from '@/lib/backup';
import { supabase } from '@/integrations/supabase/client';
import { getStoredTheme, applyTheme, type Theme } from '@/lib/theme';

export default function SettingsPage() {
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(getNotificationSettings());
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [theme, setTheme] = useState<Theme>(getStoredTheme());

  useEffect(() => {
    getProfile().then(p => p && setProfile(p));
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsSignedIn(!!user);
      if (user) getLastBackupDate().then(setLastBackup);
    });
  }, []);

  const validateField = (field: 'name' | 'schoolName', value: string) => {
    const result = profileSchema.shape[field].safeParse(value);
    setErrors(prev => ({
      ...prev,
      [field]: result.success ? '' : result.error.errors[0]?.message || '',
    }));
  };

  const handleSave = async () => {
    if (!profile) return;
    const result = profileSchema.safeParse({ name: profile.name, schoolName: profile.schoolName });
    if (!result.success) {
      const errs: ValidationErrors = {};
      result.error.errors.forEach(e => { errs[e.path[0] as string] = e.message; });
      setErrors(errs);
      toast.error(result.error.errors[0]?.message || 'Please fix validation errors');
      return;
    }
    await saveProfile(profile);
    toast.success('Settings saved');
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

  const DAY_LABELS = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Notification permission denied. Please enable it in your browser settings.');
        return;
      }
      toast.success('Notifications enabled!');
    } else {
      toast.info('Notifications disabled');
    }
    const updated = { ...notifSettings, enabled };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleTimeChange = (time: string) => {
    const updated = { ...notifSettings, reminderTime: time };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
  };

  const handleToggleDay = (day: number) => {
    const days = notifSettings.days.includes(day)
      ? notifSettings.days.filter(d => d !== day)
      : [...notifSettings.days, day].sort();
    if (days.length === 0) {
      toast.error('Select at least one day');
      return;
    }
    const updated = { ...notifSettings, days };
    setNotifSettings(updated);
    saveNotificationSettings(updated);
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
              maxLength={100}
              onChange={e => {
                setProfile(p => p ? { ...p, name: e.target.value } : p);
                validateField('name', e.target.value);
              }}
              className="mt-1 touch-target"
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </div>
          <div>
            <Label className="text-sm font-medium">School</Label>
            <Input
              value={profile.schoolName}
              maxLength={200}
              onChange={e => {
                setProfile(p => p ? { ...p, schoolName: e.target.value } : p);
                validateField('schoolName', e.target.value);
              }}
              className="mt-1 touch-target"
            />
            {errors.schoolName && <p className="text-xs text-destructive mt-1">{errors.schoolName}</p>}
          </div>
          <Button className="w-full touch-target" onClick={handleSave}>Save Changes</Button>
        </div>

        {/* Subjects */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold">Subjects</h3>
          </div>
          <SubjectEditor
            subjects={profile.subjects}
            onUpdate={async (subjects) => {
              const updated = { ...profile, subjects };
              setProfile(updated);
              await saveProfile(updated);
              toast.success('Subjects updated');
            }}
          />
        </div>

        {/* Appearance */}
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            {theme === 'light' ? <Sun className="h-5 w-5 text-primary" /> : <Moon className="h-5 w-5 text-primary" />}
            <h3 className="font-heading font-semibold">Appearance</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setTheme(opt.value);
                  applyTheme(opt.value);
                  toast.success(`${opt.label} theme enabled`);
                }}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border text-sm font-medium transition-all touch-target ${
                  theme === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <opt.icon className="h-4 w-4" /> {opt.label}
              </button>
            ))}
          </div>
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
        <div className="glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="font-heading font-semibold">Reminders</h3>
            </div>
            <Switch
              checked={notifSettings.enabled}
              onCheckedChange={handleToggleNotifications}
            />
          </div>

          {getPermissionStatus() === 'unsupported' && (
            <p className="text-xs text-destructive">Notifications are not supported on this device.</p>
          )}

          {notifSettings.enabled && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
              {/* Time picker */}
              <div>
                <Label className="text-xs font-medium flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-3.5 w-3.5" /> Reminder Time
                </Label>
                <Input
                  type="time"
                  value={notifSettings.reminderTime}
                  onChange={e => handleTimeChange(e.target.value)}
                  className="touch-target"
                />
              </div>

              {/* Day selector */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Remind me on</Label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => handleToggleDay(value)}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                        notifSettings.days.includes(value)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                You'll receive a reminder at {notifSettings.reminderTime} on selected days to prepare your lessons.
              </p>
            </motion.div>
          )}
        </div>

        {/* Data management */}
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-heading font-semibold">Backup & Restore</h3>
          </div>

          {isSignedIn && (
            <>
              <Button
                variant="outline"
                className="w-full touch-target"
                disabled={backupLoading}
                onClick={async () => {
                  setBackupLoading(true);
                  const result = await uploadBackup();
                  setBackupLoading(false);
                  if (result.success) {
                    toast.success('Backup uploaded to cloud!');
                    getLastBackupDate().then(setLastBackup);
                  } else {
                    toast.error(result.error || 'Backup failed');
                  }
                }}
              >
                {backupLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
                Backup to Cloud
              </Button>
              <Button
                variant="outline"
                className="w-full touch-target"
                disabled={restoreLoading}
                onClick={async () => {
                  if (!confirm('This will restore missing data from your cloud backup. Continue?')) return;
                  setRestoreLoading(true);
                  const result = await downloadAndRestore();
                  setRestoreLoading(false);
                  if (result.success) {
                    toast.success(result.stats || 'Data restored!');
                  } else {
                    toast.error(result.error || 'Restore failed');
                  }
                }}
              >
                {restoreLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudDownload className="h-4 w-4 mr-2" />}
                Restore from Cloud
              </Button>
              {lastBackup && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Last backup: {new Date(lastBackup).toLocaleString()}
                </p>
              )}
            </>
          )}
          {!isSignedIn && (
            <p className="text-xs text-muted-foreground">Sign in to enable cloud backup & restore.</p>
          )}

          <div className="border-t border-border/30 pt-3 space-y-2">
            <p className="text-[11px] text-muted-foreground">Or use local file backup:</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs touch-target"
                onClick={async () => {
                  await downloadBackupFile();
                  toast.success('Backup file downloaded');
                }}
              >
                <FileDown className="h-3.5 w-3.5 mr-1" /> Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs touch-target"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    const result = await restoreFromFile(file);
                    if (result.success) {
                      toast.success(result.stats || 'Data restored!');
                    } else {
                      toast.error(result.error || 'Restore failed');
                    }
                  };
                  input.click();
                }}
              >
                <FileUp className="h-3.5 w-3.5 mr-1" /> Restore File
              </Button>
            </div>
          </div>
        </div>

        {/* Danger zone */}
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

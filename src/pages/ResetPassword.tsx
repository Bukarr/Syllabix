import { errorMessage } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { passwordIssues } from '@/lib/validation';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const issues = passwordIssues(password);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issues.length > 0) {
      toast.error(`Password needs: ${issues.join(', ').toLowerCase()}`);
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated! You are now signed in.');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err) || 'Could not update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <AppLogo size="xl" className="mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Set a new password</h1>
          <p className="text-sm text-muted-foreground">
            {ready
              ? 'Enter your new password below.'
              : 'Open this page from the reset link in your email.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <Label className="text-xs font-medium">New Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 h-11"
                aria-describedby="reset-password-requirements"
                aria-invalid={password.length > 0 && issues.length > 0}
              />
            </div>
            <ul id="reset-password-requirements" className="mt-2 space-y-1">
              {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character'].map(rule => (
                <li
                  key={rule}
                  className={`text-[11px] ${issues.includes(rule) ? 'text-muted-foreground' : 'text-primary'}`}
                >
                  {issues.includes(rule) ? '•' : '✓'} {rule}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Label className="text-xs font-medium">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
          <Button type="submit" disabled={loading || !ready} className="w-full h-11 font-semibold">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Update Password
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
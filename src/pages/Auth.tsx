import { errorMessage } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLogo } from '@/components/AppLogo';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { passwordIssues } from '@/lib/validation';
import { clearFailures, lockoutRemaining, recordFailure } from '@/lib/login-guard';

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawNext = params.get('next') ?? '';
  // Only allow same-origin relative paths.
  const next = /^\/(?!\/)/.test(rawNext) ? rawNext : '/';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [lockMs, setLockMs] = useState(() => lockoutRemaining());

  const pwIssues = mode === 'signup' ? passwordIssues(password) : [];
  const locked = lockMs > 0;

  // Tick the lockout countdown so the form re-enables itself.
  useEffect(() => {
    if (!locked) return;
    const id = window.setInterval(() => setLockMs(lockoutRemaining()), 1000);
    return () => window.clearInterval(id);
  }, [locked]);

  // Auto-redirect recognized/logged-in devices straight into the app.
  useEffect(() => {
    let active = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        if (next === '/') navigate('/', { replace: true });
        else window.location.replace(next);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        if (next === '/') navigate('/', { replace: true });
        else window.location.replace(next);
      } else {
        setCheckingSession(false);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate, next]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'forgot') {
      if (!email) {
        toast.error('Please enter your email');
        return;
      }
      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success('Password reset link sent! Check your email.');
        setMode('login');
      } catch (err) {
        toast.error(errorMessage(err) || 'Could not send reset link');
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (mode === 'signup' && pwIssues.length > 0) {
      toast.error(`Password needs: ${pwIssues.join(', ').toLowerCase()}`);
      return;
    }
    if (mode === 'login' && locked) {
      toast.error('Too many failed attempts. Please try again later.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: `${window.location.origin}${next}`,
          },
        });
        if (error) throw error;
        toast.success('Check your email for verification link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        clearFailures();
        toast.success('Welcome back!');
        if (next === '/') navigate('/');
        else window.location.replace(next);
      }
    } catch (err) {
      if (mode === 'login') {
        // Throttle credential stuffing; the message stays generic on purpose.
        const lockedFor = recordFailure();
        setLockMs(lockoutRemaining());
        toast.error(
          lockedFor
            ? 'Too many failed attempts. Sign-in is locked for 15 minutes.'
            : 'Incorrect email or password. Please check and try again.',
        );
      } else {
        toast.error(errorMessage(err) || 'Could not create your account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center space-y-2">
          <AppLogo size="xl" className="mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Syllabix</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Sign in to collaborate'
              : mode === 'signup'
                ? 'Create your account'
                : 'Reset your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <Label className="text-xs font-medium">Display Name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Your name"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          )}
          <div>
            <Label className="text-xs font-medium">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="teacher@school.ng"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
          </div>
          {mode !== 'forgot' && (
          <div>
            <Label className="text-xs font-medium">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-10 h-11"
                aria-describedby={mode === 'signup' ? 'password-requirements' : undefined}
                aria-invalid={mode === 'signup' && password.length > 0 && pwIssues.length > 0}
              />
            </div>
            {mode === 'signup' && (
              <ul id="password-requirements" className="mt-2 space-y-1">
                {['At least 8 characters', 'One uppercase letter', 'One lowercase letter', 'One number', 'One special character'].map(rule => {
                  const met = !pwIssues.includes(rule);
                  return (
                    <li
                      key={rule}
                      className={`text-[11px] ${met ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {met ? '✓' : '•'} {rule}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          )}
          {mode === 'login' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-xs text-primary hover:underline"
            >
              Forgot password?
            </button>
          )}
          {locked && (
            <p role="alert" className="text-xs text-destructive">
              Too many failed attempts. Try again in {Math.ceil(lockMs / 60000)} minute(s).
            </p>
          )}
          <Button
            type="submit"
            disabled={loading || (mode === 'login' && locked)}
            className="w-full h-11 font-semibold"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {mode === 'forgot' ? (
          <p className="text-center text-sm text-muted-foreground">
            Remembered it?{' '}
            <button
              onClick={() => setMode('login')}
              className="text-primary font-semibold hover:underline"
            >
              Back to Sign In
            </button>
          </p>
        ) : (
        <p className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-primary font-semibold hover:underline"
          >
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
        )}

        <p className="text-center text-xs text-muted-foreground/60">
          Sign in is optional — only needed for school collaboration features. By
          continuing you agree to our{' '}
          <Link to="/terms" className="underline hover:text-primary">Terms</Link> and{' '}
          <Link to="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
        </p>
      </motion.div>
    </div>
  );
}

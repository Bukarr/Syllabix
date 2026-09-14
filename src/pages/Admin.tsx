import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import {
  Loader2, Shield, Users, Building2, UserPlus, UserX, Search, RefreshCw, LogOut,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { errorMessage } from '@/lib/utils';

interface AdminUser {
  userId: string;
  displayName: string;
  email: string;
  schoolCode: string;
  role: string;
  createdAt: string;
  lastSignInAt: string | null;
}

interface AdminWorkspace {
  schoolCode: string;
  members: number;
  roles: Record<string, number>;
}

interface Overview {
  stats: { totalUsers: number; totalWorkspaces: number; newThisWeek: number; unaffiliated: number };
  users: AdminUser[];
  workspaces: AdminWorkspace[];
}

const ROLE_LABELS: Record<string, string> = {
  teacher: 'Teacher',
  subject_head: 'Subject Head',
  headmaster: 'Headmaster/mistress',
  director: 'Director',
  admin: 'Admin',
};

function fmt(date: string | null): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Standalone admin console (/admin).
 * Renders outside the teacher shell and is gated entirely server-side by the
 * `admin-overview` service, which checks public.app_admins membership.
 */
export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState<string | null>(null);
  const [data, setData] = useState<Overview | null>(null);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setDenied(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setDenied('signin');
      setLoading(false);
      return;
    }
    const { data: res, error } = await supabase.functions.invoke('admin-overview', { body: {} });
    setLoading(false);
    if (error) {
      setDenied('forbidden');
      return;
    }
    setData(res as Overview);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(u =>
      [u.displayName, u.email, u.schoolCode, u.role].some(v => (v ?? '').toLowerCase().includes(q)),
    );
  }, [data, query]);

  const recent = useMemo(() => {
    if (!data) return [];
    return [...data.users]
      .filter(u => u.lastSignInAt)
      .sort((a, b) => (b.lastSignInAt! > a.lastSignInAt! ? 1 : -1))
      .slice(0, 12);
  }, [data]);

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email') ?? ''),
      password: String(form.get('password') ?? ''),
    });
    if (error) {
      toast.error('Sign-in failed. Check your credentials.');
      return;
    }
    void load();
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <Helmet>
        <title>Admin Console — Syllabix</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 p-2">
              <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-heading text-2xl font-bold">Admin Console</h1>
              <p className="text-sm text-muted-foreground">Users, roles and recent activity.</p>
            </div>
          </div>
          {data && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()}>
                <RefreshCw className="mr-1 h-4 w-4" /> Refresh
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => { await supabase.auth.signOut(); setData(null); setDenied('signin'); }}
              >
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </div>
          )}
        </header>

        {loading && (
          <div className="flex justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {!loading && denied === 'signin' && (
          <form onSubmit={signIn} className="glass-card mx-auto max-w-sm space-y-3 rounded-2xl p-5">
            <h2 className="font-heading font-semibold">Admin sign in</h2>
            <div className="space-y-1">
              <label htmlFor="admin-email" className="text-sm">Email</label>
              <Input id="admin-email" name="email" type="email" autoComplete="username" required />
            </div>
            <div className="space-y-1">
              <label htmlFor="admin-password" className="text-sm">Password</label>
              <Input id="admin-password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="touch-target w-full">Sign in</Button>
            <Link to="/" className="block pt-1 text-center text-xs text-muted-foreground underline">
              Back to Syllabix
            </Link>
          </form>
        )}

        {!loading && denied === 'forbidden' && (
          <div className="glass-card mx-auto max-w-md space-y-3 rounded-2xl p-6 text-center">
            <h2 className="font-heading font-semibold">Admin access required</h2>
            <p className="text-sm text-muted-foreground">
              This account is not registered as a Syllabix super admin.
            </p>
            <Button
              variant="outline"
              onClick={async () => { await supabase.auth.signOut(); setDenied('signin'); }}
            >
              Use another account
            </Button>
          </div>
        )}

        {!loading && data && (
          <>
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Key statistics">
              {[
                { icon: Users, label: 'Total users', value: data.stats.totalUsers },
                { icon: Building2, label: 'Workspaces', value: data.stats.totalWorkspaces },
                { icon: UserPlus, label: 'New this week', value: data.stats.newThisWeek },
                { icon: UserX, label: 'No workspace', value: data.stats.unaffiliated },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="glass-card rounded-2xl p-4">
                  <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
                  <p className="font-heading text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </section>

            <section className="glass-card space-y-3 rounded-2xl p-5" aria-label="Users">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-heading font-semibold">Users &amp; roles</h2>
                <div className="relative w-56">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Input
                    className="pl-8"
                    placeholder="Search name, email, school…"
                    aria-label="Search users"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th scope="col" className="py-2 pr-3">Name</th>
                      <th scope="col" className="py-2 pr-3">Email</th>
                      <th scope="col" className="py-2 pr-3">Role</th>
                      <th scope="col" className="py-2 pr-3">School</th>
                      <th scope="col" className="py-2 pr-3">Joined</th>
                      <th scope="col" className="py-2">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.userId} className="border-t border-border/60">
                        <td className="py-2 pr-3">{u.displayName || '—'}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{u.email || '—'}</td>
                        <td className="py-2 pr-3">
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            {ROLE_LABELS[u.role] ?? u.role ?? 'teacher'}
                          </span>
                        </td>
                        <td className="py-2 pr-3">{u.schoolCode || '—'}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{fmt(u.createdAt)}</td>
                        <td className="py-2 text-muted-foreground">{fmt(u.lastSignInAt)}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-muted-foreground">No matching users.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="glass-card space-y-3 rounded-2xl p-5" aria-label="Workspaces">
                <h2 className="font-heading font-semibold">Workspaces</h2>
                <ul className="space-y-2 text-sm">
                  {data.workspaces.map(w => (
                    <li key={w.schoolCode} className="flex items-center justify-between border-t border-border/60 pt-2 first:border-0 first:pt-0">
                      <span className="font-medium">{w.schoolCode}</span>
                      <span className="text-xs text-muted-foreground">
                        {w.members} member{w.members === 1 ? '' : 's'} ·{' '}
                        {Object.entries(w.roles).map(([r, n]) => `${ROLE_LABELS[r] ?? r} ${n}`).join(', ')}
                      </span>
                    </li>
                  ))}
                  {data.workspaces.length === 0 && (
                    <li className="text-muted-foreground">No workspaces yet.</li>
                  )}
                </ul>
              </section>

              <section className="glass-card space-y-3 rounded-2xl p-5" aria-label="Recent activity">
                <h2 className="font-heading font-semibold">Recent activity</h2>
                <ul className="space-y-2 text-sm">
                  {recent.map(u => (
                    <li key={u.userId} className="flex items-center justify-between border-t border-border/60 pt-2 first:border-0 first:pt-0">
                      <span>{u.displayName || u.email || 'Unnamed teacher'}</span>
                      <span className="text-xs text-muted-foreground">signed in {fmt(u.lastSignInAt)}</span>
                    </li>
                  ))}
                  {recent.length === 0 && <li className="text-muted-foreground">No sign-ins recorded yet.</li>}
                </ul>
              </section>
            </div>
          </>
        )}

        {!loading && !data && denied === null && (
          <p className="text-center text-sm text-muted-foreground">
            {errorMessage('Could not load admin data.')}
          </p>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/AppLogo";
import { supabase } from "@/integrations/supabase/client";

type AuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

const oauth = () => (supabase.auth as unknown as { oauth: AuthNamespace }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error: err } = await oauth().getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) return setError(err.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorizationId)
      : await oauth().denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      return setError(err.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <AppLogo size="xl" className="mx-auto" />
          <h1 className="text-2xl font-heading font-bold">Syllabix</h1>
        </div>

        {error ? (
          <div className="glass-card rounded-2xl p-6 text-center space-y-2">
            <p className="font-semibold">Could not load this request</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : !details ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-heading font-semibold">
              Connect {details.client?.name ?? "an app"} to your account
            </h2>
            <p className="text-sm text-muted-foreground">
              This lets {details.client?.name ?? "the client"} read your curriculum data and
              school workspace schemes, and post review comments, acting as you.
            </p>
            <div className="flex gap-3">
              <Button disabled={busy} onClick={() => decide(true)} className="flex-1 h-11 font-semibold">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => decide(false)}
                className="flex-1 h-11"
              >
                Deny
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Linking } from "react-native";
import { supabase } from "@/lib/supabase";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setSession(data.session ?? null);
        setLoading(false);
      }
    });

    // Handle Supabase magic-link redirects (PKCE): `...?code=...`
    const handleUrl = async (url: string) => {
      let code: string | null = null;
      try {
        const parsed = new URL(url);
        code = parsed.searchParams.get("code");
      } catch {
        const match = url.match(/[?&]code=([^&]+)/);
        code = match ? decodeURIComponent(match[1]) : null;
      }
      if (!code) return;

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        setSession(data.session ?? null);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    const sub = Linking.addEventListener("url", ({ url }: { url: string }) => {
      handleUrl(url);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => {
      mounted = false;
      sub.remove();
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

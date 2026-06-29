import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/features/staff/types";

interface CurrentUserState {
  user: User | null;
  roles: AppRole[];
  loading: boolean;
}

export function useCurrentUser(): CurrentUserState {
  const [state, setState] = useState<CurrentUserState>({
    user: null,
    roles: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function load(user: User | null) {
      if (!user) {
        if (!cancelled) setState({ user: null, roles: [], loading: false });
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      if (cancelled) return;
      setState({
        user,
        roles: (data ?? []).map((r) => r.role as AppRole),
        loading: false,
      });
    }

    supabase.auth.getUser().then(({ data }) => load(data.user));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        load(session?.user ?? null);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

export function hasRole(roles: AppRole[], role: AppRole): boolean {
  return roles.includes(role);
}

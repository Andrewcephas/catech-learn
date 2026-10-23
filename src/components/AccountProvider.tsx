import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const AccountContext = createContext<{ user: User | null; loading: boolean; recovery: boolean }>({ user: null, loading: true, recovery: false });
export const useAccount = () => useContext(AccountContext);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let revision = 0;
    const verify = async () => {
      const current = ++revision;
      const { data } = await supabase.auth.getUser();
      if (active && current === revision) { setUser(data.user); setLoading(false); }
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') { revision++; setUser(null); setLoading(false); setRecovery(false); void router.invalidate(); return; }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY') {
        setTimeout(() => { void verify(); void router.invalidate(); void queryClient.invalidateQueries(); }, 0);
      }
    });
    void verify();
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  return <AccountContext.Provider value={{ user, loading, recovery }}>{children}</AccountContext.Provider>;
}
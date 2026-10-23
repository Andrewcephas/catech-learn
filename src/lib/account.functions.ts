import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

export const getAccount = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profile, roles] = await Promise.all([
      context.supabase.from('profiles').select('*').eq('id', context.userId).single(),
      context.supabase.from('user_roles').select('role').eq('user_id', context.userId),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (roles.error) throw new Error(roles.error.message);
    return { profile: profile.data, roles: roles.data.map(row => row.role) };
  });

export const saveProfile = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ display_name: z.string().trim().min(1).max(100) }).parse(input))
  .handler(async ({ data, context }) => {
    const result = await context.supabase.from('profiles').update(data).eq('id', context.userId).select().single();
    if (result.error) throw new Error(result.error.message);
    return result.data;
  });
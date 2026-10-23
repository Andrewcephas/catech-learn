import { createFileRoute } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { UserRound, GraduationCap, Building2, Save } from 'lucide-react';
import { SiteNav, SiteFooter } from '@/components/SiteNav';
import { Button } from '@/components/ui/button';
import { getAccount, saveProfile } from '@/lib/account.functions';

const accountOptions = queryOptions({ queryKey: ['account'], queryFn: () => getAccount() });
export const Route = createFileRoute('/_authenticated/dashboard')({
  head: () => ({ meta: [
    { title: 'Your dashboard — CATECH Learn' },
    { name: 'description', content: 'Your CATECH Learn account and learning dashboard.' },
    { property: 'og:title', content: 'Your CATECH Learn dashboard' },
    { property: 'og:description', content: 'Manage your learning account.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(accountOptions),
  component: Dashboard,
});

function Dashboard() {
  const { data } = useSuspenseQuery(accountOptions);
  const [name, setName] = useState(data.profile.display_name);
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: () => saveProfile({ data: { display_name: name } }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['account'] }) });
  return <div className="min-h-screen"><SiteNav /><main className="mx-auto max-w-6xl px-5 py-12">
    <p className="text-sm font-semibold text-primary">MY CAMPUS</p>
    <h1 className="mt-2 text-3xl font-bold">Welcome, {data.profile.display_name || 'learner'}</h1>
    <div className="mt-5 flex flex-wrap gap-3">{data.roles.map(role => <span key={role} className="rounded-md bg-secondary px-3 py-1 text-sm capitalize">{role.replaceAll('_', ' ')}</span>)}</div>
    <div className="mt-10 grid gap-10 lg:grid-cols-2">
      <section><h2 className="flex items-center gap-2 text-xl font-bold"><UserRound className="h-5 w-5" /> Your profile</h2>
        <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
          <label className="block text-sm font-semibold" htmlFor="display-name">Display name</label>
          <input id="display-name" required maxLength={100} value={name} onChange={e => { setName(e.target.value); mutation.reset(); }} className="w-full rounded-md border border-input bg-card px-4 py-3" />
          <Button type="submit" disabled={mutation.isPending}><Save />{mutation.isPending ? 'Saving…' : 'Save profile'}</Button>
          {mutation.isSuccess && <p role="status" className="text-sm text-primary">Profile saved.</p>}
          {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
        </form>
        <div className="mt-8 border-t border-border pt-5"><h3 className="flex items-center gap-2 font-semibold"><Building2 className="h-5 w-5" /> Institution</h3><p className="mt-2 text-sm text-muted-foreground">{data.profile.institution_id ? 'Institution linked' : 'Not assigned to an institution yet'}</p></div>
      </section>
      <section><h2 className="flex items-center gap-2 text-xl font-bold"><GraduationCap className="h-5 w-5" /> My learning</h2><div className="mt-5 border-y border-border py-10"><p className="font-semibold">No courses enrolled yet</p><p className="mt-2 text-sm text-muted-foreground">Your assigned courses will appear here.</p></div></section>
    </div>
  </main><SiteFooter /></div>;
}
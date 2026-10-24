<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Accounts use a single root AccountProvider subscription and the managed client-only protected layout so session transitions and private pages remain consistent.
- Private account reads and profile updates use authenticated server functions and owner-scoped RLS; roles and institution assignments are never user-editable.
- New accounts receive the student role from a database trigger; elevated roles require trusted provisioning rather than signup metadata.
- The public index is a session-aware entry to /auth or /dashboard; keep real account workflows central rather than a parallel marketing home.

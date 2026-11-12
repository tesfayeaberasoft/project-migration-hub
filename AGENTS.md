<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules (Haroni Hotel DCMS)

- All data access goes through `src/services/http.ts` (`api.*`); pages never call `fetch` directly. Why: one switch point between the external PHP REST backend and the in-browser demo backend.
- `VITE_API_BASE_URL` selects the live PHP backend; when unset, `src/services/mock/handlers.ts` serves the same API contract from localStorage. Why: the data/auth server lives outside Lovable; keep the demo handlers in sync with any API change.
- Shared credit math lives in `src/lib/credit.ts` and is used by both UI and demo backend. Why: UI and backend must agree on balances.
- Portal pages live under `src/routes/_portal/<role>/` with `ssr: false` on the layout and `requireRole` in each role's `route.tsx`. Why: the session token lives in browser storage; the server enforces roles on every request.

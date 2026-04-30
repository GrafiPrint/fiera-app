# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server on localhost:5173
npm run build      # Production build → dist/
npm run preview    # Serve the dist/ build locally
```

No linting or test scripts are configured.

## Environment

Copy `.env.example` → `.env` and fill in Supabase credentials:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

When these vars are missing, the app falls back to `localStorage` automatically — `supabaseAttivo` (from `src/lib/supabase.js`) is the boolean guard used throughout.

## Architecture

**Stack:** React 18 + Vite + TailwindCSS (mobile-first). No test framework.

**Custom Tailwind colors:** `wine` (primary brand color, shades 50–950) and `gold` (400/500). Always use these instead of generic reds.

### Routes

| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `Home` | List of fiere, add/delete fiere, Google Sheets settings |
| `/oggi` | `Oggi` | All appointments across fiere for today |
| `/mappa` | `Mappa` | Fair map view |
| `/fiera/:id` | `FieraDetail` | Contact list for a fair, CSV upload, filters |
| `/fiera/:id/contatto/:cid` | `ContattoDetail` | Full contact profile, notes, voice, riferimento editor |

`BottomNav` is hidden on any route starting with `/fiera` (the `NO_NAV` constant in `App.jsx`).

### Data Layer

**Supabase tables:**
- `fiere` — fair metadata (nome, luogo, data_inizio, data_fine)
- `contatti` — contacts with columns: `id`, `fiera_id`, `nome`, `cognome`, `azienda`, `email`, `telefono`, `cellulare`, `posizione`, `regione`, `importanza_num` (INT 0–5), `giorno_num` (INT, day of month), `ora`, `ora_norm`, `ha_appuntamento`, `visitato`, `note_personali`, `riferimento`, `tag`, `dati` (JSONB — stores the full CSV row + special flags)

**`useFiere` hook** (`src/hooks/useFiere.js`):
- Manages the global fiere list with counts (fetched via `select('*, contatti(count)')`)
- Provides write operations: `addFiera`, `deleteFiera`, `updateFieraContatti`, `updateContatto`
- **Critical:** Every call to `useFiere()` creates an independent state instance. Do NOT use it to share contact state between components. Detail pages must fetch their own data directly from Supabase.
- Exports `rowToContatto` (DB row → app object) for use in direct queries.

**Direct Supabase queries in detail pages:**
`FieraDetail`, `ContattoDetail`, and `Oggi` all query Supabase directly with `useEffect` + local `useState` — bypassing `useFiere` state entirely. This avoids the race condition where `caricaFiere()` overwrites fresh data with stale counts.

**Pagination:** Supabase PostgREST returns max 1000 rows. Any query over a large contacts list must use a `while(true)` loop with `.range(from, from + PAGE - 1)` (PAGE = 1000). See `FieraDetail.jsx` for the pattern.

### Data Conversion

`contattoToRow(c, fieraId)` — converts a parsed CSV contact to a Supabase row. The full original contact object is stored in `dati` (JSONB) alongside the normalized columns.

`rowToContatto(row)` — converts a DB row back to an app contact. It spreads `row.dati` first, then overwrites with normalized DB columns. This means any field in `dati` that isn't a top-level column is still accessible.

### CSV Parsing (`src/utils/csvParser.js`)

`FIELD_MAP` maps CSV column names → internal app field names. It supports two formats simultaneously:
- **New format** — clean column names (e.g. `Nome Contatto`, `Azienda`, `Tag`)
- **Old format** — asterisk-prefixed names (e.g. `*Riferimento Contatto Fiera`, `First Name`)

**Critical pattern:** When iterating `FIELD_MAP`, always skip missing columns with `if (row[csvKey] === undefined) continue` — otherwise an empty string from a non-existent old-format column would overwrite a correctly-mapped new-format value.

`importanzaToNumber(str)` counts `X` characters in strings like `"XXX"` → `3`.

`normalizeOra(str)` converts human strings (`"mattina"`, `"pomeriggio"`) to sortable time strings (`"10:00"`, `"14:00"`). Returns `"99:99"` for unknown values so they sort last.

### Contatti "A Freddo"

Contacts added manually in-app (not from CSV) are stored with `dati: { freddo: true }`. When `updateFieraContatti` re-imports a CSV, it first saves all freddo rows, deletes everything, re-inserts the CSV, then re-inserts the freddo rows (without `id` so Supabase assigns a new one). In the UI, freddo contacts show a sky-blue card background and a `❄ FREDDO` badge.

### Voice Notes (`src/hooks/useVoiceNote.js`)

Uses Web Speech API with `continuous: false` + auto-restart on `onend` to avoid the browser accumulating transcripts across utterances. A `statoRef` (alongside the `stato` state) is used inside event callbacks to avoid stale closure bugs. `onResult` is called with only the new final transcript per utterance — not the full accumulated text.

### Google Sheets Sync (`src/hooks/useGoogleSheets.js`)

Optional integration via a Google Apps Script webhook URL stored in `localStorage`. Calls are fire-and-forget (`mode: 'no-cors'`). The companion script is at `google-apps-script/Code.gs` — it matches rows by email and writes to three special columns (`*Note App`, `*Visitato App`, `*Ultimo aggiornamento`).

### Importanza & Riferimento Badges

`ImportanzaBadge` renders 5 dots (gray/color) based on a numeric 0–5 value. Color ramps from gray → blue → yellow → orange → red.

`RiferentoBadge` color-maps known referents (fabio, alessio, rosy, bv) to specific Tailwind color classes. The key is derived from the first word of the name, lowercased.

### Notifications (`src/hooks/useNotifiche.js`)

`programmaNotifica` schedules a Web Notification only if the appointment is today, in the future, and within the next 2 hours. Uses `setTimeout` internally.

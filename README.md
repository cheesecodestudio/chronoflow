# Chronoflow

> A visual dashboard for the moments that matter.

Chronoflow is a client-side web application for creating and visualizing
count-up timers for events that already happened and countdown timers for
future events. It provides a management view for building a timer collection
and a presentation view for displaying them one at a time.

## Features

- Create counters and countdowns with date, time, and IANA timezone handling.
- Calculate elapsed and remaining time with calendar-aware Temporal operations.
- Manage timers from cards: create, delete with confirmation, and restart counters.
- Customize each timer with an accent color and icon.
- Show or hide seconds in timer displays.
- Present timers in a fullscreen, looping view with configurable 2-60 second slide duration.
- Navigate with previous/next controls, keyboard shortcuts, pause/resume, and fullscreen controls.
- Handle completed countdowns without displaying negative durations.
- Persist timers and presentation preferences in browser `localStorage`.
- Optionally sign in to an existing approved account with Supabase Auth from the Manage header.
- Provide responsive layouts, empty/error states, focus-managed dialogs, and reduced-motion behavior.

## Tech Stack

- React 19 and TypeScript
- Vite
- Tailwind CSS v4 through `@tailwindcss/vite`
- React Router
- Temporal through `temporal-polyfill`
- Font Awesome icons
- Supabase Auth through `@supabase/supabase-js`
- Vitest, Testing Library, and jsdom
- pnpm
- Vercel deployment configuration

## Architecture

The application is organized around a small repository boundary:

- `src/pages/` contains the Manage and Presentation views.
- `src/components/` contains reusable UI, forms, cards, dialogs, and settings.
- `src/features/timers/` contains timer types, temporal calculations, validation, use cases, settings, and repository contracts.
- `src/infrastructure/storage/` contains the browser storage implementations.

The UI uses timer use cases through `TimerRepository`; the current repository
implementation is `LocalStorageTimerRepository`. Presentation state such as
the active timer, pause state, transition phase, and fullscreen state remains
in the view rather than being persisted.

The main routes are `/manage` for timer management and `/view` for presentation.

See the [technical architecture](./context/03-technical-architecture.md) and
[testing strategy](./context/04-testing-strategy.md) for more detail.

## Getting Started

### Prerequisites

- Node.js 24 or newer
- pnpm 10.34.5

### Install

```bash
pnpm install
```

### Optional Supabase browser configuration

Copy `.env.example` to `.env.local` and provide the Supabase project URL and
publishable key when authentication is enabled:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

These values are public browser configuration. Never place a Supabase secret
or service-role key in a `VITE_` variable. If either approved value is missing,
Chronoflow remains local-only and the authentication boundary reports
`Authentication unavailable` without exposing configuration details.

Email/password sign-in is available only for an existing approved account;
Chronoflow does not provide account creation. Signing out affects only the
current browser session.

Authentication establishes identity, but it does not authorize timer database
access. Timers and preferences continue to use browser `localStorage` whether
the user is signed in or anonymous. Enabling authentication does not migrate,
synchronize, or persist timer data in Supabase.

### Start the development server

```bash
pnpm dev
```

Open the URL printed by Vite, then use `/manage` to create timers or `/view` to
open the presentation view.

## Available Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Vite development server. |
| `pnpm build` | Type-check the project and create a production Vite build. |
| `pnpm lint` | Run Oxlint. |
| `pnpm test` | Run Vitest in watch mode. |
| `pnpm test:run` | Run the test suite once. |
| `pnpm preview` | Serve the production build locally. |

There is no separate package script for type checking; `pnpm build` runs
`tsc -b` before Vite. For a no-emit type check, run:

```bash
pnpm exec tsc -b --noEmit
```

## Testing

Tests use Vitest with Testing Library, jsdom, and fake timers where timing
behavior needs deterministic control. The suite covers temporal calculations,
timezone and validation rules, local storage persistence, timer actions,
presentation behavior, keyboard navigation, fullscreen behavior, and the main
management flows.

Run the suite once with:

```bash
pnpm test:run
```

## Persistence

Chronoflow currently stores data in the browser's `localStorage`:

- timers: `chronoflow:timers:v1`
- display settings: `chronoflow:settings:v1`
- presentation settings: `chronoflow:presentation:v1`

Timer data is local to the browser and device. There is currently no server
persistence or cross-device timer synchronization. Optional Supabase
authentication establishes user identity only and does not change this
persistence model.

A `SupabaseTimerRepository` and database-backed timer persistence remain future
work. Database authorization, migrations, and RLS are separate from the current
browser-authentication capability.

## Project Status

Chronoflow is actively evolving. The current implementation is a client-side
MVP with presentation and timer-customization improvements layered on top.

Potential future work includes account-based persistence, authenticated user
data, cloud synchronization, and controlled AI-assisted timer creation. These
are roadmap items and are not part of the current implementation.

## License

Chronoflow is source-available under the Elastic License 2.0 (ELv2).

Copyright © 2026 Keslerth Calderón Artavia.

See [LICENSE](./LICENSE) for the full license terms.

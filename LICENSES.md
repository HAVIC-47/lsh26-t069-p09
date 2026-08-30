# Third-party licenses

All third-party code used in this project is listed below. No paid, restricted
or copyleft-encumbered dependency is used; everything is permissively licensed
and used unmodified from its public registry release.

## Runtime dependencies

| Package | Version | License | Used for |
|---|---|---|---|
| [next](https://github.com/vercel/next.js) | 16.3.3 | MIT | App Router framework, server components, server actions |
| [react](https://github.com/facebook/react) | 19.2.8 | MIT | UI runtime |
| [react-dom](https://github.com/facebook/react) | 19.2.8 | MIT | DOM renderer |
| [@supabase/supabase-js](https://github.com/supabase/supabase-js) | 2.112.4 | MIT | Postgres client for reads and writes |
| [@supabase/ssr](https://github.com/supabase/ssr) | 0.12.5 | MIT | Cookie-based Supabase session handling for the App Router |
| [server-only](https://www.npmjs.com/package/server-only) | 0.0.1 | MIT | Compile-time guard keeping the service-role key out of client bundles |
| [lucide-react](https://github.com/lucide-icons/lucide) | 1.37.0 | ISC | SVG icon set |
| [gsap](https://github.com/greensock/GSAP) | 3.15.0 | Standard "no charge" license — <https://gsap.com/standard-license> | Entry stagger and KPI count-up animations |

## Development dependencies

| Package | Version | License | Used for |
|---|---|---|---|
| [typescript](https://github.com/microsoft/TypeScript) | 5.x | Apache-2.0 | Type checking |
| [tailwindcss](https://github.com/tailwindlabs/tailwindcss) | 4.x | MIT | Styling |
| [@tailwindcss/postcss](https://github.com/tailwindlabs/tailwindcss) | 4.x | MIT | PostCSS plugin for Tailwind |
| [tsx](https://github.com/privatenumber/tsx) | 4.23.13 | MIT | Running the seed and test scripts |
| [dotenv](https://github.com/motdotla/dotenv) | 17.4.2 | BSD-2-Clause | Loading `.env.local` in scripts |
| [@types/node](https://github.com/DefinitelyTyped/DefinitelyTyped) | 20.x | MIT | Node type definitions |
| [@types/react](https://github.com/DefinitelyTyped/DefinitelyTyped) | 19.x | MIT | React type definitions |
| [@types/react-dom](https://github.com/DefinitelyTyped/DefinitelyTyped) | 19.x | MIT | React DOM type definitions |

## Fonts

| Asset | License | Used for |
|---|---|---|
| [Fira Sans](https://github.com/mozilla/Fira) | SIL Open Font License 1.1 | UI text, loaded via `next/font` |
| [Fira Code](https://github.com/tonsky/FiraCode) | SIL Open Font License 1.1 | Tabular figures — plates, odometer readings, money, dates |

## Templates and scaffolding

| Source | License | Notes |
|---|---|---|
| `create-next-app` default template | MIT | Used to scaffold the project. The generated placeholder page, styles and layout were replaced; the remaining generated files are `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` and `next-env.d.ts`. |

## Data

| Asset | Source | Notes |
|---|---|---|
| `data/P09_vehicle_service_public.json` | Supplied by LofiStack Hackathon 2026 as the public dataset for problem P09 | Used unmodified. Not authored by this team. |

## Services

| Service | Notes |
|---|---|
| [Supabase](https://supabase.com) | Hosted Postgres. Free tier. |
| [Vercel](https://vercel.com) | Hosting for the Next.js app. Free tier. |

## This project

All application source in `app/`, `lib/`, `components/`, `scripts/` and
`supabase/` was written by the team during the event window and carries no
third-party copyright.

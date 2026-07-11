# Maatu: Decision Log

Defaults chosen without asking, per standing rules. Newest first.

- 2026-07-11: Next.js app lives at the repo ROOT (not a `web/` subfolder) so Vercel deploys with zero root-directory configuration. The Python agent lives in `agent/`, which Vercel ignores.
- 2026-07-11: Scaffolded with create-next-app latest (Next 16 era, Tailwind v4, App Router, TypeScript, Turbopack, no ESLint). Spec said "Next.js 15"; latest is the same architecture and avoids pinning an outdated toolchain.
- 2026-07-11: Repo path is ~/Documents/Claude/maatu, matching every other project on this Mac. GitHub remote: jasonzacmusic/maatu, private.
- 2026-07-11: Git identity set per-repo to Jason Zac / music@nathanielschool.com (no global identity exists on this Mac; Vercel requires this author).
- 2026-07-11: keys.txt and all .env files are gitignored; keys are copied into .env.local (web) and agent/.env (worker) at "process inbox" time.

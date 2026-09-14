# iluvkt — TODO

## Done
- Next.js 16 app scaffold, warm theme, desktop sidebar + mobile tab bar, installable (manifest + icons)
- Data layer: Drizzle + Postgres (Neon when `DATABASE_URL` is set, embedded PGlite in `.data/` otherwise), auto-migrate + seed
- Password gate (`APP_PASSWORD`; off when unset)
- Home dashboard: total minutes, today ring vs goal, streaks, week chart, practice calendar, latest journal, song progress, milestones
- Practice: persistent timer (survives navigation), focus areas, song/sections, tempo, 30-min plan, mic recording, finish → AI journal
- Songs: chord sheet (ChordPro-style, paste your own lyrics), tempo-driven play-along with click + Travis tab, sections w/ status + best BPM, tutorial videos (watch-only, bookmarks, speed), recordings, details
- Lessons: 5 modules / 15 lessons with steps, chords, tools, video slot, completion
- Tools: tuner, metronome, chord library, one-minute chord changes, fretboard trainer
- Journal (list, detail, manual log, retry), Recordings (timeline, then-vs-now, star/rename/delete), Milestones, Settings (setup status)

## Needs you
- [ ] AI journal: add a credit card to Vercel AI Gateway (unlocks free credits) — journal generation currently fails with that message
- [ ] Neon: accept terms at https://vercel.com/atreyu-suttons-projects/~/integrations/accept-terms/neon?source=cli then `vercel integration add neon`
- [ ] Password: `vercel env add APP_PASSWORD` then `vercel env pull`
- [ ] Paste the lyrics into the chord sheet and double-check the progression against your tutorial
- [x] Tutorial video embedded (Josh Turner lesson)

## Next ideas
- Deploy to Vercel (`vercel deploy`)
- Move recordings to client-side direct Blob uploads if takes get very large
- Weekly AI progress summary on the home page

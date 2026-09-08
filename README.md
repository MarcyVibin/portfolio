# Portfolio

A single-page, recruiter-friendly portfolio site for a CS student at TU Graz.
Plain HTML/CSS/JS — no build step, no backend, no framework.

## What it does

- **Hero, About, Skills, Experience/Education, Contact** — static sections with
  a one-time entrance animation on load.
- **Projects** — the centerpiece. Project cards are driven by
  `projects.config.json` (just an `owner/repo` per entry); the page fetches
  each repo's README live from the GitHub REST API at load time, rewrites
  relative image/link paths so they resolve against the repo's raw content
  host, renders the Markdown client-side with `marked.js`, and sanitizes the
  result with DOMPurify before injecting it. Results are cached in
  `localStorage` for an hour to stay under GitHub's unauthenticated rate
  limit. If a fetch fails, each card falls back to manually written text
  from the config plus a "view on GitHub" link.
- READMEs are folded by default; each card has a toggle to expand them.

See `PLAN.md` for the original design brief (palette, type, layout
decisions) and the field-by-field config schema.

## Running locally

This only works served over `http://`, not opened as a `file://` path —
the GitHub/config `fetch()` calls are blocked under the file origin.
From this folder:

```
browser-sync start --server --files "*.html, *.css, *.js"
```

then open `http://localhost:3000/index.html`. Any other static file
server (`npx serve .`, VS Code Live Server, etc.) works the same way.

## Current status

- Structure, styling, and the full README fetch/render/cache pipeline are
  built and working end-to-end (verified against the three featured repos:
  `screen-selector`, `PDFConverter`, `ssh_controller`).
- Content is real, not placeholder, for name/bio/skills/experience — a few
  `<!-- TODO -->` comments remain in `index.html` (about bio, one experience
  entry) as a reminder to revisit that copy later.
- **Resume PDF is not added yet.** The hero's "Resume" button points at
  `assets/resume.pdf`; a small script checks whether that file exists and
  hides the button automatically until a real PDF is dropped in `assets/`.
- No accessibility or cross-browser pass beyond the basics (focus states,
  `prefers-reduced-motion`, semantic landmarks) has been done yet.

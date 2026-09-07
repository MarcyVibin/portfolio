# Portfolio Website — Plan

## 1. Overview

A single-page, recruiter-friendly, professional portfolio for a CS student (TU Graz).
Sections: Hero, About, Skills, Projects (auto-README), Experience/Education, Contact.

Stack: plain HTML/CSS/JS, no build step, no backend. Fully static — can be hosted
on GitHub Pages, Netlify, Vercel static, etc.

Code style: 2-space indentation throughout (HTML, CSS, JS, JSON).

---

## 2. Design direction

**Palette**

| Token            | Hex         | Use                            |
| ---------------- | ----------- | ------------------------------ |
| `--bg`         | `#FAFBFC` | page background                |
| `--surface`    | `#FFFFFF` | cards                          |
| `--ink`        | `#14181F` | primary text                   |
| `--muted`      | `#5B6472` | secondary text                 |
| `--line`       | `#E3E7EC` | borders/dividers               |
| `--accent`     | `#1E5AA8` | links, CTAs, highlights (blue) |
| `--accent-dim` | `#E8F0FB` | accent backgrounds, tags       |

**Type**

- Display/headings: a distinctive serif or grotesk (not the generic Inter-everywhere
  default) — proposing **Fraunces** for headings (has personality but reads as
  professional/editorial, not playful) + **Source Sans 3** or **IBM Plex Sans** for body.
- One monospace face (e.g. **JetBrains Mono**) reserved specifically for code-related
  bits inside rendered READMEs, not used as decorative UI chrome.

**Layout**

- Left-aligned content, generous margins, max content width ~1100px.
- Project cards: NOT identical SaaS cards with uniform shadow. Instead: a bordered
  panel per project, header row (name + tech tags + links), then the rendered
  README content beneath a subtle divider, with rendered images constrained and
  captioned.
- One deliberate motion moment on load (hero text/line reveal), everything else static
  or answers direct interaction (expand/collapse README, hover states on links only).

**Principles**

- Recruiter-first: fast load, scannable, real content over decoration.
- The README rendering IS the hero feature of the projects section — treat it as the
  main visual interest point rather than adding gradients/extra chrome.
- No tracked-out ALL-CAPS eyebrows, no '01/02/03' unless something is truly sequential
  (Experience timeline qualifies; Skills/Projects do not).

---

## 3. Sections

1. **Hero** — Name, one-line identity statement, links (GitHub / LinkedIn / email /
   resume PDF), subtle entrance animation.
2. **About** — Short bio, university (TU Graz), field of study, interests.
3. **Skills** — Grouped (Languages / Frameworks & Tools / Currently learning),
   not a flat badge wall.
4. **Projects** — Rendered from `projects.config.json` (see below). Each project is
   fetched live from GitHub and rendered client-side.
5. **Experience / Education** — Timeline (numbered OK here — genuinely sequential).
6. **Contact** — Email, socials, optional simple form (mailto-based, no backend).

---

## 4. Projects config file — `projects.config.json`

Goal: user adds a project by pasting a GitHub repo URL. Script auto-fetches the
repo's README (always Markdown) via the GitHub REST API, converts Markdown → HTML,
and rewrites any relative image paths in the README so they resolve to the raw
GitHub content host (critical — READMEs almost always use relative paths like
`./assets/demo.png`, which break outside the repo).

### Schema

```jsonc
{
  "projects": [
    {
      "repo": "MarcyVibin/screen-selector",   // required: "owner/repo"
      "branch": "main",                        // optional: defaults to repo's default branch
      "nameOverride": "Screen Selector",        // optional: overrides README title
      "descriptionOverride": null,              // optional: short manual blurb, used
                                                 //   as fallback text AND as the
                                                 //   subtitle shown above the README
      "tags": ["Python", "CV", "Tooling"],      // optional: manual tech tags
      "liveUrl": null,                          // optional: demo link
      "pinned": true,                           // optional: sort priority
      "fallbackText": "A small Python tool that lets you drag-select a screen region and grabs it as an image for further processing.",
                                                 // required-ish: shown if the GitHub
                                                 //   API fetch fails or rate-limits
      "hideReadme": false                       // optional: if true, only show
                                                 //   description, never fetch README
    }
  ],
  "settings": {
    "githubApiBase": "https://api.github.com",
    "rawContentBase": "https://raw.githubusercontent.com",
    "cacheTtlMinutes": 60,
    "maxProjectsShown": 6
  }
}
```

### Field behavior notes

- `repo` is the only truly required field — everything else has a sane fallback.
- `nameOverride` beats the README's first `#` heading beats a title-cased repo name.
- `descriptionOverride` / `fallbackText`: `descriptionOverride` is a short blurb shown
  regardless of fetch success (like a subtitle). `fallbackText` is what displays
  **instead of** the README body if the fetch fails (rate limit, 404, private repo,
  no README). If `fallbackText` is omitted, we fall back to `descriptionOverride`,
  then to a generic "View this project on GitHub" message.
- `hideReadme: true` lets you feature a project without doing any fetching at all
  (e.g. private repos, or a project you'd rather summarize yourself).

---

## 5. README fetch & render pipeline

1. For each project in config, call:
   `GET https://api.github.com/repos/{owner}/{repo}/readme`
   (optionally `?ref={branch}`) → returns metadata + base64-encoded content.
2. Decode base64 → raw Markdown text.
3. **Rewrite relative image/link paths (critical requirement):**
   - Any `![alt](path)` or `<img src="path">` where `path` is relative (doesn't start
     with `http://`, `https://`, or `data:`) gets rewritten to:
     `https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}`
   - Same rewrite applied to relative links `[text](path)` pointing at repo files.
   - Branch resolved from repo metadata (`default_branch`) if not set in config.
4. Convert Markdown → HTML using **marked.js** (loaded from CDN), with a custom
   renderer override for the image and link token types to do the rewrite from step 3
   before marked emits final HTML.
5. Sanitize output (basic allow-list or DOMPurify from CDN) before injecting via
   `innerHTML`, since we're rendering third-party content.
6. Insert into the project card; badges/shields (common in READMEs) render fine since
   they're already absolute URLs (shields.io etc.).
7. Client-side cache in `localStorage` keyed by repo+branch with a TTL (from
   `cacheTtlMinutes`) to avoid hammering the unauthenticated GitHub API (60 req/hr/IP
   limit).
8. On fetch failure at any step → show `fallbackText` (see fallback chain above),
   plus a "View README on GitHub" link.

---

## 6. Confirmed decisions

- **Featured repos (v1):** `screen-selector`, `PDFConverter`, `ssh_controller` (selected
  from the multi-select of all available repos). `machine_learning_1_2026`, `AI2-2026`,
  `wharmeow_bot` were not selected and are left out of v1 — can be added later by
  appending an entry to `projects.config.json` (`AI2-2026` and `wharmeow_bot` will need
  a `fallbackText`/`descriptionOverride` written by the user first, since they currently
  have no GitHub description).
- **Resume PDF:** "Add functionality but keep it empty for now." Hero includes a working
  "Resume" link/button wired up now, pointing to a placeholder path (e.g.
  `assets/resume.pdf`). No actual file is included yet — clearly commented in the code
  so it's easy to find and swap in later. Link should degrade gracefully (or be easy to
  hide) until the real file exists.
- **Contact:** simple `mailto:` link. No backend, no form service.

---

## 7. Build order (once approved)

1. Scaffold `index.html`, `styles.css`, `script.js`, `projects.config.json`.
2. Static sections first (Hero/About/Skills/Experience/Contact) with real + placeholder
   copy clearly marked.
3. Projects section + fetch/render/cache pipeline.
4. Responsive pass (mobile breakpoints).
5. Accessibility pass (focus states, contrast, reduced-motion).
6. Self-review against design brief, screenshot check, trim one thing.

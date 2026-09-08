# Website Critique and Improvement Direction

Review date: September 8, 2026.

This document contains only problems, opinions about what should change, and concrete recommendations. The goal is a website that communicates engineering ability to technical readers and feels deliberate, understandable, and credible to everyone else.

Scope: the current HTML, CSS, JavaScript, project and experience configuration, README, TODO, portrait asset, and linked project documentation. This is a source-based review with inspection of the portrait, not a browser-verified visual or accessibility audit. Layout risks that require rendering are identified as checks rather than claimed test results. Source line references describe the files at review time.

## 1. The Central Problem: The Website Asks for Belief Before Showing Evidence

The current sequence is a familiar portfolio outline: name, biography, skills, projects, experience, contact. Each receives a full screen, regardless of how much it has to say. The result risks looking like a template populated with personal information rather than a presentation designed around your particular work.

My main criticism is not that the website lacks effects. It is that the most important material is under-explained and visually undifferentiated.

- Nontechnical visitors need to understand what you made, what it does, and why someone would use it.
- Technical visitors need to see your contribution, constraints, decisions, and evidence that the software works.
- Neither audience should have to open a README to discover what a project is.

The design needs to make these answers visible. A different gradient, additional icons, or a more elaborate expansion animation will not do that.

**Priority: foundational.** Resolve the content hierarchy before polishing individual components.

## 2. Stop Making the Website Behave Like a Slideshow

**Evidence:** `styles.css:134-150` gives every section a viewport height and makes overflowing content scroll inside its container. `script.js:354-364` intercepts wheel input and advances between sections. `script.js:379-431` adds a second paging system for projects.

This makes the visitor adapt to the website instead of letting the website accommodate reading. A biography, a few contact links, and several projects do not deserve equal amounts of vertical space. Sparse sections become inflated while substantial content is squeezed into nested scrolling areas.

The site also combines a fixed navigation bar, a section-dot rail, project paging controls, and a scroll instruction. That is too much navigation machinery for a small portfolio.

### What I Would Change

- Use normal document scrolling and content-driven section heights.
- Make the opening section tall enough for its composition, not automatically a full viewport.
- Remove the instruction "Scroll - one section per screen."
- Remove the section-dot rail unless subsequent usability testing demonstrates a specific need for it.
- Present all four projects in the document instead of hiding them behind pagination.
- Keep a compact navigation bar with Work, Experience, About, and Contact.
- Use anchor offsets so the fixed header does not cover section headings.

There is also a concrete mismatch to resolve: the short-window CSS drops the viewport-height model at `styles.css:977-981`, but JavaScript wheel paging remains active. Reduced motion changes the animation behavior, not whether the wheel is intercepted. Simplifying scrolling removes the need to maintain these competing rules.

**Priority: highest.** This affects the entire experience, not just aesthetics.

## 3. Change the Order and the First-Screen Message

**Evidence:** About and Skills precede Projects in `index.html:81-147`. The hero repeats student status and says you build "from small tooling libraries" to "enterprise sized applications" at `index.html:56-62`.

The opening is broad enough to fit many portfolios. "Enterprise sized" is especially unconvincing without explaining scope, users, or your responsibility. It asks the reader to infer seniority from a phrase instead of showing relevant work.

### Recommended Page Sequence

1. A concise introduction with a specific focus and a direct route into the work.
2. Selected projects, with one project receiving visibly greater emphasis.
3. Professional experience, described through contributions rather than job labels.
4. A compact personal section with supporting capabilities and interests.
5. A short contact section and footer.

An illustrative positioning line, to refine against your actual responsibilities:

> I build workflow tools and integrations, and work on the systems underneath them.

Follow it with a concrete supporting sentence, not another slogan. Mention the kinds of tools, integrations, or systems you have actually implemented. Keep university and location as supporting context rather than repeating them across the opening and biography.

The primary action should be "Explore my work." Contact can be secondary. GitHub and LinkedIn do not need equal button weight beside the primary action, and a missing resume should not briefly appear as an available action while a request checks for it.

At a representative desktop viewport, aim to reveal the beginning of the work section without requiring a full-screen transition. On mobile, allow the content to take its natural height rather than shrinking it to satisfy that target.

**Priority: highest.** The first screen should establish relevance and lead to evidence.

## 4. Choose an Art Direction, Not a Collection of Components

**Evidence:** About facts, skill groups, project cards, and timeline content share a similar surface, border, and rounded-box treatment in `styles.css:455-462`, `488-493`, `598-603`, and `832-837`. Section backgrounds repeatedly use radial gradients at `styles.css:406-424`.

My concern is the repetition: different information types receive almost the same visual treatment. It can make the website feel assembled from a component checklist rather than composed around the content.

### The Direction I Would Choose

An editorial engineering portfolio: structured, restrained, and built around artifacts of the work.

- Use one primary dark neutral background, readable off-white text, and green mainly for actions and meaningful emphasis. Do not tint every surface, badge, and section with the same visual weight.
- Remove most decorative section gradients. Use spacing, alignment, image scale, and typography to establish hierarchy.
- Use the display serif selectively for the name and major headings. Let project explanations and interface labels use the body typeface. Reserve monospace for genuinely technical labels, code, and compact metadata.
- Give the featured project a large image or diagram paired with a narrower explanation column. Put supporting projects in a quieter two-column arrangement where space permits.
- Use simple separated rows for experience rather than another series of filled cards.
- Let About be a short piece of writing with a smaller portrait, not a boxed fact sheet repeating the hero.
- Define consistent image framing and captions so unrelated project screenshots still belong to the same website.

The visual signature should come from the relationship between explanatory text and real work artifacts. Do not replace the current template with a terminal simulation, glowing grid, particle background, arbitrary bento layout, or stock dashboard illustrations.

Do not add random visual variation just to avoid repetition. Layout differences should correspond to different kinds of content and levels of importance.

**Priority: high.** Establish these rules before changing individual card shapes or adding motion.

## 5. Make Projects Understandable Without Clicking Anything

**Evidence:** Three projects have `descriptionOverride: null` in `projects.config.json:15-45`. `script.js:153-172` only inserts a card summary when that override exists. Repository descriptions are fetched but are not used as visible subtitles. Fallback summaries are shown inside the README area on failure, not as the normal introduction.

This leaves the normal collapsed presentation dependent on project names, tags, and links. "SSH Controller" is not an explanation for someone who does not know SSH. "Python / Tooling" does not explain why the project matters.

The subtitle "Pulled live from GitHub" at `index.html:152-154` describes the website's implementation instead of helping the visitor understand the work.

### Every Project Needs a Curated Preview

- A clear title and one sentence describing the problem or use.
- A real screenshot, annotated output, diagram, or short demonstration.
- A concise statement of what you personally implemented.
- One detail that gives the project substance: a constraint, integration, testing challenge, or difficult behavior.
- Separate, clearly labeled routes to the case study and source code.

Do not force identical amounts of text or perfectly square boxes. Let the artifact determine the image proportions. A desktop application screenshot and a systems diagram have different needs.

All four projects are currently pinned. Select a lead project based on the depth of evidence you can present, not just which title sounds most advanced. Do not enlarge the operating-system project merely because operating systems sound difficult if there is no supporting explanation yet.

### Specific Project Changes

**Operating System Development:** The current description names the course and lecturer but does not establish your contribution. Replace "absolved" with "completed." Describe extending SWEB, distinguish the supplied kernel from your implementation, and explain team ownership. Name actual implemented features and one debugging or testing challenge. If publishing code is prohibited, state that and show a permitted diagram or technical explanation instead. Do not imply the kernel was built entirely from scratch.

**Screen Selector:** Show the sequence of selecting a region and obtaining the captured image. Explain where that output goes next. Put platform limitations and the package/API link in supporting detail. Do not rely on "CV" to communicate purpose or imply a computer-vision algorithm that the project does not demonstrate.

**PDF Converter:** Show example inputs and the resulting PDF or merged document using synthetic files. The configured "to and from PDF" claim should be narrowed unless reverse conversion is actually supported; the linked documentation describes conversion to PDF and PDF merging. State Windows and Office requirements where relevant.

**SSH Controller:** Describe the actual file-transfer workflow before using broader language about controlling remote devices. Show the interface and an example transfer. Technical detail should explain configuration, credential handling, host verification, and error behavior where verified. These are questions to answer, not established security defects.

**Priority: highest.** This is the main route to making ability visible to both audiences.

## 6. A README Is Not a Portfolio Case Study

**Evidence:** `script.js:194-225` imports repository documentation into cards. `TODO.md:7-10` proposes expanding a clicked project to nearly full screen and removing the README button.

Repository documentation is written for installation and use. A portfolio case study is written to establish relevance, ownership, and judgment. Enlarging the README would amplify installation commands, badge rows, tables of contents, and upstream formatting instead of solving that mismatch.

### Recommended Detail Structure

1. What problem the project addresses and who it is for.
2. A demonstration or visual explanation of its behavior.
3. Your responsibilities and the project context: personal, team, course, or client work.
4. One or two engineering decisions, including the alternatives or constraints that mattered.
5. How you tested it, known limitations, and what you would change next.
6. Links to source, installation documentation, and a live version when one genuinely exists.

Prefer ordinary linked detail pages for longer case studies. They support direct links, browser history, and reading without squeezing content into a panel. Short details can remain inline.

If an overlay is ultimately chosen, require an explicit detail action, visible close control, Escape dismissal, keyboard access, focus containment and restoration, and reduced-motion support. Do not make an entire card a pseudo-button with competing nested links.

Remove upstream template residue before importing any documentation. In particular, the reviewed PDF Converter README contains a license placeholder and a `YOUR-LINKEDIN-NAME` link. Verify its issue destinations as well. These details undermine the impression of care.

**Priority: high.** Curate the content first; choose the expansion behavior afterward.

## 7. Recompose the Portrait Instead of Hiding It Behind Atmosphere

**Evidence:** `assets/profile.png` is a 1500 by 2000 restaurant photograph. The hero uses it as a large cover image with centered positioning and substantial gradient overlays in `styles.css:160-174` and `210-215`.

The photograph includes a large umbrella and sky area, background diners, and a table with food and drinks. These compete with the face. The issue is its composition and role on this website, not that a developer needs a corporate headshot.

### What I Would Change

- Try a deliberate head-and-shoulders crop with a face-aware focal point.
- Use a smaller portrait beside the introduction or within About, rather than letting an unrelated restaurant scene occupy most of the opening image area.
- If the crop remains distracting, use a new photograph with a simpler background and controlled lighting.
- Avoid heavy green overlays as a substitute for choosing a suitable image.
- Export appropriately sized compressed variants and reserve image dimensions to avoid layout movement.
- Check the crop independently on narrow screens; centered `object-fit: cover` is not an art-direction strategy.

Add work imagery before adding more decorative artwork. The assets directory currently provides no local project screenshots or diagrams. Remote README images are not a substitute for selecting and composing the images visitors should encounter first.

**Priority: high for visual identity.** The portrait and project imagery need intentional roles.

## 8. Replace Skill Badges and Vague Experience With Specific Evidence

**Evidence:** `index.html:112-144` presents skills as three groups of labels. Every experience entry has an empty bullet array in `experience.config.json`. Work descriptions use broad phrases such as "high-level Full Stack architecture."

A list of technologies makes claims without explaining depth. Making the skill section "more special" through animation or a logo cloud would decorate the same information gap.

### Capabilities

Replace the full-screen skills section with compact capability statements linked to work. Potential categories are systems programming, workflow automation, and integrations, but only use categories you can support with specific examples.

Keep a short technology list as supporting metadata if useful. Do not add proficiency percentages, progress bars, or fabricated expertise levels. Separate what you have shipped from what you are currently learning.

### Experience

For each role, state the workflow or product, your contribution, and the result or validation. If numerical outcomes are unavailable, say what was delivered and who it served. Do not manufacture time savings, user counts, or business impact.

Clarify the relationship between self-employment and BBMRI-ERIC. If it is client work, label it accordingly. Distinguish architecture assistance, prototype implementation, production delivery, and maintenance instead of grouping them under a broad full-stack claim.

Confirm the AVL internship's status. "August 2026 - 1 month" and present-tense "Building" need a consistent treatment if the internship has ended. Normalize date formatting, capitalization, and institution naming.

### About

Cut generic statements such as loving interesting projects and repeating that you study computer science. Explain one specific homelab experiment or recurring problem you like solving. Keep personal interests brief. If showing a homelab diagram, omit credentials, public access details, and other sensitive information.

**Priority: high.** Precision reads as confidence; inflated wording invites doubt.

## 9. Make Interaction Quieter and More Predictable

**Evidence:** Several buttons scale on hover in `styles.css:374-399`, `579-581`, `660-669`, and `690-699`. The existing TODO requests more icons and a prominent project expansion animation.

Repeated scaling can make basic controls feel unnecessarily animated. Motion should explain a state change, not repeatedly ask for attention.

- Prefer restrained color, border, and underline changes for ordinary links.
- Reserve transitions for changes that benefit from continuity, such as opening a short detail region.
- Use recognizable icons only where they improve scanning. Keep text labels for GitHub, LinkedIn, and email.
- Resolve reported button alignment through line-height, layout, and font metrics, not arbitrary pixel nudges. The reported issue still needs browser inspection.
- Make the primary action visibly primary; do not give every outbound link a filled container.
- If a back-to-top link is needed, place a quiet text link near the footer. Do not add another floating control beside the existing navigation rail.

**Priority: medium.** Do this after the page hierarchy and project presentation change.

## 10. Mobile and Accessibility Must Shape the Layout

**Evidence:** At narrow widths the navigation keeps all five links and reduces their size (`styles.css:953-958`). Skills stack vertically while retaining the section-height model until the short-height breakpoint. Projects add a separate paging interaction and height constraint.

These are risks requiring rendered checks, particularly on narrow phones, landscape screens, and enlarged text. Do not assume that stacking columns is a complete mobile design.

- Ensure navigation fits without tiny text or cramped targets. Reduce the link set or use an accessible menu when needed.
- Use one-column projects on mobile, with summaries and images visible in the normal page flow.
- Verify that long project titles, the email address, and code samples do not cause page-wide horizontal overflow.
- Check portrait placement and text legibility independently at mobile widths.
- Give controls sufficiently large hit areas and visible keyboard focus.
- Measure text, focus, and control contrast against their actual backgrounds. Do not assume different shades of green provide sufficient separation.
- Ensure reduced motion covers all relevant interaction effects, not just the entrance animation.
- Keep the footer in normal flow where content length or zoom could otherwise make it overlap content.

**Priority: release requirement.** A design that only works in a preferred desktop viewport does not communicate engineering care.

## 11. Remove Fragile Dependencies From the Core Story

**Evidence:** Project and experience containers start empty in `index.html:159-181`. Their content is fetched and inserted by `script.js`. README rendering depends on externally hosted scripts at `index.html:220-223` and GitHub requests at `script.js:66-95`.

The visitor should not lose the substance of the portfolio because an external service, script, or request fails. The essential project summaries and experience should be available independently of live README loading.

### Recommended Changes

- Deliver core content in HTML, either authored directly or generated from configuration before deployment. Do not introduce a large framework just to do this.
- Treat remote README content as optional enrichment, preferably loaded only when requested.
- If the Markdown pipeline remains, pin exact dependency versions and use appropriate integrity or local-vendoring controls rather than floating CDN versions.
- Add bounded request behavior and deliberate loading, error, and retry states where remote content is retained.
- Make the portrait URL explicit instead of probing a nonexistent JPG before loading the PNG.
- Add a current, text-selectable resume and intentionally expose its link. Do not rely on a runtime existence check to decide the layout.
- Add a favicon and deliberate social-preview metadata and image. The current head does not define them.
- Replace the generic search description with a concise, accurate statement of the work and focus.
- Repair the README's reference to missing `PLAN.md` and update its description of the current configuration.

**Priority: medium to high.** Reliability and presentation are inseparable when loading failures remove the evidence.

## 12. How I Would Reprioritize the Existing TODO

The current TODO is weighted toward decoration and interaction before it resolves content presentation.

| Existing request | Recommended treatment |
| --- | --- |
| Floating back-to-top control | Defer; simplify navigation first and use a footer link if needed. |
| Add application and social logos | Keep secondary; use labeled icons sparingly, not as visual identity. |
| Fix button text alignment | Verify in-browser and correct the underlying metrics during component cleanup. |
| Make Skills more special | Replace the standalone badge section with evidence-linked capabilities. |
| Make project boxes more square | Design around screenshots and content, not a prescribed shape. |
| Theme the inner scrollbar | Remove unnecessary nested scrolling before styling its symptoms. |
| Expand README almost full screen | Write case-study content first; prefer linked detail pages for long material. |
| Remove the explicit README action | Replace it with an explicit case-study action rather than an undiscoverable click target. |

This document does not modify or override the TODO. It explains where I would challenge its priorities.

## 13. Implementation Order

1. **Prepare the evidence.** Write visible summaries for every project, clarify contribution and experience, correct unsupported claims, and identify permitted screenshots or diagrams. Without this, the redesign has nothing specific to organize.
2. **Simplify the page model.** Remove forced section paging and nested project pagination. Reorder the page to bring work forward and reduce redundant navigation.
3. **Build the visual hierarchy.** Establish the editorial layout, choose the featured project, compose supporting projects, refine portrait placement, and replace repetitive containers with content-appropriate treatments.
4. **Create project details.** Add concise case studies with technical depth, limitations, and evidence links. Keep installation documentation secondary.
5. **Finish the presentation.** Refine typography, spacing, image sizing, buttons, icons, contact, resume, and sharing metadata.
6. **Verify the entire experience.** Test responsive layout, keyboard use, motion preferences, contrast, content loading failures, and browsers before adding optional effects.

## 14. Acceptance Checklist

These are targets for the redesign, not claims that the current site has been tested against them.

- [ ] A first-time visitor can explain what you build after reading the opening and one project preview.
- [ ] Every project states its purpose without requiring expansion or knowledge of its technology tags.
- [ ] At least one project demonstrates your contribution, an engineering decision, and how the result was validated.
- [ ] The featured project has more emphasis because of its evidence, not arbitrary visual novelty.
- [ ] Work imagery shows actual behavior or architecture and includes useful captions.
- [ ] No fabricated metrics, exaggerated ownership claims, or unresolved template placeholders remain.
- [ ] Normal wheel, trackpad, touch, and keyboard scrolling work without forced screen jumps.
- [ ] All four projects are discoverable without project pagination.
- [ ] Layouts work at representative widths such as 320, 390, 768, 1280, and 1440 pixels, including short landscape windows.
- [ ] Text remains readable and content reachable at 200% zoom, with reflow checked at 400% on desktop.
- [ ] Keyboard focus follows a sensible order and remains visible; any overlay supports dismissal and focus restoration.
- [ ] Reduced-motion preferences remove nonessential movement.
- [ ] Contrast is measured, including muted text and focus indicators on actual surfaces.
- [ ] Core project and experience information remains available when optional external services are blocked.
- [ ] A fresh visit on a throttled connection does not reveal broken-image probes, disappearing primary actions, or disruptive layout shifts.
- [ ] Source, contact, resume, and project-detail links work, and browser history behaves predictably.
- [ ] Chrome, Firefox, and Safari are checked where available, with actual mobile-device checks rather than viewport resizing alone.
- [ ] The page no longer needs decorative effects to compensate for missing explanations.

The target is not to look more complicated. It is to make the work more legible, the claims more specific, and every layout and interaction choice more intentional.

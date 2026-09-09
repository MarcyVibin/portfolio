(() => {
  'use strict';

  const CONFIG_URL = 'projects.config.json';
  const EXPERIENCE_CONFIG_URL = 'experience.config.json';
  const CACHE_PREFIX = 'portfolio:readme:';

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  function isRelativePath(path) {
    if (!path) return false;
    return !/^(https?:)?\/\//i.test(path) && !path.startsWith('data:') && !path.startsWith('#');
  }

  function toRawUrl(owner, repo, branch, path) {
    const cleanPath = path.replace(/^\.?\//, '');
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
  }

  function toBlobUrl(owner, repo, branch, path) {
    const cleanPath = path.replace(/^\.?\//, '');
    return `https://github.com/${owner}/${repo}/blob/${branch}/${cleanPath}`;
  }

  function titleCase(str) {
    return str
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function extractTitle(markdown) {
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : null;
  }

  function cacheKey(owner, repo, branch) {
    return `${CACHE_PREFIX}${owner}/${repo}@${branch}`;
  }

  function readCache(key, ttlMinutes) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > ttlMinutes * 60 * 1000) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
    } catch (e) {
      /* localStorage unavailable or full — non-fatal, just skip caching */
    }
  }

  /* ------------------------------------------------------------------ */
  /* GitHub fetch                                                        */
  /* ------------------------------------------------------------------ */

  async function fetchRepoMeta(apiBase, owner, repo) {
    const res = await fetch(`${apiBase}/repos/${owner}/${repo}`);
    if (!res.ok) throw new Error(`repo meta fetch failed: ${res.status}`);
    return res.json();
  }

  async function fetchReadme(apiBase, owner, repo, branch) {
    const url = branch
      ? `${apiBase}/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(branch)}`
      : `${apiBase}/repos/${owner}/${repo}/readme`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`readme fetch failed: ${res.status}`);
    const json = await res.json();
    const markdown = decodeURIComponent(escape(atob(json.content.replace(/\n/g, ''))));
    return markdown;
  }

  async function loadProjectData(project, settings) {
    const [owner, repo] = project.repo.split('/');
    const key = cacheKey(owner, repo, project.branch || 'default');
    const cached = readCache(key, settings.cacheTtlMinutes);
    if (cached) return cached;

    const meta = await fetchRepoMeta(settings.githubApiBase, owner, repo);
    const branch = project.branch || meta.default_branch || 'main';
    const markdown = await fetchReadme(settings.githubApiBase, owner, repo, project.branch);

    const data = { owner, repo, branch, markdown, repoDescription: meta.description || null };
    writeCache(key, data);
    return data;
  }

  /* ------------------------------------------------------------------ */
  /* Markdown rendering                                                  */
  /* ------------------------------------------------------------------ */

  function renderMarkdown(markdown, owner, repo, branch) {
    const renderer = new marked.Renderer();

    renderer.image = ({ href, title, text }) => {
      const src = isRelativePath(href) ? toRawUrl(owner, repo, branch, href) : href;
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${src}" alt="${text || ''}"${titleAttr} loading="lazy">`;
    };

    renderer.link = function (token) {
      const { href, title, tokens, text } = token;
      const url = isRelativePath(href) ? toBlobUrl(owner, repo, branch, href) : href;
      const titleAttr = title ? ` title="${title}"` : '';
      const external = /^https?:\/\//i.test(url);
      const target = external ? ' target="_blank" rel="noopener"' : '';
      // token.text is the raw, unparsed source for links with nested content
      // (e.g. a badge image inside a link) — must re-parse via the parser to
      // resolve nested tokens (images, emphasis, etc.) into their own HTML.
      const inner = tokens ? this.parser.parseInline(tokens) : (text || '');
      return `<a href="${url}"${titleAttr}${target}>${inner}</a>`;
    };

    const rawHtml = marked.parse(markdown, { renderer });
    return DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target', 'rel', 'loading'] });
  }

  /* ------------------------------------------------------------------ */
  /* Card rendering                                                      */
  /* ------------------------------------------------------------------ */

  function resolveName(project, markdown) {
    if (project.nameOverride) return project.nameOverride;
    const [, repo] = project.repo.split('/');
    if (markdown) {
      const heading = extractTitle(markdown);
      if (heading) return heading;
    }
    return titleCase(repo);
  }

  function buildCardShell(project) {
    const card = document.createElement('article');
    card.className = 'project-card';
    if (project.repo) card.dataset.repo = project.repo;

    const [owner, repo] = project.repo ? project.repo.split('/') : [null, null];
    const tags = (project.tags || [])
      .map((t) => `<span class="project-tag">${t}</span>`)
      .join('');
    const displayName = project.nameOverride || (repo ? titleCase(repo) : 'Untitled Project');

    /* A project without a README has nothing further to show — its description
       is already on the card face — so it gets no open affordance. */
    const openable = !project.hideReadme;
    if (openable) card.classList.add('is-openable');

    /* fallbackText is a human-written summary of the repo, so it doubles as the
       card blurb — without it a card with no descriptionOverride is just a
       title and tags on a large empty panel. */
    const blurb = project.descriptionOverride || project.fallbackText;

    card.innerHTML = `
      ${openable ? '<button class="project-open" type="button"></button>' : ''}
      <div class="project-card-body">
        <h3 class="project-name">${displayName}</h3>
        ${blurb ? `<p class="project-subtitle">${blurb}</p>` : ''}
        <div class="project-tags">${tags}</div>
      </div>
      <div class="project-card-foot">
        <div class="project-links">
          ${project.repo ? `<a class="project-link-btn" href="https://github.com/${owner}/${repo}" target="_blank" rel="noopener"><svg class="icon" aria-hidden="true"><use href="#i-github"></use></svg>GitHub</a>` : ''}
          ${project.liveUrl ? `<a class="project-link-btn" href="${project.liveUrl}" target="_blank" rel="noopener"><svg class="icon icon-stroke" aria-hidden="true"><use href="#i-external"></use></svg>Live</a>` : ''}
        </div>
        ${openable ? `<span class="project-open-hint">Open<svg class="icon icon-stroke" aria-hidden="true"><use href="#i-arrow-right"></use></svg></span>` : ''}
      </div>
      ${openable ? '<div class="project-readme" hidden><div class="project-skeleton"></div></div>' : ''}
    `;

    if (openable) {
      const openBtn = card.querySelector('.project-open');
      openBtn.setAttribute('aria-label', `Open ${displayName}`);
      openBtn.addEventListener('click', () => openProjectModal(card));
    }

    return card;
  }

  function fallbackMessage(project) {
    return project.fallbackText || project.descriptionOverride ||
      'View this project on GitHub for more details.';
  }

  async function populateCard(card, project, settings) {
    if (project.hideReadme) return;

    const body = card.querySelector('.project-readme');

    if (!project.repo) {
      body.innerHTML = `<p>${fallbackMessage(project)}</p>`;
      return;
    }

    const [owner, repo] = project.repo.split('/');

    try {
      const data = await loadProjectData(project, settings);
      const html = renderMarkdown(data.markdown, data.owner, data.repo, data.branch);
      body.innerHTML = html;

      const heading = extractTitle(data.markdown);
      if (!project.nameOverride && heading) {
        const nameEl = card.querySelector('.project-name');
        if (nameEl) nameEl.textContent = heading;
      }
    } catch (err) {
      body.innerHTML = `
        <p>${fallbackMessage(project)}</p>
        <p class="project-fallback-note">
          Could not load live README &mdash;
          <a href="https://github.com/${owner}/${repo}#readme" target="_blank" rel="noopener">view README on GitHub</a>.
        </p>
      `;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Init                                                                */
  /* ------------------------------------------------------------------ */

  /* Hero photo: try assets/profile.jpg, then assets/profile.png, then fall
     back to the initials-over-geometry treatment. */
  function initHeroPhoto() {
    const img = document.getElementById('hero-photo');
    const fallback = document.getElementById('hero-fallback');
    const initialsEl = document.getElementById('hero-initials');
    if (!img || !fallback || !initialsEl) return;

    const name = (document.querySelector('.hero-name')?.textContent || '').trim();
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    initialsEl.textContent = initials || '?';

    const candidates = ['assets/profile.jpg', 'assets/profile.png'];
    let i = 0;

    function tryNext() {
      if (i >= candidates.length) {
        img.hidden = true;
        fallback.hidden = false;
        return;
      }
      img.src = candidates[i++];
    }

    img.addEventListener('load', () => {
      img.hidden = false;
      fallback.hidden = true;
    });
    img.addEventListener('error', tryNext);
    tryNext();
  }

  /* Right-side section rail: highlights whichever section owns the middle of
     the viewport. */
  function initSectionNav() {
    const links = Array.from(document.querySelectorAll('.section-nav a'));
    if (!links.length) return;

    const topLinks = Array.from(document.querySelectorAll('.nav-links a'));
    const rail = document.getElementById('section-nav');
    const backToTop = document.getElementById('back-to-top');
    const sections = links
      .map((link) => document.querySelector(link.getAttribute('href')))
      .filter(Boolean);

    if (backToTop) {
      backToTop.addEventListener('click', () => scrollToSection(0));
    }

    function setActive(id) {
      links.forEach((link) => {
        const active = link.getAttribute('href') === `#${id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
      topLinks.forEach((link) => {
        link.classList.toggle('is-current', link.getAttribute('href') === `#${id}`);
      });
      /* Nothing to go back to while the hero is on screen. */
      if (rail) rail.classList.toggle('show-top', id !== 'hero');
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
  }

  /* Skill meters fill when the section comes into view. Each row carries its
     own level and a stagger index; the widths themselves are CSS. */
  function initSkillMeters() {
    const bento = document.getElementById('skills-bento');
    if (!bento) return;

    const rows = Array.from(bento.querySelectorAll('.skill-row'));
    rows.forEach((row, i) => {
      row.style.setProperty('--level', row.dataset.level || '0');
      row.style.setProperty('--row-index', String(i));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          bento.classList.toggle('is-visible', entry.isIntersecting);
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(bento);
  }

  /* Section paging. Native CSS snapping can't serve a mouse wheel here:
     `mandatory` reverts any scroll shorter than half a screen, `proximity`
     barely engages, and both cancel programmatic smooth scrolls. So the wheel
     is paged here, on a scroll container with snapping switched off. */

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const COARSE_POINTER = window.matchMedia('(pointer: coarse)');
  const PAGE_DURATION = 650;
  let pagingLockedUntil = 0;
  let scrollAnimation = 0;

  /* The page transition is animated here rather than with
     `scrollTo({behavior:'smooth'})`: native smooth scrolling gives no control
     over duration or easing, is cancelled by any stray input, and is a silent
     no-op in engines where it is disabled — which left every nav click dead. */
  function scrollToSection(top) {
    cancelAnimationFrame(scrollAnimation);
    pagingLockedUntil = performance.now() + PAGE_DURATION;

    const start = window.scrollY;
    const distance = top - start;
    if (REDUCED_MOTION.matches || !distance) {
      window.scrollTo(0, top);
      return;
    }

    const startedAt = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / PAGE_DURATION);
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, start + distance * eased);
      if (progress < 1) scrollAnimation = requestAnimationFrame(step);
    };
    scrollAnimation = requestAnimationFrame(step);
  }

  /* True when the wheel belongs to a nested scroller (an expanded README, a
     section too tall for a short window) that still has room to move. */
  function consumedByInnerScroller(node, deltaY) {
    /* `node` may be `document` or `<html>` itself when the wheel fires outside
       `<body>`'s box (e.g. the pointer sitting over the gutter after a resize
       or browser zoom shifts body's fill) — `nodeType !== 1` catches those
       non-Element ancestors before getComputedStyle() throws on them. */
    for (let el = node; el && el.nodeType === 1 && el !== document.body; el = el.parentElement) {
      const style = getComputedStyle(el);
      if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') continue;
      const room = el.scrollHeight - el.clientHeight;
      if (room <= 1) continue;
      if (deltaY > 0 && el.scrollTop < room - 1) return true;
      if (deltaY < 0 && el.scrollTop > 1) return true;
    }
    return false;
  }

  function initSectionPaging() {
    const sections = Array.from(document.querySelectorAll('.hero, .section'));
    if (!sections.length) return;

    function nearestIndex() {
      let best = 0;
      let bestDistance = Infinity;
      sections.forEach((section, i) => {
        const distance = Math.abs(section.offsetTop - window.scrollY);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = i;
        }
      });
      return best;
    }

    function goTo(index) {
      const clamped = Math.max(0, Math.min(sections.length - 1, index));
      scrollToSection(sections[clamped].offsetTop);
    }

    window.addEventListener('wheel', (event) => {
      if (COARSE_POINTER.matches) return;
      if (event.ctrlKey) return;
      if (consumedByInnerScroller(event.target, event.deltaY)) return;

      /* With a project expanded, the wheel must never page the section behind
         it — swallow anything the modal's own scroller didn't take. */
      if (projectModalOpen) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      if (performance.now() < pagingLockedUntil) return;

      const direction = Math.sign(event.deltaY);
      if (direction) goTo(nearestIndex() + direction);
    }, { passive: false });

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        scrollToSection(target.offsetTop);
        history.replaceState(null, '', link.getAttribute('href'));
      });
    });
  }

  /* Project modal. Clicking a card expands it to near-fullscreen: the panel is
     painted over the card's own rect, then transitioned to the centred target,
     so the card appears to grow into the dialog. */

  let projectModalOpen = false;
  let openProjectModal = () => {};

  function initProjectModal() {
    const modal = document.getElementById('project-modal');
    if (!modal) return;

    const panel = modal.querySelector('.project-modal-panel');
    const titleEl = document.getElementById('project-modal-title');
    const tagsEl = document.getElementById('project-modal-tags');
    const linksEl = document.getElementById('project-modal-links');
    const bodyEl = document.getElementById('project-modal-body');
    const closeBtn = modal.querySelector('.project-modal-close');

    let sourceCard = null;
    let readme = null;
    let closeTimer = 0;

    function setRect(rect) {
      panel.style.top = `${rect.top}px`;
      panel.style.left = `${rect.left}px`;
      panel.style.width = `${rect.width}px`;
      panel.style.height = `${rect.height}px`;
    }

    function targetRect() {
      const width = Math.min(1040, window.innerWidth * 0.92);
      const height = Math.min(820, window.innerHeight * 0.86);
      return {
        top: (window.innerHeight - height) / 2,
        left: (window.innerWidth - width) / 2,
        width,
        height
      };
    }

    function open(card) {
      if (projectModalOpen) return;
      clearTimeout(closeTimer);

      sourceCard = card;
      titleEl.textContent = card.querySelector('.project-name').textContent;
      tagsEl.innerHTML = card.querySelector('.project-tags').innerHTML;
      linksEl.innerHTML = card.querySelector('.project-links').innerHTML;

      /* Move (not clone) the readme so the content populateCard already fetched
         is reused, and stays put when the modal closes. */
      readme = card.querySelector('.project-readme');
      if (readme) {
        readme.hidden = false;
        bodyEl.appendChild(readme);
      }

      modal.hidden = false;
      projectModalOpen = true;

      panel.style.transition = 'none';
      setRect(card.getBoundingClientRect());
      panel.getBoundingClientRect();
      panel.style.transition = '';

      modal.classList.add('is-open');
      setRect(targetRect());
      closeBtn.focus();
    }

    function close() {
      if (!projectModalOpen) return;
      projectModalOpen = false;

      if (sourceCard) setRect(sourceCard.getBoundingClientRect());
      modal.classList.remove('is-open');

      closeTimer = setTimeout(() => {
        modal.hidden = true;
        if (readme && sourceCard) {
          readme.hidden = true;
          sourceCard.appendChild(readme);
          readme = null;
        }
        if (sourceCard) {
          const opener = sourceCard.querySelector('.project-open');
          if (opener) opener.focus();
          sourceCard = null;
        }
      }, 440);
    }

    modal.querySelectorAll('[data-modal-close]').forEach((el) => {
      el.addEventListener('click', close);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && projectModalOpen) close();
    });
    window.addEventListener('resize', () => {
      if (projectModalOpen) setRect(targetRect());
    });

    openProjectModal = open;
  }

  /* Projects pagination: cards are grouped into viewport-sized pages so the
     section never outgrows its snap slot. */
  function initProjectsPager(cards) {
    const listEl = document.getElementById('projects-list');
    const pager = document.getElementById('projects-pager');
    const prevBtn = document.getElementById('pager-prev');
    const nextBtn = document.getElementById('pager-next');
    const countEl = document.getElementById('pager-count');
    const labelEl = document.getElementById('projects-page-label');
    if (!listEl || !pager) return;

    let pageIndex = 0;
    let pageSize = 0;

    function render() {
      const pages = Array.from(listEl.children);
      pages.forEach((page, i) => { page.hidden = i !== pageIndex; });

      const paginated = pages.length > 1;
      pager.hidden = !paginated;
      labelEl.hidden = !paginated;
      if (!paginated) return;

      countEl.textContent = `${pageIndex + 1} / ${pages.length}`;
      labelEl.textContent = `Page ${pageIndex + 1} of ${pages.length}`;
      prevBtn.disabled = pageIndex === 0;
      nextBtn.disabled = pageIndex === pages.length - 1;
    }

    function layout() {
      const size = window.matchMedia('(max-width: 800px)').matches ? 1 : 2;
      if (size === pageSize) return;
      pageSize = size;

      listEl.textContent = '';
      for (let i = 0; i < cards.length; i += size) {
        const page = document.createElement('div');
        page.className = 'projects-page';
        page.style.gridTemplateColumns = `repeat(${size}, minmax(0, 1fr))`;
        cards.slice(i, i + size).forEach((card) => page.appendChild(card));
        listEl.appendChild(page);
      }
      pageIndex = Math.min(pageIndex, listEl.children.length - 1);
      render();
    }

    prevBtn.addEventListener('click', () => {
      if (pageIndex > 0) { pageIndex -= 1; render(); }
    });
    nextBtn.addEventListener('click', () => {
      if (pageIndex < listEl.children.length - 1) { pageIndex += 1; render(); }
    });
    window.addEventListener('resize', layout);

    layout();
  }

  /* ------------------------------------------------------------------ */
  /* Experience / Education                                              */
  /* ------------------------------------------------------------------ */

  function buildExperienceItem(entry) {
    const li = document.createElement('li');
    li.className = 'timeline-item';

    const meta = [entry.organization, entry.dateRange].filter(Boolean).join(' · ');
    const bullets = (entry.bullets || [])
      .map((bullet) => `<li>${bullet}</li>`)
      .join('');

    li.innerHTML = `
      <div class="timeline-marker" aria-hidden="true"></div>
      <div class="timeline-content">
        <h3 class="timeline-title">${entry.title}</h3>
        ${meta ? `<p class="timeline-meta">${meta}</p>` : ''}
        ${entry.description ? `<p class="timeline-desc">${entry.description}</p>` : ''}
        ${bullets ? `<ul class="timeline-bullets">${bullets}</ul>` : ''}
      </div>
    `;
    return li;
  }

  async function initExperience() {
    const listEl = document.getElementById('experience-list');
    if (!listEl) return;

    let config;
    try {
      const res = await fetch(EXPERIENCE_CONFIG_URL);
      config = await res.json();
    } catch (err) {
      listEl.innerHTML = '<li>Could not load experience.</li>';
      return;
    }

    const entries = config.entries || [];
    entries.forEach((entry) => {
      listEl.appendChild(buildExperienceItem(entry));
    });
  }

  /* Resume PDF is not added yet (see PLAN.md #6) — hide the link until it exists. */
  async function checkResumeLink() {
    const link = document.getElementById('resume-link');
    if (!link) return;
    try {
      const res = await fetch(link.getAttribute('href'), { method: 'HEAD' });
      if (!res.ok) link.style.display = 'none';
    } catch (err) {
      link.style.display = 'none';
    }
  }

  async function init() {
    initHeroPhoto();
    initSectionNav();
    initSectionPaging();
    initSkillMeters();
    initProjectModal();
    checkResumeLink();
    initExperience();

    const listEl = document.getElementById('projects-list');
    if (!listEl) return;

    let config;
    try {
      const res = await fetch(CONFIG_URL);
      config = await res.json();
    } catch (err) {
      listEl.innerHTML = '<p>Could not load project list.</p>';
      return;
    }

    const settings = config.settings || {};
    const projects = (config.projects || [])
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      .slice(0, settings.maxProjectsShown || 6);

    const cards = projects.map((project) => ({ card: buildCardShell(project), project }));
    initProjectsPager(cards.map((entry) => entry.card));
    cards.forEach(({ card, project }) => populateCard(card, project, settings));
  }

  document.addEventListener('DOMContentLoaded', init);
})();

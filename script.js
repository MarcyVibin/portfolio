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

    card.innerHTML = `
      <div class="project-card-header">
        <div class="project-card-heading">
          <h3 class="project-name">${displayName}</h3>
          ${project.descriptionOverride ? `<p class="project-subtitle">${project.descriptionOverride}</p>` : ''}
          <div class="project-tags">${tags}</div>
        </div>
        <div class="project-links">
          ${project.repo ? `<a class="project-link-btn" href="https://github.com/${owner}/${repo}" target="_blank" rel="noopener">GitHub</a>` : ''}
          ${project.liveUrl ? `<a class="project-link-btn" href="${project.liveUrl}" target="_blank" rel="noopener">Live &rarr;</a>` : ''}
        </div>
      </div>
      ${project.hideReadme ? '' : `
      <button class="project-readme-toggle" type="button" aria-expanded="false">
        <span>README</span>
        <span class="chevron" aria-hidden="true">&rsaquo;</span>
      </button>
      <div class="project-readme" hidden>
        <div class="project-skeleton"></div>
      </div>
      `}
    `;

    if (!project.hideReadme) {
      const toggle = card.querySelector('.project-readme-toggle');
      const body = card.querySelector('.project-readme');
      toggle.addEventListener('click', () => {
        const expanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!expanded));
        body.hidden = expanded;
      });
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

  /* Hero avatar: try assets/profile.jpg, then assets/profile.png, then fall
     back to initials derived from the hero name. */
  function initHeroAvatar() {
    const img = document.getElementById('hero-avatar-img');
    const initialsEl = document.getElementById('hero-avatar-initials');
    if (!img || !initialsEl) return;

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
        initialsEl.hidden = false;
        return;
      }
      img.src = candidates[i++];
    }

    img.addEventListener('load', () => {
      img.hidden = false;
      initialsEl.hidden = true;
    });
    img.addEventListener('error', tryNext);
    tryNext();
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
    initHeroAvatar();
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

    const cards = projects.map((project) => {
      const card = buildCardShell(project);
      listEl.appendChild(card);
      return { card, project };
    });

    cards.forEach(({ card, project }) => populateCard(card, project, settings));
  }

  document.addEventListener('DOMContentLoaded', init);
})();

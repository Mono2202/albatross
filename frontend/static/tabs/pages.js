let _allPages = [];
let _pagesFilteredSuggestions = [];
let _pagesByPath = {};
let _currentPagePath = null;
let _expandedTreeFolders = new Set();

const _PAGES_RECENT_KEY = 'pagesRecentlyViewed';
const _PAGES_TREE_EXPANDED_KEY = 'pagesTreeExpandedFolders';
const _PAGES_TREE_PANEL_COLLAPSED_KEY = 'pagesTreePanelCollapsed';

async function loadPagesTab() {
  document.getElementById('pages-search').addEventListener('input', e => _showPageSuggestions(e.target.value));
  document.getElementById('pages-search').addEventListener('blur', () => setTimeout(_hidePageSuggestions, 150));
  window.addEventListener('hashchange', _handlePagesHash);
  _loadExpandedTreeFolders();
  _initTreePanelToggle();
  document.getElementById('pages-tree').addEventListener('click', _handleTreeClick);
  try {
    const res = await fetch('/pages/list');
    const data = await res.json();
    _allPages = data.pages || [];
    _pagesByPath = {};
    _allPages.forEach(p => { _pagesByPath[p.path] = p; });
  } catch (_) {
    document.getElementById('pages-content').innerHTML =
      '<div class="empty-state" style="color:var(--danger)">Failed to load page list.</div>';
  }
  _renderPagesTree();
  _renderRecentPages();
  _handlePagesHash();
}

function _handlePagesHash() {
  const m = location.hash.match(/^#\/pages\/(.+)$/);
  if (!m) return;
  const path = decodeURIComponent(m[1]);
  if (path === _currentPagePath) return;
  openPage(path, { fromHash: true });
}

function _showPageSuggestions(query) {
  const box = document.getElementById('pages-suggestions');
  if (!query) { box.style.display = 'none'; return; }
  const q = query.toLowerCase();
  _pagesFilteredSuggestions = _allPages.filter(p =>
    p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q)
  ).slice(0, 30);
  if (!_pagesFilteredSuggestions.length) { box.style.display = 'none'; return; }
  box.innerHTML = _pagesFilteredSuggestions.map((p, i) => {
    const folder = p.path.includes('/') ? p.path.slice(0, p.path.lastIndexOf('/')) : '';
    const hint = folder ? `<span style="color:var(--text-muted);font-size:0.8rem;margin-left:8px">${escapeHtml(folder)}</span>` : '';
    return `<div class="workout-suggestion-item" dir="auto" onmousedown="_pickPageSuggestion(${i})">${escapeHtml(p.name)}${hint}</div>`;
  }).join('');
  box.style.display = 'block';
}

function _pickPageSuggestion(i) {
  const p = _pagesFilteredSuggestions[i];
  document.getElementById('pages-search').value = '';
  _hidePageSuggestions();
  openPage(p.path);
}

function _hidePageSuggestions() {
  document.getElementById('pages-suggestions').style.display = 'none';
}

function _resolveWikilink(ref) {
  ref = (ref || '').trim();
  if (!ref) return null;
  const withExt = ref.toLowerCase().endsWith('.md') ? ref : `${ref}.md`;

  if (_pagesByPath[withExt]) return withExt;

  const lowerPath = withExt.toLowerCase();
  let match = _allPages.find(p => p.path.toLowerCase() === lowerPath);
  if (match) return match.path;

  const baseName = ref.toLowerCase().endsWith('.md') ? ref.slice(0, -3) : ref;
  const lowerBase = baseName.toLowerCase();
  const justName = lowerBase.includes('/') ? lowerBase.slice(lowerBase.lastIndexOf('/') + 1) : lowerBase;
  match = _allPages.find(p => p.name.toLowerCase() === justName);
  return match ? match.path : null;
}

async function openPage(path, opts) {
  opts = opts || {};
  const content = document.getElementById('pages-content');
  content.innerHTML = loadingHtml();
  try {
    const res = await fetch(`/pages/content?path=${encodeURIComponent(path)}`);
    const data = await res.json();
    if (!res.ok) {
      content.innerHTML = `<div class="empty-state" style="color:var(--danger)">${escapeHtml(data.error || 'Failed to load page.')}</div>`;
      return;
    }
    _currentPagePath = path;
    if (!opts.fromHash) location.hash = `/pages/${encodeURIComponent(path)}`;
    content.innerHTML = `<article class="pages-article">${mdToHtml(data.content)}</article>`;
    content.querySelectorAll('a.wikilink').forEach(a => {
      const resolved = _resolveWikilink(a.dataset.ref);
      if (!resolved) {
        a.classList.add('wikilink-missing');
        a.title = `Page not found: ${a.dataset.ref}`;
      }
      a.addEventListener('click', e => {
        e.preventDefault();
        if (resolved) openPage(resolved);
      });
    });
    _renderBreadcrumb(path);
    _renderBacklinks(data.backlinks || []);
    _addRecentPage(path, data.name);
    _revealInTree(path);
    content.scrollTop = 0;
  } catch (_) {
    content.innerHTML = '<div class="empty-state" style="color:var(--danger)">Request failed.</div>';
  }
}

function _renderBreadcrumb(path) {
  const el = document.getElementById('pages-breadcrumb');
  const parts = path.replace(/\.md$/, '').split('/');
  el.innerHTML = parts.map(p => `<bdi>${escapeHtml(p)}</bdi>`).join(' <span class="pages-breadcrumb-sep">/</span> ');
}

function _renderBacklinks(backlinks) {
  const el = document.getElementById('pages-backlinks');
  if (!backlinks.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<h3>Linked from</h3><div class="pages-backlink-list">${
    backlinks.map(b => `<a href="#" class="pages-backlink-item" dir="auto" data-page="${escapeHtml(b.path)}">${escapeHtml(b.name)}</a>`).join('')
  }</div>`;
  el.querySelectorAll('.pages-backlink-item').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); openPage(a.dataset.page); });
  });
}

function _addRecentPage(path, name) {
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(_PAGES_RECENT_KEY) || '[]'); } catch (_) {}
  recent = recent.filter(r => r.path !== path);
  recent.unshift({ path, name });
  recent = recent.slice(0, 10);
  localStorage.setItem(_PAGES_RECENT_KEY, JSON.stringify(recent));
  _renderRecentPages();
}

function _renderRecentPages() {
  const el = document.getElementById('pages-recent');
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(_PAGES_RECENT_KEY) || '[]'); } catch (_) {}
  if (!recent.length) { el.innerHTML = '<div class="empty-state">No pages viewed yet.</div>'; return; }
  el.innerHTML = recent.map(r =>
    `<div class="pages-recent-item" dir="auto" data-page="${escapeHtml(r.path)}">${escapeHtml(r.name)}</div>`
  ).join('');
  el.querySelectorAll('.pages-recent-item').forEach(item => {
    item.addEventListener('click', () => openPage(item.dataset.page));
  });
}

// ── File/folder tree panel ──────────────────────────────────────────────────

function _initTreePanelToggle() {
  const card = document.querySelector('.pages-tree-card');
  if (localStorage.getItem(_PAGES_TREE_PANEL_COLLAPSED_KEY) === '1') {
    card.classList.add('collapsed');
  }
  document.getElementById('pages-tree-toggle').addEventListener('click', () => {
    card.classList.toggle('collapsed');
    localStorage.setItem(_PAGES_TREE_PANEL_COLLAPSED_KEY, card.classList.contains('collapsed') ? '1' : '0');
  });
}

function _loadExpandedTreeFolders() {
  try {
    _expandedTreeFolders = new Set(JSON.parse(localStorage.getItem(_PAGES_TREE_EXPANDED_KEY) || '[]'));
  } catch (_) {
    _expandedTreeFolders = new Set();
  }
}

function _persistExpandedTreeFolders() {
  localStorage.setItem(_PAGES_TREE_EXPANDED_KEY, JSON.stringify([..._expandedTreeFolders]));
}

function _buildPageTree(pages) {
  const root = { dirs: new Map(), files: [] };
  pages.forEach(p => {
    const parts = p.path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!node.dirs.has(part)) node.dirs.set(part, { dirs: new Map(), files: [] });
      node = node.dirs.get(part);
    }
    node.files.push(p);
  });
  return root;
}

function _renderTreeNode(node, folderPath) {
  const dirNames = Array.from(node.dirs.keys()).sort((a, b) => a.localeCompare(b));
  const files = node.files.slice().sort((a, b) => a.name.localeCompare(b.name));

  const dirHtml = dirNames.map(name => {
    const childPath = folderPath ? `${folderPath}/${name}` : name;
    const expanded = _expandedTreeFolders.has(childPath);
    return `<li class="pages-tree-folder${expanded ? ' expanded' : ''}" data-folder="${escapeHtml(childPath)}">
      <div class="pages-tree-folder-label">
        <span class="pages-tree-caret">▸</span>
        <span class="pages-tree-icon">📁</span>
        <span dir="auto">${escapeHtml(name)}</span>
      </div>
      <ul class="pages-tree-list pages-tree-children">${_renderTreeNode(node.dirs.get(name), childPath)}</ul>
    </li>`;
  }).join('');

  const fileHtml = files.map(p => {
    const active = p.path === _currentPagePath ? ' active' : '';
    return `<li class="pages-tree-file">
      <a href="#" class="pages-tree-file-link${active}" data-path="${escapeHtml(p.path)}">
        <span class="pages-tree-icon">📄</span><span dir="auto">${escapeHtml(p.name)}</span>
      </a>
    </li>`;
  }).join('');

  return dirHtml + fileHtml;
}

function _renderPagesTree() {
  const el = document.getElementById('pages-tree');
  if (!_allPages.length) { el.innerHTML = '<div class="empty-state">No pages found.</div>'; return; }
  const tree = _buildPageTree(_allPages);
  el.innerHTML = `<ul class="pages-tree-list">${_renderTreeNode(tree, '')}</ul>`;
}

function _handleTreeClick(e) {
  const folderLabel = e.target.closest('.pages-tree-folder-label');
  if (folderLabel) {
    const li = folderLabel.closest('.pages-tree-folder');
    const folderPath = li.dataset.folder;
    if (_expandedTreeFolders.has(folderPath)) _expandedTreeFolders.delete(folderPath);
    else _expandedTreeFolders.add(folderPath);
    li.classList.toggle('expanded');
    _persistExpandedTreeFolders();
    return;
  }
  const fileLink = e.target.closest('.pages-tree-file-link');
  if (fileLink) {
    e.preventDefault();
    openPage(fileLink.dataset.path);
  }
}

function _revealInTree(path) {
  const parts = path.split('/');
  let acc = '';
  for (let i = 0; i < parts.length - 1; i++) {
    acc = acc ? `${acc}/${parts[i]}` : parts[i];
    _expandedTreeFolders.add(acc);
  }
  _persistExpandedTreeFolders();
  _renderPagesTree();
  document.querySelectorAll('.pages-tree-file-link').forEach(a => {
    if (a.dataset.path === path) a.scrollIntoView({ block: 'nearest' });
  });
}

// ── Minimal Obsidian-flavored markdown renderer ────────────────────────────

function mdToHtml(src) {
  src = (src || '').replace(/\r\n/g, '\n');

  let frontmatterHtml = '';
  const frontmatter = src.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatter) {
    src = src.slice(frontmatter[0].length);
    const rows = frontmatter[1].split('\n')
      .map(l => l.match(/^([\w-]+):\s*(.*)$/))
      .filter(Boolean)
      .map(m => `<tr><th>${escapeHtml(m[1])}</th><td dir="auto">${escapeHtml(m[2])}</td></tr>`)
      .join('');
    if (rows) frontmatterHtml = `<table class="pages-frontmatter">${rows}</table>`;
  }

  const codeStash = [];
  src = src.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const idx = codeStash.push(`<pre class="pages-codeblock"><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`) - 1;
    return `\n@@CODEBLOCK${idx}@@\n`;
  });

  const lines = src.split('\n');
  const out = [];
  let para = [];
  let listType = null;
  let listItems = [];
  let listCounter = 0;
  let quoteLines = [];

  const flushPara = () => {
    if (para.length) { out.push(`<p dir="auto">${_mdInline(para.join(' '))}</p>`); para = []; }
  };
  const flushList = () => {
    if (listItems.length) {
      out.push(`<${listType}>${listItems.join('')}</${listType}>`);
      listItems = [];
      listType = null;
    }
  };
  const flushQuote = () => {
    if (quoteLines.length) {
      out.push(`<blockquote dir="auto">${_mdInline(quoteLines.join(' '))}</blockquote>`);
      quoteLines = [];
    }
  };
  const flushAll = () => { flushPara(); flushList(); flushQuote(); };

  const isTableRow = l => /\|/.test(l) && l.trim() !== '';
  const isTableSep = l => /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/.test(l);
  const splitRow = l => {
    let s = l.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    const codeToken = trimmed.match(/^@@CODEBLOCK(\d+)@@$/);
    if (codeToken) {
      flushAll();
      out.push(codeStash[+codeToken[1]]);
      continue;
    }
    if (!trimmed) { flushAll(); continue; }

    if (isTableRow(rawLine) && idx + 1 < lines.length && isTableSep(lines[idx + 1])) {
      flushAll();
      const headerCells = splitRow(rawLine);
      const headerHtml = `<tr>${headerCells.map(c => `<th dir="auto">${_mdInline(c)}</th>`).join('')}</tr>`;
      idx += 2;
      const bodyRows = [];
      while (idx < lines.length && isTableRow(lines[idx])) {
        const cells = splitRow(lines[idx]);
        bodyRows.push(`<tr>${cells.map(c => `<td dir="auto">${_mdInline(c)}</td>`).join('')}</tr>`);
        idx++;
      }
      idx--;
      out.push(`<div class="pages-table-wrap"><table class="pages-table"><thead>${headerHtml}</thead><tbody>${bodyRows.join('')}</tbody></table></div>`);
      continue;
    }

    const heading = rawLine.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushAll();
      const level = heading[1].length;
      out.push(`<h${level} dir="auto">${_mdInline(heading[2])}</h${level}>`);
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushAll();
      out.push('<hr>');
      continue;
    }
    const quote = rawLine.match(/^>\s?(.*)$/);
    if (quote) {
      flushPara(); flushList();
      quoteLines.push(quote[1]);
      continue;
    }
    flushQuote();

    const checkbox = rawLine.match(/^\s*[-*+]\s+\[( |x|X)\]\s+(.*)$/);
    const bullet = rawLine.match(/^\s*[-*+]\s+(.*)$/);
    const ordered = rawLine.match(/^\s*\d+[.)]\s+(.*)$/);

    if (checkbox) {
      flushPara();
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      const checked = checkbox[1].toLowerCase() === 'x';
      listItems.push(`<li class="pages-task" dir="auto"><input type="checkbox" disabled ${checked ? 'checked' : ''}/> ${_mdInline(checkbox[2])}</li>`);
      continue;
    }
    if (bullet) {
      flushPara();
      if (listType !== 'ul') { flushList(); listType = 'ul'; }
      listItems.push(`<li dir="auto"><span class="pages-li-marker">•</span> ${_mdInline(bullet[1])}</li>`);
      continue;
    }
    if (ordered) {
      flushPara();
      if (listType !== 'ol') { flushList(); listType = 'ol'; listCounter = 0; }
      listCounter++;
      listItems.push(`<li dir="auto"><span class="pages-li-marker">${listCounter}.</span> ${_mdInline(ordered[1])}</li>`);
      continue;
    }
    flushList();
    para.push(trimmed);
  }
  flushAll();

  return frontmatterHtml + out.join('\n');
}

function _mdInline(text) {
  text = escapeHtml(text);

  const spanStash = [];
  const stash = html => `@@SPAN${spanStash.push(html) - 1}@@`;

  text = text.replace(/`([^`]+)`/g, (_, code) => stash(`<code>${code}</code>`));

  text = text.replace(/!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, name) =>
    stash(`<img class="pages-embed" src="/pages/asset?name=${encodeURIComponent(name.trim())}" alt="${escapeHtml(name.trim())}">`));
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
    const url = /^(https?:)?\/\//.test(src) ? src : `/pages/asset?name=${encodeURIComponent(src)}`;
    return stash(`<img class="pages-embed" src="${url}" alt="${escapeHtml(alt)}">`);
  });

  text = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, page, alias) => {
    const label = alias || page;
    return stash(`<a href="#" class="wikilink" data-ref="${escapeHtml(page.trim())}">${escapeHtml(label.trim())}</a>`);
  });
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) =>
    stash(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`));

  text = text.replace(/(^|\s)#([A-Za-z][\w/-]*)/g, (m, pre, tag) => `${pre}${stash(`<span class="pages-tag">#${tag}</span>`)}`);

  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  text = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/(^|[^\w])_([^_]+)_(?!\w)/g, '$1<em>$2</em>');

  text = text.replace(/@@SPAN(\d+)@@/g, (_, i) => spanStash[+i]);
  return text;
}

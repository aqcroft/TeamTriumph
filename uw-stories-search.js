(() => {
  'use strict';

  let catalogue = null;
  let cataloguePromise = null;

  function normalise(value) {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function editDistance(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    const cur = new Array(b.length + 1);
    for (let i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
    }
    return prev[b.length];
  }

  function fuzzyToken(token, words) {
    if (words.some(word => word.includes(token) || token.includes(word))) return true;
    const allowance = token.length <= 4 ? 1 : token.length <= 8 ? 2 : 3;
    return words.some(word => Math.abs(word.length - token.length) <= allowance && editDistance(token, word) <= allowance);
  }

  function scoreStory(story, query) {
    const q = normalise(query);
    if (!q) return 0;
    const tokens = q.split(' ').filter(Boolean);
    const title = normalise(story.title);
    const summary = normalise(story.summary);
    const text = normalise(story.text);
    const all = `${title} ${summary} ${text}`;
    const words = all.split(' ').filter(Boolean);

    if (!tokens.every(token => fuzzyToken(token, words))) return -1;

    let score = 0;
    if (title.includes(q)) score += 120;
    else if (summary.includes(q)) score += 70;
    else if (text.includes(q)) score += 35;

    const titleWords = title.split(' ');
    const summaryWords = summary.split(' ');
    const textWords = text.split(' ');
    tokens.forEach(token => {
      if (fuzzyToken(token, titleWords)) score += 30;
      else if (fuzzyToken(token, summaryWords)) score += 16;
      else if (fuzzyToken(token, textWords)) score += 6;
    });
    return score;
  }

  function escapeHtml(value = '') {
    return value.replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function excerpt(story, query) {
    const source = story.summary || story.text || '';
    const clean = source.replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    const qTokens = normalise(query).split(' ').filter(Boolean);
    const lower = normalise(clean);
    let index = -1;
    for (const token of qTokens) {
      const found = lower.indexOf(token);
      if (found >= 0) { index = found; break; }
    }
    if (index < 0 || clean.length <= 210) return clean.slice(0, 210) + (clean.length > 210 ? '…' : '');
    const start = Math.max(0, index - 75);
    const end = Math.min(clean.length, start + 230);
    return `${start ? '…' : ''}${clean.slice(start, end).trim()}${end < clean.length ? '…' : ''}`;
  }

  function resizeParent(el) {
    const body = el.closest('.section-body');
    if (body && body.dataset.open === 'true') requestAnimationFrame(() => { body.style.maxHeight = body.scrollHeight + 'px'; });
  }

  async function loadCatalogue() {
    if (catalogue) return catalogue;
    if (!cataloguePromise) {
      cataloguePromise = fetch('data/uw-stories.json', { cache: 'no-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`Catalogue unavailable (${response.status})`);
          return response.json();
        })
        .then(data => (catalogue = data));
    }
    return cataloguePromise;
  }

  async function runSearch(wrapper, query) {
    const results = wrapper.querySelector('.uw-stories-results');
    const status = wrapper.querySelector('.uw-stories-status');
    const q = query.trim();
    if (q.length < 2) {
      results.innerHTML = '';
      status.textContent = q ? 'Type at least 2 characters' : '';
      resizeParent(wrapper);
      return;
    }

    status.textContent = 'Searching local UW Stories library…';
    try {
      const data = await loadCatalogue();
      const matches = data.stories
        .map(story => ({ story, score: scoreStory(story, q) }))
        .filter(item => item.score >= 0)
        .sort((a, b) => b.score - a.score || a.story.title.localeCompare(b.story.title))
        .slice(0, 8);

      status.textContent = matches.length
        ? `${matches.length}${data.stories.length > 8 && matches.length === 8 ? '+' : ''} matching stor${matches.length === 1 ? 'y' : 'ies'}`
        : 'No matching stories - try a shorter or broader phrase';

      results.innerHTML = matches.map(({ story }) => `
        <a class="uw-story-result" href="${escapeHtml(story.url)}" target="_blank" rel="noopener">
          <span class="uw-story-result-title">🎞️ ${escapeHtml(story.title)}</span>
          <span class="uw-story-result-desc">${escapeHtml(excerpt(story, q))}</span>
          <span class="uw-story-result-open">Open story →</span>
        </a>`).join('');
    } catch (error) {
      console.error(error);
      status.innerHTML = 'Story library is refreshing or unavailable - <a href="https://www.uwstories.co.uk/" target="_blank" rel="noopener">open UW Stories</a>';
      results.innerHTML = '';
    }
    resizeParent(wrapper);
  }

  function addStyles() {
    if (document.getElementById('uw-stories-search-styles')) return;
    const style = document.createElement('style');
    style.id = 'uw-stories-search-styles';
    style.textContent = `
      .uw-stories-finder { margin: .6rem 0 .8rem; padding: .85rem; background: rgba(124,58,237,.055); border: 1px solid rgba(124,58,237,.16); border-radius: .85rem; }
      .uw-stories-finder-title { font-size: .8rem; font-weight: 700; color: var(--text-primary); margin-bottom: .42rem; }
      .uw-stories-finder-sub { font-size: .72rem; color: var(--text-muted); line-height: 1.4; margin-bottom: .55rem; }
      .uw-stories-search-box { display:flex; align-items:center; gap:.4rem; background:#fff; border:1px solid rgba(0,0,0,.12); border-radius:.7rem; padding:.12rem .55rem; }
      .uw-stories-search-box input { flex:1; min-width:0; border:0; outline:0; background:transparent; font: .82rem 'DM Sans',sans-serif; color:var(--text-primary); padding:.58rem .1rem; }
      .uw-stories-status { min-height:1rem; margin:.38rem .08rem 0; font-size:.68rem; color:var(--text-muted); }
      .uw-stories-status a { color:var(--violet); }
      .uw-stories-results { margin-top:.45rem; display:grid; gap:.38rem; }
      .uw-story-result { display:block; text-decoration:none; background:#fff; border:1px solid rgba(0,0,0,.075); border-radius:.65rem; padding:.62rem .7rem; box-shadow:0 1px 2px rgba(0,0,0,.035); }
      .uw-story-result:hover { border-color:rgba(124,58,237,.3); }
      .uw-story-result-title { display:block; color:var(--text-primary); font-size:.78rem; font-weight:650; margin-bottom:.16rem; }
      .uw-story-result-desc { display:block; color:var(--text-secondary); font-size:.7rem; line-height:1.4; }
      .uw-story-result-open { display:block; color:var(--violet); font-size:.67rem; font-weight:650; margin-top:.28rem; }
    `;
    document.head.appendChild(style);
  }

  function init() {
    addStyles();
    const uwLink = [...document.querySelectorAll('a[href]')].find(a => {
      try { return new URL(a.href).hostname.replace(/^www\./, '') === 'uwstories.co.uk'; } catch { return false; }
    });
    if (!uwLink || document.querySelector('.uw-stories-finder')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'uw-stories-finder';
    wrapper.innerHTML = `
      <div class="uw-stories-finder-title">🔎 Find the right UW Story</div>
      <div class="uw-stories-finder-sub">Search the story title and the description/topics discussed - spelling mistakes are OK.</div>
      <div class="uw-stories-search-box">
        <span aria-hidden="true">🔎</span>
        <input type="search" autocomplete="off" spellcheck="false" placeholder="Try: teacher, illness, mortgage, confidence…" aria-label="Search UW Stories by topic">
      </div>
      <div class="uw-stories-status" aria-live="polite"></div>
      <div class="uw-stories-results"></div>`;

    uwLink.insertAdjacentElement('afterend', wrapper);
    const input = wrapper.querySelector('input');
    let timer;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => runSearch(wrapper, input.value), 120);
    });
    input.addEventListener('focus', () => loadCatalogue().catch(() => {}), { once: true });
    resizeParent(wrapper);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

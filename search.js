(() => {
  'use strict';

  const SEARCHABLE_SELECTOR = '.card, .copy-card, .info-card, .image-card, .meal-card';
  let lastQuery = '';
  let preSearchState = null;

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

    const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
    const current = new Array(b.length + 1);

    for (let i = 1; i <= a.length; i++) {
      current[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + cost
        );
      }
      for (let j = 0; j <= b.length; j++) previous[j] = current[j];
    }
    return previous[b.length];
  }

  function tokenMatches(queryToken, textTokens) {
    if (!queryToken) return true;
    if (textTokens.some(token => token.includes(queryToken) || queryToken.includes(token))) return true;

    const allowance = queryToken.length <= 4 ? 1 : queryToken.length <= 8 ? 2 : 3;
    return textTokens.some(token => {
      if (Math.abs(token.length - queryToken.length) > allowance) return false;
      return editDistance(queryToken, token) <= allowance;
    });
  }

  function matches(card, query) {
    const cleanQuery = normalise(query);
    if (!cleanQuery) return true;

    const text = normalise(card.textContent);
    if (text.includes(cleanQuery)) return true;

    const queryTokens = cleanQuery.split(' ').filter(Boolean);
    const textTokens = text.split(' ').filter(Boolean);
    return queryTokens.every(token => tokenMatches(token, textTokens));
  }

  function isAvailableInCurrentMode(card) {
    return !(document.body.dataset.mode === 'lite' && card.classList.contains('builder-only'));
  }

  function captureAccordionState() {
    const states = {};
    (window.SECTIONS || ['started','show','share','rise','support','portal','tools']).forEach(id => {
      const body = document.getElementById('body-' + id);
      if (body) states[id] = body.dataset.open === 'true';
    });
    return states;
  }

  function restoreAccordionState() {
    if (!preSearchState) return;
    Object.entries(preSearchState).forEach(([id, isOpen]) => {
      const body = document.getElementById('body-' + id);
      const chev = document.getElementById('chev-' + id);
      if (!body || !chev) return;
      body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0px';
      body.style.opacity = isOpen ? '1' : '0';
      body.dataset.open = String(isOpen);
      chev.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
    });
    preSearchState = null;
  }

  function setSectionVisibility(section, hasMatches, searching) {
    if (!searching) {
      section.style.removeProperty('display');
      return;
    }
    section.style.display = hasMatches ? '' : 'none';
  }

  function updateSearch(query) {
    const searching = normalise(query).length > 0;
    const cards = [...document.querySelectorAll(SEARCHABLE_SELECTOR)];
    const sections = [...document.querySelectorAll('.section')];
    const status = document.getElementById('resource-search-status');
    const clearBtn = document.getElementById('resource-search-clear');

    if (searching && !preSearchState) preSearchState = captureAccordionState();

    let matchCount = 0;

    cards.forEach(card => {
      const available = isAvailableInCurrentMode(card);
      const matched = available && matches(card, query);
      card.dataset.searchMatch = matched ? 'true' : 'false';
      card.style.display = searching ? (matched ? '' : 'none') : '';
      if (searching && matched) matchCount++;
    });

    sections.forEach(section => {
      if (document.body.dataset.mode === 'lite' && section.classList.contains('builder-only')) {
        section.style.display = 'none';
        return;
      }

      const sectionCards = [...section.querySelectorAll(SEARCHABLE_SELECTOR)];
      if (!sectionCards.length) {
        setSectionVisibility(section, true, searching);
        return;
      }

      const hasMatches = sectionCards.some(card => card.dataset.searchMatch === 'true');
      setSectionVisibility(section, hasMatches, searching);

      if (searching && hasMatches) {
        const body = section.querySelector('.section-body');
        const chev = section.querySelector('.sec-chevron');
        if (body) {
          body.dataset.open = 'true';
          body.style.opacity = '1';
          requestAnimationFrame(() => { body.style.maxHeight = body.scrollHeight + 'px'; });
        }
        if (chev) chev.style.transform = 'rotate(0deg)';
      }
    });

    if (!searching) {
      cards.forEach(card => {
        delete card.dataset.searchMatch;
        if (!(document.body.dataset.mode === 'lite' && card.classList.contains('builder-only'))) {
          card.style.removeProperty('display');
        }
      });
      restoreAccordionState();
    }

    if (status) {
      status.textContent = searching
        ? (matchCount ? `${matchCount} resource${matchCount === 1 ? '' : 's'} found` : 'No resources found - try a shorter word or check the spelling')
        : '';
      status.classList.toggle('is-empty', searching && matchCount === 0);
    }
    if (clearBtn) clearBtn.hidden = !searching;

    lastQuery = query;
  }

  function createSearchUI() {
    const hero = document.querySelector('.hero');
    if (!hero || document.getElementById('resource-search')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'resource-search-wrap';
    wrapper.innerHTML = `
      <button type="button" class="resource-search-toggle" id="resource-search-toggle" aria-expanded="false" aria-controls="resource-search-panel">🔎 Search resources</button>
      <div class="resource-search-panel" id="resource-search-panel" hidden>
        <div class="resource-search-box">
          <span class="resource-search-icon" aria-hidden="true">🔎</span>
          <input id="resource-search" type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search tools, training, links..." aria-label="Search Team Triumph resources">
          <button type="button" id="resource-search-clear" class="resource-search-clear" aria-label="Clear search" hidden>×</button>
        </div>
        <div id="resource-search-status" class="resource-search-status" aria-live="polite"></div>
      </div>`;

    hero.appendChild(wrapper);

    const toggle = document.getElementById('resource-search-toggle');
    const panel = document.getElementById('resource-search-panel');
    const input = document.getElementById('resource-search');
    const clear = document.getElementById('resource-search-clear');

    toggle.addEventListener('click', () => {
      const opening = panel.hidden;
      panel.hidden = !opening;
      toggle.setAttribute('aria-expanded', String(opening));
      toggle.classList.toggle('active', opening);
      if (opening) requestAnimationFrame(() => input.focus());
      else if (!input.value) updateSearch('');
    });

    input.addEventListener('input', () => updateSearch(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        input.value = '';
        updateSearch('');
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        toggle.classList.remove('active');
        toggle.focus();
      }
    });

    clear.addEventListener('click', () => {
      input.value = '';
      updateSearch('');
      input.focus();
    });
  }

  function addStyles() {
    if (document.getElementById('resource-search-styles')) return;
    const style = document.createElement('style');
    style.id = 'resource-search-styles';
    style.textContent = `
      .resource-search-wrap { margin: 1rem auto 0; max-width: 520px; }
      .resource-search-toggle {
        display: inline-flex; align-items: center; justify-content: center; gap: .42rem;
        font-family: 'DM Sans', sans-serif; font-size: .78rem; font-weight: 600;
        color: var(--text-secondary); background: rgba(255,255,255,.78);
        border: 1px solid var(--border-hover); border-radius: 2rem;
        padding: .48rem .9rem; cursor: pointer; box-shadow: var(--shadow-sm);
        transition: background .18s, border-color .18s, transform .15s;
      }
      .resource-search-toggle:hover, .resource-search-toggle.active {
        background: #fff; border-color: rgba(0,0,0,.18); transform: translateY(-1px);
      }
      .resource-search-panel { margin-top: .65rem; }
      .resource-search-panel[hidden] { display: none; }
      .resource-search-box {
        display: flex; align-items: center; gap: .45rem; width: 100%;
        background: #fff; border: 1px solid rgba(0,0,0,.13); border-radius: .9rem;
        padding: .2rem .45rem .2rem .72rem; box-shadow: var(--shadow-sm);
      }
      .resource-search-icon { font-size: .9rem; opacity: .7; flex: 0 0 auto; }
      #resource-search {
        flex: 1; min-width: 0; border: 0; outline: 0; background: transparent;
        color: var(--text-primary); font-family: 'DM Sans', sans-serif;
        font-size: .88rem; padding: .62rem .15rem;
      }
      #resource-search::placeholder { color: var(--text-muted); }
      .resource-search-clear {
        border: 0; background: rgba(0,0,0,.06); color: var(--text-secondary);
        width: 1.8rem; height: 1.8rem; border-radius: 50%; cursor: pointer;
        font-size: 1.15rem; line-height: 1; flex: 0 0 auto;
      }
      .resource-search-status {
        min-height: 1.2rem; margin-top: .35rem; padding: 0 .2rem;
        font-size: .72rem; color: var(--text-muted); text-align: left;
      }
      .resource-search-status.is-empty { color: var(--orange); }
      @media (max-width: 480px) {
        .resource-search-wrap { margin-top: .85rem; }
        .resource-search-toggle { font-size: .76rem; padding: .46rem .82rem; }
      }`;
    document.head.appendChild(style);
  }

  function keepSearchInSyncWithMode() {
    if (typeof window.setMode !== 'function') return;
    const originalSetMode = window.setMode;
    window.setMode = function(mode) {
      originalSetMode(mode);
      if (lastQuery) requestAnimationFrame(() => updateSearch(lastQuery));
    };
  }

  function init() {
    addStyles();
    createSearchUI();
    keepSearchInSyncWithMode();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

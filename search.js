(() => {
  'use strict';

  const SEARCHABLE_SELECTOR = '.card, .copy-card, .info-card, .image-card, .meal-card';
  const SECTION_IDS = ['events','started','show','share','rise','support','portal','tools'];
  const OLD_FIRST_60_DAYS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal.html';
  const CURRENT_FIRST_60_DAYS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';
  const POWERUP_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/dkNED0cslX0?rel=0&modestbranding=1';
  const APP_RELEASE = {
    version: '1.2.0',
    date: '7th Oct 2026',
    summary: 'New mobile-first tile layout with quick links, always-visible search and separate New Partner and Team Builder views.'
  };
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

  function searchableText(card) {
    const section = card.closest('.section');
    const sectionLabel = section?.querySelector('.section-label')?.textContent || '';
    const sectionSub = section?.querySelector('.section-sub')?.textContent || '';
    return `${sectionLabel} ${sectionSub} ${card.textContent}`;
  }

  function matches(card, query) {
    const cleanQuery = normalise(query);
    if (!cleanQuery) return true;

    const text = normalise(searchableText(card));
    if (text.includes(cleanQuery)) return true;

    const queryTokens = cleanQuery.split(' ').filter(Boolean);
    const textTokens = text.split(' ').filter(Boolean);
    return queryTokens.every(token => tokenMatches(token, textTokens));
  }

  function isAvailableInCurrentMode(card) {
    if (document.body.dataset.mode !== 'lite') return true;
    return !card.closest('.builder-only');
  }

  function captureAccordionState() {
    const states = {};
    SECTION_IDS.forEach(id => {
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
        card.style.removeProperty('display');
      });
      sections.forEach(section => section.style.removeProperty('display'));
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
    const host = document.getElementById('resource-search-slot') || hero;
    if (!host || document.getElementById('resource-search')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'resource-search-wrap';
    wrapper.innerHTML = `
      <div class="resource-search-box">
        <span class="resource-search-icon" aria-hidden="true">🔎</span>
        <input id="resource-search" type="search" inputmode="search" autocomplete="off" spellcheck="false" placeholder="Search resources, tools, training..." aria-label="Search Team Triumph resources">
        <button type="button" id="resource-search-clear" class="resource-search-clear" aria-label="Clear search" hidden>×</button>
      </div>
      <div id="resource-search-status" class="resource-search-status" aria-live="polite"></div>`;

    host.appendChild(wrapper);

    const input = document.getElementById('resource-search');
    const clear = document.getElementById('resource-search-clear');

    input.addEventListener('input', () => updateSearch(input.value));
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        input.value = '';
        updateSearch('');
        input.blur();
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
      .resource-search-wrap {
        width: 100%;
        margin: 0 0 .72rem;
      }
      .resource-search-box {
        display: flex;
        align-items: center;
        gap: .45rem;
        width: 100%;
        background: rgba(255,255,255,.92);
        border: 1px solid rgba(0,0,0,.1);
        border-radius: .88rem;
        padding: .16rem .4rem .16rem .72rem;
        box-shadow: 0 1px 5px rgba(0,0,0,.045);
      }
      .resource-search-box:focus-within {
        border-color: rgba(14,148,132,.42);
        box-shadow: 0 0 0 3px rgba(14,148,132,.08);
      }
      .resource-search-icon {
        font-size: .9rem;
        opacity: .65;
        flex: 0 0 auto;
      }
      #resource-search {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--text-primary);
        font-family: 'DM Sans', sans-serif;
        font-size: .84rem;
        padding: .62rem .12rem;
      }
      #resource-search::placeholder { color: var(--text-muted); }
      .resource-search-clear {
        border: 0;
        background: rgba(0,0,0,.055);
        color: var(--text-secondary);
        width: 1.75rem;
        height: 1.75rem;
        border-radius: 50%;
        cursor: pointer;
        font-size: 1.1rem;
        line-height: 1;
        flex: 0 0 auto;
      }
      .resource-search-status {
        min-height: 1rem;
        margin-top: .28rem;
        padding: 0 .18rem;
        font-size: .68rem;
        color: var(--text-muted);
        text-align: left;
      }
      .resource-search-status:empty {
        min-height: 0;
        margin-top: 0;
      }
      .resource-search-status.is-empty { color: var(--orange); }
    `;
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

  function updateFirst60DaysLink() {
    document.querySelectorAll(`a[href="${OLD_FIRST_60_DAYS_URL}"]`).forEach(link => {
      link.href = CURRENT_FIRST_60_DAYS_URL;
    });
  }

  function updateEventsSection() {
    const events = document.querySelector('.section.sec-start');
    if (!events) return;

    const iframe = events.querySelector('.video-nudge iframe');
    if (iframe) {
      iframe.src = POWERUP_VIDEO_EMBED_URL;
      iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }

    const kickoff = events.querySelector('a.image-card');
    if (kickoff) {
      kickoff.href = 'https://www.tickettailor.com/events/utilitywarehouse/2399522';
      kickoff.dataset.event = 'kickoff';
      kickoff.style.setProperty('--accent', 'var(--orange)');

      const thumb = kickoff.querySelector('.image-card-thumb');
      if (thumb) {
        thumb.innerHTML = '<span style="font-size:2.2rem;line-height:1;">🚀</span>';
      }

      const title = kickoff.querySelector('.card-title');
      if (title) title.textContent = '🚀 UW Kick Off';

      const desc = kickoff.querySelector('.card-desc');
      if (desc) desc.textContent = "UW's start-of-year event bringing Partners together for fresh ideas, inspiration and momentum for the year ahead.";

      const tip = kickoff.querySelector('.tip');
      if (tip) tip.textContent = '🎟️ Book your place';
    }

    if (events.querySelector('[data-event="powerup-2027"]')) return;

    const powerup = document.createElement('a');
    powerup.className = 'image-card';
    powerup.dataset.event = 'powerup-2027';
    powerup.href = 'https://www.eventbrite.com/checkout-external?eid=1996103044941';
    powerup.target = '_blank';
    powerup.rel = 'noopener';
    powerup.style.setProperty('--accent', 'var(--violet)');
    powerup.innerHTML = `
      <div class="image-card-inner">
        <div class="image-card-thumb">
          <img src="powerup.webp" alt="UW Power Up 2027">
        </div>
        <div class="image-card-content">
          <div class="card-title">⚡ Power Up 2027 - BP Pulse Live, Birmingham</div>
          <div class="card-desc">A big UW Partner day for business-boosting announcements, inspiration from successful Partners and recognition on the main stage.</div>
          <div class="tip">🎟️ Saturday 17th April 2027 · £35 · Book direct</div>
        </div>
      </div>`;

    if (kickoff) kickoff.before(powerup);
    else {
      const eventsBody = events.querySelector('.section-body');
      (eventsBody || events).appendChild(powerup);
    }

    const openBody = events.querySelector('.section-body[data-open="true"]');
    if (openBody) requestAnimationFrame(() => {
      openBody.style.maxHeight = openBody.scrollHeight + 'px';
    });
  }

  function renderReleaseInfo() {
    const footer = document.querySelector('.footer');
    if (!footer || footer.querySelector('.app-release')) return;

    const release = document.createElement('details');
    release.className = 'app-release';
    release.style.cssText = 'margin:0.9rem auto 0;max-width:420px;font-size:0.7rem;opacity:0.78;';
    release.innerHTML = `
      <summary style="cursor:pointer;font-weight:600;">Version ${APP_RELEASE.version} · ${APP_RELEASE.date}</summary>
      <div style="margin-top:0.35rem;line-height:1.5;">${APP_RELEASE.summary}</div>
    `;
    footer.appendChild(release);
  }

  function init() {
    updateFirst60DaysLink();
    updateEventsSection();
    addStyles();
    createSearchUI();
    keepSearchInSyncWithMode();
    renderReleaseInfo();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

// UW Stories has its own richer topic search backed by a locally cached weekly catalogue.
(() => {
  const script = document.createElement('script');
  script.src = 'uw-stories-search.js';
  script.defer = true;
  document.head.appendChild(script);
})();
(() => {
  'use strict';

  const OLD_FIRST_60_DAYS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal.html';
  const CURRENT_FIRST_60_DAYS_URL = 'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v21.html';
  const POWERUP_VIDEO_EMBED_URL = 'https://www.youtube.com/embed/dkNED0cslX0?rel=0&modestbranding=1';
  const APP_RELEASE = {
    version: '1.3.3',
    date: '7th Oct 2026',
    summary: 'Removes the resource search bar to keep the mobile home screen tighter and focused on shortcuts and tiles.'
  };

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
      kickoff.dataset.nextEvent = 'true';
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


  const SHORTCUT_DEFAULTS = ['next-event','partner-quote','first-30-days','stuart-video'];
  const WELCOME_SEEN_KEY = 'teamTriumphWelcomeModalSeenV1';
  let shortcutEditing = false;
  let shortcutSlot = null;

  function currentMode() {
    return document.body.dataset.mode === 'builder' ? 'builder' : 'lite';
  }

  function shortcutStorageKey(mode = currentMode()) {
    return 'teamTriumphShortcuts:' + mode;
  }

  function shortcutCatalog() {
    const nextEvent = document.querySelector('[data-next-event="true"]') || document.querySelector('[data-event="kickoff"]');
    return [
      {
        id:'next-event', icon:'🎟️', label:'Next Event', section:'Events',
        href: nextEvent?.href || '#', bg:'#fff7e8', accent:'#d97706'
      },
      {
        id:'partner-quote', icon:'🛒', label:'Partner Quote Login', section:'Showing the Presentation',
        href:'https://uw.co.uk/quote', bg:'#edf5ff', accent:'#2563eb'
      },
      {
        id:'first-30-days', icon:'✅', label:'First 30 Days', section:'Getting Started',
        href:'https://cdn.elucidat.com/53a957b459e8c/projects/6a7adfc792953/resources/bda9953510661d75e9f5057db6f878e8.pdf',
        bg:'#fff0e8', accent:'#ea6c2e'
      },
      {
        id:'stuart-video', icon:'▶️', label:"Stuart's Partner Opportunity Video", section:'Share the Opportunity',
        href:'https://youtu.be/VHkcvvUUH6U?is=GxPhLKYhCNhy4iXl', bg:'#eaf8f4', accent:'#0e9484'
      },
      {
        id:'fast-start', icon:'⚡', label:'Fast Start Plan', section:'Getting Started',
        href:'fast-start-plan.pdf', bg:'#fff0e8', accent:'#ea6c2e'
      },
      {
        id:'first-60-days', icon:'💷', label:'The First 60 Days', section:'Getting Started',
        href:'https://aqcroft.github.io/UW_PET_GH_v2/sep26/earningstool-vfinal-coaching-preview-v22.html',
        bg:'#fff0e8', accent:'#ea6c2e'
      },
      {
        id:'online-training', icon:'🎓', label:'Getting Started Training', section:'Getting Started',
        href:'https://uw.co.uk/partner/portal/training-centre/page/training-modules/your-training',
        bg:'#fff0e8', accent:'#ea6c2e'
      },
      {
        id:'customer-meet', icon:'👤', label:'Customer Meeting Link', section:'Showing the Presentation',
        href:'https://uw.link/meet', bg:'#edf5ff', accent:'#2563eb'
      },
      {
        id:'infocall', icon:'🖥️', label:'UW Live - InfoCall', section:'Share the Opportunity',
        href:'https://infocall.co.uk', bg:'#eaf8f4', accent:'#0e9484'
      },
      {
        id:'uw-stories', icon:'🎞️', label:'UW Stories', section:'Share the Opportunity',
        href:'https://uwstories.co.uk', bg:'#eaf8f4', accent:'#0e9484'
      },
      {
        id:'rise-call', icon:'👥', label:'Team RISE Weekly Call', section:'Team RISE',
        href:'https://us02web.zoom.us/meeting/register/r_z1CYT6QA2Ayms-x2eBQw',
        bg:'#fff0f5', accent:'#db2777'
      },
      {
        id:'askmii', icon:'🧠', label:'AskMii', section:'Support',
        href:'https://askmii.co.uk', bg:'#f4efff', accent:'#7c3aed'
      },
      {
        id:'partner-portal', icon:'📰', label:'Partner Portal', section:'Portal & Training',
        href:'https://uw.co.uk/partner/portal/', bg:'#fff5df', accent:'#b86a12'
      },
      {
        id:'training-centre', icon:'🎓', label:'Training Centre', section:'Portal & Training',
        href:'https://uw.co.uk/partner/portal/training-centre', bg:'#fff5df', accent:'#b86a12',
        builderOnly:true
      },
      {
        id:'opportunity-booklet', icon:'📘', label:'Opportunity Booklet', section:'Portal & Training',
        href:'https://opguide.uw.co.uk/', bg:'#fff5df', accent:'#b86a12',
        builderOnly:true
      },
      {
        id:'bundle-guide', icon:'🧩', label:'Bundle Combinations', section:'Useful Tools',
        href:'uw-bundle-combinations.png', bg:'#e9f7f4', accent:'#0a7a6e',
        builderOnly:true
      },
      {
        id:'appointment-companion', icon:'📊', label:'Appointment Companion', section:'Useful Tools',
        href:'https://aqcroft.github.io/Appointment_Companion/v5-companion.html',
        bg:'#e9f7f4', accent:'#0a7a6e', builderOnly:true
      },
      {
        id:'ev-companion', icon:'⚡', label:'EV Tariff Companion', section:'Useful Tools',
        href:'https://aqcroft.github.io/Appointment_Companion/v16b-ev.html',
        bg:'#e9f7f4', accent:'#0a7a6e', builderOnly:true
      }
    ];
  }

  function availableShortcutCatalog() {
    const mode = currentMode();
    return shortcutCatalog().filter(item => mode === 'builder' || !item.builderOnly);
  }

  function loadShortcutIds() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(shortcutStorageKey()) || 'null'); } catch(e) {}
    const allowed = new Set(availableShortcutCatalog().map(item => item.id));
    const cleaned = Array.isArray(saved)
      ? saved.filter((id, index) => allowed.has(id) && saved.indexOf(id) === index)
      : [];
    SHORTCUT_DEFAULTS.forEach(id => {
      if (cleaned.length < 4 && allowed.has(id) && !cleaned.includes(id)) cleaned.push(id);
    });
    availableShortcutCatalog().forEach(item => {
      if (cleaned.length < 4 && !cleaned.includes(item.id)) cleaned.push(item.id);
    });
    return cleaned.slice(0,4);
  }

  function saveShortcutIds(ids) {
    try { localStorage.setItem(shortcutStorageKey(), JSON.stringify(ids)); } catch(e) {}
  }

  function renderShortcuts() {
    const grid = document.getElementById('shortcut-grid');
    const editBtn = document.getElementById('shortcut-edit-btn');
    if (!grid || !editBtn) return;

    const catalog = new Map(availableShortcutCatalog().map(item => [item.id,item]));
    const ids = loadShortcutIds();
    grid.innerHTML = ids.map((id, index) => {
      const item = catalog.get(id);
      if (!item) return '';
      const disabledHref = item.href && item.href !== '#' ? item.href : 'javascript:void(0)';
      return `
        <a class="quick-link" data-shortcut-slot="${index}" data-shortcut-id="${item.id}"
           href="${disabledHref}" target="_blank" rel="noopener"
           style="--shortcut-bg:${item.bg};--shortcut-accent:${item.accent};">
          <span class="edit-badge" aria-hidden="true">✎</span>
          <span class="quick-icon">${item.icon}</span>
          <span class="quick-label">${item.label}</span>
        </a>`;
    }).join('');

    grid.classList.toggle('is-editing', shortcutEditing);
    editBtn.classList.toggle('editing', shortcutEditing);
    editBtn.textContent = shortcutEditing ? 'Done' : 'Edit';

    grid.querySelectorAll('.quick-link').forEach(link => {
      link.addEventListener('click', event => {
        if (!shortcutEditing) return;
        event.preventDefault();
        shortcutSlot = Number(link.dataset.shortcutSlot);
        openShortcutPicker();
      });
    });
  }

  function setShortcutEditing(editing) {
    shortcutEditing = Boolean(editing);
    if (!shortcutEditing) shortcutSlot = null;
    renderShortcuts();
  }

  function openShortcutPicker() {
    if (shortcutSlot === null) return;
    const modal = document.getElementById('shortcut-picker');
    const list = document.getElementById('shortcut-picker-list');
    if (!modal || !list) return;

    const current = loadShortcutIds();
    const occupied = new Set(current.filter((_, index) => index !== shortcutSlot));
    const options = availableShortcutCatalog().filter(item => !occupied.has(item.id));

    list.innerHTML = options.map(item => `
      <button type="button" class="picker-option" data-picker-id="${item.id}"
              style="--option-bg:${item.bg};--option-accent:${item.accent};">
        <span class="picker-option-icon">${item.icon}</span>
        <span>
          <span class="picker-option-title">${item.label}</span>
          <span class="picker-option-section">${item.section}</span>
        </span>
        <span class="picker-option-arrow">→</span>
      </button>`).join('');

    list.querySelectorAll('.picker-option').forEach(option => {
      option.addEventListener('click', () => {
        const ids = loadShortcutIds();
        ids[shortcutSlot] = option.dataset.pickerId;
        saveShortcutIds(ids);
        closeAppModal('shortcuts');
        renderShortcuts();
      });
    });

    modal.hidden = false;
    document.body.classList.add('modal-open');
  }

  function openWelcomeModal(markSeen = false) {
    const modal = document.getElementById('welcome-modal');
    if (!modal) return;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    if (markSeen) {
      try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch(e) {}
    }
  }

  function closeAppModal(type) {
    const id = type === 'shortcuts' ? 'shortcut-picker' : 'welcome-modal';
    const modal = document.getElementById(id);
    if (modal) modal.hidden = true;
    if (!document.querySelector('.app-modal:not([hidden])')) {
      document.body.classList.remove('modal-open');
    }
    if (type === 'shortcuts') shortcutSlot = null;
  }

  function initShortcutEditing() {
    const editBtn = document.getElementById('shortcut-edit-btn');
    if (editBtn) editBtn.addEventListener('click', () => setShortcutEditing(!shortcutEditing));

    window.addEventListener('partnerModeChanged', () => {
      shortcutEditing = false;
      shortcutSlot = null;
      renderShortcuts();
    });

    document.querySelectorAll('[data-close-modal="shortcuts"]').forEach(el => {
      el.addEventListener('click', () => closeAppModal('shortcuts'));
    });

    renderShortcuts();
  }

  function initWelcomeModal() {
    const reopen = document.getElementById('welcome-reopen');
    const gotIt = document.getElementById('welcome-got-it');

    document.querySelectorAll('[data-close-modal="welcome"]').forEach(el => {
      el.addEventListener('click', () => {
        try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch(e) {}
        closeAppModal('welcome');
      });
    });

    if (reopen) reopen.addEventListener('click', () => openWelcomeModal(false));
    if (gotIt) gotIt.addEventListener('click', () => {
      try { localStorage.setItem(WELCOME_SEEN_KEY, 'true'); } catch(e) {}
      closeAppModal('welcome');
    });

    let seen = false;
    try { seen = localStorage.getItem(WELCOME_SEEN_KEY) === 'true'; } catch(e) {}
    if (!seen) requestAnimationFrame(() => openWelcomeModal(false));
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
    initShortcutEditing();
    initWelcomeModal();
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
// === Main JS ===
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.nav');
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  const scrollContainer = document.getElementById('page-scroll-container');
  const isOnePageScroll = Boolean(scrollContainer);
  const progressBar = document.getElementById('nav-progress-bar');
  const scrollHint = document.querySelector('.panel-scroll-hint');

  const SECTION_ORDER = ['landing', 'about', 'research', 'experience', 'publications', 'explore', 'contact'];

  const navPromptCwd = document.querySelector('[data-nav-cwd]');

  const SECTION_CWD_MAP = {
    landing: '',
    about: 'whoami',
    research: 'whoami',
    experience: 'experience',
    publications: 'publications',
    explore: 'explore',
    contact: 'contact',
    news: 'news'
  };

  const PATHNAME_CWD_MAP = [
    { match: /\/blog(?:\/|$)/i, cwd: 'blog' },
    { match: /\/cv(?:\/|$)/i, cwd: 'cv' },
    { match: /\/projects(?:\/|$)/i, cwd: 'projects' },
    { match: /\/history(?:\/|$)/i, cwd: 'history' },
    { match: /\/experience(?:\/|$)/i, cwd: 'experience' }
  ];

  const updateNavPromptCwd = (cwd) => {
    if (!navPromptCwd) return;
    navPromptCwd.textContent = cwd || '';
  };

  const cwdFromSection = (sectionId) => SECTION_CWD_MAP[sectionId] ?? '';

  const cwdFromPathname = () => {
    const path = window.location.pathname;
    const match = PATHNAME_CWD_MAP.find(({ match }) => match.test(path));
    if (match) return match.cwd;

    const hash = window.location.hash.replace('#', '');
    if (hash && Object.prototype.hasOwnProperty.call(SECTION_CWD_MAP, hash)) {
      return SECTION_CWD_MAP[hash];
    }

    return '';
  };

  const getScrollTop = () => scrollContainer ? scrollContainer.scrollTop : window.scrollY;

  const getSnapPanel = (element) => {
    if (!element) return null;
    if (element.id === 'landing') {
      return document.getElementById('landing-scroll-track') || element;
    }
    return element.closest('.footer-snap-panel, .page-panel, .home-section') || element;
  };

  const getPanelScrollTop = (panel) => {
    if (!scrollContainer || !panel) return 0;
    const panelRect = panel.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    return panelRect.top - containerRect.top + scrollContainer.scrollTop;
  };

  /*
   * === Shared scroll model ===
   *
   * One geometry snapshot per frame drives the progress bar, the nav
   * highlight, the URL hash and the scroll hint. They used to be three
   * independent computations that disagreed with each other.
   *
   * Progress is section-index based, not pixel based. Panels are not equal
   * heights — `#experience`, `#publications`, and Contact are auto-height and `#experience` runs to ~2.2x the
   * viewport on a phone — so raw `scrollTop / scrollHeight` made the bar crawl
   * through most sections and sprint through that one. Each section now owns
   * an equal slice, and travel inside a section fills its slice linearly.
   */

  // Scroll offset of each section's panel, ascending. Rebuilt on layout change.
  let sectionStops = [];

  const measureSectionStops = () => {
    if (!scrollContainer) {
      sectionStops = [];
      return;
    }
    const max = Math.max(scrollContainer.scrollHeight - scrollContainer.clientHeight, 0);
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const scrolled = scrollContainer.scrollTop;

    const stops = [];
    SECTION_ORDER.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      const panel = getSnapPanel(element) || element;
      const top = panel.getBoundingClientRect().top - containerTop + scrolled;
      stops.push({ id, top: Math.min(Math.max(Math.round(top), 0), max) });
    });
    if (!stops.length) {
      sectionStops = [];
      return;
    }

    // The last section is the footer panel: its own top sits past the end of
    // the scroll range, so pin it to max or the final slice never completes.
    stops[stops.length - 1].top = max;
    // Keep strictly ascending — a clamped stop must never overtake its
    // predecessor, or the interpolation below divides by zero.
    for (let i = 1; i < stops.length; i += 1) {
      if (stops[i].top < stops[i - 1].top) stops[i].top = stops[i - 1].top;
    }
    sectionStops = stops;
  };

  // { index, id, progress } for a scroll offset. `progress` is 0..1 across the
  // whole page with every section weighted equally.
  const resolveScrollPosition = (scrollTop) => {
    if (sectionStops.length < 2) return { index: 0, id: SECTION_ORDER[0], progress: 0 };

    const last = sectionStops.length - 1;
    let index = 0;
    while (index < last && scrollTop >= sectionStops[index + 1].top) index += 1;

    const start = sectionStops[index].top;
    const end = index < last ? sectionStops[index + 1].top : start;
    const span = end - start;
    const local = span > 0 ? Math.min(Math.max((scrollTop - start) / span, 0), 1) : 0;

    return {
      index,
      id: sectionStops[index].id,
      progress: Math.min(Math.max((index + local) / last, 0), 1)
    };
  };

  // Set by the one-page block below so the model can drive the nav highlight,
  // and so a programmatic scroll can claim its destination up front.
  let onSectionChange = null;
  let claimSection = null;
  let lastSectionId = null;
  // Shared with the one-page lock so a click-to-section can pin the prompt
  // during the smooth scroll without the scroll handler reverting it.
  let isNavigating = false;

  // Fraction of the viewport from the top. The panel whose top has crossed
  // this line owns the nav prompt and hash. Waiting for flush-top (the
  // progress-bar index) lagged the visual hand-off: About was already on
  // screen while the prompt still read `~/`.
  const NAV_ACTIVE_LINE = 0.42;

  const resolveNavSectionId = (scrollTop) => {
    if (sectionStops.length === 0) return SECTION_ORDER[0];
    if (sectionStops.length === 1) return sectionStops[0].id;
    const viewport = scrollContainer ? scrollContainer.clientHeight : window.innerHeight;
    const probe = scrollTop + viewport * NAV_ACTIVE_LINE;
    const last = sectionStops.length - 1;
    let index = 0;
    while (index < last && probe >= sectionStops[index + 1].top) index += 1;
    return sectionStops[index].id;
  };

  const applyScrollState = () => {
    const scrollTop = getScrollTop();

    nav?.classList.toggle('scrolled', scrollTop > 20);

    if (!isOnePageScroll || !scrollContainer) {
      if (progressBar) {
        const root = document.documentElement;
        const range = root.scrollHeight - root.clientHeight;
        const p = range > 0 ? Math.min(Math.max(scrollTop / range, 0), 1) : 0;
        progressBar.style.transform = `scaleX(${p})`;
      }
      return;
    }

    const position = resolveScrollPosition(scrollTop);

    if (progressBar) progressBar.style.transform = `scaleX(${position.progress})`;
    if (scrollHint) {
      scrollHint.classList.toggle('hidden', position.index >= sectionStops.length - 1);
    }
    // Click-to-section already claimed the destination; don't flash the
    // previous prompt while the smooth scroll is still in the prior panel.
    if (isNavigating) return;
    const navSectionId = resolveNavSectionId(scrollTop);
    if (navSectionId !== lastSectionId) {
      lastSectionId = navSectionId;
      onSectionChange?.(navSectionId);
    }
  };

  // rAF-batched: the previous handler wrote a style and then read 14
  // getBoundingClientRects on every scroll event, forcing a synchronous layout
  // flush per event (~137 layouts per 20 wheel ticks).
  let scrollFrame = 0;
  const onScroll = () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      applyScrollState();
    });
  };

  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', onScroll, { passive: true });
  } else {
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  const syncSnapPanelHeight = () => {
    if (!scrollContainer) return;
    const height = scrollContainer.clientHeight;
    if (height > 0) {
      document.documentElement.style.setProperty('--snap-panel-height', `${height}px`);
    }
  };

  const syncNavOffset = () => {
    if (!nav) return;
    const { bottom } = nav.getBoundingClientRect();
    if (bottom > 0) {
      document.documentElement.style.setProperty('--nav-float-offset', `${bottom}px`);
    }
  };

  const syncLayoutMetrics = () => {
    syncSnapPanelHeight();
    syncNavOffset();
    measureSectionStops();
    applyScrollState();
  };

  if (scrollContainer) {
    syncLayoutMetrics();
    requestAnimationFrame(syncLayoutMetrics);
    window.addEventListener('load', syncLayoutMetrics);
    window.addEventListener('resize', syncLayoutMetrics);
  } else {
    syncLayoutMetrics();
    window.addEventListener('load', syncLayoutMetrics);
    window.addEventListener('resize', syncLayoutMetrics);
  }

  const updateUrlForSection = (id) => {
    if (id === 'landing') {
      const path = window.location.pathname || '/';
      if (window.location.hash) {
        history.replaceState(null, '', path);
      }
      return;
    }
    history.replaceState(null, '', `#${id}`);
  };

  const scrollToSection = (id, { smooth = false } = {}) => {
    const target = document.getElementById(id);
    if (!target) return false;

    const scrollTarget = getSnapPanel(target) || target;

    if (scrollContainer) {
      const top = getPanelScrollTop(scrollTarget);
      claimSection?.(id);
      scrollContainer.scrollTo({
        top,
        behavior: smooth ? 'smooth' : 'auto'
      });
      updateUrlForSection(id);
    } else {
      target.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'start'
      });
      updateUrlForSection(id);
    }

    return true;
  };

  const scrollToAnchor = (id) => {
    const target = document.getElementById(id);
    if (!target) return false;

    if (scrollContainer) {
      return scrollToSection(id);
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `#${id}`);
    return true;
  };

  // Scroll to in-page sections (Landing, Publications, Contact, etc.)
  document.querySelectorAll('[data-scroll-to]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sectionId = btn.dataset.scrollTo;
      const onHomePage = isOnePageScroll || window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');

      if (onHomePage) {
        if (scrollToSection(sectionId, { smooth: true })) {
          e.preventDefault();
          if (mobileMenu) mobileMenu.classList.remove('open');
        }
        return;
      }

      if (scrollToAnchor(sectionId)) {
        e.preventDefault();
        if (mobileMenu) mobileMenu.classList.remove('open');
      }
    });
  });

  const scrollToHashTarget = () => {
    const id = window.location.hash.replace('#', '');
    if (!id) {
      if (isOnePageScroll) updateNavPromptCwd(cwdFromSection('landing'));
      return;
    }
    if (id === 'landing') {
      updateUrlForSection('landing');
    }
    if (isOnePageScroll && Object.prototype.hasOwnProperty.call(SECTION_CWD_MAP, id)) {
      updateNavPromptCwd(cwdFromSection(id));
    } else if (!isOnePageScroll) {
      updateNavPromptCwd(cwdFromPathname());
    }
    requestAnimationFrame(() => {
      if (isOnePageScroll) {
        scrollToSection(id, { smooth: false });
      } else {
        scrollToAnchor(id);
      }
    });
  };

  if (window.location.hash) {
    setTimeout(scrollToHashTarget, 100);
  } else if (scrollContainer) {
    // Mandatory snap can settle on the first snappable panel before JS runs.
    // Pin fresh home loads to the landing hero when there is no hash.
    scrollContainer.scrollTop = 0;
    requestAnimationFrame(() => {
      if (!window.location.hash) scrollContainer.scrollTop = 0;
    });
  }

  window.addEventListener('hashchange', scrollToHashTarget);

  if (isOnePageScroll) {
    const sectionNavMap = {
      landing: null,
      about: 'about',
      research: 'about',
      experience: null,
      news: null,
      explore: null,
      publications: 'publications',
      contact: 'contact'
    };

    const canonicalHashForSection = (sectionId) => sectionId;

    const panelSectionMap = new Map();
    let activeSectionId = SECTION_ORDER[0];

    const releaseNavigationLock = () => {
      isNavigating = false;
      applyScrollState();
    };

    const lockNavigation = (smooth) => {
      isNavigating = true;
      if (smooth) {
        window.setTimeout(releaseNavigationLock, 700);
      } else {
        requestAnimationFrame(() => requestAnimationFrame(releaseNavigationLock));
      }
    };

    const setActivePanel = (sectionId) => {
      activeSectionId = sectionId;
      panelSectionMap.forEach((id, panel) => {
        panel.classList.toggle('is-active', id === sectionId);
      });
    };

    const setActiveSection = (sectionId) => {
      document.querySelectorAll('[data-nav-section]').forEach(link => {
        link.classList.toggle('active', link.dataset.navSection === sectionNavMap[sectionId]);
      });
      setActivePanel(sectionId);
      updateNavPromptCwd(cwdFromSection(sectionId));
    };

    const syncHashToSection = (sectionId) => {
      updateUrlForSection(canonicalHashForSection(sectionId));
    };

    /*
     * The active section comes from the shared scroll model, not from an
     * IntersectionObserver ratio.
     *
     * The observer gated on `intersectionRatio >= 0.45` against the panel's own
     * box. `#experience` is auto-height, so its peak achievable ratio is
     * viewportHeight / panelHeight — 0.447 at 390x844. It sat three
     * thousandths under the gate and therefore never became active on a phone,
     * which froze `activeSectionId` and left the keyboard and the scroll hint
     * unable to move past it. Reading the section from scroll offsets is
     * height-independent, so no panel can fall through that way.
     */
    SECTION_ORDER.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      panelSectionMap.set(getSnapPanel(element) || element, id);
    });

    onSectionChange = (sectionId) => {
      if (sectionId === activeSectionId) return;
      setActiveSection(sectionId);
      syncHashToSection(sectionId);
    };

    claimSection = (sectionId) => {
      lastSectionId = sectionId;
      setActiveSection(sectionId);
      // A settle chosen before this jump is now aimed at the wrong panel.
      cancelSettle();
    };

    /*
     * A section's scroll footprint is the gap to the next section's stop, not
     * its own offsetHeight. The landing track's box is 230vh but it carries
     * `margin-bottom: -130vh`, so it only occupies 100vh of scroll. Measuring
     * it by offsetHeight made this code believe landing owned 0-2070 when
     * About actually starts at 900, so "scroll within the landing panel"
     * stepped straight over About's rest position and it was never shown.
     */
    const sectionBounds = (index) => {
      if (index < 0 || index >= sectionStops.length) return null;
      const top = sectionStops[index].top;
      const bottom = index + 1 < sectionStops.length
        ? sectionStops[index + 1].top
        : scrollContainer.scrollHeight;
      return { top, bottom };
    };

    // Scrolling is free now, so this no longer has to disable and restore
    // snap — that restore used to re-arm mandatory snap mid-animation and yank
    // the last ~130px of the tall Experience panel out of reach.
    const scrollWithinPanel = (_panel, delta) => {
      scrollContainer.scrollBy({ top: delta, behavior: 'smooth' });
    };

    const handlePanelScroll = (direction) => {
      if (isNavigating || sectionStops.length < 2) return;

      const scrollTop = scrollContainer.scrollTop;
      // Steer from where the scroll actually is, not from the last section the
      // observer happened to report.
      const currentIndex = resolveScrollPosition(scrollTop).index;
      const bounds = sectionBounds(currentIndex);
      if (!bounds) return;

      const viewport = scrollContainer.clientHeight;
      const scrollBottom = scrollTop + viewport;
      // Only a section taller than the viewport has anywhere to go inside it.
      const canScrollInsidePanel = bounds.bottom - bounds.top > viewport + 12;

      if (direction === 'down') {
        if (canScrollInsidePanel && scrollBottom < bounds.bottom - 12) {
          lockNavigation(true);
          scrollWithinPanel(null, Math.min(viewport * 0.85, bounds.bottom - scrollBottom));
          return;
        }
        if (currentIndex + 1 < sectionStops.length) {
          lockNavigation(true);
          scrollToSection(sectionStops[currentIndex + 1].id, { smooth: true });
        }
        return;
      }

      if (canScrollInsidePanel && scrollTop > bounds.top + 12) {
        lockNavigation(true);
        scrollWithinPanel(null, -Math.min(viewport * 0.85, scrollTop - bounds.top));
        return;
      }

      if (currentIndex - 1 >= 0) {
        lockNavigation(true);
        scrollToSection(sectionStops[currentIndex - 1].id, { smooth: true });
      }
    };

    /*
     * === Panel settle ===
     *
     * This replaces CSS scroll-snap. Mandatory snap re-evaluated after every
     * wheel event, and one real wheel/trackpad gesture is a burst of many
     * small events, so each one was snapped away before the next arrived: the
     * page was pinned at About and no amount of scrolling moved it.
     *
     * The settle does the same job from the other side. It never touches a
     * scroll that is still arriving. Only once input has been quiet does it
     * ease to the nearest panel edge, and only when that edge is already
     * close and lies the way the user was already travelling. Anything else is
     * left exactly where the user put it.
     */
    const SETTLE_IDLE_MS = 140;
    const SETTLE_DURATION = 360;
    // Reach, as a fraction of the viewport. Beyond this the user is reading
    // mid-panel on purpose (Experience is taller than the viewport) and a
    // settle would be a yank, so we leave the scroll alone.
    const SETTLE_REACH = 0.3;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let settleTimer = 0;
    let settleFrame = 0;
    let isSettling = false;
    let settleFromTop = scrollContainer.scrollTop;
    let scrollDirection = 1;

    const cancelSettle = () => {
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
      if (settleFrame) {
        cancelAnimationFrame(settleFrame);
        settleFrame = 0;
      }
      isSettling = false;
    };

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animateSettle = (to) => {
      const from = scrollContainer.scrollTop;
      const distance = to - from;
      const startedAt = performance.now();
      isSettling = true;
      // Last offset this animation wrote, so it can tell its own movement
      // apart from someone else's.
      let written = from;

      const finish = () => {
        settleFrame = 0;
        isSettling = false;
        settleFromTop = scrollContainer.scrollTop;
      };

      const step = (now) => {
        // Anything else that moved the scroll mid-animation outranks the
        // settle — a nav jump, a reset, a fresh gesture. Yield instead of
        // stomping it back to the target we picked before it happened.
        if (Math.abs(scrollContainer.scrollTop - written) > 2) {
          finish();
          return;
        }
        const t = Math.min((now - startedAt) / SETTLE_DURATION, 1);
        scrollContainer.scrollTop = from + distance * easeOutCubic(t);
        // Read back: the container clamps at its bounds, so the value we asked
        // for is not always the value we got.
        written = scrollContainer.scrollTop;
        if (t < 1) {
          settleFrame = requestAnimationFrame(step);
          return;
        }
        finish();
      };

      settleFrame = requestAnimationFrame(step);
    };

    const settleToPanel = () => {
      settleTimer = 0;
      if (isNavigating || isSettling || reducedMotion.matches) return;
      // Landing and About are blended by raw scroll offset during the
      // hand-off; moving the scroll under that blend fights the choreography.
      if (scrollContainer.classList.contains('landing-scroll-soft')) return;
      if (sectionStops.length < 2) return;

      const scrollTop = scrollContainer.scrollTop;
      const max = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      if (scrollTop <= 1 || scrollTop >= max - 1) return;

      // Only ever settle the way the user was already going. Settling to the
      // nearest edge in either direction would drag a reader back out of a
      // panel taller than the viewport.
      const goingDown = scrollDirection >= 0;
      let target = null;
      sectionStops.forEach(({ top }) => {
        if (goingDown ? top < scrollTop : top > scrollTop) return;
        if (target === null || (goingDown ? top < target : top > target)) target = top;
      });
      if (target === null) return;

      const distance = Math.abs(target - scrollTop);
      if (distance < 2 || distance > scrollContainer.clientHeight * SETTLE_REACH) return;

      animateSettle(target);
    };

    const queueSettle = () => {
      if (isSettling) return;
      const top = scrollContainer.scrollTop;
      if (Math.abs(top - settleFromTop) > 0.5) {
        scrollDirection = top > settleFromTop ? 1 : -1;
        settleFromTop = top;
      }
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settleToPanel, SETTLE_IDLE_MS);
    };

    scrollContainer.addEventListener('scroll', queueSettle, { passive: true });
    // Any fresh input outranks a settle already in flight.
    ['wheel', 'touchstart', 'pointerdown'].forEach((type) => {
      scrollContainer.addEventListener(type, cancelSettle, { passive: true });
    });
    document.addEventListener('keydown', cancelSettle, { passive: true });
    window.addEventListener('resize', cancelSettle, { passive: true });

    document.querySelectorAll('[data-scroll-direction]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        handlePanelScroll(btn.dataset.scrollDirection);
      });
    });

    const isTypingTarget = (target) => {
      if (!target) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    };

    const handleSectionKeydown = (e) => {
      if (isTypingTarget(e.target)) return;
      if (e.target.closest('button, a')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (mobileMenu?.classList.contains('open')) return;

      const directionByKey = {
        ArrowDown: 'down',
        ArrowUp: 'up',
        PageDown: 'down',
        PageUp: 'up',
        ' ': 'down'
      };

      const direction = directionByKey[e.key];
      if (!direction) return;

      e.preventDefault();
      handlePanelScroll(direction);
    };

    document.addEventListener('keydown', handleSectionKeydown);
    scrollContainer.focus({ preventScroll: true });

    applyScrollState();
    syncSnapPanelHeight();
    setActiveSection(activeSectionId);
  }

  // More dropdown toggle
  document.querySelectorAll('.nav-dropdown').forEach(dropdown => {
    const toggle = dropdown.querySelector(':scope > .nav-dropdown-toggle');
    const menu = dropdown.querySelector(':scope > .nav-dropdown-menu');

    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        dropdown.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
      });
    });
  });

  // Tools submenu inside More dropdown
  document.querySelectorAll('.nav-dropdown-submenu').forEach(submenu => {
    const toggle = submenu.querySelector('.nav-dropdown-submenu-toggle');
    const menu = submenu.querySelector('.nav-dropdown-submenu-menu');

    toggle?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = submenu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        submenu.classList.remove('open');
        toggle?.setAttribute('aria-expanded', 'false');
        submenu.closest('.nav-dropdown')?.classList.remove('open');
        submenu.closest('.nav-dropdown')?.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown')) {
      document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
        dropdown.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
      });
    }
    if (!e.target.closest('.nav-dropdown-submenu')) {
      document.querySelectorAll('.nav-dropdown-submenu.open').forEach(submenu => {
        submenu.classList.remove('open');
        submenu.querySelector('.nav-dropdown-submenu-toggle')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.nav-dropdown.open').forEach(dropdown => {
        dropdown.classList.remove('open');
        dropdown.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
      });
      document.querySelectorAll('.nav-dropdown-submenu.open').forEach(submenu => {
        submenu.classList.remove('open');
        submenu.querySelector('.nav-dropdown-submenu-toggle')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Mobile menu toggle
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      const icon = mobileMenuBtn.querySelector('svg');
      icon.innerHTML = isOpen
        ? '<line x1="18" x2="6" y1="6" y2="18"></line><line x1="6" x2="18" y1="6" y2="18"></line>'
        : '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>';
    });

    // Close on link click
    mobileMenu.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        const icon = mobileMenuBtn.querySelector('svg');
        icon.innerHTML = '<line x1="4" x2="20" y1="12" y2="12"></line><line x1="4" x2="20" y1="6" y2="6"></line><line x1="4" x2="20" y1="18" y2="18"></line>';
      });
    });
  }

  // Active nav link from pathname (non-home pages)
  if (!isOnePageScroll) {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      if (!href) return;
      if (path === '/' && (href === '/' || href.includes('index'))) {
        link.classList.add('active');
      } else if (path !== '/' && href !== '/' && path.includes(href.replace(/\.html$/, '').replace(/\/$/, ''))) {
        link.classList.add('active');
      }
    });
    updateNavPromptCwd(cwdFromPathname());
    applyScrollState();
  }

  // Scroll animations via IntersectionObserver
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

  // Project category filter
  const categoryBtns = document.querySelectorAll('.category-pill');
  const projectCards = document.querySelectorAll('.project-card[data-category]');
  const projectCount = document.getElementById('project-count');

  if (categoryBtns.length) {
    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        categoryBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        let count = 0;
        projectCards.forEach(card => {
          const show = cat === 'all' || card.dataset.category === cat;
          card.classList.toggle('hidden', !show);
          if (show) count++;
        });
        if (projectCount) projectCount.textContent = count;
      });
    });
  }

  // Timeline expand/collapse
  const timelineItems = document.querySelectorAll('.timeline-item');
  timelineItems.forEach(item => {
    const marker = item.querySelector('.timeline-marker');
    const card = item.querySelector('.timeline-card');
    const toggle = () => {
      const wasExpanded = item.classList.contains('expanded');
      timelineItems.forEach(i => i.classList.remove('expanded'));
      if (!wasExpanded) item.classList.add('expanded');
    };
    if (marker) marker.addEventListener('click', toggle);
    if (card) card.addEventListener('click', toggle);
  });

  /*
   * Line utilization: no wrapped line should occupy less than half of its
   * available measure (the "planes." widow in About). text-wrap:pretty is the
   * CSS first pass; this then glues trailing words with NBSP so the last
   * line fills ≥ 50% without splitting links or overflowing the float.
   */
  const LINE_FILL_MIN = 0.5;
  const LINE_FILL_WORD = /\S*[A-Za-z0-9]\S*/g;
  const LINE_FILL_SELECTOR = [
    '.about-text p',
    '.landing-bio p',
    '.skill-category-description',
    '.cv-responsibilities li',
    '.footer-description',
    '.publication-entry-title',
    '.publication-entry-authors'
  ].join(',');
  const lineFillOriginals = new WeakMap();

  const collectRightFloats = (el) => {
    const floats = [];
    let parent = el.parentElement;
    for (let depth = 0; parent && depth < 5; depth += 1, parent = parent.parentElement) {
      for (const child of parent.children) {
        const side = getComputedStyle(child).float;
        if (side !== 'right' && side !== 'left') continue;
        const r = child.getBoundingClientRect();
        const cs = getComputedStyle(child);
        floats.push({
          side,
          top: r.top,
          bottom: r.bottom,
          left: r.left - (parseFloat(cs.marginLeft) || 0),
          right: r.right + (parseFloat(cs.marginRight) || 0)
        });
      }
    }
    return floats;
  };

  const mergeLineRects = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const raw = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 1);
    raw.sort((a, b) => a.top - b.top || a.left - b.left);
    const lines = [];
    raw.forEach((r) => {
      const last = lines[lines.length - 1];
      if (!last || Math.abs(r.top - last.top) > 2) {
        lines.push({ top: r.top, left: r.left, right: r.right });
      } else {
        last.left = Math.min(last.left, r.left);
        last.right = Math.max(last.right, r.right);
      }
    });
    return lines;
  };

  const minLineRatio = (el) => {
    if (el.clientWidth < 32) return 1;
    const lines = mergeLineRects(el);
    if (lines.length < 2) return 1;
    const box = el.getBoundingClientRect();
    const padRight = parseFloat(getComputedStyle(el).paddingRight) || 0;
    const contentRight = box.right - padRight;
    const floats = collectRightFloats(el);
    let min = 1;
    lines.forEach((line) => {
      let rightEdge = contentRight;
      floats.forEach((f) => {
        if (f.side !== 'right') return;
        if (line.top < f.bottom - 1 && line.top + 4 > f.top) {
          rightEdge = Math.min(rightEdge, f.left);
        }
      });
      const available = rightEdge - line.left;
      if (available < 8) return;
      min = Math.min(min, (line.right - line.left) / available);
    });
    return min;
  };

  const eachWord = (el) => {
    const words = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const re = new RegExp(LINE_FILL_WORD.source, 'g');
      let match;
      while ((match = re.exec(node.textContent))) {
        words.push({
          node,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }
    return words;
  };

  const nbspRange = (node, from, to) => {
    const t = node.textContent;
    node.textContent = t.slice(0, from) + t.slice(from, to).replace(/\s/g, '\u00a0') + t.slice(to);
  };

  const glueLastWords = (el, wordCount) => {
    const words = eachWord(el);
    if (wordCount < 2 || words.length < wordCount) return false;
    const slice = words.slice(-wordCount);
    for (let i = 1; i < slice.length; i += 1) {
      const prev = slice[i - 1];
      const next = slice[i];
      if (prev.node === next.node) {
        nbspRange(prev.node, prev.end, next.start);
      } else {
        nbspRange(prev.node, prev.end, prev.node.textContent.length);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let seen = false;
        let node;
        while ((node = walker.nextNode())) {
          if (node === prev.node) {
            seen = true;
            continue;
          }
          if (node === next.node) break;
          if (seen) node.textContent = node.textContent.replace(/\s/g, '\u00a0');
        }
        nbspRange(next.node, 0, next.start);
      }
    }
    const start = slice[0];
    const end = slice[slice.length - 1];
    const harden = (text) => text.replace(/-/g, '\u2011').replace(/\//g, '/\u2060');
    if (start.node === end.node) {
      const t = start.node.textContent;
      start.node.textContent = t.slice(0, start.start) + harden(t.slice(start.start, end.end)) + t.slice(end.end);
    } else {
      const startT = start.node.textContent;
      start.node.textContent = startT.slice(0, start.start) + harden(startT.slice(start.start));
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let seen = false;
      let node;
      while ((node = walker.nextNode())) {
        if (node === start.node) {
          seen = true;
          continue;
        }
        if (node === end.node) break;
        if (seen) node.textContent = harden(node.textContent);
      }
      const endT = end.node.textContent;
      end.node.textContent = harden(endT.slice(0, end.end)) + endT.slice(end.end);
    }
    return true;
  };

  const restoreLineFill = (el) => {
    if (lineFillOriginals.has(el)) el.innerHTML = lineFillOriginals.get(el);
  };

  const overflowsMeasure = (el) => {
    if (el.scrollWidth > el.clientWidth + 1) return true;
    const lines = mergeLineRects(el);
    const floats = collectRightFloats(el);
    return lines.some((line) =>
      floats.some((f) =>
        f.side === 'right' &&
        line.top < f.bottom - 1 &&
        line.top + 4 > f.top &&
        line.right > f.left + 4
      )
    );
  };

  const suffixWidth = (el, wordCount) => {
    const words = eachWord(el);
    if (words.length < wordCount) return 0;
    const slice = words.slice(-wordCount);
    const range = document.createRange();
    range.setStart(slice[0].node, slice[0].start);
    range.setEnd(slice[slice.length - 1].node, slice[slice.length - 1].end);
    const span = document.createElement('span');
    span.style.whiteSpace = 'nowrap';
    try {
      range.surroundContents(span);
    } catch (err) {
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    const width = span.getBoundingClientRect().width;
    const parent = span.parentNode;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
    el.normalize();
    return width;
  };

  const lastLineAvailable = (el) => {
    const lines = mergeLineRects(el);
    if (!lines.length) return el.clientWidth;
    const last = lines[lines.length - 1];
    const box = el.getBoundingClientRect();
    const padRight = parseFloat(getComputedStyle(el).paddingRight) || 0;
    let rightEdge = box.right - padRight;
    collectRightFloats(el).forEach((f) => {
      if (f.side !== 'right') return;
      if (last.top < f.bottom - 1 && last.top + 4 > f.top) {
        rightEdge = Math.min(rightEdge, f.left);
      }
    });
    return Math.max(8, rightEdge - last.left);
  };

  const fillElement = (el) => {
    if (!el || !el.textContent.trim()) return;
    if (!lineFillOriginals.has(el)) lineFillOriginals.set(el, el.innerHTML);
    restoreLineFill(el);
    if (el.clientWidth < 32) return;

    const startScore = minLineRatio(el);
    if (startScore >= LINE_FILL_MIN) return;

    let bestK = 0;
    let bestScore = startScore;
    let foundFill = false;
    const wordCount = (el.textContent.match(LINE_FILL_WORD) || []).length;
    const maxK = Math.min(wordCount - 1, 48);
    const previousWrap = el.style.getPropertyValue('text-wrap');
    el.style.setProperty('text-wrap', 'wrap');

    for (let k = 2; k <= maxK; k += 1) {
      restoreLineFill(el);
      if (!glueLastWords(el, k)) continue;
      if (overflowsMeasure(el)) continue;
      const lines = mergeLineRects(el);
      const avail = lastLineAvailable(el);
      const suffix = suffixWidth(el, k);
      if (lines.length < 2) {
        if (suffix >= LINE_FILL_MIN * el.clientWidth - 1) {
          bestK = k;
          bestScore = 1;
          foundFill = true;
          break;
        }
        continue;
      }
      const score = minLineRatio(el);
      if (score > bestScore + 0.001) {
        bestScore = score;
        bestK = k;
      }
      if (suffix >= LINE_FILL_MIN * avail - 1 && suffix <= avail + 1 && score >= LINE_FILL_MIN) {
        bestK = k;
        bestScore = score;
        foundFill = true;
        break;
      }
    }

    restoreLineFill(el);
    if (bestK > 0 && (foundFill || bestScore > startScore + 0.001)) {
      glueLastWords(el, bestK);
    }
    if (previousWrap) el.style.setProperty('text-wrap', previousWrap);
    else el.style.removeProperty('text-wrap');
  };

  const optimizeLineUtilization = () => {
    document.querySelectorAll(LINE_FILL_SELECTOR).forEach(fillElement);
  };

  let lineFillTimer = 0;
  const scheduleLineFill = () => {
    if (lineFillTimer) window.clearTimeout(lineFillTimer);
    lineFillTimer = window.setTimeout(() => {
      lineFillTimer = 0;
      optimizeLineUtilization();
    }, 80);
  };

  const startLineFill = () => {
    optimizeLineUtilization();
    window.setTimeout(optimizeLineUtilization, 400);
    window.addEventListener('resize', scheduleLineFill);
    document.querySelectorAll('.about-portrait img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', scheduleLineFill, { once: true });
      else scheduleLineFill();
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        scheduleLineFill();
        io.unobserve(entry.target);
      });
    }, { threshold: 0.02 });
    document.querySelectorAll('#about, #research, #experience, #contact').forEach((el) => {
      io.observe(el);
    });
  };

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(startLineFill);
  } else {
    startLineFill();
  }

});

// Navigation helper
function navigateTo(page) {
  window.location.href = page;
}

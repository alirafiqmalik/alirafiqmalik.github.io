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

  const updateScrollHintVisibility = () => {
    if (!scrollHint || !isOnePageScroll || !scrollContainer) return;

    const sections = SECTION_ORDER;
    const scrollTop = scrollContainer.scrollTop;
    const viewportMid = scrollTop + scrollContainer.clientHeight * 0.35;
    let currentId = sections[0];

    sections.forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      const panelRect = section.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const top = panelRect.top - containerRect.top + scrollContainer.scrollTop;
      if (top <= viewportMid) currentId = id;
    });

    scrollHint.classList.toggle('hidden', currentId === sections[sections.length - 1]);
  };

  const updateProgressBar = () => {
    if (!progressBar) return;
    const container = scrollContainer || document.documentElement;
    const scrollTop = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = `${pct}%`;
  };

  // Scroll effect for nav + progress bar
  const onScroll = () => {
    nav?.classList.toggle('scrolled', getScrollTop() > 20);
    updateProgressBar();
    updateScrollHintVisibility();
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

  // Keep News card sticky just under the floating navbar (content-sized; no stretch).
  const syncNewsCardMetrics = () => {
    if (!nav) return;
    if (window.matchMedia('(max-width: 1023px)').matches) {
      document.documentElement.style.removeProperty('--news-sticky-top');
      return;
    }

    const stickyGap = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-sticky-gap')
    ) || 8;
    const top = nav.getBoundingClientRect().bottom + stickyGap;
    document.documentElement.style.setProperty('--news-sticky-top', `${top}px`);

    const card = document.querySelector('.landing-aside .news-window-inner, .profile-aside .news-window-inner');
    if (card) {
      const height = card.getBoundingClientRect().height;
      if (height > 0) {
        document.documentElement.style.setProperty('--news-card-height', `${height}px`);
      }
    }
  };

  const syncLayoutMetrics = () => {
    syncSnapPanelHeight();
    syncNavOffset();
    syncNewsCardMetrics();
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

  const getSnapPanel = (element) => {
    if (!element) return null;
    if (element.id === 'landing') {
      return document.getElementById('landing-scroll-track') || element;
    }
    return element.closest('.footer-snap-panel, .page-panel, .home-section') || element;
  };

  const getObserveTarget = (element) => {
    if (!element) return null;
    if (element.classList.contains('profile-interests')) return element;
    if (element.id === 'landing') return element;
    return getSnapPanel(element) || element;
  };

  const getPanelScrollTop = (panel) => {
    if (!scrollContainer || !panel) return 0;
    const panelRect = panel.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    return panelRect.top - containerRect.top + scrollContainer.scrollTop;
  };

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

    // Profile blocks (#research inside #about) scroll to the element itself.
    const scrollTarget = target.classList.contains('profile-interests')
      ? target
      : (getSnapPanel(target) || target);

    if (scrollContainer) {
      const top = getPanelScrollTop(scrollTarget);
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
    let isNavigating = false;

    const releaseNavigationLock = () => {
      isNavigating = false;
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

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.45) return;
        const sectionId = panelSectionMap.get(entry.target);
        if (!sectionId) return;
        setActiveSection(sectionId);
        syncHashToSection(sectionId);
        updateScrollHintVisibility();
      });
    }, {
      root: scrollContainer,
      threshold: [0.45, 0.6]
    });

    SECTION_ORDER.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      const observeTarget = getObserveTarget(element);
      panelSectionMap.set(observeTarget, id);
      sectionObserver.observe(observeTarget);
    });

    const panelNeedsInternalScroll = (panel) => {
      if (!panel || !scrollContainer) return false;
      return panel.offsetHeight > scrollContainer.clientHeight + 12;
    };

    const scrollWithinPanel = (panel, delta) => {
      scrollContainer.style.scrollSnapType = 'none';
      scrollContainer.scrollBy({ top: delta, behavior: 'smooth' });
      window.setTimeout(() => {
        scrollContainer.style.scrollSnapType = '';
      }, 900);
    };

    const handlePanelScroll = (direction) => {
      if (isNavigating) return;

      const currentId = activeSectionId;
      const currentIndex = SECTION_ORDER.indexOf(currentId);
      if (currentIndex === -1) return;

      const element = document.getElementById(currentId);
      const panel = getSnapPanel(element);
      if (!panel) return;

      const panelTop = getPanelScrollTop(panel);
      const panelBottom = panelTop + panel.offsetHeight;
      const scrollTop = scrollContainer.scrollTop;
      const scrollBottom = scrollTop + scrollContainer.clientHeight;
      const canScrollInsidePanel = panelNeedsInternalScroll(panel);

      if (direction === 'down') {
        if (canScrollInsidePanel && scrollBottom < panelBottom - 12) {
          lockNavigation(true);
          scrollWithinPanel(panel, scrollContainer.clientHeight * 0.85);
          return;
        }

        // Skip sibling intro blocks that share the same tall panel.
        let nextIndex = currentIndex + 1;
        while (nextIndex < SECTION_ORDER.length) {
          const nextEl = document.getElementById(SECTION_ORDER[nextIndex]);
          const nextPanel = getSnapPanel(nextEl);
          if (nextPanel !== panel) break;
          nextIndex += 1;
        }

        if (nextIndex < SECTION_ORDER.length) {
          lockNavigation(false);
          scrollToSection(SECTION_ORDER[nextIndex], { smooth: false });
        }
        return;
      }

      if (canScrollInsidePanel && scrollTop > panelTop + 12) {
        lockNavigation(true);
        scrollWithinPanel(panel, -scrollContainer.clientHeight * 0.85);
        return;
      }

      let prevIndex = currentIndex - 1;
      while (prevIndex >= 0) {
        const prevEl = document.getElementById(SECTION_ORDER[prevIndex]);
        const prevPanel = getSnapPanel(prevEl);
        if (prevPanel !== panel) break;
        prevIndex -= 1;
      }

      if (prevIndex >= 0) {
        lockNavigation(false);
        scrollToSection(SECTION_ORDER[prevIndex], { smooth: false });
      }
    };

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

    updateScrollHintVisibility();
    updateProgressBar();
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
    updateProgressBar();
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

  // News CTA: scroll to #news and briefly focus the news window
  const focusNewsWindow = () => {
    const newsWindows = document.querySelectorAll('.news-window');
    if (!newsWindows.length) return;
    let target = newsWindows[0];
    newsWindows.forEach(win => {
      const panel = win.closest('.page-panel, .home-section, .landing-aside, .profile-aside');
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.75 && rect.bottom > window.innerHeight * 0.15) {
        target = win;
      }
    });
    newsWindows.forEach(win => win.classList.remove('is-focused'));
    target.classList.add('is-focused');
    window.setTimeout(() => target.classList.remove('is-focused'), 1600);
  };

  document.querySelectorAll('[data-focus-news]').forEach(el => {
    el.addEventListener('click', () => {
      window.setTimeout(focusNewsWindow, 350);
    });
  });
});

// Navigation helper
function navigateTo(page) {
  window.location.href = page;
}

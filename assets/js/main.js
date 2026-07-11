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

  const siteScroll = window.__siteScroll || {};
  const hasLenis = Boolean(siteScroll.lenis);

  const getScrollTop = () => {
    if (typeof siteScroll.getScrollTop === 'function') return siteScroll.getScrollTop();
    return scrollContainer ? scrollContainer.scrollTop : window.scrollY;
  };

  const updateScrollHintVisibility = () => {
    if (!scrollHint || !isOnePageScroll || !scrollContainer) return;
    const sections = ['landing', 'about', 'research', 'experience', 'publications', 'explore', 'contact'];
    const scrollTop = getScrollTop();
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

    const isLast = currentId === sections[sections.length - 1];
    scrollHint.classList.toggle('hidden', isLast);
  };

  const updateProgressBar = () => {
    if (!progressBar) return;
    const container = scrollContainer || document.documentElement;
    const scrollTop = getScrollTop();
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

  if (typeof siteScroll.onScroll === 'function') {
    siteScroll.onScroll(onScroll);
  } else if (scrollContainer) {
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

  if (scrollContainer) {
    syncSnapPanelHeight();
    requestAnimationFrame(syncSnapPanelHeight);
    window.addEventListener('load', syncSnapPanelHeight);
    window.addEventListener('resize', syncSnapPanelHeight);
  }

  const getSnapPanel = (element) => {
    if (!element) return null;
    return element.closest('.footer-snap-panel, .page-panel') || element;
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

    const panel = getSnapPanel(target);

    if (hasLenis && typeof siteScroll.scrollTo === 'function') {
      if (scrollContainer) {
        const top = getPanelScrollTop(panel);
        siteScroll.scrollTo(top, { immediate: !smooth });
      } else {
        siteScroll.scrollTo(target, { immediate: !smooth });
        updateUrlForSection(id);
      }
      return true;
    }

    if (scrollContainer) {
      const top = getPanelScrollTop(panel);
      scrollContainer.scrollTo({
        top,
        behavior: smooth ? 'smooth' : 'auto'
      });
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
      return scrollToSection(id, { smooth: true });
    }

    if (hasLenis && typeof siteScroll.scrollTo === 'function') {
      siteScroll.scrollTo(target, { immediate: false });
      history.replaceState(null, '', `#${id}`);
      return true;
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
    if (!id) return;
    if (id === 'landing') {
      updateUrlForSection('landing');
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
  }

  window.addEventListener('hashchange', scrollToHashTarget);

  if (isOnePageScroll) {
    const sectionNavMap = {
      landing: null,
      about: 'about',
      research: null,
      experience: 'about',
      explore: null,
      publications: 'research',
      contact: 'contact'
    };

    const canonicalHashForSection = (sectionId) => {
      if (sectionId === 'experience') return 'about';
      return sectionId;
    };

    const panelSectionMap = new Map();
    let activeSectionId = SECTION_ORDER[0];
    let isNavigating = false;

    const releaseNavigationLock = () => {
      isNavigating = false;
    };

    const lockNavigation = (smooth) => {
      isNavigating = true;
      if (smooth) {
        window.setTimeout(releaseNavigationLock, hasLenis ? 1100 : 700);
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
    };

    const syncHashToSection = (sectionId) => {
      updateUrlForSection(canonicalHashForSection(sectionId));
    };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
        const sectionId = panelSectionMap.get(entry.target);
        if (!sectionId) return;
        setActiveSection(sectionId);
        syncHashToSection(sectionId);
        updateScrollHintVisibility();
      });
    }, {
      root: scrollContainer,
      threshold: 0.6
    });

    SECTION_ORDER.forEach(id => {
      const element = document.getElementById(id);
      const panel = getSnapPanel(element);
      if (panel) {
        panelSectionMap.set(panel, id);
        sectionObserver.observe(panel);
      }
    });

    const panelNeedsInternalScroll = (panel) => {
      if (!panel || !scrollContainer) return false;
      return panel.offsetHeight > scrollContainer.clientHeight + 12;
    };

    const scrollWithinPanel = (panel, delta) => {
      const nextTop = scrollContainer.scrollTop + delta;
      if (hasLenis && typeof siteScroll.scrollTo === 'function') {
        siteScroll.scrollTo(nextTop, { immediate: false });
        return;
      }
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
      const scrollTop = getScrollTop();
      const scrollBottom = scrollTop + scrollContainer.clientHeight;
      const canScrollInsidePanel = panelNeedsInternalScroll(panel);
      // With Lenis, prefer fluid section-to-section easing over hard snaps
      const useSmoothSectionJump = hasLenis;

      if (direction === 'down') {
        if (canScrollInsidePanel && scrollBottom < panelBottom - 12) {
          lockNavigation(true);
          scrollWithinPanel(panel, scrollContainer.clientHeight * 0.85);
          return;
        }

        if (currentIndex < SECTION_ORDER.length - 1) {
          lockNavigation(useSmoothSectionJump);
          scrollToSection(SECTION_ORDER[currentIndex + 1], { smooth: useSmoothSectionJump });
        }
        return;
      }

      if (canScrollInsidePanel && scrollTop > panelTop + 12) {
        lockNavigation(true);
        scrollWithinPanel(panel, -scrollContainer.clientHeight * 0.85);
        return;
      }

      if (currentIndex > 0) {
        lockNavigation(useSmoothSectionJump);
        scrollToSection(SECTION_ORDER[currentIndex - 1], { smooth: useSmoothSectionJump });
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
    updateProgressBar();
  }

  // Scroll reveals: GSAP ScrollTrigger owns these when smooth-scroll is active
  if (!document.documentElement.classList.contains('has-smooth-scroll')) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));
  }

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
});

// Navigation helper
function navigateTo(page) {
  window.location.href = page;
}

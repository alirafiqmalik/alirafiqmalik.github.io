/**
 * Smooth scrolling (Lenis) + scroll-driven motion (GSAP ScrollTrigger).
 * Framer Motion is React-only; GSAP provides equivalent scrub / transform mapping here.
 */
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollContainer = document.getElementById('page-scroll-container');
  const isOnePageScroll = Boolean(scrollContainer);

  window.__siteScroll = {
    lenis: null,
    reducedMotion: prefersReducedMotion,
    isOnePageScroll,
    scrollTo: null,
    getScrollTop: null,
    onScroll: null
  };

  if (prefersReducedMotion || typeof Lenis === 'undefined' || typeof gsap === 'undefined') {
    document.documentElement.classList.add('native-scroll');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  document.documentElement.classList.add('has-smooth-scroll');
  if (isOnePageScroll) {
    document.documentElement.classList.add('has-smooth-scroll-nested');
  }

  // --- Lenis ---
  const lenisOptions = {
    lerp: 0.09,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.4,
    smoothWheel: true,
    syncTouch: true,
    autoRaf: false
  };

  if (isOnePageScroll) {
    const content =
      document.getElementById('page-scroll-content') ||
      scrollContainer.querySelector('.page-scroll-content') ||
      scrollContainer;
    lenisOptions.wrapper = scrollContainer;
    lenisOptions.content = content;
  }

  const lenis = new Lenis(lenisOptions);
  window.__siteScroll.lenis = lenis;
  window.__lenis = lenis;

  // Lenis writes real scrollTop on the wrapper — ScrollTrigger can read it directly.
  // Keep ST in sync on every Lenis frame; avoid scrollerProxy (it broke nested pin/scrub).
  lenis.on('scroll', ScrollTrigger.update);

  if (isOnePageScroll) {
    ScrollTrigger.defaults({ scroller: scrollContainer });
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  ScrollTrigger.config({ ignoreMobileResize: true });

  const getScrollTop = () => {
    if (isOnePageScroll) return scrollContainer.scrollTop;
    return lenis.scroll || window.scrollY || 0;
  };

  window.__siteScroll.getScrollTop = getScrollTop;

  window.__siteScroll.scrollTo = (target, { immediate = false, offset = 0 } = {}) => {
    if (typeof target === 'number') {
      lenis.scrollTo(target + offset, { immediate, lock: false });
      return;
    }

    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;

    if (isOnePageScroll) {
      const panel = el.closest('.footer-snap-panel, .page-panel') || el;
      const panelRect = panel.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const top = panelRect.top - containerRect.top + scrollContainer.scrollTop + offset;
      lenis.scrollTo(top, { immediate, lock: false });
    } else {
      lenis.scrollTo(el, { immediate, offset, lock: false });
    }
  };

  window.__siteScroll.onScroll = (callback) => {
    lenis.on('scroll', callback);
    return () => lenis.off('scroll', callback);
  };

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    lenis.resize();
  });

  // --- Scroll-driven animations ---
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    setupLandingMotion();
    setupSectionReveals();
    setupParallax();
    setupResearchScrub();
    setupExperienceMotion();
    setupExploreDrift();
    setupHeadingTypography();
    setupPublicationsScrub();
    setupSocialBob();
    setupFooterMotion();

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  });

  function setupLandingMotion() {
    const name = document.querySelector('.landing-name');
    const tagline = document.querySelector('.landing-tagline');
    const bio = document.querySelector('.landing-bio');
    const footerRow = document.querySelector('.landing-footer-row');
    const landing = document.getElementById('landing');
    if (!landing || !name) return;

    gsap.from([name, tagline, bio, footerRow].filter(Boolean), {
      y: 28,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.05,
      clearProps: 'transform'
    });

    // Scrub tied to scroll progress (reverses when scrolling up)
    gsap.to(name, {
      yPercent: -18,
      scale: 0.92,
      opacity: 0.45,
      ease: 'none',
      scrollTrigger: {
        trigger: landing,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6
      }
    });

    if (tagline) {
      gsap.to(tagline, {
        yPercent: -36,
        opacity: 0.15,
        ease: 'none',
        scrollTrigger: {
          trigger: landing,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.8
        }
      });
    }
  }

  function setupSectionReveals() {
    const skip = new Set([
      ...document.querySelectorAll('.skills-grid.animate-on-scroll'),
      ...document.querySelectorAll('.experience-list.animate-on-scroll'),
      ...document.querySelectorAll('.explore-quick-links.animate-on-scroll')
    ]);

    document.querySelectorAll('.animate-on-scroll').forEach((el) => {
      if (skip.has(el)) return;
      // Play/reverse on enter — content always reaches full opacity
      gsap.from(el, {
        opacity: 0,
        y: 28,
        duration: 0.75,
        ease: 'power2.out',
        immediateRender: false,
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse'
        }
      });
    });
  }

  function setupParallax() {
    const portrait = document.querySelector('.about-portrait');
    if (portrait) {
      gsap.fromTo(
        portrait,
        { yPercent: 10 },
        {
          yPercent: -10,
          ease: 'none',
          scrollTrigger: {
            trigger: '#about',
            start: 'top bottom',
            end: 'bottom top',
            scrub: true
          }
        }
      );
    }

    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax) || 0.2;
      gsap.to(el, {
        y: () => -window.innerHeight * speed * 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  function setupResearchScrub() {
    const section = document.getElementById('research');
    const categories = gsap.utils.toArray('.page-panel-research .skill-category');
    if (!section || !categories.length) return;

    // Reveal on enter (safe), then scrub horizontal depth while in view
    gsap.from(categories, {
      opacity: 0,
      x: -36,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });

    categories.forEach((cat, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.to(cat, {
        x: dir * 20,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  function setupExperienceMotion() {
    const section = document.getElementById('experience');
    const list = section?.querySelector('.experience-list');
    if (!section || !list) return;

    const items = gsap.utils.toArray(list.querySelectorAll('.cv-item'));
    if (!items.length) return;

    gsap.from(items, {
      opacity: 0,
      y: 36,
      duration: 0.7,
      stagger: 0.12,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        toggleActions: 'play none none reverse'
      }
    });

    // Soft scrub: items drift at different rates (parallax depth)
    items.forEach((item, i) => {
      gsap.to(item, {
        y: (i % 2 === 0 ? -1 : 1) * 12,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });

    // Element pinning on document-scroll pages only (nested Lenis pin is unreliable)
    if (!isOnePageScroll) {
      const header = section.querySelector('.page-panel-header');
      if (!header) return;
      ScrollTrigger.create({
        trigger: header,
        start: 'top 5.5rem',
        endTrigger: list,
        end: 'bottom 60%',
        pin: true,
        pinSpacing: true
      });
    }
  }

  function setupExploreDrift() {
    const links = gsap.utils.toArray('.explore-quick-links .quick-link');
    if (!links.length) return;

    gsap.from(links, {
      y: 40,
      opacity: 0,
      rotate: -2,
      duration: 0.7,
      stagger: 0.1,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#explore',
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    });

    // Multi-directional sway scrubbed to scroll
    links.forEach((link, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      gsap.to(link, {
        x: dir * 18,
        ease: 'none',
        scrollTrigger: {
          trigger: '#explore',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  function setupHeadingTypography() {
    document.querySelectorAll('.page-panel-header h2, .footer-heading').forEach((heading) => {
      gsap.fromTo(
        heading,
        { letterSpacing: '0.06em', y: 16 },
        {
          letterSpacing: '0em',
          y: 0,
          ease: 'none',
          scrollTrigger: {
            trigger: heading,
            start: 'top 92%',
            end: 'top 55%',
            scrub: 0.65
          }
        }
      );
    });
  }

  function setupPublicationsScrub() {
    const items = gsap.utils.toArray(
      '.page-panel-publications .publication-item, .page-panel-publications .pub-item, .publication-list > *'
    );
    if (!items.length) return;

    gsap.from(items, {
      y: 28,
      opacity: 0,
      duration: 0.65,
      stagger: 0.08,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#publications',
        start: 'top 75%',
        toggleActions: 'play none none reverse'
      }
    });
  }

  function setupSocialBob() {
    const icons = gsap.utils.toArray('.landing-social a, .footer-social a');
    if (!icons.length) return;

    icons.forEach((icon, i) => {
      gsap.to(icon, {
        y: i % 2 === 0 ? -6 : 6,
        ease: 'none',
        scrollTrigger: {
          trigger: icon.closest('section, footer') || icon,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  function setupFooterMotion() {
    const contact = document.querySelector('.footer-contact-inner');
    if (!contact) return;

    gsap.from(contact, {
      y: 40,
      opacity: 0,
      duration: 0.8,
      ease: 'power2.out',
      immediateRender: false,
      scrollTrigger: {
        trigger: '#contact',
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    });
  }
})();

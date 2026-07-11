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

  const scroller = isOnePageScroll ? scrollContainer : window;

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

  lenis.on('scroll', ScrollTrigger.update);

  if (isOnePageScroll) {
    ScrollTrigger.scrollerProxy(scrollContainer, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight
        };
      },
      pinType: scrollContainer.style.transform ? 'transform' : 'fixed'
    });

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

  // Keep ScrollTrigger measurements correct after fonts/images settle
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
    setupExperiencePin();
    setupExploreDrift();
    setupHeadingTypography();
    setupPublicationsScrub();
    setupSocialBob();
    setupFooterMotion();

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

    // Entrance without pre-hiding (avoids FOUC with deferred scripts)
    gsap.from([name, tagline, bio, footerRow].filter(Boolean), {
      y: 28,
      autoAlpha: 0,
      duration: 0.9,
      stagger: 0.12,
      ease: 'power3.out',
      delay: 0.05,
      clearProps: 'transform'
    });

    // Scrub: name scales / fades as you leave the hero
    gsap.to(name, {
      yPercent: -18,
      scale: 0.92,
      opacity: 0.35,
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
        yPercent: -40,
        opacity: 0,
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
      gsap.set(el, { opacity: 0, y: 28 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          end: 'top 55%',
          scrub: 0.7
        }
      });
    });
  }

  function setupParallax() {
    const portrait = document.querySelector('.about-portrait');
    if (portrait) {
      gsap.fromTo(
        portrait,
        { yPercent: 12 },
        {
          yPercent: -12,
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
    const inner = section?.querySelector('.page-panel-inner');
    if (!section || !categories.length) return;

    gsap.set(categories, { opacity: 0.25, x: -24 });

    const canPin = isOnePageScroll && inner && categories.length >= 2;
    if (canPin) {
      section.classList.add('page-panel-pin-sequence');
    }

    gsap.to(categories, {
      opacity: 1,
      x: 0,
      ease: 'none',
      stagger: 0.12,
      scrollTrigger: {
        trigger: section,
        start: canPin ? 'top top' : 'top 75%',
        end: canPin
          ? () => `+=${Math.round(scrollContainer.clientHeight * 0.85)}`
          : 'center 40%',
        scrub: 0.8,
        pin: canPin ? inner : false,
        pinSpacing: canPin,
        anticipatePin: canPin ? 1 : 0
      }
    });
  }

  function setupExperiencePin() {
    const section = document.getElementById('experience');
    const list = section?.querySelector('.experience-list');
    if (!section || !list) return;

    const items = gsap.utils.toArray(list.querySelectorAll('.cv-item'));
    if (!items.length) return;

    gsap.set(items, { opacity: 0.2, y: 40 });

    gsap.to(items, {
      opacity: 1,
      y: 0,
      ease: 'none',
      stagger: 0.15,
      scrollTrigger: {
        trigger: section,
        start: 'top 70%',
        end: 'bottom 55%',
        scrub: 0.9
      }
    });

    // Pinning is unreliable inside a nested Lenis wrapper; use document scroll only
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

    gsap.set(links, { y: 48, opacity: 0, rotate: -2 });

    gsap.to(links, {
      y: 0,
      opacity: 1,
      rotate: 0,
      ease: 'none',
      stagger: {
        each: 0.1,
        from: 'start'
      },
      scrollTrigger: {
        trigger: '#explore',
        start: 'top 80%',
        end: 'center 50%',
        scrub: 0.75
      }
    });

    // Multi-directional sway while the section is in view
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
        { letterSpacing: '0.08em', y: 24, opacity: 0.4 },
        {
          letterSpacing: '0em',
          y: 0,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: heading,
            start: 'top 90%',
            end: 'top 55%',
            scrub: 0.65
          }
        }
      );
    });
  }

  function setupPublicationsScrub() {
    const items = gsap.utils.toArray('.page-panel-publications .publication-item, .page-panel-publications .pub-item, .publication-list > *');
    if (!items.length) return;

    gsap.fromTo(
      items,
      { y: 32, opacity: 0.15 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        stagger: 0.1,
        scrollTrigger: {
          trigger: '#publications',
          start: 'top 75%',
          end: 'center 45%',
          scrub: 0.7
        }
      }
    );
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

    gsap.fromTo(
      contact,
      { y: 60, opacity: 0.4 },
      {
        y: 0,
        opacity: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#contact',
          start: 'top 85%',
          end: 'top 40%',
          scrub: 0.8
        }
      }
    );
  }
})();

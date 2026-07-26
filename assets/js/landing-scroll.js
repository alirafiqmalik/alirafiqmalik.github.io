/**
 * Landing scroll choreography:
 * exit (bio/news/title) → reveal globe 50%→100% → dim as persistent site bg
 * → soft blend into About
 */
(function () {
  'use strict';

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function smoothstep(t) {
    const x = clamp(t, 0, 1);
    return x * x * (3 - 2 * x);
  }

  function init() {
    const track = document.getElementById('landing-scroll-track');
    const stage = document.getElementById('landing-stage');
    const globeSlot = document.getElementById('landing-globe-slot');
    const about = document.getElementById('about');
    if (!track || !stage) return;

    const scrollRoot = document.getElementById('page-scroll-container');
    const getViewportHeight = () => (scrollRoot ? scrollRoot.clientHeight : window.innerHeight);

    // Keep the globe on <body> as a fixed site-wide layer so overflow/sticky
    // clipping on the landing stage can never cut the reveal short.
    if (globeSlot && globeSlot.parentElement !== document.body) {
      document.body.appendChild(globeSlot);
      window.dispatchEvent(new Event('resize'));
    }

    const setVars = (p, exit, reveal, fade) => {
      stage.style.setProperty('--landing-p', String(p));
      stage.style.setProperty('--landing-exit', String(exit));
      stage.style.setProperty('--landing-reveal', String(reveal));
      stage.style.setProperty('--landing-fade', String(fade));
      if (globeSlot) {
        globeSlot.style.setProperty('--landing-p', String(p));
        globeSlot.style.setProperty('--landing-exit', String(exit));
        globeSlot.style.setProperty('--landing-reveal', String(reveal));
        globeSlot.style.setProperty('--landing-fade', String(fade));
      }
    };

    const applyEndState = () => {
      setVars(1, 1, 1, 1);
      document.body.classList.add('globe-is-bg');
      if (about) about.style.setProperty('--about-enter', '1');
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      applyEndState();
      return;
    }

    let ticking = false;

    const getTrackProgress = () => {
      const viewportHeight = getViewportHeight();
      const total = track.offsetHeight - viewportHeight;

      if (scrollRoot) {
        const trackRect = track.getBoundingClientRect();
        const containerRect = scrollRoot.getBoundingClientRect();
        const scrolled = Math.min(
          Math.max(-(trackRect.top - containerRect.top), 0),
          Math.max(total, 1)
        );
        return scrolled / Math.max(total, 1);
      }

      const rect = track.getBoundingClientRect();
      const scrolled = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      return scrolled / Math.max(total, 1);
    };

    const getAboutEnter = () => {
      if (!about) return 0;
      const viewportHeight = getViewportHeight();

      let top;
      if (scrollRoot) {
        const containerRect = scrollRoot.getBoundingClientRect();
        top = about.getBoundingClientRect().top - containerRect.top;
      } else {
        top = about.getBoundingClientRect().top;
      }

      // 0 when About is still below the fold; 1 when it has settled near the top
      return smoothstep(clamp(1 - top / viewportHeight, 0, 1));
    };

    const syncSnapForProgress = (p, aboutEnter) => {
      if (!scrollRoot) return;
      // Free scrub through most of the landing track; proximity snap for the
      // landing→About blend; mandatory snap resumes once About is settled.
      const inLanding = p > 0.01 && p < 0.88;
      const inBlend = (p >= 0.88 && p <= 1) || (aboutEnter > 0 && aboutEnter < 0.92);

      scrollRoot.classList.toggle('landing-scroll-free', inLanding);
      scrollRoot.classList.toggle('landing-scroll-soft', !inLanding && inBlend);
      if (!inLanding && !inBlend) {
        scrollRoot.classList.remove('landing-scroll-free', 'landing-scroll-soft');
      }
    };

    const update = () => {
      ticking = false;

      const p = getTrackProgress();
      const aboutEnter = getAboutEnter();

      // Longer, eased phases so landing → About feels continuous
      const exit = smoothstep(clamp(p / 0.3, 0, 1));
      const reveal = smoothstep(clamp((p - 0.14) / 0.5, 0, 1));
      // Dim starts while reveal finishes and continues into the About approach
      const fade = smoothstep(clamp((p - 0.52) / 0.48, 0, 1));

      setVars(p, exit, reveal, fade);
      if (about) about.style.setProperty('--about-enter', String(aboutEnter));
      syncSnapForProgress(p, aboutEnter);

      const shouldBeBg = fade > 0.2 || p >= 0.85 || aboutEnter > 0.15;
      document.body.classList.toggle('globe-is-bg', shouldBeBg);
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    // Fresh visits (/ with no hash) must start on the hero — not #about.
    if (scrollRoot && !window.location.hash) {
      scrollRoot.scrollTop = 0;
    }

    if (scrollRoot) {
      scrollRoot.addEventListener('scroll', requestUpdate, { passive: true });
    } else {
      window.addEventListener('scroll', requestUpdate, { passive: true });
    }
    window.addEventListener('resize', requestUpdate, { passive: true });

    update();

    // Re-assert top after layout metrics / snap settle on first paint.
    if (scrollRoot && !window.location.hash) {
      requestAnimationFrame(() => {
        if (!window.location.hash && scrollRoot.scrollTop > 0) {
          scrollRoot.scrollTop = 0;
          update();
        }
      });
      window.addEventListener(
        'load',
        () => {
          if (!window.location.hash && scrollRoot.scrollTop > 0) {
            scrollRoot.scrollTop = 0;
            update();
          }
        },
        { once: true }
      );
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

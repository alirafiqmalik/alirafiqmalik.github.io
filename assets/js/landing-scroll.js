/**
 * Landing scrollytelling choreography.
 *
 * The globe is a fixed layer pinned to the viewport centre for the whole page;
 * scroll progress drives everything that moves around it:
 *
 *   0.00 → 0.40  hero copy (title / bio / news) lifts away
 *   0.10 → 0.55  globe reveals from half-height to centred
 *   0.45 → 1.00  globe dims and the unified scrim rises behind the content
 *   first scroll → past the track  About rises through the overlap and settles
 *
 * The phases overlap on purpose: at no point in the journey is scrolling
 * moving nothing, which is what produced the dead gap before About.
 *
 * Contrast over the globe comes from one fixed `.site-backdrop` layer whose
 * opacity is set here (`--backdrop-scrim`). Panels are transparent, so no
 * panel edge can ever slice across the globe (issue #21).
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

    // Nested overflow:auto scrollports (News / About) steal wheel/touch even
    // when content fits. Only enable scrolling when content actually overflows.
    const nestedScrollPorts = () =>
      document.querySelectorAll('.landing-aside, .page-panel-about .page-panel-inner');

    const needsNestedScroll = (el) => {
      // The About reveal transform expands scrollHeight even when the bio fits.
      // Its own scrollHeight measures the bio layout without that transform.
      const content = el.querySelector(':scope > .about-panel');
      const contentHeight = content ? content.scrollHeight : el.scrollHeight;
      return contentHeight > el.clientHeight + 1;
    };

    const syncNestedScrollPorts = () => {
      nestedScrollPorts().forEach((el) => {
        el.classList.toggle('is-scrollable', needsNestedScroll(el));
      });
    };

    // Peak opacity of the unified scrim once the globe is the site background.
    // Replaces the old per-panel rgba fills (0.52–0.70) with one uniform value.
    const SCRIM_MAX = 0.58;

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

    const setScrim = (value) => {
      document.documentElement.style.setProperty('--backdrop-scrim', String(value));
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // CSS `@media (prefers-reduced-motion: reduce)` owns the static values
      // (one-screen track, centred dimmed globe, hero copy at rest). Only the
      // classes that CSS cannot set are applied here.
      document.body.classList.add('globe-is-bg');
      if (about) about.style.setProperty('--about-enter', '1');
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

    const syncSnapForProgress = (aboutEnter) => {
      if (!scrollRoot) return;
      // The track and About overlap. Snap must stay off during the blend, or
      // the browser can skip the scroll-driven transition. About entry reaches
      // 1 and stays there after About passes, so snap returns for later panels.
      // Free scrolling must own the rest position. Otherwise, mandatory snap
      // can cancel small wheel ticks before progress reaches the old 1% gate.
      const inLanding = aboutEnter < 0.55;
      const inBlend = !inLanding && aboutEnter >= 0.55 && aboutEnter < 0.94;

      scrollRoot.classList.toggle('landing-scroll-free', inLanding);
      scrollRoot.classList.toggle('landing-scroll-soft', inBlend);
      if (!inLanding && !inBlend) {
        scrollRoot.classList.remove('landing-scroll-free', 'landing-scroll-soft');
      }
    };

    const update = () => {
      ticking = false;

      const p = getTrackProgress();
      const aboutEnter = getAboutEnter();

      // Overlapping phases — something is always in motion while scrolling
      const exit = smoothstep(clamp(p / 0.4, 0, 1));
      const reveal = smoothstep(clamp((p - 0.1) / 0.45, 0, 1));
      // Dim starts while the reveal finishes and runs into the About approach
      const fade = smoothstep(clamp((p - 0.45) / 0.55, 0, 1));

      setVars(p, exit, reveal, fade);
      // One uniform scrim, driven by whichever of the two blend drivers leads.
      // Because it is a single fixed layer there is no edge to slice the globe.
      setScrim(Math.max(fade, aboutEnter) * SCRIM_MAX);
      if (about) about.style.setProperty('--about-enter', String(aboutEnter));
      syncSnapForProgress(aboutEnter);
      syncNestedScrollPorts();

      const shouldBeBg = fade > 0.2 || p >= 0.8 || aboutEnter > 0.05;
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
    // Portrait / font layout can change overflow needs after first paint.
    window.addEventListener('load', () => {
      syncNestedScrollPorts();
      update();
    }, { once: true });

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

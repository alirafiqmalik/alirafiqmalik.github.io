/**
 * Landing globe — COBE dark mode with Firefly device stickers as DOM markers.
 * Progressive loop: blank → markers → arcs → hold → fade → reset.
 *
 * Source; bundle with: npm run build:globe
 * Stickers: assets/img/globe/stickers/* from Firefly_RemoveBackground.png
 */
import createGlobe from 'cobe';

(function () {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const ACCENT = [206 / 255, 1, 0];

  // Device stickers extracted from assets/img/Firefly_RemoveBackground.png
  const STICKERS = [
    { id: 'cellular-tower', file: 'cellular-tower.png', label: 'Cellular tower' },
    { id: 'datacenter', file: 'datacenter.png', label: 'Datacenter' },
    { id: 'cluster', file: 'cloud.png', label: 'Cloud cluster' },
    { id: 'wifi', file: 'wifi.png', label: 'Wi‑Fi' },
    { id: 'phone', file: 'phone.png', label: 'Phone' },
    { id: 'laptop', file: 'laptop.png', label: 'Laptop' },
    { id: 'desktop', file: 'desktop.png', label: 'Desktop' },
    { id: 'bank', file: 'house.png', label: 'Bank / building' },
    { id: 'watch', file: 'watch.png', label: 'Smartwatch' },
    { id: 'gamepad', file: 'gamepad.png', label: 'IoT / gamepad' },
    { id: 'phone-signal', file: 'phone-signal.png', label: 'Mobile signal' },
    { id: 'location', file: 'location-pin.png', label: 'Location' }
  ];

  // Progressive mesh links (indices into STICKERS)
  const LINK_PAIRS = [
    [0, 1], [0, 4], [0, 3],
    [1, 2], [1, 6], [1, 5],
    [2, 3], [2, 7],
    [3, 4], [3, 8],
    [4, 5], [4, 10],
    [5, 6], [5, 9],
    [6, 7], [6, 11],
    [7, 8], [8, 9],
    [9, 10], [10, 11],
    [2, 11], [0, 7]
  ];

  const assetPath = (file) => {
    const root = document.body?.dataset?.baseurl || '';
    const base = root ? `${root.replace(/\/?$/, '')}/` : '/';
    return `${base}assets/img/globe/stickers/${file}`;
  };

  /** Fibonacci lattice → uniform [lat, lon] on the sphere. */
  function fibonacciLocations(count) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / Math.max(1, count - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const lat = (Math.asin(Math.max(-1, Math.min(1, y))) * 180) / Math.PI;
      const lon = (Math.atan2(z, x) * 180) / Math.PI;
      pts.push([lat, lon]);
    }
    return pts;
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /** Exact COBE anchor match (avoids --cobe-phone matching --cobe-phone-signal). */
  function findAnchor(host, id) {
    const want = `--cobe-${id}`;
    for (const el of host.children) {
      if (el.tagName !== 'DIV') continue;
      const name = el.style.getPropertyValue('anchor-name').trim() || el.style.anchorName || '';
      if (name === want) return el;
    }
    return null;
  }

  function isCobeFacing(id) {
    // COBE sets `--cobe-visible-{id}: N` on :root when facing; removes when not
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue(`--cobe-visible-${id}`)
      .trim();
    return raw !== '' && raw !== '0';
  }

  /**
   * Front-hemisphere depth from projected anchor (0 at limb → 1 at disk center).
   * COBE already culls the back; this ranks/fades stickers still on the front.
   */
  function screenDepth(leftPct, topPct) {
    const nx = (leftPct - 50) / 50;
    const ny = (topPct - 50) / 50;
    const r2 = nx * nx + ny * ny;
    if (r2 >= 0.98) return 0; // at / past the silhouette
    return Math.sqrt(Math.max(0, 1 - r2));
  }

  // Drop stickers hugging the silhouette before they wrap behind
  const DEPTH_HIDE = 0.22;
  const DEPTH_FULL = 0.7;
  // Min screen-space separation between visible sticker anchors (% of host)
  const MIN_SEP_PCT = 12;

  function initLandingGlobe(canvas) {
    const locations = fibonacciLocations(STICKERS.length);
    const nodes = STICKERS.map((s, i) => ({
      ...s,
      location: locations[i],
      el: null
    }));

    let width = 0;
    let phi = 2.35;
    let theta = 0.32;
    let pointerX = null;
    let pointerPhi = phi;
    let dragging = false;
    let raf = 0;
    let running = true;
    let globe = null;
    let startTs = 0;

    // Progressive timeline (seconds), then loop
    const T = {
      blank: 1.2,
      markersEnd: 3.0,   // markers pop in quickly
      arcsEnd: 7.6,      // arcs draw slower
      holdEnd: 10.2,
      fadeEnd: 12.0
    };

    const pixelSize = () => {
      width = canvas.offsetWidth || canvas.clientWidth || 480;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return { dpr, size: Math.max(2, Math.floor(width * dpr)) };
    };

    const { dpr, size } = pixelSize();
    const ensureHost = () => canvas.parentElement;

    const buildStickers = () => {
      const host = ensureHost();
      if (!host) return;
      host.classList.add('cobe-globe-host');

      let layer = host.querySelector('.globe-sticker-layer');
      if (!layer) {
        layer = document.createElement('div');
        layer.className = 'globe-sticker-layer';
        host.appendChild(layer);
      }
      layer.innerHTML = '';

      nodes.forEach((node) => {
        const el = document.createElement('div');
        el.className = 'globe-sticker';
        el.dataset.stickerId = node.id;
        el.setAttribute('aria-hidden', 'true');
        el.style.setProperty('position-anchor', `--cobe-${node.id}`);

        const img = document.createElement('img');
        img.src = assetPath(node.file);
        img.alt = node.label;
        img.draggable = false;
        el.appendChild(img);

        layer.appendChild(el);
        node.el = el;
      });
    };

    const markersForCount = (count) => nodes.slice(0, count).map((n) => ({
      location: n.location,
      size: 0.022,
      id: n.id,
      color: ACCENT
    }));

    const arcsForCount = (count) => LINK_PAIRS.slice(0, count).map(([a, b], i) => ({
      from: nodes[a].location,
      to: nodes[b].location,
      id: `arc-${a}-${b}`,
      color: i % 2 === 0 ? ACCENT : [0.55, 0.75, 0.35]
    }));

    globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size,
      height: size,
      phi,
      theta,
      dark: 1,
      diffuse: 1.15,
      scale: 1.05,
      mapSamples: 18000,
      mapBrightness: 5.2,
      mapBaseBrightness: 0.04,
      baseColor: [0.12, 0.12, 0.12],
      markerColor: ACCENT,
      glowColor: [0.18, 0.18, 0.18],
      markers: [],
      arcs: [],
      arcColor: ACCENT,
      arcWidth: 0.5,
      arcHeight: 0.3,
      markerElevation: 0.02,
      opacity: 1,
      offset: [0, 0]
    });

    buildStickers();

    const hideSticker = (el) => {
      el.classList.remove('is-facing');
      el.style.opacity = '0';
      el.style.visibility = 'hidden';
      el.style.transform = 'translate(-50%, calc(-100% - 6px)) scale(0.85)';
      el.style.zIndex = '1';
    };

    const syncStickerLayout = () => {
      const host = ensureHost();
      const layer = host?.querySelector('.globe-sticker-layer');
      if (!host || !layer) return;

      // Front-hemisphere only (COBE culls the back), then resolve overlaps
      const candidates = [];

      nodes.forEach((node) => {
        if (!node.el) return;
        const shown = node.el.classList.contains('is-shown');
        const anchor = findAnchor(host, node.id);
        const cobeFacing = isCobeFacing(node.id);

        if (anchor) {
          node.el.style.left = anchor.style.left || '50%';
          node.el.style.top = anchor.style.top || '50%';
        }

        // Behind the globe or not yet revealed → fully gone until it rotates back
        if (!shown || !cobeFacing || !anchor) {
          hideSticker(node.el);
          return;
        }

        const left = parseFloat(anchor.style.left) || 50;
        const top = parseFloat(anchor.style.top) || 50;
        const depth = screenDepth(left, top);

        if (depth < DEPTH_HIDE) {
          hideSticker(node.el);
          return;
        }

        const limb = clamp((depth - DEPTH_HIDE) / (DEPTH_FULL - DEPTH_HIDE), 0, 1);
        candidates.push({ node, left, top, depth, limb });
      });

      // Closer to camera first — keep it, hide anything too close in screen space
      candidates.sort((a, b) => b.depth - a.depth);
      const kept = [];

      candidates.forEach((c) => {
        const overlaps = kept.some((k) => {
          const dx = k.left - c.left;
          const dy = k.top - c.top;
          return Math.hypot(dx, dy) < MIN_SEP_PCT;
        });

        if (overlaps) {
          hideSticker(c.node.el);
          return;
        }

        kept.push(c);
        const el = c.node.el;
        const op = 0.4 + 0.6 * c.limb;
        el.classList.add('is-facing');
        el.style.opacity = String(op);
        el.style.visibility = 'visible';
        el.style.transform = `translate(-50%, calc(-100% - 6px)) scale(${0.9 + 0.1 * c.limb})`;
        el.style.zIndex = String(10 + Math.round(c.depth * 40));
      });
    };

    const stageAt = (elapsed) => {
      const t = elapsed % T.fadeEnd;
      let markerCount = 0;
      let arcCount = 0;
      let fade = 1;

      if (t < T.blank) {
        markerCount = 0;
        arcCount = 0;
      } else if (t < T.markersEnd) {
        const p = easeOutCubic((t - T.blank) / (T.markersEnd - T.blank));
        markerCount = Math.floor(p * nodes.length + 0.001);
        arcCount = 0;
      } else if (t < T.arcsEnd) {
        markerCount = nodes.length;
        const p = easeOutCubic((t - T.markersEnd) / (T.arcsEnd - T.markersEnd));
        arcCount = Math.floor(p * LINK_PAIRS.length + 0.001);
      } else if (t < T.holdEnd) {
        markerCount = nodes.length;
        arcCount = LINK_PAIRS.length;
      } else {
        markerCount = nodes.length;
        arcCount = LINK_PAIRS.length;
        fade = 1 - (t - T.holdEnd) / (T.fadeEnd - T.holdEnd);
      }

      return { markerCount, arcCount, fade: clamp(fade, 0, 1), t };
    };

    let lastMarkerCount = -1;
    let lastArcCount = -1;
    let lastCycleT = 0;

    const applyStage = (st) => {
      if (!globe) return;

      if (st.t + 0.05 < lastCycleT) {
        lastMarkerCount = -1;
        lastArcCount = -1;
      }
      lastCycleT = st.t;

      if (st.markerCount !== lastMarkerCount) {
        lastMarkerCount = st.markerCount;
        globe.update({ markers: markersForCount(st.markerCount) });
      }

      nodes.forEach((node, i) => {
        if (!node.el) return;
        const on = i < st.markerCount && st.fade > 0.08;
        node.el.classList.toggle('is-shown', on);
      });

      if (st.arcCount !== lastArcCount) {
        lastArcCount = st.arcCount;
        globe.update({ arcs: arcsForCount(st.arcCount) });
      }

      const layer = ensureHost()?.querySelector('.globe-sticker-layer');
      if (layer) layer.style.opacity = String(st.fade);
    };

    const render = (ts) => {
      if (!running || !globe) return;
      if (!startTs) startTs = ts;
      const elapsed = REDUCED_MOTION.matches ? T.holdEnd - 0.01 : (ts - startTs) / 1000;

      if (!REDUCED_MOTION.matches && !dragging) {
        phi += 0.0024;
      }

      const st = stageAt(elapsed);
      if (st.t >= T.holdEnd) {
        const fadeMarkers = st.fade > 0.35 ? st.markerCount : 0;
        const fadeArcs = st.fade > 0.35 ? st.arcCount : 0;
        applyStage({ ...st, markerCount: fadeMarkers, arcCount: fadeArcs });
      } else {
        applyStage(st);
      }

      globe.update({ phi, theta });
      syncStickerLayout();

      if (!REDUCED_MOTION.matches) {
        raf = requestAnimationFrame(render);
      }
    };

    const onResize = () => {
      if (!globe) return;
      const next = pixelSize();
      globe.update({
        width: next.size,
        height: next.size,
        devicePixelRatio: next.dpr,
        phi,
        theta
      });
      syncStickerLayout();
    };

    window.addEventListener('resize', onResize);

    const onPointerDown = (e) => {
      dragging = true;
      pointerX = e.clientX;
      pointerPhi = phi;
      canvas.style.cursor = 'grabbing';
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
      if (!dragging || pointerX === null) return;
      phi = pointerPhi + (e.clientX - pointerX) / 220;
    };
    const onPointerUp = (e) => {
      dragging = false;
      pointerX = null;
      canvas.style.cursor = 'grab';
      try { canvas.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !running) {
        running = true;
        startTs = 0;
        raf = requestAnimationFrame(render);
      } else if (!visible && running) {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }
    }, { threshold: 0.05 });
    io.observe(canvas);

    if (REDUCED_MOTION.matches) {
      applyStage({ markerCount: nodes.length, arcCount: LINK_PAIRS.length, fade: 1, t: 0 });
      globe.update({
        phi,
        theta,
        markers: markersForCount(nodes.length),
        arcs: arcsForCount(LINK_PAIRS.length)
      });
      syncStickerLayout();
    } else {
      raf = requestAnimationFrame(render);
    }

    canvas.__cobeCleanup = () => {
      running = false;
      io.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      if (raf) cancelAnimationFrame(raf);
      globe?.destroy?.();
      globe = null;
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('landing-globe-canvas');
    if (canvas) initLandingGlobe(canvas);
  });
})();

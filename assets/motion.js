/* Native scrolling drives the timelines; no wheel/touch interception. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  const desktop = matchMedia('(min-width: 901px) and (min-height: 700px)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const story = document.querySelector('.session-story');
  const photo = story.querySelector('.session-photo');
  const features = document.querySelector('#features');
  const stage = features.querySelector('.feature-stage');
  const intro = features.querySelector('.feature-intro');
  const enter = features.querySelector('.feature-enter');
  const portal = features.querySelector('.feature-portal');
  const content = features.querySelector('.feature-portal-content');
  const details = features.querySelector('#feature-details');
  const cards = [...features.querySelectorAll('.feature-card')];
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const motionAllowed = () => !reduced.matches && !forcedColors.matches;
  let pinned = false;
  let frame = 0;
  let metrics = { height: 0, distance: 0, overflow: 0, inset: [0, 0, 0, 0] };

  function renderScroll() {
    frame = 0;
    if (!motionAllowed() || document.hidden) return;
    const viewport = innerHeight;
    const sr = story.getBoundingClientRect();
    const fr = features.getBoundingClientRect();
    const cardRects = pinned ? [] : cards.map(card => card.getBoundingClientRect());
    if (sr.bottom >= 0 && sr.top <= viewport) {
      const progress = pinned
        ? clamp(-sr.top / Math.max(1, sr.height - viewport))
        : clamp((viewport - sr.top) / (viewport + sr.height));
      photo.style.transform = `scale(${1 + progress * (pinned ? .32 : .12)})`;
      story.style.setProperty('--session-progress', progress.toFixed(4));
    }
    if (pinned) {
      // Intro hold, aperture expansion, vertical feature tour, final reading pause.
      const travel = clamp(-fr.top, 0, metrics.distance);
      const zoom = clamp((travel - metrics.height * .18) / (metrics.height * .75));
      const shift = clamp(travel - metrics.height * .93, 0, metrics.overflow);
      portal.style.clipPath = `inset(${metrics.inset.map(n => `${n * (1 - zoom)}px`).join(' ')} round ${30 * (1 - zoom)}px)`;
      content.style.transform = `translateY(${-shift}px) scale(${1.12 - zoom * .12})`;
      intro.style.opacity = String(1 - clamp(zoom * 2));
      intro.style.visibility = zoom > .55 ? 'hidden' : '';
      intro.inert = zoom > .55;
      stage.style.setProperty('--feature-progress', (travel / metrics.distance).toFixed(4));
    } else {
      cardRects.forEach((rect, index) => {
        const progress = clamp((viewport - rect.top) / (viewport * .65));
        cards[index].style.transform = `scale(${.96 + progress * .04})`;
      });
    }
  }

  function scheduleScroll() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(renderScroll);
  }

  function measure() {
    pinned = motionAllowed() && desktop.matches;
    story.classList.toggle('is-pinned', pinned);
    features.classList.toggle('is-pinned', pinned);
    intro.style.removeProperty('opacity');
    intro.style.removeProperty('visibility');
    intro.inert = false;
    content.style.removeProperty('transform');
    cards.forEach(card => card.style.removeProperty('transform'));
    if (pinned) {
      const rect = stage.getBoundingClientRect();
      const button = enter.getBoundingClientRect();
      metrics.height = rect.height;
      metrics.overflow = Math.max(0, content.scrollHeight - rect.height + 46);
      metrics.distance = rect.height * 1.13 + metrics.overflow;
      metrics.inset = [button.top - rect.top, rect.right - button.right, rect.bottom - button.bottom, button.left - rect.left];
      features.style.height = `${rect.height + metrics.distance}px`;
    } else {
      features.style.removeProperty('height');
      portal.style.removeProperty('clip-path');
      photo.style.removeProperty('transform');
      story.style.removeProperty('--session-progress');
    }
    renderScroll();
    resizeDots();
  }

  function detailPosition() {
    // Scroll positions are rounded by browsers; land just beyond the reveal boundary.
    return Math.ceil(scrollY + features.getBoundingClientRect().top + metrics.height * .93) + 1;
  }

  enter.addEventListener('click', event => {
    if (!pinned) return; // Native anchors handle the ordinary mobile/static layout.
    event.preventDefault();
    history.pushState(null, '', '#feature-details');
    scrollTo({ top: detailPosition(), behavior: 'smooth' });
    details.focus({ preventScroll: true });
  });

  // A direct URL or browser history entry must also reveal clipped content.
  function restoreDetails() {
    if (pinned && location.hash === '#feature-details') {
      scrollTo({ top: detailPosition(), behavior: 'instant' });
      renderScroll();
    }
  }
  addEventListener('hashchange', restoreDetails);

  cards.forEach(card => {
    card.addEventListener('pointermove', event => {
      if (!motionAllowed() || !finePointer.matches) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--light-x', `${event.clientX - rect.left}px`);
      card.style.setProperty('--light-y', `${event.clientY - rect.top}px`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--light-x');
      card.style.removeProperty('--light-y');
    });
  });

  // A spring grid, rendered only while visible and changing. Idle dots cost no RAFs.
  const canvas = stage.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let dots = [];
  let width = 0;
  let height = 0;
  let dotFrame = 0;
  let previousTime = 0;
  let visible = false;
  let pointer = null;
  let dirty = true;

  function drawDots() {
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    for (const dot of dots) {
      const proximity = pointer ? clamp(1 - Math.hypot(dot.x - pointer.x, dot.y - pointer.y) / 150) : 0;
      ctx.fillStyle = `rgb(${Math.round(71 + 146 * proximity)},${Math.round(82 + 173 * proximity)},${Math.round(48 * (1 - proximity))})`;
      ctx.beginPath();
      ctx.arc(dot.x + dot.dx, dot.y + dot.dy, 2 + proximity * .8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function animateDots(time) {
    dotFrame = 0;
    if (!visible || document.hidden || !motionAllowed()) return;
    const dt = clamp((time - (previousTime || time - 16.67)) / 16.67, .25, 2);
    previousTime = time;
    let moving = false;
    for (const dot of dots) {
      const dx = pointer ? dot.x - pointer.x : 0;
      const dy = pointer ? dot.y - pointer.y : 0;
      const distance = Math.hypot(dx, dy);
      const force = pointer ? Math.pow(clamp(1 - distance / 150), 2) * 58 : 0;
      const tx = distance > .01 ? dx / distance * force : 0;
      const ty = distance > .01 ? dy / distance * force : 0;
      dot.vx = (dot.vx + (tx - dot.dx) * .105 * dt) * Math.pow(.73, dt);
      dot.vy = (dot.vy + (ty - dot.dy) * .105 * dt) * Math.pow(.73, dt);
      dot.dx += dot.vx * dt;
      dot.dy += dot.vy * dt;
      if (Math.abs(dot.vx) + Math.abs(dot.vy) + Math.abs(tx - dot.dx) + Math.abs(ty - dot.dy) > .08) moving = true;
      else { dot.dx = tx; dot.dy = ty; dot.vx = dot.vy = 0; }
    }
    drawDots();
    dirty = false;
    if (moving) dotFrame = requestAnimationFrame(animateDots);
  }

  function wakeDots() {
    if (ctx && visible && motionAllowed() && !document.hidden && !dotFrame) {
      previousTime = 0;
      dotFrame = requestAnimationFrame(animateDots);
    }
  }

  function resizeDots() {
    if (!ctx) return;
    cancelAnimationFrame(dotFrame);
    dotFrame = 0;
    pointer = null;
    width = stage.clientWidth;
    height = pinned ? stage.clientHeight : intro.offsetHeight;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = width < 600 ? 28 : 32;
    dots = [];
    for (let y = 16; y < height; y += gap) {
      for (let x = 16; x < width; x += gap) dots.push({ x, y, dx: 0, dy: 0, vx: 0, vy: 0 });
    }
    drawDots();
    stage.classList.add('has-canvas');
    dirty = false;
  }

  stage.addEventListener('pointermove', event => {
    if (!finePointer.matches || !motionAllowed() || (pinned && intro.inert)) return;
    const rect = canvas.getBoundingClientRect();
    pointer = event.clientY <= rect.bottom ? { x: event.clientX - rect.left, y: event.clientY - rect.top } : null;
    dirty = true;
    wakeDots();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointer = null; dirty = true; wakeDots(); });
  stage.addEventListener('click', event => {
    if (!motionAllowed() || event.target.closest('a, button') || (pinned && intro.inert)) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    for (const dot of dots) {
      const dx = dot.x - x;
      const dy = dot.y - y;
      const distance = Math.hypot(dx, dy);
      const impulse = Math.pow(clamp(1 - distance / 240), 2) * 32;
      if (distance > .01) { dot.vx += dx / distance * impulse; dot.vy += dy / distance * impulse; }
    }
    dirty = true;
    wakeDots();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wakeDots();
      else { cancelAnimationFrame(dotFrame); dotFrame = 0; pointer = null; }
    }).observe(canvas);
  } else visible = true;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(dotFrame); dotFrame = 0; }
    else { scheduleScroll(); if (dirty || dots.some(dot => dot.dx || dot.dy)) wakeDots(); }
  });
  addEventListener('scroll', scheduleScroll, { passive: true });
  let resizeFrame = 0;
  const scheduleMeasure = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(measure);
  };
  addEventListener('resize', scheduleMeasure, { passive: true });
  [reduced, forcedColors, desktop, finePointer].forEach(query => query.addEventListener('change', scheduleMeasure));
  measure();
  document.fonts.ready.then(() => { measure(); restoreDetails(); });
  addEventListener('pageshow', () => { measure(); restoreDetails(); });
})();

/*
 * Avyra Stays: motion and interaction.
 *
 * GSAP (with ScrollTrigger and SplitText) choreographs the page and Lenis
 * smooths the scroll. Nothing here is required to read or use the page:
 * without the libraries, or when the visitor prefers reduced motion, every
 * element stays visible and every control still works.
 */
(() => {
  'use strict';

  const html = document.documentElement;
  const config = window.AVYRA_CONFIG || {};
  const { gsap, ScrollTrigger, SplitText, Lenis } = window;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const motion = Boolean(gsap && ScrollTrigger && SplitText) && !reduceMotion;
  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';

  let lenis = null;

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ---------- Photo galleries (keys match files in assets/img) ---------- */

  const seq = (prefix, from, to, label) =>
    Array.from({ length: to - from + 1 }, (_, i) => [prefix + String(from + i).padStart(2, '0'), label]);

  const GALLERIES = {
    suite: {
      title: 'The Private Suite',
      photos: [
        ...seq('r', 1, 4, 'Living area'),
        ...seq('r', 5, 8, 'Kitchenette'),
        ...seq('r', 9, 11, 'Bedroom'),
        ...seq('r', 12, 13, 'Bathroom'),
        ['r14', 'Entrance'],
      ],
    },
    one: {
      title: 'The 1BHK Apartment',
      photos: [
        ...seq('o', 1, 5, 'Living room'),
        ...seq('o', 6, 12, 'Kitchen'),
        ...seq('o', 13, 19, 'Bedroom'),
        ...seq('o', 20, 24, 'Bathroom'),
        ['o25', 'Entrance'],
        ['o26', 'Living room'],
      ],
    },
    two: {
      title: 'The 2BHK Home',
      photos: [
        ...seq('d', 1, 4, 'Living room'),
        ...seq('d', 5, 11, 'Kitchen'),
        ...seq('d', 12, 14, 'Bedroom 1'),
        ...seq('d', 15, 17, 'Bedroom 2'),
        ['d18', 'Bathroom 1'],
        ...seq('d', 19, 20, 'Bathroom 2'),
        ['d23', 'Entrance'],
      ],
    },
  };

  /* ---------- Contact details come from config.js ---------- */

  function fillContactDetails() {
    const phone = (config.phone || '').trim();
    const email = (config.email || '').trim();
    const whatsapp = (config.whatsapp || '').replace(/\D/g, '');

    document.querySelectorAll('[data-contact]').forEach((el) => {
      const kind = el.dataset.contact;
      const value = kind === 'phone' ? phone : email;
      if (!value) {
        (el.closest('[data-contact-row]') || el).hidden = true;
        return;
      }
      if (!el.hasAttribute('data-keep-text')) el.textContent = value;
      el.href = kind === 'phone' ? `tel:${phone.replace(/[^\d+]/g, '')}` : `mailto:${email}`;
    });

    if (/0{5}/.test(phone) || /example\.com$/i.test(email) || /^(91)?0+$/.test(whatsapp)) {
      console.info('Avyra Stays: contact details are placeholders. Edit assets/js/config.js before launch.');
    }
  }

  function setYear() {
    document.querySelectorAll('[data-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Smooth scroll ---------- */

  function initSmoothScroll() {
    if (!motion || !Lenis) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  const easeInOutQuint = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);

  function scrollToTarget(target, done) {
    const toTop = target === 'top';
    if (lenis) {
      lenis.scrollTo(toTop ? 0 : target, { duration: 1.5, easing: easeInOutQuint, onComplete: done });
      return;
    }
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (toTop) window.scrollTo({ top: 0, behavior });
    else target.scrollIntoView({ behavior, block: 'start' });
    if (done) setTimeout(done, reduceMotion ? 0 : 700);
  }

  /* ---------- In-page links ---------- */

  function initAnchors() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const hash = link.getAttribute('href');
      if (hash.length < 2) return;
      const target = hash === '#top' ? 'top' : document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      closeMenu(false);

      const focusSelector = link.dataset.focus;
      scrollToTarget(target, () => {
        const focusEl = focusSelector ? document.querySelector(focusSelector) : target === 'top' ? null : target;
        if (!focusEl) return;
        if (!focusEl.matches('a, button, input, select, textarea, [tabindex]')) focusEl.setAttribute('tabindex', '-1');
        focusEl.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Navigation: floating pill, hides on the way down ---------- */

  function initNav() {
    const nav = document.querySelector('[data-nav]');
    if (!nav) return;

    let lastY = window.scrollY;
    const update = (y) => {
      nav.classList.toggle('is-scrolled', y > 24);
      const delta = y - lastY;
      if (Math.abs(delta) < 6) return;
      nav.classList.toggle('is-hidden', delta > 0 && y > window.innerHeight * 0.7 && !menuOpen);
      lastY = y;
    };

    if (lenis) lenis.on('scroll', ({ scroll }) => update(scroll));
    else window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
    update(window.scrollY);

    // Mark the link for the section currently in view.
    const links = [...nav.querySelectorAll('.nav__links a')];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          links.forEach((link) => {
            if (link.getAttribute('href') === `#${entry.target.id}`) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-45% 0px -50% 0px' }
    );
    links.forEach((link) => {
      const section = document.querySelector(link.getAttribute('href'));
      if (section) observer.observe(section);
    });
  }

  /* ---------- Mobile menu ---------- */

  const menu = document.getElementById('menu');
  const menuToggle = document.querySelector('.nav__toggle');
  const pageRegions = [document.querySelector('main'), document.querySelector('.footer')];
  let menuOpen = false;

  function openMenu() {
    if (menuOpen || !menu) return;
    menuOpen = true;
    menu.hidden = false;
    html.classList.add('menu-open');
    menuToggle.setAttribute('aria-expanded', 'true');
    menuToggle.setAttribute('aria-label', 'Close menu');
    pageRegions.forEach((region) => region && (region.inert = true));
    lenis?.stop();

    if (motion) {
      gsap.killTweensOf(menu);
      gsap
        .timeline()
        .fromTo(menu, { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.5, ease: 'expo.out' })
        .fromTo(menu.querySelectorAll('.menu__link span'), { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 }, 0.08)
        .fromTo(menu.querySelector('.menu__foot'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.3);
    }
    menu.querySelector('a')?.focus({ preventScroll: true });
  }

  function closeMenu(returnFocus = true) {
    if (!menuOpen) return;
    menuOpen = false;
    html.classList.remove('menu-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open menu');
    pageRegions.forEach((region) => region && (region.inert = false));
    lenis?.start();

    const hide = () => {
      if (!menuOpen) menu.hidden = true;
    };
    if (motion) {
      gsap.killTweensOf(menu);
      gsap.to(menu, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.4, ease: 'expo.inOut', onComplete: hide });
    } else {
      hide();
    }
    if (returnFocus) menuToggle.focus({ preventScroll: true });
  }

  function initMenu() {
    if (!menu || !menuToggle) return;
    menuToggle.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuOpen) closeMenu();
    });
    window.matchMedia('(min-width: 56em)').addEventListener('change', (event) => {
      if (event.matches) closeMenu(false);
    });
  }

  /* ---------- Photo viewer ---------- */

  function initLightbox() {
    const dialog = document.querySelector('.lightbox');
    if (!dialog || typeof dialog.showModal !== 'function') return;

    const stage = dialog.querySelector('.lightbox__stage');
    const caption = dialog.querySelector('.lightbox__caption');
    const counter = dialog.querySelector('.lightbox__count');
    const title = dialog.querySelector('.lightbox__title');

    // Created on first open, so the page never carries an image without a source.
    let img = null;
    const ensureImage = () => {
      if (img) return;
      img = document.createElement('img');
      img.className = 'lightbox__img';
      img.decoding = 'async';
      img.draggable = false;
      img.alt = '';
      stage.insertBefore(img, caption);
    };

    let gallery = null;
    let index = 0;
    let token = 0;

    const srcFor = (key) => `assets/img/${key}-1440.webp`;

    const preload = (i) => {
      const n = gallery.photos.length;
      const next = new Image();
      next.decoding = 'async';
      next.src = srcFor(gallery.photos[(i + n) % n][0]);
    };

    function render(i, direction) {
      const n = gallery.photos.length;
      index = (i + n) % n;
      const [key, label] = gallery.photos[index];
      const current = ++token;

      counter.textContent = `${index + 1} / ${n}`;
      caption.textContent = label;
      img.getAnimations().forEach((animation) => animation.cancel());

      const apply = () => {
        img.src = srcFor(key);
        img.alt = `${gallery.title}: ${label}`;
      };

      if (!motion || !direction || !img.getAttribute('src')) {
        apply();
      } else {
        // The old photo leaves the way you're moving; the new one arrives from the other side.
        const out = img.animate(
          [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${direction * -28}px)` }],
          { duration: 160, easing: 'ease-out', fill: 'forwards' }
        );
        out.onfinish = () => {
          if (current !== token) return;
          apply();
          const reveal = () => {
            if (current !== token) return;
            out.cancel();
            img.animate(
              [{ opacity: 0, transform: `translateX(${direction * 28}px)` }, { opacity: 1, transform: 'none' }],
              { duration: 320, easing: EASE_OUT }
            );
          };
          img.decode().then(reveal, reveal);
        };
      }

      preload(index + 1);
      preload(index - 1);
    }

    function open(name, start) {
      gallery = GALLERIES[name];
      if (!gallery) return;
      ensureImage();
      title.textContent = gallery.title;
      render(start, 0);
      dialog.showModal();
      html.classList.add('has-dialog');
      lenis?.stop();
    }

    dialog.addEventListener('close', () => {
      html.classList.remove('has-dialog');
      lenis?.start();
    });

    document.querySelectorAll('[data-gallery]').forEach((button) => {
      button.addEventListener('click', () => open(button.dataset.gallery, Number(button.dataset.index) || 0));
    });

    dialog.querySelector('[data-lightbox-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-lightbox-prev]').addEventListener('click', () => render(index - 1, -1));
    dialog.querySelector('[data-lightbox-next]').addEventListener('click', () => render(index + 1, 1));

    dialog.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        render(index + 1, 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        render(index - 1, -1);
      }
    });

    // Swipe between photos; a plain click on the dark area closes the viewer.
    let startX = null;
    let swiped = false;
    stage.addEventListener('pointerdown', (event) => {
      startX = event.clientX;
      swiped = false;
    });
    stage.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) {
        swiped = true;
        render(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      }
    });
    stage.addEventListener('click', (event) => {
      if (swiped) {
        swiped = false;
        return;
      }
      if (event.target === stage) dialog.close();
    });
  }

  /* ---------- Reviews: drag, buttons and progress ---------- */

  function initReviews() {
    const track = document.querySelector('.reviews__track');
    if (!track) return;
    const prev = document.querySelector('[data-reviews-prev]');
    const next = document.querySelector('[data-reviews-next]');
    const bar = document.querySelector('.reviews__progress > span');
    const behavior = reduceMotion ? 'auto' : 'smooth';

    const step = () => {
      const card = track.querySelector('.review');
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth * 0.8;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      const progress = max > 0 ? track.scrollLeft / max : 1;
      if (bar) bar.style.transform = `scaleX(${0.12 + progress * 0.88})`;
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft > max - 4;
    };

    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
    track.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        track.scrollBy({ left: step(), behavior });
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        track.scrollBy({ left: -step(), behavior });
      }
    });

    // Mouse drag. Touch and trackpads already scroll natively.
    if (!finePointer) return;
    let dragging = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;

    const release = () => track.classList.remove('is-dragging');

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      moved = false;
      startX = event.clientX;
      startLeft = track.scrollLeft;
      track.classList.add('is-dragging');
      track.setPointerCapture(event.pointerId);
    });

    track.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = startLeft - dx;
    });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      // Settle on the nearest card, then hand control back to scroll snapping.
      const s = step();
      track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior });
      if ('onscrollend' in window) track.addEventListener('scrollend', release, { once: true });
      else setTimeout(release, 600);
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    track.addEventListener(
      'click',
      (event) => {
        if (moved) {
          event.preventDefault();
          event.stopPropagation();
        }
      },
      true
    );
  }

  /* ---------- "Enquire about this home" preselects it in the form ---------- */

  function initEnquireLinks() {
    const select = document.getElementById('enquiry-home');
    if (!select) return;
    document.querySelectorAll('[data-enquire]').forEach((link) => {
      link.addEventListener('click', () => {
        select.value = link.dataset.enquire;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* ---------- Cursor label over galleries and the review track ---------- */

  function initCursor() {
    if (!motion || !finePointer) return;
    const cursor = document.querySelector('.cursor');
    if (!cursor) return;
    const label = cursor.querySelector('.cursor__label');
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.45, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.45, ease: 'power3.out' });

    window.addEventListener(
      'pointermove',
      (event) => {
        xTo(event.clientX);
        yTo(event.clientY);
      },
      { passive: true }
    );

    document.querySelectorAll('[data-cursor]').forEach((zone) => {
      zone.addEventListener('pointerenter', (event) => {
        gsap.set(cursor, { x: event.clientX, y: event.clientY });
        label.textContent = zone.dataset.cursor;
        cursor.classList.add('is-visible');
      });
      zone.addEventListener('pointerleave', () => cursor.classList.remove('is-visible'));
    });
  }

  /* ---------- Magnetic buttons ---------- */

  function initMagnetic() {
    if (!motion || !finePointer) return;
    document.querySelectorAll('[data-magnetic]').forEach((el) => {
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('pointermove', (event) => {
        const rect = el.getBoundingClientRect();
        xTo((event.clientX - (rect.left + rect.width / 2)) * 0.25);
        yTo((event.clientY - (rect.top + rect.height / 2)) * 0.35);
      });
      el.addEventListener('pointerleave', () => {
        xTo(0);
        yTo(0);
      });
    });
  }

  /* ---------- Scroll choreography ---------- */

  function initScrollMotion() {
    // Headings: each line rises out of its own mask.
    document.querySelectorAll('[data-split]').forEach((el) => {
      SplitText.create(el, {
        type: 'lines',
        mask: 'lines',
        linesClass: 'split-line',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 108,
            duration: 1.2,
            ease: 'expo.out',
            stagger: 0.08,
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          }),
      });
    });

    // Framed photos: wipe upward and settle from a slight zoom.
    document.querySelectorAll('[data-reveal]').forEach((frame) => {
      const img = frame.querySelector('img');
      gsap
        .timeline({ scrollTrigger: { trigger: frame, start: 'top 88%', once: true } })
        .fromTo(
          frame,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }
        )
        .fromTo(img, { scale: 1.25 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
    });

    // Gallery photos: the same wipe, batched so neighbours stagger.
    gsap.set('.shot', { clipPath: 'inset(100% 0% 0% 0%)' });
    ScrollTrigger.batch('.shot', {
      start: 'top 90%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.3,
          ease: 'expo.out',
          stagger: 0.12,
          clearProps: 'clipPath',
        }),
    });

    // Parallax: photos drift inside their frames (frames hold 10% spare each side).
    document.querySelectorAll('[data-parallax]').forEach((img) => {
      const amount = Math.min(parseFloat(img.dataset.parallax) || 6, 8);
      gsap.fromTo(
        img,
        { yPercent: -amount },
        {
          yPercent: amount,
          ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });

    // Hero depth: the masthead lags behind as the cover lifts away.
    const heroScroll = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.masthead', { yPercent: 22, ease: 'none', scrollTrigger: heroScroll });
    gsap.to('.hero__figure', { yPercent: -10, ease: 'none', scrollTrigger: { ...heroScroll } });

    // About: the statement fills in word by word as it is read. Words start at
    // 0.55 opacity so even unread text keeps at least 3:1 contrast.
    const statement = document.querySelector('[data-scrub]');
    if (statement) {
      const { words } = SplitText.create(statement, { type: 'words', wordsClass: 'scrub-word' });
      gsap.fromTo(
        words,
        { opacity: 0.55 },
        {
          opacity: 1,
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: statement, start: 'top 78%', end: 'bottom 42%', scrub: 0.5 },
        }
      );
    }

    // Amenities ticker: drifts on its own and speeds up with the scroll.
    const track = document.querySelector('.marquee__track');
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 42, repeat: -1 });
      let boost = 0;
      const ticker = ScrollTrigger.create({
        trigger: '.marquee',
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => (self.isActive ? loop.resume() : loop.pause()),
        onUpdate: (self) => {
          boost = Math.min(Math.abs(self.getVelocity()) / 220, 7);
        },
      });
      if (!ticker.isActive) loop.pause();
      gsap.ticker.add(() => {
        if (!ticker.isActive) return;
        boost *= 0.9;
        loop.timeScale(1 + boost);
      });
    }

    // Reviews arrive from the right, hinting that the row scrolls sideways.
    gsap.from('.review', {
      x: 80,
      autoAlpha: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.08,
      scrollTrigger: { trigger: '.reviews__track', start: 'top 85%', once: true },
    });

    // Footer masthead letters rise as the page ends.
    gsap.from('.footer__letter', {
      yPercent: 108,
      duration: 1.4,
      ease: 'expo.out',
      stagger: 0.07,
      scrollTrigger: { trigger: '.footer__mast', start: 'top 95%', once: true },
    });

    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ---------- Loader and opening sequence ---------- */

  function seenThisSession() {
    try {
      const seen = sessionStorage.getItem('avyra-intro') === '1';
      sessionStorage.setItem('avyra-intro', '1');
      return seen;
    } catch {
      return false;
    }
  }

  async function playIntro() {
    const preloader = document.querySelector('.preloader');
    const finish = () => {
      html.classList.add('is-loaded');
      preloader?.remove();
    };

    // No motion, or the failsafe already revealed the page: just show it.
    if (!motion || !preloader || html.classList.contains('is-loaded')) {
      if (motion) initScrollMotion();
      finish();
      return;
    }

    const quick = seenThisSession();
    const cover = document.querySelector('.hero__cover img');
    const coverReady =
      cover && !cover.complete
        ? new Promise((resolve) => {
            cover.addEventListener('load', resolve, { once: true });
            cover.addEventListener('error', resolve, { once: true });
          })
        : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // Starting positions, hidden under the loader.
    gsap.set('.masthead__letter', { yPercent: 108 });
    gsap.set('.hero__cover', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.hero__cover img', { scale: 1.3 });
    gsap.set('[data-hero-fade]', { autoAlpha: 0, y: 24 });
    gsap.set('.seal', { autoAlpha: 0, scale: 0.7, rotate: -40 });
    gsap.set('.nav__inner', { autoAlpha: 0, y: -16 });

    const count = preloader.querySelector('.preloader__count');
    const bar = preloader.querySelector('.preloader__bar > span');
    const logoFill = preloader.querySelector('.preloader__logo-fill');
    const progress = { value: 0 };
    const draw = () => {
      count.textContent = String(Math.round(progress.value));
      bar.style.transform = `scaleX(${progress.value / 100})`;
      logoFill.style.clipPath = `inset(0 ${100 - progress.value}% 0 0)`;
    };

    await Promise.all([
      gsap.to(progress, { value: 90, duration: quick ? 0.4 : 1, ease: 'power2.inOut', onUpdate: draw }),
      Promise.race([Promise.all([coverReady, fontsReady]), wait(4000)]),
    ]);

    // Fonts are in, so lines can be measured now.
    const title = SplitText.create('.hero__title', { type: 'lines', mask: 'lines', linesClass: 'split-line' });
    gsap.set(title.lines, { yPercent: 108 });
    initScrollMotion();

    await gsap.to(progress, { value: 100, duration: 0.25, ease: 'power1.out', onUpdate: draw });

    gsap
      .timeline({
        onComplete: () => {
          title.revert();
          gsap.set('.hero__cover', { clearProps: 'clipPath' });
          finish();
        },
      })
      .to(preloader.querySelector('.preloader__inner'), { yPercent: -40, autoAlpha: 0, duration: 0.5, ease: 'power3.in' })
      .to([count, bar.parentElement], { autoAlpha: 0, duration: 0.35 }, 0)
      .fromTo(
        preloader,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' },
        0.15
      )
      .add(heroIn(title), 0.55);
  }

  function heroIn(title) {
    return gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .to('.masthead__letter', { yPercent: 0, duration: 1.4, stagger: 0.06 }, 0)
      .to('.hero__cover', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 }, 0.15)
      .to('.hero__cover img', { scale: 1, duration: 2 }, 0.15)
      .to(title.lines, { yPercent: 0, duration: 1.2, stagger: 0.08 }, 0.4)
      .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.55)
      .to('.nav__inner', { autoAlpha: 1, y: 0, duration: 0.9 }, 0.5)
      .to('.seal', { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.2 }, 0.8);
  }

  /* ---------- Start ---------- */

  if (motion) gsap.registerPlugin(ScrollTrigger, SplitText);

  fillContactDetails();
  setYear();
  initSmoothScroll();
  initAnchors();
  initNav();
  initMenu();
  initLightbox();
  initReviews();
  initEnquireLinks();
  initCursor();
  initMagnetic();
  playIntro();
})();

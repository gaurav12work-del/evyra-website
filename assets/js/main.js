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
  // The stacked-homes layout in styles.css uses this same query.
  const STACKED = '(min-width: 64em) and (min-height: 40em)';

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

    // A group with nothing left to show (no phone, no email) disappears too.
    document.querySelectorAll('[data-contact-group]').forEach((group) => {
      group.hidden = ![...group.querySelectorAll('[data-contact]')].some((el) => !el.closest('[hidden]'));
    });

    document.querySelectorAll('[data-whatsapp-row]').forEach((row) => {
      row.hidden = !whatsapp;
    });
    if (whatsapp) {
      const greeting = encodeURIComponent('Hi Avyra Stays, I’d like to ask about a stay.');
      document.querySelectorAll('[data-whatsapp]').forEach((link) => {
        link.href = `https://wa.me/${whatsapp}?text=${greeting}`;
      });
    }

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
      const focusSelector = link.dataset.focus;
      scrollToTarget(target, () => {
        const focusEl = focusSelector ? document.querySelector(focusSelector) : target === 'top' ? null : target;
        if (!focusEl) return;
        if (!focusEl.matches('a, button, input, select, textarea, [tabindex]')) focusEl.setAttribute('tabindex', '-1');
        focusEl.focus({ preventScroll: true });
      });
    });
  }

  /* ---------- Navigation: light over the cover, cream after it; hides on the way down ---------- */

  function initNav() {
    const nav = document.querySelector('[data-nav]');
    if (!nav) return;
    const hero = document.querySelector('.hero');

    // The bar turns cream as the welcome note reaches it, i.e. once the photo is gone from behind it.
    let solidFrom = 24;
    const measure = () => {
      if (hero) solidFrom = hero.offsetHeight - nav.offsetHeight;
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });

    let lastY = window.scrollY;
    const update = (y) => {
      nav.classList.toggle('is-solid', y > solidFrom);
      const delta = y - lastY;
      if (Math.abs(delta) < 6) return;
      nav.classList.toggle('is-hidden', delta > 0 && y > window.innerHeight * 0.7);
      lastY = y;
    };

    if (lenis) lenis.on('scroll', ({ scroll }) => update(scroll));
    else window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
    update(window.scrollY);

    // Keyboard users tabbing back to the top should always find the nav.
    nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));
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

  /* ---------- Reviews: one at a time, moving on by themselves unless paused ---------- */

  function initQuotes() {
    const root = document.querySelector('[data-quotes]');
    if (!root) return;
    const slides = [...root.querySelectorAll('[data-quote]')];
    const n = slides.length;
    if (n < 2) return;

    const stage = root.querySelector('[data-quotes-stage]');
    const controls = root.querySelector('[data-quotes-controls]');
    const count = root.querySelector('[data-quote-count]');
    const bar = root.querySelector('[data-quote-bar]');
    const timer = bar.firstElementChild;
    const toggle = root.querySelector('[data-quote-toggle]');
    const toggleLabel = toggle.querySelector('[data-quote-toggle-label]');

    // Reviews only advance by themselves for visitors who are happy with motion.
    const autoplay = !reduceMotion;
    let index = 0;
    let stopped = !autoplay;
    const holds = new Set();

    root.classList.add('is-ready');
    controls.hidden = false;
    bar.hidden = !autoplay;
    toggle.hidden = !autoplay;

    slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${n}`);
      slide.classList.toggle('is-active', i === 0);
      slide.inert = i !== 0;
    });

    const running = () => !stopped && holds.size === 0;

    function sync() {
      root.classList.toggle('is-held', !running());
      // Changes are announced only while the visitor is moving through the reviews themselves.
      stage.setAttribute('aria-live', running() ? 'off' : 'polite');
    }

    // The progress line is the timer: when its animation ends, the next review comes in.
    function restartTimer() {
      if (!autoplay) return;
      root.classList.remove('is-playing');
      void timer.offsetWidth;
      root.classList.add('is-playing');
    }

    const settle = (els) => gsap.set(els, { clearProps: 'opacity,visibility,transform' });

    function show(to, direction) {
      const from = index;
      index = (to + n) % n;
      if (index === from) return;
      const outgoing = slides[from];
      const incoming = slides[index];
      count.textContent = `${index + 1} / ${n}`;

      slides.forEach((slide) => {
        slide.inert = slide !== incoming;
        if (slide === outgoing || slide === incoming) return;
        // Still leaving after an earlier, quicker click.
        if (motion) {
          gsap.killTweensOf([slide, ...slide.children]);
          settle([slide, ...slide.children]);
        }
        slide.classList.remove('is-active');
      });

      incoming.classList.add('is-active');

      if (motion) {
        gsap.killTweensOf([outgoing, ...outgoing.children, incoming, ...incoming.children]);
        settle(incoming);
        // The old words lift away; the new ones rise in from the side you're heading.
        gsap.to(outgoing, {
          autoAlpha: 0,
          y: -20 * direction,
          duration: 0.45,
          ease: 'power2.out',
          onComplete: () => {
            outgoing.classList.remove('is-active');
            settle([outgoing, ...outgoing.children]);
          },
        });
        gsap.fromTo(
          incoming.children,
          { autoAlpha: 0, y: 32 * direction },
          { autoAlpha: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.09, delay: 0.25, clearProps: 'opacity,visibility,transform' }
        );
      } else {
        outgoing.classList.remove('is-active');
      }

      restartTimer();
    }

    timer.addEventListener('animationend', () => show(index + 1, 1));
    root.querySelector('[data-quote-prev]').addEventListener('click', () => show(index - 1, -1));
    root.querySelector('[data-quote-next]').addEventListener('click', () => show(index + 1, 1));

    toggle.addEventListener('click', () => {
      stopped = !stopped;
      toggle.classList.toggle('is-stopped', stopped);
      toggleLabel.textContent = stopped ? 'Play reviews' : 'Pause reviews';
      sync();
    });

    // Swipe on touch screens.
    let startX = null;
    stage.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') startX = event.clientX;
    });
    stage.addEventListener('pointerup', (event) => {
      if (startX === null) return;
      const dx = event.clientX - startX;
      startX = null;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });

    // Rest while someone points at or tabs into the reviews, or while they are out of sight.
    const hold = (reason, on) => {
      if (on) holds.add(reason);
      else holds.delete(reason);
      sync();
    };
    if (finePointer) {
      root.addEventListener('pointerenter', () => hold('pointer', true));
      root.addEventListener('pointerleave', () => hold('pointer', false));
    }
    root.addEventListener('focusin', (event) => hold('focus', event.target.matches(':focus-visible')));
    root.addEventListener('focusout', (event) => {
      if (!root.contains(event.relatedTarget)) hold('focus', false);
    });
    new IntersectionObserver(([entry]) => hold('offscreen', !entry.isIntersecting), { threshold: 0.3 }).observe(root);
    document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));

    sync();
    restartTimer();
  }

  /* ---------- "Enquire" on a home starts the message for you ---------- */

  function initEnquireLinks() {
    const message = document.getElementById('enquiry-message');
    if (!message) return;
    document.querySelectorAll('[data-enquire]').forEach((link) => {
      link.addEventListener('click', () => {
        const line = `I’m interested in ${link.dataset.enquire}.`;
        const current = message.value.trim();
        // Only fill an empty box, or swap the home in a line we wrote earlier.
        if (!current || current === message.dataset.prefill) {
          message.value = line;
          message.dataset.prefill = line;
        }
      });
    });
  }

  /* ---------- Cursor label over the home photos ---------- */

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

    // Cover: while the welcome note slides up over it, the photo drifts closer
    // and dims, and the headline lifts away ahead of the paper.
    if (document.querySelector('.hero')) {
      const over = { trigger: '.welcome', start: 'top bottom', end: 'top top', scrub: true };
      gsap.to('.hero__media', { scale: 1.08, opacity: 0.4, ease: 'none', scrollTrigger: over });
      gsap.to('.hero__content', { yPercent: -12, autoAlpha: 0, ease: 'none', scrollTrigger: { ...over, end: 'top 35%' } });
    }

    // The opening lines about the homes brighten word by word as you read down.
    const words = document.querySelector('[data-words]');
    if (words) {
      SplitText.create(words, {
        type: 'words',
        wordsClass: 'word',
        onSplit: (self) =>
          gsap.fromTo(
            self.words,
            { opacity: 0.18 },
            {
              opacity: 1,
              ease: 'none',
              stagger: 0.12,
              scrollTrigger: { trigger: words, start: 'top 82%', end: 'bottom 50%', scrub: true },
            }
          ),
      });
    }

    // Photos that drift a little slower than the page around them.
    document.querySelectorAll('[data-parallax]').forEach((img) => {
      gsap.set(img, { scale: 1.12 });
      gsap.fromTo(
        img,
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        }
      );
    });

    // Photos open upward as they arrive, easing out of a slight zoom.
    document.querySelectorAll('[data-reveal]').forEach((frame) => {
      const img = frame.querySelector('img');
      const rest = img && img.hasAttribute('data-parallax') ? 1.12 : 1;
      gsap
        .timeline({ scrollTrigger: { trigger: frame, start: 'top 88%', once: true } })
        .fromTo(
          frame,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }
        )
        .fromTo(img, { scale: rest + 0.22 }, { scale: rest, duration: 1.8, ease: 'expo.out' }, 0);
    });

    const mm = gsap.matchMedia();

    // Wide screens: each home slides up over the last, and the one underneath
    // settles back into the dark. The arriving photo drifts inside its frame.
    mm.add(STACKED, () => {
      const homes = gsap.utils.toArray('.home');
      homes.forEach((home, i) => {
        if (i > 0) {
          gsap.fromTo(
            home.querySelector('.home__zoom img'),
            { yPercent: -6, scale: 1.15 },
            {
              yPercent: 0,
              scale: 1.15,
              ease: 'none',
              scrollTrigger: { trigger: home, start: 'top bottom', end: 'top top', scrub: true },
            }
          );
        }
        const next = homes[i + 1];
        if (!next) return;
        gsap
          .timeline({ scrollTrigger: { trigger: next, start: 'top bottom', end: 'top top', scrub: true } })
          .to(home.querySelector('.home__inner'), { scale: 0.92, ease: 'none' }, 0)
          .to(home.querySelector('.home__shade'), { opacity: 0.55, ease: 'none' }, 0);
      });
    });

    // Narrower screens: the homes simply follow one another, each photo opening as it arrives.
    mm.add(`not all and ${STACKED}`, () => {
      gsap.utils.toArray('.home__media').forEach((media) => {
        gsap
          .timeline({ scrollTrigger: { trigger: media, start: 'top 88%', once: true } })
          .fromTo(
            media,
            { clipPath: 'inset(100% 0% 0% 0%)' },
            { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.out', clearProps: 'clipPath' }
          )
          .fromTo(
            media.querySelector('.home__zoom img'),
            { scale: 1.3 },
            { scale: 1, duration: 1.8, ease: 'expo.out', clearProps: 'transform' },
            0
          );
      });
    });

    // Location: the entrance photo opens out to the full width as you walk up to it.
    const entrance = document.querySelector('[data-expand]');
    if (entrance) {
      gsap
        .timeline({ scrollTrigger: { trigger: entrance, start: 'top bottom', end: 'top 12%', scrub: true } })
        .fromTo(
          entrance,
          { clipPath: 'inset(10% 12% 10% 12% round 24px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' },
          0
        )
        .fromTo(entrance.querySelector('img'), { scale: 1.3 }, { scale: 1, ease: 'none' }, 0);
    }

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
    const cover = document.querySelector('.hero__img');
    const coverReady =
      cover && !cover.complete
        ? new Promise((resolve) => {
            cover.addEventListener('load', resolve, { once: true });
            cover.addEventListener('error', resolve, { once: true });
          })
        : Promise.resolve();
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

    // Starting positions, hidden under the loader.
    gsap.set('.hero__line-inner', { yPercent: 112 });
    gsap.set('.hero__img', { scale: 1.16 });
    gsap.set('[data-hero-fade]', { autoAlpha: 0, y: 24 });
    gsap.set('.nav__inner', { autoAlpha: 0, y: -16 });

    const bar = preloader.querySelector('.preloader__bar > span');
    const logoFill = preloader.querySelector('.preloader__logo-fill');
    const progress = { value: 0 };
    const draw = () => {
      bar.style.transform = `scaleX(${progress.value / 100})`;
      logoFill.style.clipPath = `inset(0 ${100 - progress.value}% 0 0)`;
    };

    await Promise.all([
      gsap.to(progress, { value: 90, duration: quick ? 0.4 : 1, ease: 'power2.inOut', onUpdate: draw }),
      Promise.race([Promise.all([coverReady, fontsReady]), wait(4000)]),
    ]);

    // Fonts are in, so heading lines can be measured now.
    initScrollMotion();

    await gsap.to(progress, { value: 100, duration: 0.25, ease: 'power1.out', onUpdate: draw });

    // The loader lifts like a blind; the room is underneath, already lit.
    gsap
      .timeline({ onComplete: finish })
      .to(preloader.querySelector('.preloader__inner'), { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power2.out' })
      .to(bar.parentElement, { autoAlpha: 0, duration: 0.35 }, 0)
      .fromTo(
        preloader,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 1.1,
          ease: 'expo.inOut',
          // Gone from view: let clicks through while the headline finishes rising.
          onComplete: () => {
            preloader.style.pointerEvents = 'none';
          },
        },
        0.15
      )
      .add(heroIn(), 0.45);
  }

  // The photo settles from a slight zoom while the headline rises line by line.
  function heroIn() {
    return gsap
      .timeline({ defaults: { ease: 'expo.out' } })
      .to('.hero__img', { scale: 1, duration: 2.8 }, 0)
      .to('.hero__line-inner', { yPercent: 0, duration: 1.3, stagger: 0.1 }, 0.35)
      .to('[data-hero-fade]', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.1 }, 0.85)
      .to('.nav__inner', { autoAlpha: 1, y: 0, duration: 1 }, 0.6);
  }

  /* ---------- Start ---------- */

  if (motion) gsap.registerPlugin(ScrollTrigger, SplitText);

  fillContactDetails();
  setYear();
  initSmoothScroll();
  initAnchors();
  initNav();
  initLightbox();
  initQuotes();
  initEnquireLinks();
  initCursor();
  initMagnetic();
  playIntro();
})();

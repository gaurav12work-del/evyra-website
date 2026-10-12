/*
 * Avyra Stays: enquiry form.
 *
 * Checks each field in plain language, emails the enquiry through Web3Forms
 * when a key is set in config.js, and always offers WhatsApp as the next step.
 * Without a key, the enquiry is handed to WhatsApp or the guest's email app,
 * already written out.
 */
(() => {
  'use strict';

  const form = document.getElementById('enquiry-form');
  const done = document.getElementById('enquiry-done');
  if (!form || !done) return;

  const config = window.AVYRA_CONFIG || {};
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('.btn__label');
  const field = (name) => form.elements.namedItem(name);

  const HOMES = {
    suite: { name: 'The Private Suite', sleeps: 2 },
    one: { name: 'The 1BHK Apartment', sleeps: 2 },
    two: { name: 'The 2BHK Home', sleeps: 4 },
    any: { name: 'Not sure yet', sleeps: 4 },
  };

  /* ---------- Dates, as local calendar days (YYYY-MM-DD) ---------- */

  const pad = (n) => String(n).padStart(2, '0');
  const toISO = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const fromISO = (value) => {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
  const pretty = (value) => fromISO(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const today = toISO(new Date());
  const resetDateLimits = () => {
    field('checkin').min = today;
    field('checkout').min = toISO(addDays(new Date(), 1));
  };
  resetDateLimits();

  field('checkin').addEventListener('change', () => {
    const checkin = field('checkin').value;
    if (!checkin) return;
    const earliest = toISO(addDays(fromISO(checkin), 1));
    field('checkout').min = earliest;
    if (field('checkout').value && field('checkout').value < earliest) field('checkout').value = '';
  });

  /* ---------- Validation ---------- */

  const RULES = {
    name: (v) => v.trim().length >= 2 || 'Enter your name.',
    phone: (v) => {
      const digits = v.replace(/\D/g, '').length;
      return (digits >= 10 && digits <= 15) || 'Enter a phone number with at least 10 digits.';
    },
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter an email address, like name@example.com.',
    home: (v) => Boolean(v) || 'Choose a home, or pick “Not sure yet”.',
    checkin: (v) => {
      if (!v) return 'Choose a check-in date.';
      return v >= today || 'Choose a check-in date from today onwards.';
    },
    checkout: (v) => {
      if (!v) return 'Choose a check-out date.';
      const checkin = field('checkin').value;
      return !checkin || v > checkin || 'Check-out needs to be after check-in.';
    },
    guests: (v) => {
      const home = HOMES[field('home').value];
      return !home || Number(v) <= home.sleeps || `${home.name} sleeps up to ${home.sleeps}. For 3 or 4 guests, choose the 2BHK Home.`;
    },
  };

  const touched = new Set();

  function check(name) {
    const input = field(name);
    const result = RULES[name](input.value);
    const ok = result === true;
    const wrapper = input.closest('.field');
    wrapper.classList.toggle('is-invalid', !ok);
    wrapper.querySelector('.field__error').textContent = ok ? '' : result;
    if (ok) input.removeAttribute('aria-invalid');
    else input.setAttribute('aria-invalid', 'true');
    return ok;
  }

  function clearErrors() {
    Object.keys(RULES).forEach((name) => {
      const input = field(name);
      input.removeAttribute('aria-invalid');
      input.closest('.field').classList.remove('is-invalid');
      input.closest('.field').querySelector('.field__error').textContent = '';
    });
    touched.clear();
  }

  // Fields are checked once someone has filled them in, then re-checked as they change.
  Object.keys(RULES).forEach((name) => {
    const input = field(name);
    input.addEventListener('blur', () => {
      if (!input.value) return;
      touched.add(name);
      check(name);
    });
    const recheck = () => touched.has(name) && check(name);
    input.addEventListener('input', recheck);
    input.addEventListener('change', recheck);
  });

  // A home that sleeps fewer people can make the guest count invalid, and the reverse.
  field('home').addEventListener('change', () => {
    touched.add('guests');
    check('guests');
  });
  field('checkin').addEventListener('change', () => touched.has('checkout') && check('checkout'));

  /* ---------- The enquiry, as data and as a message ---------- */

  function collect() {
    const checkin = field('checkin').value;
    const checkout = field('checkout').value;
    return {
      name: field('name').value.trim(),
      phone: field('phone').value.trim(),
      email: field('email').value.trim(),
      home: HOMES[field('home').value].name,
      checkin,
      checkout,
      nights: Math.round((fromISO(checkout) - fromISO(checkin)) / 86400000),
      guests: Number(field('guests').value),
      message: field('message').value.trim(),
    };
  }

  const stayLine = (e) => `${pretty(e.checkin)} to ${pretty(e.checkout)} (${e.nights} night${e.nights === 1 ? '' : 's'})`;
  const guestLine = (e) => `${e.guests} guest${e.guests === 1 ? '' : 's'}`;

  function messageFor(e) {
    return [
      'Hi Avyra Stays, I’d like to check availability.',
      '',
      `Home: ${e.home}`,
      `Dates: ${stayLine(e)}`,
      `Guests: ${guestLine(e)}`,
      `Name: ${e.name}`,
      `Phone: ${e.phone}`,
      `Email: ${e.email}`,
      e.message ? `\n${e.message}` : '',
    ]
      .join('\n')
      .trim();
  }

  const whatsappLink = (e) =>
    `https://wa.me/${(config.whatsapp || '').replace(/\D/g, '')}?text=${encodeURIComponent(messageFor(e))}`;

  const emailLink = (e) =>
    `mailto:${config.email || ''}?subject=${encodeURIComponent(`Stay enquiry: ${e.home}, ${stayLine(e)}`)}&body=${encodeURIComponent(messageFor(e))}`;

  async function sendByEmail(e) {
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: config.web3formsKey,
        subject: `New stay enquiry: ${e.home}, ${stayLine(e)}`,
        from_name: 'Avyra Stays website',
        replyto: e.email,
        name: e.name,
        email: e.email,
        phone: e.phone,
        home: e.home,
        dates: stayLine(e),
        guests: guestLine(e),
        message: e.message || '(none)',
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || `the form service answered ${response.status}`);
  }

  /* ---------- States ---------- */

  let lastMode = null;

  function setBusy(busy) {
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : 'Send enquiry';
  }

  function showStatus(text, isError, link) {
    status.classList.toggle('is-error', Boolean(isError));
    status.replaceChildren(text);
    if (link) {
      const a = document.createElement('a');
      a.className = 'link';
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = link.text;
      status.append(' ', a);
    }
  }

  function swap(from, to) {
    from.hidden = true;
    to.hidden = false;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && to.animate) {
      to.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], {
        duration: 360,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
      });
    }
  }

  function showDone(mode, e) {
    lastMode = mode;
    const sent = mode === 'sent';
    const titleEl = done.querySelector('[data-done-title]');
    titleEl.textContent = sent ? 'Enquiry sent' : 'Your enquiry is ready';
    done.querySelector('[data-done-text]').textContent = sent
      ? `Thanks, ${e.name.split(' ')[0]}. It’s in our inbox and we usually reply within an hour. For a quicker answer, continue on WhatsApp.`
      : 'Send it to us on WhatsApp or by email. Both open with your details already filled in.';

    const rows = [
      ['Home', e.home],
      ['Dates', stayLine(e)],
      ['Guests', guestLine(e)],
    ];
    done.querySelector('[data-done-summary]').replaceChildren(
      ...rows.flatMap(([term, value]) => {
        const dt = document.createElement('dt');
        const dd = document.createElement('dd');
        dt.textContent = term;
        dd.textContent = value;
        return [dt, dd];
      })
    );

    const whatsapp = done.querySelector('[data-done-whatsapp]');
    whatsapp.href = whatsappLink(e);
    whatsapp.querySelector('.btn__label').textContent = sent ? 'Continue on WhatsApp' : 'Send on WhatsApp';

    const email = done.querySelector('[data-done-email]');
    email.href = emailLink(e);
    email.hidden = sent;

    done.querySelector('[data-done-reset]').textContent = sent ? 'Send another enquiry' : 'Edit enquiry';

    swap(form, done);
    titleEl.focus({ preventScroll: true });
  }

  done.querySelector('[data-done-reset]').addEventListener('click', () => {
    if (lastMode === 'sent') {
      form.reset();
      clearErrors();
      resetDateLimits();
    }
    showStatus('');
    swap(done, form);
    field('name').focus({ preventScroll: true });
  });

  /* ---------- Submit ---------- */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (field('botcheck').checked) return;

    Object.keys(RULES).forEach((name) => touched.add(name));
    const invalid = Object.keys(RULES).filter((name) => !check(name));
    if (invalid.length) {
      showStatus(invalid.length === 1 ? 'One field needs attention.' : `${invalid.length} fields need attention.`, true);
      field(invalid[0]).focus();
      return;
    }

    showStatus('');
    const enquiry = collect();

    if (!config.web3formsKey) {
      showDone('manual', enquiry);
      return;
    }

    setBusy(true);
    try {
      await sendByEmail(enquiry);
      showDone('sent', enquiry);
    } catch (error) {
      const reason = error instanceof TypeError ? 'the connection failed' : error.message;
      showStatus(`Couldn’t send your enquiry: ${reason}. Try again, or`, true, {
        href: whatsappLink(enquiry),
        text: 'send it on WhatsApp',
      });
    } finally {
      setBusy(false);
    }
  });
})();

/*
 * Avyra Stays: enquiry form.
 *
 * Checks each field in plain language, then submits the enquiry to Netlify
 * Forms. Netlify stores every submission and emails it to the address set
 * under Forms > Submission notifications in the Netlify dashboard. When a
 * WhatsApp number is set in config.js, guests can also continue there.
 */
(() => {
  'use strict';

  const form = document.getElementById('enquiry-form');
  const done = document.getElementById('enquiry-done');
  if (!form || !done) return;

  // This script does the checking; without JavaScript the browser's own checks apply.
  form.noValidate = true;

  const config = window.AVYRA_CONFIG || {};
  const whatsappNumber = (config.whatsapp || '').replace(/\D/g, '');
  const contactEmail = (config.email || '').trim();
  const status = form.querySelector('[data-form-status]');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('.btn__label');
  const altRow = document.querySelector('[data-whatsapp-row]');
  const field = (name) => form.elements.namedItem(name);

  /* ---------- Validation ---------- */

  const RULES = {
    name: (v) => v.trim().length >= 2 || 'Enter your name.',
    phone: (v) => {
      const digits = v.replace(/\D/g, '').length;
      return (digits >= 10 && digits <= 15) || 'Enter a phone number with at least 10 digits.';
    },
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter an email address, like name@example.com.',
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
    input.addEventListener('input', () => touched.has(name) && check(name));
  });

  /* ---------- The enquiry, as data and as a message ---------- */

  function collect() {
    return {
      name: field('name').value.trim(),
      phone: field('phone').value.trim(),
      email: field('email').value.trim(),
      message: field('message').value.trim(),
    };
  }

  function messageFor(e) {
    return [
      'Hi Avyra Stays, I’d like to ask about a stay.',
      '',
      `Name: ${e.name}`,
      `Phone: ${e.phone}`,
      `Email: ${e.email}`,
      e.message ? `\n${e.message}` : '',
    ]
      .join('\n')
      .trim();
  }

  const whatsappLink = (e) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageFor(e))}`;

  const emailLink = (e) =>
    `mailto:${contactEmail}?subject=${encodeURIComponent(`Stay enquiry from ${e.name}`)}&body=${encodeURIComponent(messageFor(e))}`;

  // Netlify Forms: a URL-encoded POST to the site, carrying the form's name.
  async function sendToNetlify(e) {
    field('subject').value = `New stay enquiry from ${e.name}`;
    const data = new FormData(form);
    if (!data.has('form-name')) data.set('form-name', form.getAttribute('name'));
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data).toString(),
    });
    if (!response.ok) throw new Error(`the form service answered ${response.status}`);
  }

  /* ---------- States ---------- */

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
      status.append(' ', a, '.');
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

  function showDone(e) {
    const titleEl = done.querySelector('[data-done-title]');
    const first = e.name.split(' ')[0];
    done.querySelector('[data-done-text]').textContent = whatsappNumber
      ? `Thanks, ${first}. We’ve received your enquiry and usually reply within the hour. For a quicker answer, continue on WhatsApp.`
      : `Thanks, ${first}. We’ve received your enquiry and usually reply within the hour.`;

    const whatsapp = done.querySelector('[data-done-whatsapp]');
    whatsapp.hidden = !whatsappNumber;
    if (whatsappNumber) whatsapp.href = whatsappLink(e);

    if (altRow) altRow.hidden = true;
    swap(form, done);
    titleEl.focus({ preventScroll: true });
  }

  done.querySelector('[data-done-reset]').addEventListener('click', () => {
    form.reset();
    delete field('message').dataset.prefill;
    clearErrors();
    showStatus('');
    if (altRow) altRow.hidden = !whatsappNumber;
    swap(done, form);
    field('name').focus({ preventScroll: true });
  });

  /* ---------- Submit ---------- */

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (field('bot-field').value) return;

    Object.keys(RULES).forEach((name) => touched.add(name));
    const invalid = Object.keys(RULES).filter((name) => !check(name));
    if (invalid.length) {
      showStatus(invalid.length === 1 ? 'One field needs attention.' : `${invalid.length} fields need attention.`, true);
      field(invalid[0]).focus();
      return;
    }

    showStatus('');
    const enquiry = collect();
    setBusy(true);
    try {
      await sendToNetlify(enquiry);
      showDone(enquiry);
    } catch (error) {
      const reason = error instanceof TypeError ? 'the connection failed' : error.message;
      const fallback = whatsappNumber
        ? { href: whatsappLink(enquiry), text: 'send it on WhatsApp' }
        : contactEmail
          ? { href: emailLink(enquiry), text: `email it to ${contactEmail}` }
          : null;
      showStatus(`Couldn’t send your enquiry: ${reason}. Try again${fallback ? ', or' : ' in a moment.'}`, true, fallback);
    } finally {
      setBusy(false);
    }
  });
})();

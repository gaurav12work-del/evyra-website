/*
 * Avyra Stays: site settings.
 *
 * This is the only file to edit when contact details change or when the
 * enquiry form is connected to an inbox. Everything on the page that shows a
 * phone number, email or WhatsApp link reads from here.
 */
window.AVYRA_CONFIG = {
  // PLACEHOLDER: replace with the real number, including the country code.
  phone: '+91 00000 00000',

  // PLACEHOLDER: WhatsApp number as digits only, country code first (e.g. 919876543210).
  whatsapp: '910000000000',

  // PLACEHOLDER: the address guests can write to; also used for "Send by email".
  email: 'hello@example.com',

  // Free access key from https://web3forms.com (enter the inbox that should
  // receive enquiries, and the key arrives by email). While this is empty, the
  // form hands each enquiry to WhatsApp or the guest's email app instead.
  web3formsKey: '',
};

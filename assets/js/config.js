/*
 * Avyra Stays: site settings.
 *
 * This is the only file to edit when contact details change. Everything on
 * the page that shows a phone number, email or WhatsApp link reads from here,
 * and anything left empty stays hidden. (Prices are written into index.html.)
 *
 * Enquiry-form submissions don't depend on this file: they go through Netlify
 * Forms and are emailed to the address set under Forms > Submission
 * notifications in the Netlify dashboard.
 */
window.AVYRA_CONFIG = {
  // Shown as "Call or WhatsApp" in the contact section. Include the country code, e.g. '+91 98765 43210'.
  phone: '',

  // WhatsApp number as digits only, country code first (e.g. '919876543210').
  // When set, the contact section offers "Chat on WhatsApp", and guests can
  // continue there after sending an enquiry.
  whatsapp: '',

  // Public contact email shown in the contact section and footer.
  email: '',
};

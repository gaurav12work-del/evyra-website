# Avyra Stays website

A one-page site for Avyra Stays: three homes near IIM Bangalore (the Private Suite, the 1BHK Apartment and the 2BHK Home). It is plain HTML, CSS and JavaScript with no build step. It is hosted on Netlify, which also handles the enquiry form.

The page is deliberately minimal: large photographs and very little text. In order:

1. **Cover**: the Private Suite at lamplight, full screen, with the headline over it.
2. **About the stays**: one short statement on what every home is like. It slides up over the cover photo.
3. **The homes**: photo, one line, bedrooms and guests, price, Enquire and View on Airbnb. On wide screens each home fills the screen and slides up over the one before.
4. **Reviews**: one guest at a time, moving on every few seconds, with a pause button.
5. **Location**: a few lines about the area and a link to Google Maps; the entrance photo opens out to full width as you scroll to it. No address is shown.
6. **Enquiry form**: name, phone, email and an optional message.

## Contact details

Open `assets/js/config.js`. Every phone, email and WhatsApp link on the page reads from here, and anything left empty stays hidden. They are empty until the real details are confirmed. Setting a WhatsApp number also adds a "Chat on WhatsApp" button under the form.

## Prices

Each home's price is written directly in `index.html`, in its "Starting at" line (search the file for `₹`), so it shows even before the scripts load and search engines can read it.

- **Current rates** (set October 2026): ₹1,800 a night for the Private Suite and the 1BHK, ₹3,100 for the 2BHK. They are the lowest regular Airbnb prices per night, fees included, rounded, from dates checked between October and December 2026.
- There are no monthly rates yet, so each home says "Ask us about monthly stays".
- The same range is in `priceRange` in the structured data near the top of `index.html`; update it too when prices change.

## Enquiry form (Netlify Forms)

- The form asks for name, phone, email and an optional message. "Enquire" on a home starts the message with that home's name.
- Submissions go to Netlify Forms. Each one is stored under **Forms** in the Netlify dashboard and emailed to **gaurav@avyrastays.in**. Change the recipient under Forms > Submission notifications.
- Notification emails come from formresponses@netlify.com. Replying to one goes straight to the guest, because the form has an `email` field.
- When a WhatsApp number is set in `config.js`, guests are offered "Continue on WhatsApp" after sending. If sending fails, the form keeps what they typed and offers WhatsApp or email instead, when those are set.
- Form detection must stay enabled for the site (Forms > Form detection). Netlify reads the form's fields from each deploy.

## Motion

- A short loader, then the cover photo settles from a slight zoom while the headline rises line by line.
- The opening lines about the homes brighten word by word as you read down.
- Section headings rise into place; photos open upward as they arrive.
- Reviews change every 9 seconds. They pause while the pointer is over them, while they are out of view, or when the visitor presses Pause.
- Visitors whose device asks for reduced motion get the page without the loader, the sliding layers or the moving reviews. Everything stays readable and usable without JavaScript too.

## Deploying

The site is linked to the Netlify project `avyra-stays`. `netlify.toml` publishes the repository root as is.

- From this folder: `netlify deploy --prod`
- Or connect the GitHub repository in the Netlify dashboard (Project configuration > Build & deploy) so every push to `main` deploys automatically. This needs the repository owner's GitHub account.

When you change a file in `assets/css` or `assets/js`, raise the `?v=` number on its link in `index.html` (for example `?v=20261020` to the new date), so visitors' browsers fetch the new copy instead of one they already have.

Link previews (WhatsApp, Facebook) use `og:image` in `index.html`, which points at `https://avyra-stays.netlify.app/assets/img/og-image.jpg`. When a custom domain is attached (for example avyrastays.in), change that address and the two in the structured data below it to the new domain.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page, all copy and the prices |
| `assets/css/styles.css` | Styles; the brand colours are the tokens at the top |
| `assets/js/config.js` | Contact details (phone, WhatsApp, email) |
| `assets/js/main.js` | Motion, navigation, reviews and the photo viewer |
| `assets/js/enquiry.js` | Enquiry form |
| `netlify.toml` | Netlify settings (publish the root folder) |
| `assets/img/` | Listing photos as WebP, 720px and 1440px wide (`r` Suite, `o` 1BHK, `d` 2BHK). The cover (`r10`) and the entrance (`r14`) also come 1920px wide, for large screens. `og-image.jpg` is the link-preview image. |
| `assets/logo/` | The original logo, plus web versions (colour, cream for dark backgrounds, emblem, icons) |
| `assets/vendor/` | GSAP 3.15 (with ScrollTrigger and SplitText) and Lenis 1.3, kept locally |

## Content sources

All copy, photos, ratings and guest quotes come from the three Airbnb listings and the host profile, as they stood in October 2026. Quotes are excerpts, with omissions marked by "…". The rating and review count ("rated 5.0 by every guest", "All 24 guests") need updating by hand as they change.

## Previewing locally

Serve the folder with any static server (for example `npx serve`, or `python -m http.server`) and open it in a browser. If a change doesn't appear, the browser is showing a copy it kept: press Ctrl+F5. The enquiry form only sends from the live Netlify site.

## Credits

Fonts: Cormorant and Hanken Grotesk (Google Fonts, Open Font License). Motion: GSAP (free under the GSAP Standard License) and Lenis (MIT).

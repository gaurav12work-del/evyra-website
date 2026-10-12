# Avyra Stays website

A one-page site for Avyra Stays: three homes near IIM Bangalore (the Private Suite, the 1BHK Apartment and the 2BHK Home). It is plain HTML, CSS and JavaScript with no build step, so any static host can serve it as is.

## Before launch

1. **Contact details.** Open `assets/js/config.js` and replace the placeholder phone, WhatsApp number and email. Every phone, email and WhatsApp link on the page reads from this file. Leave a value empty to hide that line.
2. **Enquiry emails.** Get a free access key at [web3forms.com](https://web3forms.com) (enter the inbox that should receive enquiries) and paste it into `web3formsKey` in the same file. Until a key is set, the form still works: it hands the finished enquiry to WhatsApp or the guest's email app.
3. **Social preview.** Once the domain is known, change `og:image` in `index.html` to the full address, for example `https://avyrastays.com/assets/img/og-image.jpg`. Link previews on WhatsApp and Facebook need an absolute URL.

## How the form behaves

- It checks each field in plain language, including the guest count against the chosen home (the Suite and the 1BHK sleep 2; the 2BHK sleeps 4).
- With a Web3Forms key, the enquiry is emailed, and the guest is offered "Continue on WhatsApp".
- If sending fails, the form keeps what the guest typed and offers WhatsApp instead.

## Files

| Path | What it is |
|---|---|
| `index.html` | The page and all copy |
| `assets/css/styles.css` | Styles; the brand colours are the tokens at the top |
| `assets/js/config.js` | Contact details and form key: the only file that usually needs editing |
| `assets/js/main.js` | Motion, navigation, photo viewer and review carousel |
| `assets/js/enquiry.js` | Enquiry form |
| `assets/img/` | Listing photos as WebP, 720px and 1440px wide (`r` Suite, `o` 1BHK, `d` 2BHK) |
| `assets/logo/` | The original logo, plus web versions (colour, cream for dark backgrounds, emblem, icons) |
| `assets/vendor/` | GSAP 3.15 (with ScrollTrigger and SplitText) and Lenis 1.3, kept locally |

## Content sources

All copy, photos, ratings and guest quotes come from the three Airbnb listings and the host profile, as they stood in October 2026. Quotes are excerpts, with omissions marked by "…". The ratings and review counts (5.0 from 24 reviews) need updating by hand as new reviews arrive.

## Previewing locally

Open `index.html` in a browser, or serve the folder with any static server (for example `npx serve`).

## Credits

Fonts: Cormorant and Hanken Grotesk (Google Fonts, Open Font License). Motion: GSAP (free under the GSAP Standard License) and Lenis (MIT).

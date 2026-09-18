# verdio Climate Footprint Tracker

verdio is a local-first carbon footprint tracker for turning everyday choices into a clear climate signal. It includes activity logging, CO2e calculations, weekly targets, daily/weekly/monthly reports, history filters, activity editing, streaks and achievements, Climate Quest, CSV/PDF export, PWA installation support, a climate assistant, and a developer-support modal.

## What It Tracks

Fixed emission factors used by the app:

| Activity | Factor | Unit |
| --- | ---: | --- |
| Car travel | 0.20 | kg CO2e / km |
| Bike travel | 0.02 | kg CO2e / km |
| Bus travel | 0.08 | kg CO2e / km |
| Train travel | 0.04 | kg CO2e / km |
| Flight | 0.25 | kg CO2e / km |
| Electricity | 0.80 | kg CO2e / kWh |
| Air conditioning | 0.80 | kg CO2e / kWh |
| Vegetarian meal | 0.5 | kg CO2e / meal |
| Non-vegetarian meal | 2.0 | kg CO2e / meal |

The default weekly target is 17 kg CO2e. Weeks run from Monday 00:00 through Sunday 23:59 in the user's local timezone. The dashboard caps the progress bar at 100% and displays any excess separately.

## Run Locally

### Zero-setup browser version

The current project works as a static browser app and stores demo activities, settings, and local-demo account data in browser storage.

```powershell
cd C:\Users\mriju\Desktop\Hackhathon
python -m http.server 4173
```

Open <http://127.0.0.1:4173>.

### Optional Express server

`server.js` provides static hosting and the server-side Cloudflare Turnstile verification endpoint. Node.js and npm must be installed first.

```powershell
cd C:\Users\mriju\Desktop\Hackhathon
npm install express dotenv
node server.js
```

The server listens on `http://localhost:4173` by default. Set `PORT` to use another port.

Create a `.env` file from [.env.example](.env.example):

```env
PORT=4173
TURNSTILE_SECRET_KEY=your-cloudflare-turnstile-secret
```

The Turnstile secret belongs only in `.env` and must never be placed in frontend code. The current frontend uses a placeholder Turnstile site-key marker until a real public site key is configured.

## Test Credentials

Authentication is intentionally local-demo authentication; there is no remote user database in this project.

### Fastest demo access

Click **Continue with Google**. This creates a local demo session for:

```text
Email: google-user@verdio.local
Username: Google user
```

### Email account flow

Choose **Create account** and use these test values:

```text
Username: climate.tester
Email: climate.tester@example.com
Password: Climate!2026
Confirm password: Climate!2026
```

The password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character. Select **Keep me signed in** if the local session should persist after closing the tab.

## Important Files

- [index.html](index.html): app markup, auth screen, dashboard, reports, game, support modal, and PWA references.
- [styles.css](styles.css): responsive Midnight Ocean design system and accessibility styles.
- [app.js](app.js): activity factors, local persistence, calculations, validation, reports, quiz, exports, PWA install flow, and UI behavior.
- [server.js](server.js): optional Express static server and Turnstile verification endpoint.
- [manifest.webmanifest](manifest.webmanifest): PWA metadata.
- [sw.js](sw.js): service-worker cache and offline shell behavior.
- [icon.svg](icon.svg): PWA icon.
- [.env.example](.env.example): server configuration template.

## Data and Privacy

The tracker stores activities and local-demo preferences in the browser's `localStorage`. Activity records are validated and sanitized before calculations. The optional server only verifies Turnstile tokens; it does not provide a user database.

## Accessibility

The app includes semantic labels and landmarks, keyboard-visible focus, a skip link, live progress and feedback announcements, text values alongside charts, non-color success/error states, responsive layout, and reduced-motion support. The interface avoids relying on color alone for climate categories, progress, quiz answers, or target status.

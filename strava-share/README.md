# Workout Share Studio

Connect to Strava, pick an activity, drop in a photo, and export a
poster-style image (1080×1920, story-ready) that overlays your route and
stats — like a "workout complete" card you can share anywhere.

Everything runs in the browser and your photo never leaves your device. The
only server-side piece is a tiny function that exchanges Strava's OAuth code
for an access token, because that step requires a secret that can't safely
live in client-side JavaScript.

## 1. Create a Strava API application

1. Go to <https://www.strava.com/settings/api> and create an application.
2. Set **Authorization Callback Domain** to the domain you'll deploy to
   (e.g. `your-site.netlify.app`, or `localhost` while developing locally).
3. Note your **Client ID** (public) and **Client Secret** (keep this private).

## 2. Configure the app

Edit `js/config.js` and set `clientId` to your Strava Client ID. The Client
ID is safe to commit — Strava sends it back to the browser as part of the
redirect, so it's not actually secret.

**Never put the Client Secret in `js/config.js` or anywhere in client-side
code.** It only belongs in your hosting platform's environment variables.

## 3. Deploy (Netlify)

This folder is set up for Netlify out of the box:

1. Create a new Netlify site from this repo, with **Base directory** set to
   `strava-share`.
2. In **Site settings > Environment variables**, add:
   - `STRAVA_CLIENT_ID` — your Client ID
   - `STRAVA_CLIENT_SECRET` — your Client Secret
3. Deploy. Netlify will serve the static files and automatically pick up
   `netlify/functions/strava-auth.js` as a serverless function, reachable at
   `/api/strava-auth` thanks to the redirect in `netlify.toml`.

(Any platform that can serve static files plus one small Node serverless
function — Vercel, Cloudflare Pages, etc. — will work too; you'll just need
to translate `netlify.toml` to that platform's config and adjust
`tokenProxy` in `js/config.js` if the function's path differs.)

## 4. Run it locally

The static part works with any local server, e.g.:

```bash
cd strava-share
python3 -m http.server 8080
```

To test the full OAuth flow locally you'll also need to run the serverless
function — the easiest route is the Netlify CLI:

```bash
npm install -g netlify-cli
cd strava-share
netlify dev
```

Set `STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET` in a `.env` file (Netlify CLI
loads it automatically) and add `localhost` as the Authorization Callback
Domain on your Strava API application.

## How it works

- `js/strava.js` — OAuth redirect + token storage/refresh, and a small
  Strava API client (activity list + activity detail).
- `js/polyline.js` — decodes Strava's encoded route polylines into
  latitude/longitude points.
- `js/render.js` — draws everything onto a `<canvas>`: background, photo
  (cropped to fill its frame), the glowing route trace, the stats grid and
  the caption. `TEMPLATES` defines the available color themes; add more
  entries there to add more looks.
- `js/app.js` — wires the UI controls to the renderer and handles the
  "download as PNG" export via `canvas.toBlob`.
- `netlify/functions/strava-auth.js` — the only server-side code; proxies
  the OAuth token exchange/refresh so the Client Secret stays off the client.

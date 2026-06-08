// Public app configuration.
//
// The Client ID is NOT secret — Strava sends it back to the browser as part
// of the OAuth redirect, so it's fine to ship it in client-side code. Your
// Client Secret must never appear here; it lives only as an environment
// variable on the server that runs netlify/functions/strava-auth.js.
//
// Get a Client ID by creating an API application at:
// https://www.strava.com/settings/api
window.STRAVA_APP_CONFIG = {
    clientId: 'YOUR_STRAVA_CLIENT_ID',

    // Where Strava should send the user back after they approve access.
    // Defaults to this page's own URL, which is almost always what you want.
    redirectUri: window.location.origin + window.location.pathname,

    // Scopes requested from the athlete. `activity:read_all` is needed to
    // read activities (including private ones) and their route data.
    scope: 'read,activity:read_all',

    // Path to the serverless function that performs the token exchange.
    // The Netlify config in this folder maps /api/* to /.netlify/functions/*.
    tokenProxy: '/api/strava-auth',
};

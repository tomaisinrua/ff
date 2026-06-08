// Serverless proxy for the Strava OAuth token exchange.
//
// This is the one piece of the app that *must* run on a server: turning an
// authorization code (or refresh token) into an access token requires the
// app's Client Secret, and secrets must never reach the browser. Everything
// else in this project is static and can be served directly.
//
// Configure STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET as environment
// variables on your hosting platform (Netlify: Site settings > Environment
// variables). Get both by creating an API application at
// https://www.strava.com/settings/api

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token']);

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, { error: 'Method not allowed' });
    }

    let payload;
    try {
        payload = JSON.parse(event.body || '{}');
    } catch (err) {
        return jsonResponse(400, { error: 'Invalid JSON body' });
    }

    const { grant_type: grantType, code, refresh_token: refreshToken } = payload;

    if (!ALLOWED_GRANT_TYPES.has(grantType)) {
        return jsonResponse(400, { error: 'Unsupported grant_type' });
    }
    if (grantType === 'authorization_code' && !code) {
        return jsonResponse(400, { error: 'Missing code' });
    }
    if (grantType === 'refresh_token' && !refreshToken) {
        return jsonResponse(400, { error: 'Missing refresh_token' });
    }

    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return jsonResponse(500, { error: 'Server is missing Strava API credentials' });
    }

    const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
    });
    if (code) params.set('code', code);
    if (refreshToken) params.set('refresh_token', refreshToken);

    try {
        const stravaResponse = await fetch(STRAVA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
        });

        const data = await stravaResponse.json();
        if (!stravaResponse.ok) {
            return jsonResponse(stravaResponse.status, { error: 'Strava rejected the token request', details: data });
        }

        // Only forward what the client actually needs.
        return jsonResponse(200, {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            athlete: data.athlete,
        });
    } catch (err) {
        return jsonResponse(502, { error: 'Could not reach Strava' });
    }
};

function jsonResponse(statusCode, body) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    };
}

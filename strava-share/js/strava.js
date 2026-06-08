// Strava OAuth + API client.
//
// Access tokens are short-lived (6 hours). Refreshing them requires the app's
// Client Secret, which must stay server-side — so every token request goes
// through our serverless proxy (netlify/functions/strava-auth.js) instead of
// talking to https://www.strava.com/oauth/token directly.

const STRAVA_AUTH_ENDPOINT = 'https://www.strava.com/oauth/authorize';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const TOKEN_STORAGE_KEY = 'workoutShareStudio.stravaTokens';

const StravaAuth = {
    getStoredTokens() {
        try {
            return JSON.parse(localStorage.getItem(TOKEN_STORAGE_KEY));
        } catch (err) {
            return null;
        }
    },

    storeTokens(tokens) {
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
    },

    clearTokens() {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
    },

    redirectToStrava() {
        const config = window.STRAVA_APP_CONFIG;
        const url = new URL(STRAVA_AUTH_ENDPOINT);
        url.searchParams.set('client_id', config.clientId);
        url.searchParams.set('redirect_uri', config.redirectUri);
        url.searchParams.set('response_type', 'code');
        url.searchParams.set('approval_prompt', 'auto');
        url.searchParams.set('scope', config.scope);
        window.location.href = url.toString();
    },

    async exchangeCodeForTokens(code) {
        const data = await this._callTokenProxy({ grant_type: 'authorization_code', code });
        this.storeTokens({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_at: data.expires_at,
            athlete: data.athlete,
        });
        return data;
    },

    async refreshTokens(refreshToken) {
        const data = await this._callTokenProxy({ grant_type: 'refresh_token', refresh_token: refreshToken });
        const tokens = this.getStoredTokens() || {};
        tokens.access_token = data.access_token;
        tokens.refresh_token = data.refresh_token;
        tokens.expires_at = data.expires_at;
        this.storeTokens(tokens);
        return tokens;
    },

    async getValidAccessToken() {
        const tokens = this.getStoredTokens();
        if (!tokens) return null;

        const now = Math.floor(Date.now() / 1000);
        const aboutToExpire = !tokens.expires_at || tokens.expires_at - now < 120;
        if (!aboutToExpire) return tokens.access_token;

        const refreshed = await this.refreshTokens(tokens.refresh_token);
        return refreshed.access_token;
    },

    async _callTokenProxy(payload) {
        const response = await fetch(window.STRAVA_APP_CONFIG.tokenProxy, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const detail = await response.text().catch(() => '');
            throw new Error(`Strava authentication failed (${response.status}). ${detail}`);
        }
        return response.json();
    },
};

const StravaApi = {
    async _get(path, params) {
        const token = await StravaAuth.getValidAccessToken();
        if (!token) throw new Error('Not connected to Strava');

        const url = new URL(STRAVA_API_BASE + path);
        Object.entries(params || {}).forEach(([key, value]) => {
            if (value !== undefined && value !== null) url.searchParams.set(key, value);
        });

        const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) {
            throw new Error(`Strava API request failed (${response.status})`);
        }
        return response.json();
    },

    getActivities(page, perPage) {
        return this._get('/athlete/activities', { page, per_page: perPage });
    },

    getActivity(id) {
        return this._get(`/activities/${id}`);
    },
};

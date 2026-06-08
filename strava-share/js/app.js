// Wires the UI together: authentication state, activity loading, photo
// upload, live preview rendering and the final image download.

const STAT_DEFINITIONS = [
    {
        key: 'distance',
        label: 'Distance',
        compute: (a) => `${(a.distance / 1000).toFixed(2)} km`,
    },
    {
        key: 'moving_time',
        label: 'Time',
        compute: (a) => formatDuration(a.moving_time),
    },
    {
        key: 'elevation',
        label: 'Elev gain',
        compute: (a) => `${Math.round(a.total_elevation_gain)} m`,
    },
    {
        key: 'calories',
        label: 'Calories',
        compute: (a) => (a.calories ? `${Math.round(a.calories)} cal` : '—'),
    },
    {
        key: 'avg_hr',
        label: 'Avg HR',
        compute: (a) => (a.average_heartrate ? `${Math.round(a.average_heartrate)} bpm` : '—'),
    },
    {
        key: 'pace',
        label: 'Avg pace',
        compute: (a) => formatPace(a.average_speed),
    },
];

const DEFAULT_STAT_KEYS = ['distance', 'moving_time', 'elevation', 'calories', 'avg_hr', 'pace'];

function formatDuration(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function formatPace(metersPerSecond) {
    if (!metersPerSecond) return '—';
    const secondsPerKm = 1000 / metersPerSecond;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
}

(function initApp() {
    const dom = {
        connectBtn: document.getElementById('connect-btn'),
        athleteInfo: document.getElementById('athlete-info'),
        athleteAvatar: document.getElementById('athlete-avatar'),
        athleteName: document.getElementById('athlete-name'),
        logoutBtn: document.getElementById('logout-btn'),
        app: document.getElementById('app'),
        activitySelect: document.getElementById('activity-select'),
        loadMoreBtn: document.getElementById('load-more-btn'),
        photoInput: document.getElementById('photo-input'),
        templateSelect: document.getElementById('template-select'),
        captionInput: document.getElementById('caption-input'),
        statToggles: document.getElementById('stat-toggles'),
        canvas: document.getElementById('preview-canvas'),
        downloadBtn: document.getElementById('download-btn'),
        statusMsg: document.getElementById('status-msg'),
    };

    const ctx = dom.canvas.getContext('2d');

    const state = {
        page: 1,
        loadedActivityIds: new Set(),
        selectedActivity: null,
        routePoints: [],
        photoImage: null,
        selectedStatKeys: new Set(DEFAULT_STAT_KEYS),
    };

    function setStatus(message, isError) {
        dom.statusMsg.textContent = message || '';
        dom.statusMsg.classList.toggle('error', Boolean(isError));
    }

    function currentTemplate() {
        return TEMPLATES.find((t) => t.id === dom.templateSelect.value) || TEMPLATES[0];
    }

    function buildStatsForDisplay() {
        if (!state.selectedActivity) return [];
        return STAT_DEFINITIONS
            .filter((def) => state.selectedStatKeys.has(def.key))
            .map((def) => ({ label: def.label, value: def.compute(state.selectedActivity) }));
    }

    function redraw() {
        renderShareImage(ctx, {
            template: currentTemplate(),
            photo: state.photoImage,
            points: state.routePoints,
            stats: buildStatsForDisplay(),
            caption: dom.captionInput.value,
        });
    }

    function populateTemplateOptions() {
        TEMPLATES.forEach((template) => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            dom.templateSelect.appendChild(option);
        });
    }

    function populateStatToggles() {
        STAT_DEFINITIONS.forEach((def) => {
            const label = document.createElement('label');
            label.className = 'stat-toggle';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = state.selectedStatKeys.has(def.key);
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) state.selectedStatKeys.add(def.key);
                else state.selectedStatKeys.delete(def.key);
                redraw();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(def.label));
            dom.statToggles.appendChild(label);
        });
    }

    function describeActivity(activity) {
        const km = (activity.distance / 1000).toFixed(1);
        const date = new Date(activity.start_date_local).toLocaleDateString();
        return `${activity.name} — ${km} km — ${date}`;
    }

    async function loadActivities() {
        setStatus('Loading your activities…');
        try {
            const activities = await StravaApi.getActivities(state.page, 12);
            activities
                .filter((activity) => !state.loadedActivityIds.has(activity.id))
                .forEach((activity) => {
                    state.loadedActivityIds.add(activity.id);
                    const option = document.createElement('option');
                    option.value = activity.id;
                    option.textContent = describeActivity(activity);
                    dom.activitySelect.appendChild(option);
                });

            if (!state.selectedActivity && dom.activitySelect.options.length > 0) {
                dom.activitySelect.selectedIndex = 0;
                await selectActivity(dom.activitySelect.value);
            }

            if (activities.length === 0) {
                dom.loadMoreBtn.disabled = true;
                dom.loadMoreBtn.textContent = 'No more activities';
            }

            setStatus('');
        } catch (err) {
            setStatus(`Couldn't load your activities: ${err.message}`, true);
        }
    }

    async function selectActivity(activityId) {
        setStatus('Loading activity details…');
        try {
            const activity = await StravaApi.getActivity(activityId);
            const polyline = activity.map && (activity.map.polyline || activity.map.summary_polyline);
            state.selectedActivity = activity;
            state.routePoints = polyline ? decodePolyline(polyline) : [];
            redraw();
            setStatus('');
        } catch (err) {
            setStatus(`Couldn't load that activity: ${err.message}`, true);
        }
    }

    function showAuthenticatedUI(athlete) {
        dom.connectBtn.classList.add('hidden');
        dom.athleteInfo.classList.remove('hidden');

        if (athlete) {
            dom.athleteAvatar.src = athlete.profile_medium || athlete.profile || '';
            dom.athleteName.textContent = `${athlete.firstname || ''} ${athlete.lastname || ''}`.trim();
        }

        dom.activitySelect.disabled = false;
        dom.activitySelect.innerHTML = '';
        dom.loadMoreBtn.disabled = false;
        loadActivities();
    }

    function showLoggedOutUI() {
        dom.connectBtn.classList.remove('hidden');
        dom.athleteInfo.classList.add('hidden');

        state.page = 1;
        state.loadedActivityIds.clear();
        state.selectedActivity = null;
        state.routePoints = [];

        dom.activitySelect.innerHTML = '<option>Connect with Strava to load your activities</option>';
        dom.activitySelect.disabled = true;
        dom.loadMoreBtn.disabled = true;
        dom.loadMoreBtn.textContent = 'Load more activities';
        redraw();
    }

    function bindEvents() {
        dom.connectBtn.addEventListener('click', () => StravaAuth.redirectToStrava());

        dom.logoutBtn.addEventListener('click', () => {
            StravaAuth.clearTokens();
            showLoggedOutUI();
        });

        dom.activitySelect.addEventListener('change', (event) => selectActivity(event.target.value));

        dom.loadMoreBtn.addEventListener('click', () => {
            state.page += 1;
            loadActivities();
        });

        dom.templateSelect.addEventListener('change', redraw);
        dom.captionInput.addEventListener('input', redraw);

        dom.photoInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = () => {
                const image = new Image();
                image.onload = () => {
                    state.photoImage = image;
                    redraw();
                };
                image.src = reader.result;
            };
            reader.readAsDataURL(file);
        });

        dom.downloadBtn.addEventListener('click', () => {
            dom.canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'workout-share.png';
                link.click();
                URL.revokeObjectURL(url);
            }, 'image/png');
        });
    }

    async function handleOAuthCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');

        if (error) {
            window.history.replaceState({}, '', window.location.pathname);
            setStatus('Strava connection was cancelled.', true);
            return false;
        }

        if (!code) return false;

        setStatus('Connecting to Strava…');
        try {
            const data = await StravaAuth.exchangeCodeForTokens(code);
            window.history.replaceState({}, '', window.location.pathname);
            showAuthenticatedUI(data.athlete);
            setStatus('');
            return true;
        } catch (err) {
            window.history.replaceState({}, '', window.location.pathname);
            setStatus(`Strava connection failed: ${err.message}`, true);
            return false;
        }
    }

    async function start() {
        if (!window.STRAVA_APP_CONFIG || window.STRAVA_APP_CONFIG.clientId === 'YOUR_STRAVA_CLIENT_ID') {
            setStatus('Set your Strava Client ID in js/config.js to enable login.', true);
        }

        populateTemplateOptions();
        populateStatToggles();
        bindEvents();
        redraw();

        const handledCallback = await handleOAuthCallback();
        if (handledCallback) return;

        const tokens = StravaAuth.getStoredTokens();
        if (tokens) showAuthenticatedUI(tokens.athlete);
    }

    start();
})();

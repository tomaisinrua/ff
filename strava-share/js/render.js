// Canvas-based poster renderer. Given a template, an uploaded photo, the
// selected Strava activity and a list of stats to display, draws a complete
// shareable image (1080x1920 — the standard Instagram/TikTok story size).

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const TEMPLATES = [
    {
        id: 'sunset',
        name: 'Sunset Glow',
        background: ['#3b1f0e', '#7a3b12', '#2a1509'],
        wordmarkColor: '#f5e9da',
        statLabelColor: 'rgba(245, 233, 218, 0.65)',
        statValueColor: '#f5e9da',
        captionColor: '#caff3f',
        routeColor: 'rgba(255, 150, 40, 0.95)',
        routeGlowColor: 'rgba(255, 140, 30, 0.55)',
    },
    {
        id: 'midnight',
        name: 'Midnight Run',
        background: ['#03060f', '#0d1730', '#03060f'],
        wordmarkColor: '#eaf6ff',
        statLabelColor: 'rgba(234, 246, 255, 0.6)',
        statValueColor: '#eaf6ff',
        captionColor: '#62d8ff',
        routeColor: 'rgba(98, 216, 255, 0.95)',
        routeGlowColor: 'rgba(98, 216, 255, 0.55)',
    },
    {
        id: 'fresh',
        name: 'Fresh Mint',
        background: ['#0c2b22', '#1f5c46', '#0a201a'],
        wordmarkColor: '#eafff6',
        statLabelColor: 'rgba(234, 255, 246, 0.6)',
        statValueColor: '#eafff6',
        captionColor: '#7cffcb',
        routeColor: 'rgba(124, 255, 203, 0.95)',
        routeGlowColor: 'rgba(124, 255, 203, 0.5)',
    },
    {
        id: 'paper',
        name: 'Clean Paper',
        background: ['#f4efe7', '#e8e0d2', '#f4efe7'],
        wordmarkColor: '#2b2620',
        statLabelColor: 'rgba(43, 38, 32, 0.55)',
        statValueColor: '#2b2620',
        captionColor: '#e8552c',
        routeColor: 'rgba(232, 85, 44, 0.95)',
        routeGlowColor: 'rgba(232, 85, 44, 0.35)',
    },
];

const PHOTO_RECT = { x: 64, y: 380, w: CANVAS_WIDTH - 128, h: 1010 };
const CORNER_RADIUS = 32;

function renderShareImage(ctx, options) {
    const { template, photo, points, stats, caption } = options;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawBackground(ctx, template);
    drawPhoto(ctx, photo);

    if (points && points.length > 1) {
        const routeRect = {
            x: PHOTO_RECT.x + 44,
            y: PHOTO_RECT.y + PHOTO_RECT.h - 470,
            w: PHOTO_RECT.w * 0.6,
            h: 360,
        };
        drawRoute(ctx, points, routeRect, template);
    }

    drawStatsPanel(ctx, { x: PHOTO_RECT.x + 44, y: PHOTO_RECT.y + PHOTO_RECT.h - 96 }, stats, template);
    drawCaption(ctx, caption, template);
}

function drawBackground(ctx, template) {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, template.background[0]);
    gradient.addColorStop(0.55, template.background[1]);
    gradient.addColorStop(1, template.background[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawPhoto(ctx, photo) {
    if (photo) {
        drawImageCover(ctx, photo, PHOTO_RECT, CORNER_RADIUS);
        return;
    }

    ctx.save();
    roundedRectPath(ctx, PHOTO_RECT.x, PHOTO_RECT.y, PHOTO_RECT.w, PHOTO_RECT.h, CORNER_RADIUS);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '500 36px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Upload a photo to see your preview', CANVAS_WIDTH / 2, PHOTO_RECT.y + PHOTO_RECT.h / 2);
    ctx.restore();
}

function drawImageCover(ctx, image, rect, radius) {
    const imageRatio = image.width / image.height;
    const rectRatio = rect.w / rect.h;

    let sx, sy, sw, sh;
    if (imageRatio > rectRatio) {
        sh = image.height;
        sw = sh * rectRatio;
        sx = (image.width - sw) / 2;
        sy = 0;
    } else {
        sw = image.width;
        sh = sw / rectRatio;
        sx = 0;
        sy = (image.height - sh) / 2;
    }

    ctx.save();
    roundedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, radius);
    ctx.clip();
    ctx.drawImage(image, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);

    // Subtle bottom scrim so light overlay text/route stays legible on bright photos.
    const scrim = ctx.createLinearGradient(0, rect.y + rect.h * 0.45, 0, rect.y + rect.h);
    scrim.addColorStop(0, 'rgba(0, 0, 0, 0)');
    scrim.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
    ctx.fillStyle = scrim;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
}

function roundedRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function drawRoute(ctx, points, rect, template) {
    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const latSpan = Math.max(maxLat - minLat, 1e-6);
    const lngSpan = Math.max(maxLng - minLng, 1e-6);

    // Fit the route inside `rect` while preserving its real aspect ratio.
    const scale = Math.min(rect.w / lngSpan, rect.h / latSpan) * 0.88;
    const drawWidth = lngSpan * scale;
    const drawHeight = latSpan * scale;
    const offsetX = rect.x + (rect.w - drawWidth) / 2;
    const offsetY = rect.y + (rect.h - drawHeight) / 2;

    const project = ([lat, lng]) => [
        offsetX + (lng - minLng) * scale,
        offsetY + (drawHeight - (lat - minLat) * scale), // latitude increases northward = up
    ];

    const tracePath = () => {
        ctx.beginPath();
        points.forEach((point, index) => {
            const [x, y] = project(point);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
    };

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Soft glow pass underneath...
    ctx.shadowColor = template.routeGlowColor;
    ctx.shadowBlur = 30;
    ctx.strokeStyle = template.routeColor;
    ctx.lineWidth = 10;
    tracePath();
    ctx.stroke();

    // ...then a crisp line on top.
    ctx.shadowBlur = 4;
    ctx.lineWidth = 5;
    tracePath();
    ctx.stroke();

    // Start/finish marker.
    const [startX, startY] = project(points[0]);
    ctx.shadowBlur = 12;
    ctx.fillStyle = template.routeColor;
    ctx.beginPath();
    ctx.arc(startX, startY, 9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawStatsPanel(ctx, origin, stats, template) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = template.wordmarkColor;
    ctx.font = '800 32px -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('STRAVA', origin.x, origin.y);

    const columns = 3;
    const columnWidth = (PHOTO_RECT.w - 88) / columns;
    const rowHeight = 70;
    const gridTop = origin.y + 46;

    stats.forEach((stat, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = origin.x + col * columnWidth;
        const y = gridTop + row * rowHeight;

        ctx.fillStyle = template.statLabelColor;
        ctx.font = '700 17px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(stat.label.toUpperCase(), x, y);

        ctx.fillStyle = template.statValueColor;
        ctx.font = '800 31px -apple-system, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(stat.value, x, y + 34);
    });

    ctx.restore();
}

function drawCaption(ctx, caption, template) {
    if (!caption || !caption.trim()) return;

    ctx.save();
    ctx.fillStyle = template.captionColor;
    ctx.textAlign = 'left';
    ctx.font = '800 68px -apple-system, "Segoe UI", Roboto, sans-serif';

    const lines = wrapText(caption.toUpperCase(), 18);
    let y = PHOTO_RECT.y + PHOTO_RECT.h + 116;
    lines.forEach((line) => {
        ctx.fillText(line, PHOTO_RECT.x, y);
        y += 78;
    });
    ctx.restore();
}

function wrapText(text, maxCharsPerLine) {
    const words = text.trim().split(/\s+/);
    const lines = [];
    let current = '';

    words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > maxCharsPerLine && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    });
    if (current) lines.push(current);

    return lines.slice(0, 3);
}

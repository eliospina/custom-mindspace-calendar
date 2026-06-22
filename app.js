const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events.readonly';

const SAMPLE_EVENTS = [
    { summary: 'Dentist', start: { dateTime: todayAt(10, 0) } },
    { summary: 'Lunch with Ana', start: { dateTime: todayAt(13, 30) } },
    { summary: 'Gym', start: { dateTime: todayAt(19, 0) } },
];

let tokenClient;
let gapiInited = false;
let gisInited = false;
let activeStyleId = 'minimal';
let liveEvents = null;
let usingLiveEvents = false;
let viewDate = new Date();

const phoneScreen = document.getElementById('phone-screen');
const stylePicker = document.getElementById('style-picker');
const authBtn = document.getElementById('auth-btn');
const statusMsg = document.getElementById('status-msg');
const headerSub = document.getElementById('header-sub');
const earlyAccessPanel = document.getElementById('early-access');
const earlyAccessForm = document.getElementById('early-access-form');
const waitlistEmailInput = document.getElementById('waitlist-email');
const earlyAccessDone = document.getElementById('early-access-done');

const WAITLIST_KEY = 'mindspace_waitlist_email';
const EARLY_ACCESS_REPO = 'https://github.com/eliospina/custom-mindspace-calendar/issues/new';

function getBetaAccessUrl(email = '') {
    const custom = window.GOOGLE_CONFIG?.BETA_ACCESS_URL?.trim();
    if (custom) return custom;
    const title = encodeURIComponent(email ? `Early access: ${email}` : 'Early access: ');
    const body = encodeURIComponent(
        email
            ? `**Gmail:** ${email}\n\nI want to try Mindspace with my real Google Calendar.\n\nDemo in progress · first users list.`
            : '**Gmail:** \n\nI want to try Mindspace with my real Google Calendar.',
    );
    return `${EARLY_ACCESS_REPO}?template=early_access.md&title=${title}&body=${body}&labels=early-access`;
}

function showWaitlistDone(email) {
    if (!earlyAccessPanel || !earlyAccessDone) return;
    earlyAccessPanel.classList.add('is-done');
    earlyAccessDone.textContent = `You're on the list (${email}). We'll enable sign-in for you soon — then tap Sign in above.`;
}

function initWaitlist() {
    const saved = localStorage.getItem(WAITLIST_KEY);
    if (saved) showWaitlistDone(saved);

    earlyAccessForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = waitlistEmailInput?.value?.trim();
        if (!email) return;
        localStorage.setItem(WAITLIST_KEY, email);
        window.open(getBetaAccessUrl(email), '_blank', 'noopener');
        showWaitlistDone(email);
        setStatus('Confirm your request on GitHub — then we add your Gmail.');
    });
}

function saveSessionToken(token) {
    if (token?.access_token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
    }
}

function loadSessionToken() {
    try {
        const raw = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearSessionToken() {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (gapiInited) gapi.client.setToken(null);
}

function applySessionToken() {
    const token = loadSessionToken();
    if (!token?.access_token || !gapiInited) return false;
    gapi.client.setToken(token);
    return true;
}

const TOKEN_STORAGE_KEY = 'mindspace_gcal_token';

function getGoogleConfig() {
    const config = window.GOOGLE_CONFIG;
    if (!config?.CLIENT_ID || !config?.API_KEY) return null;
    if (config.CLIENT_ID.includes('YOUR_CLIENT_ID') || config.API_KEY.includes('YOUR_API_KEY')) return null;
    return config;
}

function isSignedIn() {
    try {
        return gapiInited && gapi.client.getToken() !== null;
    } catch {
        return false;
    }
}

function setStatus(text, isError = false) {
    if (!statusMsg) return;
    statusMsg.textContent = text || '';
    statusMsg.classList.toggle('is-error', !!isError);
}

function updateChrome() {
    const connected = isSignedIn();
    document.body.classList.toggle('is-connected', connected);
    if (authBtn) authBtn.textContent = connected ? 'Sign out' : 'Sign in';
    if (headerSub) {
        const theme = CALENDAR_STYLES[activeStyleId]?.label || 'Calendar';
        headerSub.textContent = connected
            ? `${theme} · Google Calendar`
            : 'In progress · Skins ready now';
    }
    if (connected && statusMsg && !statusMsg.classList.contains('is-error')) {
        setStatus('');
    }
}

function todayAt(h, m) {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toISOString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

// Star Jedi maps lowercase input to the correct logo-style glyphs; uppercase breaks (U→K, O→N, etc.)
function starJediText(text) {
    return escapeHtml(String(text ?? '').toLowerCase());
}

function formatEventTime(start) {
    if (!start.dateTime) return 'All day';
    return new Date(start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getMonthGrid(date = viewDate) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const now = new Date();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startPad = (first.getDay() + 6) % 7;
    const days = [];
    for (let i = 0; i < startPad; i++) {
        days.push({ day: new Date(year, month, -startPad + i + 1).getDate(), current: false });
    }
    for (let d = 1; d <= last.getDate(); d++) {
        days.push({
            day: d,
            current: true,
            isToday: d === now.getDate() && month === now.getMonth() && year === now.getFullYear(),
        });
    }
    while (days.length % 7 !== 0) {
        days.push({ day: days.length - last.getDate() - startPad + 1, current: false });
    }
    const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    return { days, monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) };
}

function monthRange(date = viewDate) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    return { timeMin: start.toISOString(), timeMax: end.toISOString() };
}

function changeMonth(delta) {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    if (usingLiveEvents && gapiInited) fetchEvents();
    else renderPhone();
}

function starDots() {
    const pts = [[10,15,2],[30,8,1],[55,22,1.5],[80,10,1],[100,35,2],[130,12,1],[160,28,1.5],[190,8,1],[220,40,2],[250,18,1],[280,30,1.5],[310,10,1],[340,25,2],[25,50,1],[70,55,1.5],[120,48,1],[200,52,2],[260,58,1],[300,45,1.5]];
    return pts.map(([x, y, s]) =>
        `<span style="position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;background:#fff;border-radius:50%;opacity:0.${s > 1.5 ? '9' : '5'}"></span>`
    ).join('');
}

function renderHero(type, s, monthLabel) {
    const font = s.font;
    const safe = escapeHtml(monthLabel);

    switch (type) {
    case 'minimal':
        return `<div style="padding:10px 16px 8px;border-bottom:1px solid #e8eaed;background:${s.appBar};flex-shrink:0">
            <div style="font-size:20px;font-weight:500;color:${s.monthText};font-family:${font}">${safe}</div></div>`;
    case 'starwars':
        return `<div style="height:128px;position:relative;overflow:hidden;background:#000;flex-shrink:0">
            ${starDots()}
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.1) 0%,rgba(0,0,0,0.9) 100%)"></div>
            <div style="position:absolute;top:8px;left:0;right:0;text-align:center;font-family:'Star Jedi',sans-serif;font-size:7px;color:#FFE81F;opacity:0.55;letter-spacing:0.12em;padding:0 12px;line-height:1.4">a long time ago in a calendar far, far away...</div>
            <div style="position:absolute;bottom:10px;left:0;right:0;padding:0 16px 4px;text-align:center;transform:perspective(260px) rotateX(24deg);transform-origin:center bottom">
                <div style="font-family:'Star Jedi',sans-serif;font-size:20px;color:#FFE81F;letter-spacing:0.06em;line-height:1.45;text-shadow:0 0 14px rgba(255,232,31,0.65),0 0 4px rgba(255,232,31,0.9)">${starJediText(monthLabel)}</div>
            </div>
        </div>`;
    case 'tron':
        return `<div style="height:96px;position:relative;overflow:hidden;background:#000;flex-shrink:0">
            <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(0,255,242,0.08) 19px,rgba(0,255,242,0.08) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,255,242,0.08) 19px,rgba(0,255,242,0.08) 20px)"></div>
            <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:#00fff2;box-shadow:0 0 12px #00fff2"></div>
            <div style="position:absolute;bottom:14px;left:16px;font-size:16px;font-weight:500;color:#00fff2;font-family:${font};text-shadow:0 0 8px rgba(0,255,242,0.8)">${safe}</div>
        </div>`;
    case 'nebula':
        return `<div style="height:96px;position:relative;overflow:hidden;flex-shrink:0;background:
            radial-gradient(ellipse 70% 80% at 20% 50%, rgba(236,72,153,0.6) 0%, transparent 55%),
            radial-gradient(ellipse 60% 70% at 80% 30%, rgba(99,102,241,0.7) 0%, transparent 50%),
            radial-gradient(ellipse 50% 60% at 50% 80%, rgba(168,85,247,0.5) 0%, transparent 50%),
            #0f0a28">
            <div style="position:absolute;bottom:12px;left:16px;font-size:16px;font-weight:500;color:#f0abfc;font-family:${font}">${safe}</div>
        </div>`;
    case 'coder':
        return `<div style="height:80px;padding:12px 16px;background:#0d1117;border-bottom:1px solid #21262d;flex-shrink:0;font-family:${font};font-size:13px;line-height:1.6">
            <div><span style="color:#ff7b72">const</span> <span style="color:#79c0ff">month</span> = <span style="color:#a5d6a7">"${safe}"</span>;</div>
            <div style="color:#484f58">// user.style !== 'googleClipArt'</div>
        </div>`;
    default:
        return '';
    }
}

function renderPhone() {
    if (!phoneScreen) return;

    const s = CALENDAR_STYLES[activeStyleId] || CALENDAR_STYLES.minimal;
    const { days, monthLabel } = getMonthGrid();
    const now = new Date();
    const isCurrentMonth = viewDate.getMonth() === now.getMonth() && viewDate.getFullYear() === now.getFullYear();
    const events = usingLiveEvents
        ? (liveEvents ?? [])
        : (isCurrentMonth ? SAMPLE_EVENTS : []);
    const showingSamples = !usingLiveEvents && events.length > 0;
    const monthName = monthLabel.split(' ')[0];
    const font = s.font;
    const titleFont = s.titleFont || font;
    const isSw = activeStyleId === 'starwars';

    phoneScreen.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;position:relative;font-family:${font}">
        <div style="background:${s.appBar};color:${s.appBarText};padding:36px 16px 10px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;border-bottom:1px solid ${s.navBorder}">
            <button type="button" data-action="prev-month" style="background:none;border:none;color:${s.appBarText};font-size:22px;padding:4px 8px;line-height:1" aria-label="Previous month">‹</button>
            <span style="font-family:${titleFont};font-size:${isSw ? '20px' : '18px'};letter-spacing:${isSw ? '0.06em' : 'normal'};text-shadow:${isSw ? '0 0 8px rgba(255,232,31,0.5)' : 'none'}">${isSw ? starJediText(monthName) : escapeHtml(monthName)}</span>
            <button type="button" data-action="next-month" style="background:none;border:none;color:${s.appBarText};font-size:22px;padding:4px 8px;line-height:1" aria-label="Next month">›</button>
        </div>
        ${renderHero(s.heroType, s, monthLabel)}
        <div class="cal-scroll" style="background:${s.body};flex:1">
            <div style="padding:12px 12px 4px">
                <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;margin-bottom:4px">
                    ${['M','T','W','T','F','S','S'].map(d => `<span style="font-size:11px;font-weight:500;color:${s.weekday}">${d}</span>`).join('')}
                </div>
                <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center;gap:2px 0">
                    ${days.map(({ day, current, isToday }) => isToday
                        ? `<span style="width:28px;height:28px;line-height:28px;margin:0 auto;border-radius:4px;background:${s.todayBg};color:${s.todayText};font-size:13px;font-weight:500">${day}</span>`
                        : `<span style="width:28px;height:28px;line-height:28px;margin:0 auto;font-size:13px;color:${current ? s.day : s.dayOther}">${day}</span>`
                    ).join('')}
                </div>
            </div>
            <div style="padding:8px 16px 16px">
                <p style="font-family:${titleFont};font-size:${isSw ? '13px' : '11px'};font-weight:500;color:${s.weekday};margin:8px 0 10px;letter-spacing:${isSw ? '0.12em' : '0.5px'};${isSw ? '' : 'text-transform:uppercase'}">${isSw ? starJediText('upcoming missions') : (showingSamples ? 'Sample preview' : 'Events this month')}</p>
                ${events.length ? events.map(ev => `
                <div style="display:flex;gap:8px;margin-bottom:8px">
                    <div style="width:2px;background:${s.eventBorder};flex-shrink:0;border-radius:1px;${showingSamples ? 'opacity:0.5' : ''}"></div>
                    <div style="flex:1;background:${s.eventBg};border:1px solid ${s.eventBorder}33;border-radius:4px;padding:10px 12px;${showingSamples ? 'opacity:0.85' : ''}">
                        <div style="font-family:${titleFont};font-size:${isSw ? '15px' : '14px'};font-weight:500;color:${s.eventText};letter-spacing:${isSw ? '0.04em' : 'normal'}">${isSw ? starJediText(ev.summary || 'Event') : escapeHtml(ev.summary || 'Event')}</div>
                        <div style="font-size:12px;color:${s.weekday};margin-top:2px">${formatEventTime(ev.start)}${showingSamples ? ' · preview' : ''}</div>
                    </div>
                </div>`).join('') : `<p style="font-size:12px;color:${s.weekday};margin:0">${usingLiveEvents ? 'No events this month.' : 'Sign in to load your calendar.'}</p>`}
            </div>
        </div>
        <div style="background:${s.navBg};border-top:1px solid ${s.navBorder};display:flex;justify-content:space-around;padding:8px 0 16px;flex-shrink:0">
            ${['📅','✓','📍','☰'].map((icon, i) => `<button style="background:none;border:none;font-size:${i === 0 ? 20 : 17}px;opacity:${i === 0 ? 1 : 0.4};color:${s.navIcon};padding:4px 12px">${icon}</button>`).join('')}
        </div>
        <button style="position:absolute;bottom:64px;right:16px;width:48px;height:48px;border-radius:8px;background:${s.fab};color:${s.fabText};border:none;font-size:22px;box-shadow:0 2px 8px rgba(0,0,0,0.3);z-index:10">+</button>
    </div>`;
}

function renderStylePicker() {
    if (!stylePicker) return;
    stylePicker.innerHTML = Object.entries(CALENDAR_STYLES).map(([id, st]) => `
        <button type="button" class="style-chip${id === activeStyleId ? ' selected' : ''}" data-style="${id}" aria-pressed="${id === activeStyleId}">
            <div class="style-chip-swatch" style="background:${st.swatch}"></div>
            <span class="style-chip-label">${st.label}</span>
        </button>`).join('');
    stylePicker.querySelectorAll('.style-chip').forEach(btn => {
        btn.addEventListener('click', () => selectStyle(btn.dataset.style));
    });
}

function selectStyle(id) {
    if (!CALENDAR_STYLES[id]) return;
    activeStyleId = id;
    localStorage.setItem('calendar_style', id);
    renderStylePicker();
    renderPhone();
    updateChrome();
}

function initializeGoogleAPIs() {
    const config = getGoogleConfig();
    if (!config) {
        setStatus('Preview mode · Sign in unavailable');
        return;
    }
    if (typeof gapi === 'undefined' || typeof google === 'undefined') {
        setTimeout(initializeGoogleAPIs, 100);
        return;
    }
    gapi.load('client', () => {
        gapi.client.init({ apiKey: config.API_KEY, discoveryDocs: [DISCOVERY_DOC] }).then(async () => {
            gapiInited = true;
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: config.CLIENT_ID,
                scope: SCOPES,
                callback: handleAuthCallback,
            });
            if (applySessionToken()) {
                usingLiveEvents = true;
                updateChrome();
                await fetchEvents();
            }
        });
    });
}

async function handleAuthCallback(res) {
    if (res.error) {
        if (res.error === 'access_denied') {
            setStatus('Not on the list yet — join below, then try Sign in after we add you.', true);
            earlyAccessPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            setStatus(`Could not sign in (${res.error}).`, true);
        }
        updateChrome();
        return;
    }
    if (res.access_token) {
        gapi.client.setToken(res);
        saveSessionToken(res);
    }
    updateChrome();
    await fetchEvents();
}

async function fetchEvents() {
    if (!gapiInited) return;
    setStatus('Loading…');
    const { timeMin, timeMax } = monthRange();
    try {
        const res = await gapi.client.calendar.events.list({
            calendarId: 'primary',
            timeMin,
            timeMax,
            showDeleted: false,
            singleEvents: true,
            maxResults: 20,
            orderBy: 'startTime',
        });
        liveEvents = res.result.items ?? [];
        usingLiveEvents = true;
        setStatus('');
    } catch {
        if (loadSessionToken()) {
            clearSessionToken();
            setStatus('Session expired — sign in again.', true);
        } else {
            setStatus('Could not load events.', true);
        }
        liveEvents = null;
        usingLiveEvents = false;
    }
    updateChrome();
    renderPhone();
}

authBtn.addEventListener('click', () => {
    if (!getGoogleConfig()) { setStatus('Google credentials not configured.', true); return; }
    if (!gapiInited || !tokenClient) { setStatus('Loading…'); return; }
    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({ prompt: loadSessionToken() ? '' : 'consent' });
    } else {
        clearSessionToken();
        liveEvents = null;
        usingLiveEvents = false;
        viewDate = new Date();
        setStatus('');
        updateChrome();
        renderPhone();
    }
});

phoneScreen?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'prev-month') changeMonth(-1);
    if (btn.dataset.action === 'next-month') changeMonth(1);
});

window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('calendar_style');
    const legacy = { limpio: 'minimal', slate: 'minimal', noche: 'coder', space: 'nebula', google: 'minimal', personal: 'minimal' };
    activeStyleId = CALENDAR_STYLES[saved] ? saved : (legacy[saved] || 'minimal');

    renderStylePicker();
    renderPhone();
    updateChrome();
    initWaitlist();
    initializeGoogleAPIs();
});

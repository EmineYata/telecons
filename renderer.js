import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'https://unpkg.com/livekit-client@2.7.2/dist/livekit-client.esm.mjs';

import { desktopConfig } from './config.js';

const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const identityBadge = document.getElementById('identityBadge');
const roomInfo = document.getElementById('roomInfo');

const homeView = document.getElementById('homeView');
const callView = document.getElementById('callView');
const remoteGrid = document.getElementById('remoteGrid');

const openSettingsBtn = document.getElementById('openSettings');
const settingsModal = document.getElementById('settingsModal');
const settingsBackdrop = document.getElementById('settingsBackdrop');
const closeSettingsBtn = document.getElementById('closeSettings');
const cancelSettingsBtn = document.getElementById('cancelSettings');
const saveSettingsBtn = document.getElementById('saveSettings');
const cameraList = document.getElementById('cameraList');
const micList = document.getElementById('micList');
const audioTrackCountEl = document.getElementById('audioTrackCount');

const startCallBtn = document.getElementById('startCall');
const toggleMicBtn = document.getElementById('toggleMic');
const toggleCamBtn = document.getElementById('toggleCam');
const toggleStethoBtn = document.getElementById('toggleStetho');


const refreshDevicesBtn = document.getElementById('refreshDevices');
const leaveBtn = document.getElementById('leave');

const localVideos = document.getElementById('localVideos');

let previewStream = null;
let room = null;
let localTracks = [];
let micEnabled = true;
let camEnabled = true;
let activeAudioMode = 'patient';
let publishedAudio = null;

const STORAGE_KEY = 'desktopversion.deviceSelection.v1';

const AUDIO_SELECTION_KEY = 'desktopversion.audioSelection.v1';

function loadAudioSelection() {
  try {
    const raw = localStorage.getItem(AUDIO_SELECTION_KEY);
    if (!raw) return { patientMicId: '', stethoMicId: '' };
    const parsed = JSON.parse(raw);
    return {
      patientMicId: String(parsed?.patientMicId || ''),
      stethoMicId: String(parsed?.stethoMicId || ''),
    };
  } catch {
    return { patientMicId: '', stethoMicId: '' };
  }
}

function saveAudioSelection(sel) {
  localStorage.setItem(AUDIO_SELECTION_KEY, JSON.stringify(sel));
}

function findFirstAvailableMicId(excludeId = '') {
  const mics = Array.from(micList?.querySelectorAll?.('input[type="checkbox"][data-kind="mic"]') || [])
    .map((i) => i.getAttribute('data-id'))
    .filter(Boolean);
  for (const id of mics) {
    if (excludeId && id === excludeId) continue;
    return id;
  }
  return '';
}

function ensureAudioSelectionIsValid() {
  const sel = loadAudioSelection();
  const checkedMicIds = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
    .filter((i) => i.checked)
    .map((i) => i.getAttribute('data-id'))
    .filter(Boolean);

  let patientMicId = sel.patientMicId;
  let stethoMicId = sel.stethoMicId;

  if (!patientMicId || !checkedMicIds.includes(patientMicId)) {
    patientMicId = checkedMicIds[0] || '';
  }
  if (!stethoMicId || !checkedMicIds.includes(stethoMicId) || stethoMicId === patientMicId) {
    stethoMicId = checkedMicIds.find((id) => id !== patientMicId) || '';
  }

  const next = { patientMicId, stethoMicId };
  saveAudioSelection(next);
  return next;
}

function renderAudioRoleSelectors() {
  const current = loadAudioSelection();
  const items = Array.from(micList.querySelectorAll('.device-item'));
  for (const row of items) {
    const input = row.querySelector('input[type="checkbox"][data-kind="mic"]');
    if (!input) continue;
    const deviceId = input.getAttribute('data-id');

    let role = row.querySelector('select[data-role="audio"]');
    if (!role) {
      role = document.createElement('select');
      role.setAttribute('data-role', 'audio');
      role.style.marginLeft = '8px';
      role.innerHTML = `
        <option value="none">-</option>
        <option value="patient">Patient</option>
        <option value="stetho">Stetho</option>
      `;
      row.appendChild(role);
    }

    if (deviceId && deviceId === current.patientMicId) role.value = 'patient';
    else if (deviceId && deviceId === current.stethoMicId) role.value = 'stetho';
    else role.value = 'none';

    role.disabled = !input.checked;

    role.onchange = () => {
      const sel = loadAudioSelection();
      if (role.value === 'patient') {
        sel.patientMicId = deviceId;
        if (sel.stethoMicId === deviceId) sel.stethoMicId = '';
      } else if (role.value === 'stetho') {
        sel.stethoMicId = deviceId;
        if (sel.patientMicId === deviceId) sel.patientMicId = '';
      } else {
        if (sel.patientMicId === deviceId) sel.patientMicId = '';
        if (sel.stethoMicId === deviceId) sel.stethoMicId = '';
      }

      saveAudioSelection(sel);
      ensureAudioSelectionIsValid();
      renderAudioRoleSelectors();
    };
  }
}

async function setPublishedAudioMode(mode) {
  const m = mode === 'stetho' ? 'stetho' : 'patient';
  activeAudioMode = m;

  if (!room?.localParticipant) return;

  const sel = loadAudioSelection();
  const deviceId = m === 'stetho' ? sel.stethoMicId : sel.patientMicId;

  if (publishedAudio?.track) {
    try {
      room.localParticipant.unpublishTrack(publishedAudio.track);
    } catch {}
    try {
      publishedAudio.track.stop();
    } catch {}
    publishedAudio = null;
  }

  if (!micEnabled) {
    if (toggleMicBtn) toggleMicBtn.textContent = 'Mic: off';
    return;
  }

  const t = deviceId ? await createLocalAudioTrack({ deviceId }) : await createLocalAudioTrack();
  if (t?.mediaStreamTrack?.kind === 'audio') {
    const name = `audio:${m}`;
    const pub = await room.localParticipant.publishTrack(t, { name });
    publishedAudio = { track: t, pub };
  }
}

function getRole() {
  const v = String(desktopConfig?.role || '').trim().toLowerCase();
  if (v === 'doctor' || v === 'medecin') return 'doctor';
  if (v === 'cart' || v === 'chariot') return 'cart';
  return 'cart';
}

function loadSelection() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { cameras: [], mics: [] };
    const parsed = JSON.parse(raw);
    return {
      cameras: Array.isArray(parsed?.cameras) ? parsed.cameras : [],
      mics: Array.isArray(parsed?.mics) ? parsed.mics : [],
    };
  } catch {
    return { cameras: [], mics: [] };
  }
}

function saveSelection(sel) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
}

function getSelectedValues(selectEl) {
  return Array.from(selectEl.selectedOptions || []).map((o) => o.value).filter(Boolean);
}

function setStatus(msg) {
  statusEl.textContent = msg;
}

function setDebug(obj) {
  debugEl.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
}

function attachRemoteTrack(track, pub, participant) {
  if (!participant || !track) return;
  const sid = pub?.trackSid || pub?.sid || track?.sid || '';
  const id = `${participant.identity}:${sid || Math.random()}`;

  if (track.kind === 'video') {
    const wrap = document.createElement('div');
    wrap.className = 'tile';
    wrap.dataset.id = id;
    const v = track.attach();
    v.autoplay = true;
    v.playsInline = true;
    wrap.appendChild(v);
    const lab = document.createElement('div');
    lab.className = 'label';
    lab.textContent = participant.identity;
    wrap.appendChild(lab);
    remoteGrid.appendChild(wrap);
  }

  if (track.kind === 'audio') {
    const a = track.attach();
    a.autoplay = true;
    a.controls = true;
    a.dataset.id = id;
    remoteGrid.appendChild(a);
  }
}

function detachRemoteTrack(track, pub, participant) {
  const sid = pub?.trackSid || pub?.sid || track?.sid;
  if (!sid || !participant?.identity) return;
  const nodes = remoteGrid.querySelectorAll(`[data-id^="${participant.identity}:${sid}"]`);
  nodes.forEach((n) => n.remove());
}

function normalizeBaseUrl(s) {
  const v = String(s || '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    return u.origin;
  } catch {
    return v.endsWith('/') ? v.slice(0, -1) : v;
  }
}

function dedupe(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function labelMatchesAny(label, patterns) {
  const l = String(label || '').toLowerCase();
  const ps = Array.isArray(patterns) ? patterns : [];
  return ps.some((p) => l.includes(String(p || '').toLowerCase()));
}

async function buildDeviceLabelMap() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const map = new Map();
  for (const d of devices) {
    if (d?.deviceId) map.set(d.deviceId, d.label || d.deviceId);
  }
  return map;
}

async function listDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cams = devices.filter((d) => d.kind === 'videoinput');
  const mics = devices.filter((d) => d.kind === 'audioinput');

  const selection = loadSelection();

  cameraList.innerHTML = '';
  micList.innerHTML = '';

  for (const cam of cams) {
    const id = cam.deviceId;
    const checked = selection.cameras.includes(id) || labelMatchesAny(cam.label, desktopConfig?.preferredCameraLabels);
    const row = document.createElement('div');
    row.className = 'device-item';
    row.innerHTML = `
      <label>
        <input type="checkbox" data-kind="camera" data-id="${id}" ${checked ? 'checked' : ''} />
        <span>${cam.label || 'Camera'}</span>
      </label>
    `;
    cameraList.appendChild(row);
  }

  for (const mic of mics) {
    const id = mic.deviceId;
    const checked = selection.mics.includes(id) || labelMatchesAny(mic.label, desktopConfig?.preferredMicLabels);
    const row = document.createElement('div');
    row.className = 'device-item';
    row.innerHTML = `
      <label>
        <input type="checkbox" data-kind="mic" data-id="${id}" ${checked ? 'checked' : ''} />
        <span>${mic.label || 'Micro'}</span>
      </label>
    `;
    micList.appendChild(row);
  }

  ensureAudioSelectionIsValid();
  renderAudioRoleSelectors();

  return { cams, mics };
}

async function ensureDeviceLabels() {
  // Needed to get device labels on some platforms
  const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  tmp.getTracks().forEach((t) => t.stop());
}

async function startPreview() {
  await stopPreview();

  const selection = loadSelection();
  const videoDeviceId = selection.cameras[0] || undefined;
  const audioDeviceId = selection.mics[0] || undefined;

  const constraints = {
    video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
    audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
  };

  previewStream = await navigator.mediaDevices.getUserMedia(constraints);
  setStatus('Preview started');
}

async function stopPreview() {
  if (previewStream) {
    previewStream.getTracks().forEach((t) => t.stop());
    previewStream = null;
  }
}

function renderLocalVideos() {
  if (!localVideos) return;
  localVideos.innerHTML = '';

  const videos = localTracks.filter((t) => t?.mediaStreamTrack?.kind === 'video');
  for (const t of videos) {
    const el = t.attach();
    el.autoplay = true;
    el.playsInline = true;
    el.muted = true;
    localVideos.appendChild(el);
  }
}

async function fetchToken({ serverBase, roomName, identity }) {
  const url = `${serverBase}/api/token?roomName=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}&publish=1&subscribe=1`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Token error (${res.status})`;
    throw new Error(msg);
  }
  if (!data?.url || !data?.token) {
    throw new Error(`Invalid token response: ${JSON.stringify(data)}`);
  }
  return { url: data.url, token: data.token };
}

async function joinRoom() {
  const serverBase = normalizeBaseUrl(desktopConfig?.serverBaseUrl);
  const roomName = String(desktopConfig?.roomName || '').trim();
  const identity = String(desktopConfig?.identity || '').trim();

  if (!serverBase) throw new Error('Server base URL requis');
  if (!roomName) throw new Error('Room name requis');
  if (!identity) throw new Error('Identity requis');

  identityBadge.textContent = identity;

  // Avoid holding devices twice (preview + published tracks)
  await stopPreview();

  setStatus('Getting token...');
  const { url, token } = await fetchToken({ serverBase, roomName, identity });

  setStatus('Creating local tracks...');
  const selection = loadSelection();
  const selectedVideoIds = selection.cameras;
  const selectedAudioIds = selection.mics;

  const deviceLabelMap = await buildDeviceLabelMap();

  const publishAllCameras = desktopConfig?.publishAllCameras === true;
  const audioTrackCount = Number.isFinite(Number(desktopConfig?.audioTrackCount))
    ? Math.max(0, Math.floor(Number(desktopConfig.audioTrackCount)))
    : 2;

  localTracks = [];

  // Video tracks (one per selected camera)
  let videoDeviceIds = dedupe(selectedVideoIds);
  if (publishAllCameras) {
    const all = await navigator.mediaDevices.enumerateDevices();
    videoDeviceIds = dedupe(all.filter((d) => d.kind === 'videoinput').map((d) => d.deviceId));
  }

  if (videoDeviceIds.length === 0) {
    localTracks.push(await createLocalVideoTrack());
  } else {
    for (const deviceId of videoDeviceIds) {
      localTracks.push(await createLocalVideoTrack({ deviceId }));
    }
  }

  // Audio tracks (one per selected microphone)
  if (audioTrackCount <= 0) {
    // publish no audio
  } else {
    // We publish ONLY ONE audio track at a time: patient OR stetho.
    // Device roles are defined in settings (patientMicId / stethoMicId).
    // Fallback: use first checked mic.
    const roleSel = ensureAudioSelectionIsValid();
    let deviceId = roleSel.patientMicId;
    if (!deviceId) {
      const selected = dedupe(selectedAudioIds);
      deviceId = selected[0] || '';
    }
    localTracks.push(deviceId ? await createLocalAudioTrack({ deviceId }) : await createLocalAudioTrack());
    activeAudioMode = 'patient';
  }

  setStatus('Connecting to room...');
  room = new Room({ adaptiveStream: true, dynacast: true, autoSubscribe: true });

  room.on(RoomEvent.Connected, () => {
    roomInfo.textContent = `Connected to ${roomName} as ${identity}`;
  });

  room.on(RoomEvent.Disconnected, () => {
    roomInfo.textContent = 'Not connected';
  });

  // Register listeners BEFORE connect() to not miss early subscriptions
  room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
    attachRemoteTrack(track, pub, participant);
  });

  room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
    detachRemoteTrack(track, pub, participant);
  });

  room.on(RoomEvent.ParticipantDisconnected, (participant) => {
    if (!participant?.identity) return;
    const nodes = remoteGrid.querySelectorAll(`[data-id^="${participant.identity}:"]`);
    nodes.forEach((n) => n.remove());
  });

  await room.connect(url, token);

  if (getRole() === 'cart') {
    room.on(RoomEvent.DataReceived, async (payload, participant) => {
      try {
        const msg = new TextDecoder().decode(payload);
        const data = JSON.parse(msg);
        if (data?.type !== 'audio_mode') return;
        if (data?.mode !== 'patient' && data?.mode !== 'stetho') return;
        await setPublishedAudioMode(data.mode);
      } catch {
        // ignore
      }
    });
  }

  // Hydrate already-present tracks (participants already in room)
  try {
    const remotes = Array.from(room.remoteParticipants?.values?.() || []);
    const summary = remotes.map((p) => ({
      identity: p.identity,
      tracks: Array.from(p.trackPublications?.values?.() || []).map((tp) => ({
        sid: tp.trackSid || tp.sid,
        kind: tp.kind,
        source: tp.source,
        subscribed: tp.isSubscribed,
      })),
    }));
    setDebug({ remoteParticipants: summary });

    for (const p of remotes) {
      for (const tp of Array.from(p.trackPublications?.values?.() || [])) {
        if (tp?.isSubscribed && tp.track) {
          attachRemoteTrack(tp.track, tp, p);
        }
      }
    }
  } catch (e) {
    setDebug({ error: e?.message || String(e) });
  }

  setStatus('Publishing tracks...');
  const published = [];
  for (const t of localTracks) {
    // best-effort: label track so we can see which device it came from
    const mediaTrack = t?.mediaStreamTrack;
    const deviceId = mediaTrack?.getSettings?.().deviceId;
    const label = deviceId ? (deviceLabelMap.get(deviceId) || deviceId) : (mediaTrack?.label || '');
    const kind = mediaTrack?.kind || 'track';
    const name = kind === 'audio' ? `audio:${activeAudioMode}` : `${kind}:${label || 'default'}`;

    const pub = await room.localParticipant.publishTrack(t, { name });
    published.push({ kind, name, deviceId: deviceId || null, sid: pub?.trackSid || pub?.sid || null });

    if (kind === 'audio') {
      publishedAudio = { track: t, pub };
    }
  }

  setDebug({ publishedTracks: published });

  // Render local published cameras
  renderLocalVideos();

  homeView.classList.add('hidden');
  callView.classList.remove('hidden');

  leaveBtn.disabled = false;
  setStatus('Joined');
}

async function leaveRoom() {
  try {
    if (room) {
      room.disconnect();
      room = null;
    }
  } finally {
    for (const t of localTracks) {
      try { t.stop(); } catch {}
    }
    localTracks = [];

    if (localVideos) localVideos.innerHTML = '';

    leaveBtn.disabled = true;
    remoteGrid.innerHTML = '';
    callView.classList.add('hidden');
    homeView.classList.remove('hidden');
    setStatus('Left');
  }
}

refreshDevicesBtn.addEventListener('click', async () => {
  try {
    setStatus('Refreshing devices...');
    await ensureDeviceLabels();
    const d = await listDevices();
    setDebug(d);
    setStatus('Devices ready');
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

function openSettings() {
  settingsBackdrop.classList.remove('hidden');
  settingsModal.classList.remove('hidden');
}

function closeSettings() {
  settingsBackdrop.classList.add('hidden');
  settingsModal.classList.add('hidden');
}

function collectChecked() {
  const cameras = Array.from(cameraList.querySelectorAll('input[type="checkbox"][data-kind="camera"]'))
    .filter((i) => i.checked)
    .map((i) => i.getAttribute('data-id'))
    .filter(Boolean);
  const mics = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
    .filter((i) => i.checked)
    .map((i) => i.getAttribute('data-id'))
    .filter(Boolean);
  return { cameras, mics };
}

openSettingsBtn.addEventListener('click', () => openSettings());
closeSettingsBtn.addEventListener('click', () => closeSettings());
cancelSettingsBtn.addEventListener('click', () => closeSettings());
settingsBackdrop.addEventListener('click', () => closeSettings());

saveSettingsBtn.addEventListener('click', async () => {
  try {
    const sel = collectChecked();
    saveSelection(sel);
    ensureAudioSelectionIsValid();
    setStatus('Settings saved');
    closeSettings();
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

startCallBtn.addEventListener('click', async () => {
  try {
    await joinRoom();

    if (toggleStethoBtn) {
      if (getRole() === 'doctor') {
        toggleStethoBtn.classList.remove('hidden');
        toggleStethoBtn.textContent = 'Stetho: off';
      } else {
        toggleStethoBtn.classList.add('hidden');
      }
    }
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

toggleMicBtn.addEventListener('click', async () => {
  micEnabled = !micEnabled;
  if (publishedAudio?.track) {
    if (micEnabled) await publishedAudio.track.unmute();
    else await publishedAudio.track.mute();
  }
  toggleMicBtn.textContent = `Mic: ${micEnabled ? 'on' : 'off'}`;
});

toggleCamBtn.addEventListener('click', async () => {
  camEnabled = !camEnabled;
  for (const t of localTracks) {
    const kind = t?.mediaStreamTrack?.kind;
    if (kind === 'video') {
      if (camEnabled) await t.unmute();
      else await t.mute();
    }
  }
  toggleCamBtn.textContent = `Cam: ${camEnabled ? 'on' : 'off'}`;
});

leaveBtn.addEventListener('click', async () => {
  try {
    await leaveRoom();
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

if (toggleStethoBtn) {
  toggleStethoBtn.addEventListener('click', async () => {
    try {
      if (!room) return;
      const role = getRole();
      if (role === 'doctor') {
        activeAudioMode = activeAudioMode === 'stetho' ? 'patient' : 'stetho';
        const msg = JSON.stringify({ type: 'audio_mode', mode: activeAudioMode });
        await room.localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true });
        toggleStethoBtn.textContent = `Stetho: ${activeAudioMode === 'stetho' ? 'on' : 'off'}`;
      } else {
        const next = activeAudioMode === 'stetho' ? 'patient' : 'stetho';
        await setPublishedAudioMode(next);
        toggleStethoBtn.textContent = `Stetho: ${activeAudioMode === 'stetho' ? 'on' : 'off'}`;
      }
    } catch (e) {
      setStatus(e?.message || String(e));
    }
  });
}

// init defaults
identityBadge.textContent = String(desktopConfig?.identity || '');

audioTrackCountEl.textContent = String(
  Number.isFinite(Number(desktopConfig?.audioTrackCount)) ? Number(desktopConfig.audioTrackCount) : 2
);

callView.classList.add('hidden');
homeView.classList.remove('hidden');

(async () => {
  try {
    setStatus('Init...');
    await ensureDeviceLabels();
    const d = await listDevices();
    setDebug(d);
    setStatus('Ready');
  } catch (e) {
    setStatus(e?.message || String(e));
  }
})();

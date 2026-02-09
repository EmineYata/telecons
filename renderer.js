// import {
//   Room,
//   RoomEvent,
//   createLocalAudioTrack,
//   createLocalVideoTrack,
//   LocalAudioTrack,
// } from 'https://unpkg.com/livekit-client@2.7.2/dist/livekit-client.esm.mjs';

// import { desktopConfig } from './config.js';

// const statusEl = document.getElementById('status');
// const debugEl = document.getElementById('debug');
// const identityBadge = document.getElementById('identityBadge');
// const roomInfo = document.getElementById('roomInfo');

// const homeView = document.getElementById('homeView');
// const callView = document.getElementById('callView');
// const remoteGrid = document.getElementById('remoteGrid');

// const openSettingsBtn = document.getElementById('openSettings');
// const settingsModal = document.getElementById('settingsModal');
// const settingsBackdrop = document.getElementById('settingsBackdrop');
// const closeSettingsBtn = document.getElementById('closeSettings');
// const cancelSettingsBtn = document.getElementById('cancelSettings');
// const saveSettingsBtn = document.getElementById('saveSettings');
// const cameraList = document.getElementById('cameraList');
// const micList = document.getElementById('micList');
// const audioTrackCountEl = document.getElementById('audioTrackCount');
// const patientMicSelect = document.getElementById('patientMicSelect');
// const stethoMicSelect = document.getElementById('stethoMicSelect');
// const audioConfigStatus = document.getElementById('audioConfigStatus');
// const stethoPresetSelect = document.getElementById('stethoPreset');
// const stethoNotchSelect = document.getElementById('stethoNotch');

// const startCallBtn = document.getElementById('startCall');
// const toggleMicBtn = document.getElementById('toggleMic');
// const toggleCamBtn = document.getElementById('toggleCam');
// const toggleStethoBtn = document.getElementById('toggleStetho');


// const refreshDevicesBtn = document.getElementById('refreshDevices');
// const resetDevicesBtn = document.getElementById('resetDevices');
// const leaveBtn = document.getElementById('leave');

// const localVideos = document.getElementById('localVideos');

// let previewStream = null;
// let room = null;
// let localTracks = [];
// let micEnabled = true;
// let camEnabled = true;
// let activeAudioMode = 'patient';
// let publishedAudio = null;

// const STORAGE_KEY = 'desktopversion.deviceSelection.v1';

// const AUDIO_SELECTION_KEY = 'desktopversion.audioSelection.v1';
// const STETHO_PRESET_KEY = 'desktopversion.stethoPreset.v1';

// let stethoAudioContext = null;
// let stethoGraph = null;
// let stethoRawTrack = null;
// let stethoProcessedTrack = null;
// let stethoLocalAudioTrack = null;

// function loadStethoPreset() {
//   try {
//     const raw = localStorage.getItem(STETHO_PRESET_KEY);
//     if (!raw) return { preset: 'heart', notchHz: 50 };
//     const p = JSON.parse(raw);
//     const preset = ['heart', 'lung', 'wide'].includes(p?.preset) ? p.preset : 'heart';
//     const notchHz = Number(p?.notchHz) === 60 ? 60 : 50;
//     return { preset, notchHz };
//   } catch {
//     return { preset: 'heart', notchHz: 50 };
//   }
// }

// function saveStethoPreset(v) {
//   localStorage.setItem(STETHO_PRESET_KEY, JSON.stringify(v));
// }

// function getPresetParams() {
//   const { preset, notchHz } = loadStethoPreset();
//   if (preset === 'lung') {
//     return {
//       preset,
//       notchHz,
//       hp: 100,
//       lp: 1800,
//       lowShelfHz: 120,
//       lowShelfGainDb: 6,
//       compThreshold: -34,
//       compKnee: 18,
//       compRatio: 4,
//       compAttack: 0.004,
//       compRelease: 0.22,
//       gainDb: 12,
//     };
//   }
//   if (preset === 'wide') {
//     return {
//       preset,
//       notchHz,
//       hp: 25,
//       lp: 2200,
//       lowShelfHz: 90,
//       lowShelfGainDb: 4,
//       compThreshold: -36,
//       compKnee: 20,
//       compRatio: 3,
//       compAttack: 0.005,
//       compRelease: 0.25,
//       gainDb: 6,
//     };
//   }
//   return {
//     preset: 'heart',
//     notchHz,
//     hp: 25,
//     lp: 220,
//     lowShelfHz: 80,
//     lowShelfGainDb: 10,
//     compThreshold: -38,
//     compKnee: 22,
//     compRatio: 6,
//     compAttack: 0.003,
//     compRelease: 0.28,
//     gainDb: 16,
//   };
// }

// function applyStethoPresetToGraph() {
//   if (!stethoGraph) return;
//   const p = getPresetParams();
//   stethoGraph.hp.frequency.value = p.hp;
//   stethoGraph.lp.frequency.value = p.lp;
//   stethoGraph.notch.frequency.value = p.notchHz;
//   stethoGraph.notch2.frequency.value = p.notchHz * 2;
//   if (stethoGraph.lowShelf) {
//     stethoGraph.lowShelf.frequency.value = p.lowShelfHz;
//     stethoGraph.lowShelf.gain.value = p.lowShelfGainDb;
//   }
//   if (stethoGraph.comp) {
//     stethoGraph.comp.threshold.value = p.compThreshold;
//     stethoGraph.comp.knee.value = p.compKnee;
//     stethoGraph.comp.ratio.value = p.compRatio;
//     stethoGraph.comp.attack.value = p.compAttack;
//     stethoGraph.comp.release.value = p.compRelease;
//   }
//   stethoGraph.gain.gain.value = Math.pow(10, p.gainDb / 20);
// }

// async function buildProcessedStethoTrack(deviceId) {
//   if (stethoLocalAudioTrack) return stethoLocalAudioTrack;

//   const stream = await navigator.mediaDevices.getUserMedia({
//     audio: deviceId ? {
//       deviceId: { exact: deviceId },
//       echoCancellation: false,
//       noiseSuppression: false,
//       autoGainControl: false,
//       channelCount: 1,
//     } : {
//       echoCancellation: false,
//       noiseSuppression: false,
//       autoGainControl: false,
//       channelCount: 1,
//     },
//     video: false,
//   });
//   stethoRawTrack = stream.getAudioTracks()[0] || null;
//   if (!stethoRawTrack) throw new Error('No stetho audio track');

//   stethoAudioContext = new (window.AudioContext || window.webkitAudioContext)();
//   try {
//     if (stethoAudioContext.state === 'suspended') await stethoAudioContext.resume();
//   } catch {}
//   const src = stethoAudioContext.createMediaStreamSource(new MediaStream([stethoRawTrack]));
//   const hp = stethoAudioContext.createBiquadFilter();
//   hp.type = 'highpass';
//   const lp = stethoAudioContext.createBiquadFilter();
//   lp.type = 'lowpass';
//   const notch = stethoAudioContext.createBiquadFilter();
//   notch.type = 'notch';
//   const notch2 = stethoAudioContext.createBiquadFilter();
//   notch2.type = 'notch';
//   const lowShelf = stethoAudioContext.createBiquadFilter();
//   lowShelf.type = 'lowshelf';
//   const comp = stethoAudioContext.createDynamicsCompressor();
//   const gain = stethoAudioContext.createGain();
//   const dest = stethoAudioContext.createMediaStreamDestination();

//   src.connect(hp);
//   hp.connect(notch);
//   notch.connect(notch2);
//   notch2.connect(lp);
//   lp.connect(lowShelf);
//   lowShelf.connect(comp);
//   comp.connect(gain);
//   gain.connect(dest);

//   stethoGraph = { src, hp, lp, notch, notch2, lowShelf, comp, gain, dest };
//   applyStethoPresetToGraph();

//   stethoProcessedTrack = dest.stream.getAudioTracks()[0] || null;
//   if (!stethoProcessedTrack) throw new Error('No processed stetho track');

//   stethoLocalAudioTrack = new LocalAudioTrack(stethoProcessedTrack);
//   return stethoLocalAudioTrack;
// }

// async function teardownStethoProcessing() {
//   try {
//     if (stethoLocalAudioTrack) {
//       try { stethoLocalAudioTrack.stop(); } catch {}
//     }
//   } finally {
//     stethoLocalAudioTrack = null;
//   }

//   try {
//     if (stethoProcessedTrack) {
//       try { stethoProcessedTrack.stop(); } catch {}
//     }
//   } finally {
//     stethoProcessedTrack = null;
//   }

//   try {
//     if (stethoRawTrack) {
//       try { stethoRawTrack.stop(); } catch {}
//     }
//   } finally {
//     stethoRawTrack = null;
//   }

//   try {
//     if (stethoAudioContext) {
//       try { await stethoAudioContext.close(); } catch {}
//     }
//   } finally {
//     stethoAudioContext = null;
//     stethoGraph = null;
//   }
// }

// function loadAudioSelection() {
//   try {
//     const raw = localStorage.getItem(AUDIO_SELECTION_KEY);
//     if (!raw) return { patientMicId: '', stethoMicId: '' };
//     const parsed = JSON.parse(raw);
//     return {
//       patientMicId: String(parsed?.patientMicId || ''),
//       stethoMicId: String(parsed?.stethoMicId || ''),
//     };
//   } catch {
//     return { patientMicId: '', stethoMicId: '' };
//   }
// }

// function hydrateStethoPresetUi() {
//   if (!stethoPresetSelect || !stethoNotchSelect) return;
//   const p = loadStethoPreset();
//   stethoPresetSelect.value = p.preset;
//   stethoNotchSelect.value = String(p.notchHz);

//   stethoPresetSelect.onchange = () => {
//     const cur = loadStethoPreset();
//     const preset = ['heart', 'lung', 'wide'].includes(String(stethoPresetSelect.value))
//       ? String(stethoPresetSelect.value)
//       : cur.preset;
//     saveStethoPreset({ preset, notchHz: cur.notchHz });
//     applyStethoPresetToGraph();
//   };

//   stethoNotchSelect.onchange = () => {
//     const cur = loadStethoPreset();
//     const notchHz = Number(stethoNotchSelect.value) === 60 ? 60 : 50;
//     saveStethoPreset({ preset: cur.preset, notchHz });
//     applyStethoPresetToGraph();
//   };
// }

// function saveAudioSelection(sel) {
//   localStorage.setItem(AUDIO_SELECTION_KEY, JSON.stringify(sel));
// }

// function setInlineAudioStatus(message, isError) {
//   if (!audioConfigStatus) return;
//   const msg = String(message || '').trim();
//   if (!msg) {
//     audioConfigStatus.classList.add('hidden');
//     audioConfigStatus.classList.remove('error');
//     audioConfigStatus.textContent = '';
//     return;
//   }
//   audioConfigStatus.textContent = msg;
//   audioConfigStatus.classList.remove('hidden');
//   if (isError) audioConfigStatus.classList.add('error');
//   else audioConfigStatus.classList.remove('error');
// }

// function findFirstAvailableMicId(excludeId = '') {
//   const mics = Array.from(micList?.querySelectorAll?.('input[type="checkbox"][data-kind="mic"]') || [])
//     .map((i) => i.getAttribute('data-id'))
//     .filter(Boolean);
//   for (const id of mics) {
//     if (excludeId && id === excludeId) continue;
//     return id;
//   }
//   return '';
// }

// function ensureAudioSelectionIsValid() {
//   const sel = loadAudioSelection();
//   const checkedMicIds = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
//     .filter((i) => i.checked)
//     .map((i) => i.getAttribute('data-id'))
//     .filter(Boolean);

//   let patientMicId = sel.patientMicId;
//   let stethoMicId = sel.stethoMicId;

//   if (!patientMicId || !checkedMicIds.includes(patientMicId)) {
//     patientMicId = checkedMicIds[0] || '';
//   }
//   if (!stethoMicId || !checkedMicIds.includes(stethoMicId) || stethoMicId === patientMicId) {
//     stethoMicId = checkedMicIds.find((id) => id !== patientMicId) || '';
//   }

//   const next = { patientMicId, stethoMicId };
//   saveAudioSelection(next);

//   if (checkedMicIds.length === 0) {
//     setInlineAudioStatus('Aucun micro sélectionné. Coche au moins 1 micro.', true);
//   } else if (!next.patientMicId) {
//     setInlineAudioStatus('Choisis un Micro Patient.', true);
//   } else if (!next.stethoMicId) {
//     setInlineAudioStatus('Choisis un Micro Stetho (optionnel si tu n\'envoies qu\'un audio).', false);
//   } else {
//     setInlineAudioStatus(`Patient + Stetho configurés.`, false);
//   }

//   return next;
// }

// function renderAudioRoleDropdowns() {
//   if (!patientMicSelect || !stethoMicSelect) return;

//   const checkedMicIds = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
//     .filter((i) => i.checked)
//     .map((i) => i.getAttribute('data-id'))
//     .filter(Boolean);

//   const current = ensureAudioSelectionIsValid();

//   const buildOptions = (selectEl, selectedId, otherId) => {
//     selectEl.innerHTML = '';

//     const empty = document.createElement('option');
//     empty.value = '';
//     empty.textContent = '—';
//     selectEl.appendChild(empty);

//     for (const id of checkedMicIds) {
//       const opt = document.createElement('option');
//       opt.value = id;
//       const labelEl = micList.querySelector(`input[data-kind="mic"][data-id="${CSS.escape(id)}"]`)?.closest('label');
//       opt.textContent = labelEl?.querySelector('span')?.textContent || id;
//       if (id === otherId) opt.disabled = true;
//       selectEl.appendChild(opt);
//     }

//     selectEl.value = selectedId && checkedMicIds.includes(selectedId) ? selectedId : '';
//   };

//   buildOptions(patientMicSelect, current.patientMicId, current.stethoMicId);
//   buildOptions(stethoMicSelect, current.stethoMicId, current.patientMicId);

//   patientMicSelect.disabled = checkedMicIds.length === 0;
//   stethoMicSelect.disabled = checkedMicIds.length === 0;

//   patientMicSelect.onchange = () => {
//     const sel = loadAudioSelection();
//     sel.patientMicId = String(patientMicSelect.value || '');
//     if (sel.stethoMicId === sel.patientMicId) sel.stethoMicId = '';
//     saveAudioSelection(sel);
//     ensureAudioSelectionIsValid();
//     renderAudioRoleDropdowns();
//     renderAudioRoleSelectors();
//   };

//   stethoMicSelect.onchange = () => {
//     const sel = loadAudioSelection();
//     sel.stethoMicId = String(stethoMicSelect.value || '');
//     if (sel.patientMicId === sel.stethoMicId) sel.patientMicId = '';
//     saveAudioSelection(sel);
//     ensureAudioSelectionIsValid();
//     renderAudioRoleDropdowns();
//     renderAudioRoleSelectors();
//   };

//   if (checkedMicIds.length === 1) {
//     setInlineAudioStatus('Un seul micro coché: Patient OK, Stetho désactivé.', false);
//   }
// }

// function renderAudioRoleSelectors() {
//   const current = loadAudioSelection();
//   const items = Array.from(micList.querySelectorAll('.device-item'));
//   for (const row of items) {
//     const input = row.querySelector('input[type="checkbox"][data-kind="mic"]');
//     if (!input) continue;
//     const deviceId = input.getAttribute('data-id');

//     let role = row.querySelector('select[data-role="audio"]');
//     if (!role) {
//       role = document.createElement('select');
//       role.setAttribute('data-role', 'audio');
//       role.style.marginLeft = '8px';
//       role.innerHTML = `
//         <option value="none">-</option>
//         <option value="patient">Patient</option>
//         <option value="stetho">Stetho</option>
//       `;
//       row.appendChild(role);
//     }

//     if (deviceId && deviceId === current.patientMicId) role.value = 'patient';
//     else if (deviceId && deviceId === current.stethoMicId) role.value = 'stetho';
//     else role.value = 'none';

//     role.disabled = !input.checked;

//     role.onchange = () => {
//       const sel = loadAudioSelection();
//       if (role.value === 'patient') {
//         sel.patientMicId = deviceId;
//         if (sel.stethoMicId === deviceId) sel.stethoMicId = '';
//       } else if (role.value === 'stetho') {
//         sel.stethoMicId = deviceId;
//         if (sel.patientMicId === deviceId) sel.patientMicId = '';
//       } else {
//         if (sel.patientMicId === deviceId) sel.patientMicId = '';
//         if (sel.stethoMicId === deviceId) sel.stethoMicId = '';
//       }

//       saveAudioSelection(sel);
//       ensureAudioSelectionIsValid();
//       renderAudioRoleSelectors();
//     };
//   }
// }

// async function setPublishedAudioMode(mode) {
//   const m = mode === 'stetho' ? 'stetho' : 'patient';
//   activeAudioMode = m;

//   if (!room?.localParticipant) return;

//   const sel = loadAudioSelection();
//   const deviceId = m === 'stetho' ? sel.stethoMicId : sel.patientMicId;

//   if (publishedAudio?.track) {
//     try {
//       room.localParticipant.unpublishTrack(publishedAudio.track);
//     } catch {}
//     try {
//       publishedAudio.track.stop();
//     } catch {}
//     publishedAudio = null;
//   }

//   if (!micEnabled) {
//     if (toggleMicBtn) toggleMicBtn.textContent = 'Mic: off';
//     return;
//   }

//   const t = deviceId ? await createLocalAudioTrack({ deviceId }) : await createLocalAudioTrack();
//   if (t?.mediaStreamTrack?.kind === 'audio') {
//     const name = `audio:${m}`;
//     const pub = await room.localParticipant.publishTrack(t, { name });
//     publishedAudio = { track: t, pub };
//   }
// }

// function getRole() {
//   const v = String(desktopConfig?.role || '').trim().toLowerCase();
//   if (v === 'doctor' || v === 'medecin') return 'doctor';
//   if (v === 'cart' || v === 'chariot') return 'cart';
//   return 'cart';
// }

// function loadSelection() {
//   try {
//     const raw = localStorage.getItem(STORAGE_KEY);
//     if (!raw) return { cameras: [], mics: [] };
//     const parsed = JSON.parse(raw);
//     return {
//       cameras: Array.isArray(parsed?.cameras) ? parsed.cameras : [],
//       mics: Array.isArray(parsed?.mics) ? parsed.mics : [],
//     };
//   } catch {
//     return { cameras: [], mics: [] };
//   }
// }

// function saveSelection(sel) {
//   localStorage.setItem(STORAGE_KEY, JSON.stringify(sel));
// }

// function getSelectedValues(selectEl) {
//   return Array.from(selectEl.selectedOptions || []).map((o) => o.value).filter(Boolean);
// }

// function setStatus(msg) {
//   statusEl.textContent = msg;
// }

// function setDebug(obj) {
//   debugEl.textContent = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
// }

// function attachRemoteTrack(track, pub, participant) {
//   if (!participant || !track) return;
//   const sid = pub?.trackSid || pub?.sid || track?.sid || '';
//   const id = `${participant.identity}:${sid || Math.random()}`;

//   if (track.kind === 'video') {
//     const wrap = document.createElement('div');
//     wrap.className = 'tile';
//     wrap.dataset.id = id;
//     const v = track.attach();
//     v.autoplay = true;
//     v.playsInline = true;
//     wrap.appendChild(v);
//     const lab = document.createElement('div');
//     lab.className = 'label';
//     lab.textContent = participant.identity;
//     wrap.appendChild(lab);
//     remoteGrid.appendChild(wrap);
//   }

//   if (track.kind === 'audio') {
//     const a = track.attach();
//     a.autoplay = true;
//     a.controls = true;
//     a.dataset.id = id;
//     remoteGrid.appendChild(a);
//   }
// }

// function detachRemoteTrack(track, pub, participant) {
//   const sid = pub?.trackSid || pub?.sid || track?.sid;
//   if (!sid || !participant?.identity) return;
//   const nodes = remoteGrid.querySelectorAll(`[data-id^="${participant.identity}:${sid}"]`);
//   nodes.forEach((n) => n.remove());
// }

// function normalizeBaseUrl(s) {
//   const v = String(s || '').trim();
//   if (!v) return '';
//   try {
//     const u = new URL(v);
//     return u.origin;
//   } catch {
//     return v.endsWith('/') ? v.slice(0, -1) : v;
//   }
// }

// function dedupe(arr) {
//   return Array.from(new Set((arr || []).filter(Boolean)));
// }

// function labelMatchesAny(label, patterns) {
//   const l = String(label || '').toLowerCase();
//   const ps = Array.isArray(patterns) ? patterns : [];
//   return ps.some((p) => l.includes(String(p || '').toLowerCase()));
// }

// async function buildDeviceLabelMap() {
//   const devices = await navigator.mediaDevices.enumerateDevices();
//   const map = new Map();
//   for (const d of devices) {
//     if (d?.deviceId) map.set(d.deviceId, d.label || d.deviceId);
//   }
//   return map;
// }

// async function listDevices() {
//   const devices = await navigator.mediaDevices.enumerateDevices();
//   const cams = devices.filter((d) => d.kind === 'videoinput');
//   const mics = devices.filter((d) => d.kind === 'audioinput');

//   const selection = loadSelection();

//   cameraList.innerHTML = '';
//   micList.innerHTML = '';

//   for (const cam of cams) {
//     const id = cam.deviceId;
//     const checked = selection.cameras.includes(id) || labelMatchesAny(cam.label, desktopConfig?.preferredCameraLabels);
//     const row = document.createElement('div');
//     row.className = 'device-item';
//     row.innerHTML = `
//       <label>
//         <input type="checkbox" data-kind="camera" data-id="${id}" ${checked ? 'checked' : ''} />
//         <span>${cam.label || 'Camera'}</span>
//       </label>
//     `;
//     cameraList.appendChild(row);
//   }

//   for (const mic of mics) {
//     const id = mic.deviceId;
//     const checked = selection.mics.includes(id) || labelMatchesAny(mic.label, desktopConfig?.preferredMicLabels);
//     const row = document.createElement('div');
//     row.className = 'device-item';
//     row.innerHTML = `
//       <label>
//         <input type="checkbox" data-kind="mic" data-id="${id}" ${checked ? 'checked' : ''} />
//         <span>${mic.label || 'Micro'}</span>
//       </label>
//     `;
//     micList.appendChild(row);
//   }

//   ensureAudioSelectionIsValid();
//   renderAudioRoleDropdowns();
//   hydrateStethoPresetUi();
//   renderAudioRoleSelectors();

//   return { cams, mics };
// }

// async function ensureDeviceLabels() {
//   // Needed to get device labels on some platforms
//   const tmp = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
//   tmp.getTracks().forEach((t) => t.stop());
// }

// async function startPreview() {
//   await stopPreview();

//   const selection = loadSelection();
//   const videoDeviceId = selection.cameras[0] || undefined;
//   const audioDeviceId = selection.mics[0] || undefined;

//   const constraints = {
//     video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
//     audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
//   };

//   previewStream = await navigator.mediaDevices.getUserMedia(constraints);
//   setStatus('Preview started');
// }

// async function stopPreview() {
//   if (previewStream) {
//     previewStream.getTracks().forEach((t) => t.stop());
//     previewStream = null;
//   }
// }

// function renderLocalVideos() {
//   if (!localVideos) return;
//   localVideos.innerHTML = '';

//   const videos = localTracks.filter((t) => t?.mediaStreamTrack?.kind === 'video');
//   for (const t of videos) {
//     const el = t.attach();
//     el.autoplay = true;
//     el.playsInline = true;
//     el.muted = true;
//     localVideos.appendChild(el);
//   }
// }

// async function fetchToken({ serverBase, roomName, identity }) {
//   const url = `${serverBase}/api/token?roomName=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}&publish=1&subscribe=1`;
//   const res = await fetch(url);
//   const data = await res.json().catch(() => ({}));
//   if (!res.ok) {
//     const msg = data?.error?.message || `Token error (${res.status})`;
//     throw new Error(msg);
//   }
//   if (!data?.url || !data?.token) {
//     throw new Error(`Invalid token response: ${JSON.stringify(data)}`);
//   }
//   return { url: data.url, token: data.token };
// }

// async function joinRoom() {
//   const serverBase = normalizeBaseUrl(desktopConfig?.serverBaseUrl);
//   const roomName = String(desktopConfig?.roomName || '').trim();
//   const identity = String(desktopConfig?.identity || '').trim();

//   if (!serverBase) throw new Error('Server base URL requis');
//   if (!roomName) throw new Error('Room name requis');
//   if (!identity) throw new Error('Identity requis');

//   identityBadge.textContent = identity;

//   // Avoid holding devices twice (preview + published tracks)
//   await stopPreview();

//   setStatus('Getting token...');
//   const { url, token } = await fetchToken({ serverBase, roomName, identity });

//   setStatus('Creating local tracks...');
//   const selection = loadSelection();
//   const selectedVideoIds = selection.cameras;
//   const selectedAudioIds = selection.mics;

//   const deviceLabelMap = await buildDeviceLabelMap();

//   const publishAllCameras = desktopConfig?.publishAllCameras === true;
//   const audioTrackCount = Number.isFinite(Number(desktopConfig?.audioTrackCount))
//     ? Math.max(0, Math.floor(Number(desktopConfig.audioTrackCount)))
//     : 2;

//   localTracks = [];

//   // Video tracks (one per selected camera)
//   let videoDeviceIds = dedupe(selectedVideoIds);
//   if (publishAllCameras) {
//     const all = await navigator.mediaDevices.enumerateDevices();
//     videoDeviceIds = dedupe(all.filter((d) => d.kind === 'videoinput').map((d) => d.deviceId));
//   }

//   if (videoDeviceIds.length === 0) {
//     localTracks.push(await createLocalVideoTrack());
//   } else {
//     for (const deviceId of videoDeviceIds) {
//       localTracks.push(await createLocalVideoTrack({ deviceId }));
//     }
//   }

//   // Audio tracks (one per selected microphone)
//   if (audioTrackCount <= 0) {
//     // publish no audio
//   } else {
//     // Publish TWO audio tracks (patient + stetho) if configured.
//     // The doctor can choose which one to listen to.
//     const roleSel = ensureAudioSelectionIsValid();
//     const patientId = roleSel.patientMicId || '';
//     const stethoId = roleSel.stethoMicId || '';

//     if (patientId) {
//       localTracks.push(await createLocalAudioTrack({ deviceId: patientId }));
//     } else {
//       localTracks.push(await createLocalAudioTrack());
//     }

//     if (audioTrackCount >= 2) {
//       if (stethoId && stethoId !== patientId) {
//         localTracks.push(await createLocalAudioTrack({
//           deviceId: stethoId,
//           echoCancellation: false,
//           noiseSuppression: false,
//           autoGainControl: false,
//           channelCount: 1,
//         }));
//       }
//     }
//   }

//   setStatus('Connecting to room...');
//   room = new Room({ adaptiveStream: true, dynacast: true, autoSubscribe: true });

//   room.on(RoomEvent.Connected, () => {
//     roomInfo.textContent = `Connected to ${roomName} as ${identity}`;
//   });

//   room.on(RoomEvent.Disconnected, () => {
//     roomInfo.textContent = 'Not connected';
//   });

//   // Register listeners BEFORE connect() to not miss early subscriptions
//   room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
//     attachRemoteTrack(track, pub, participant);
//   });

//   room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
//     detachRemoteTrack(track, pub, participant);
//   });

//   room.on(RoomEvent.ParticipantDisconnected, (participant) => {
//     if (!participant?.identity) return;
//     const nodes = remoteGrid.querySelectorAll(`[data-id^="${participant.identity}:"]`);
//     nodes.forEach((n) => n.remove());
//   });

//   await room.connect(url, token);

//   // (audio switching handled on doctor side by muting/unmuting received audio tracks)

//   // Hydrate already-present tracks (participants already in room)
//   try {
//     const remotes = Array.from(room.remoteParticipants?.values?.() || []);
//     const summary = remotes.map((p) => ({
//       identity: p.identity,
//       tracks: Array.from(p.trackPublications?.values?.() || []).map((tp) => ({
//         sid: tp.trackSid || tp.sid,
//         kind: tp.kind,
//         source: tp.source,
//         subscribed: tp.isSubscribed,
//       })),
//     }));
//     setDebug({ remoteParticipants: summary });

//     for (const p of remotes) {
//       for (const tp of Array.from(p.trackPublications?.values?.() || [])) {
//         if (tp?.isSubscribed && tp.track) {
//           attachRemoteTrack(tp.track, tp, p);
//         }
//       }
//     }
//   } catch (e) {
//     setDebug({ error: e?.message || String(e) });
//   }

//   setStatus('Publishing tracks...');
//   const published = [];
//   for (const t of localTracks) {
//     // best-effort: label track so we can see which device it came from
//     const mediaTrack = t?.mediaStreamTrack;
//     const deviceId = mediaTrack?.getSettings?.().deviceId;
//     const label = deviceId ? (deviceLabelMap.get(deviceId) || deviceId) : (mediaTrack?.label || '');
//     const kind = mediaTrack?.kind || 'track';

//     let name = `${kind}:${label || 'default'}`;
//     if (kind === 'audio') {
//       const audioSel = loadAudioSelection();
//       const did = deviceId || '';
//       if (t === stethoLocalAudioTrack) name = 'audio:stetho';
//       else if (did && audioSel.patientMicId && did === audioSel.patientMicId) name = 'audio:patient';
//       else if (did && audioSel.stethoMicId && did === audioSel.stethoMicId) name = 'audio:stetho';
//       else if (!published.some((p) => p.kind === 'audio')) name = 'audio:patient';
//       else name = 'audio:stetho';
//     }

//     const pub = await room.localParticipant.publishTrack(t, { name });
//     published.push({ kind, name, deviceId: deviceId || null, sid: pub?.trackSid || pub?.sid || null });
//   }

//   setDebug({ publishedTracks: published });

//   // Render local published cameras
//   renderLocalVideos();

//   homeView.classList.add('hidden');
//   callView.classList.remove('hidden');

//   leaveBtn.disabled = false;
//   setStatus('Joined');
// }

// async function leaveRoom() {
//   try {
//     if (room) {
//       room.disconnect();
//       room = null;
//     }
//   } finally {
//     for (const t of localTracks) {
//       try { t.stop(); } catch {}
//     }
//     localTracks = [];

//     if (localVideos) localVideos.innerHTML = '';

//     leaveBtn.disabled = true;
//     remoteGrid.innerHTML = '';
//     callView.classList.add('hidden');
//     homeView.classList.remove('hidden');
//     setStatus('Left');
//   }
// }

// refreshDevicesBtn.addEventListener('click', async () => {
//   try {
//     setStatus('Refreshing devices...');
//     await ensureDeviceLabels();
//     const d = await listDevices();
//     setDebug(d);
//     setStatus('Devices ready');
//   } catch (e) {
//     setStatus(e?.message || String(e));
//   }
// });

// if (resetDevicesBtn) {
//   resetDevicesBtn.addEventListener('click', async () => {
//     try {
//       resetSelections();
//       await ensureDeviceLabels();
//       await listDevices();
//       setStatus('Selections reset');
//     } catch (e) {
//       setStatus(e?.message || String(e));
//     }
//   });
// }

// function openSettings() {
//   settingsBackdrop.classList.remove('hidden');
//   settingsModal.classList.remove('hidden');
// }

// function closeSettings() {
//   settingsBackdrop.classList.add('hidden');
//   settingsModal.classList.add('hidden');
// }

// function collectChecked() {
//   const cameras = Array.from(cameraList.querySelectorAll('input[type="checkbox"][data-kind="camera"]'))
//     .filter((i) => i.checked)
//     .map((i) => i.getAttribute('data-id'))
//     .filter(Boolean);
//   const mics = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
//     .filter((i) => i.checked)
//     .map((i) => i.getAttribute('data-id'))
//     .filter(Boolean);
//   return { cameras, mics };
// }

// function resetSelections() {
//   try {
//     localStorage.removeItem(STORAGE_KEY);
//     localStorage.removeItem(AUDIO_SELECTION_KEY);
//   } catch {}
//   setInlineAudioStatus('', false);
// }

// openSettingsBtn.addEventListener('click', () => openSettings());
// closeSettingsBtn.addEventListener('click', () => closeSettings());
// cancelSettingsBtn.addEventListener('click', () => closeSettings());
// settingsBackdrop.addEventListener('click', () => closeSettings());

// saveSettingsBtn.addEventListener('click', async () => {
//   try {
//     const sel = collectChecked();
//     saveSelection(sel);
//     ensureAudioSelectionIsValid();
//     renderAudioRoleDropdowns();
//     renderAudioRoleSelectors();
//     setStatus('Settings saved');
//     closeSettings();
//   } catch (e) {
//     setStatus(e?.message || String(e));
//   }
// });

// startCallBtn.addEventListener('click', async () => {
//   try {
//     await joinRoom();

//     if (toggleStethoBtn) {
//       if (getRole() === 'doctor') {
//         toggleStethoBtn.classList.remove('hidden');
//         toggleStethoBtn.textContent = 'Stetho: off';
//       } else {
//         toggleStethoBtn.classList.add('hidden');
//       }
//     }
//   } catch (e) {
//     setStatus(e?.message || String(e));
//   }
// });

// toggleMicBtn.addEventListener('click', async () => {
//   micEnabled = !micEnabled;
//   for (const t of localTracks) {
//     const kind = t?.mediaStreamTrack?.kind;
//     if (kind === 'audio') {
//       if (micEnabled) await t.unmute();
//       else await t.mute();
//     }
//   }
//   toggleMicBtn.textContent = `Mic: ${micEnabled ? 'on' : 'off'}`;
// });

// toggleCamBtn.addEventListener('click', async () => {
//   camEnabled = !camEnabled;
//   for (const t of localTracks) {
//     const kind = t?.mediaStreamTrack?.kind;
//     if (kind === 'video') {
//       if (camEnabled) await t.unmute();
//       else await t.mute();
//     }
//   }
//   toggleCamBtn.textContent = `Cam: ${camEnabled ? 'on' : 'off'}`;
// });

// leaveBtn.addEventListener('click', async () => {
//   try {
//     await leaveRoom();
//   } catch (e) {
//     setStatus(e?.message || String(e));
//   }
// });

// if (toggleStethoBtn) {
//   toggleStethoBtn.addEventListener('click', async () => {
//     try {
//       if (!room) return;
//       const role = getRole();
//       if (role === 'doctor') {
//         activeAudioMode = activeAudioMode === 'stetho' ? 'patient' : 'stetho';
//         const msg = JSON.stringify({ type: 'audio_mode', mode: activeAudioMode });
//         await room.localParticipant.publishData(new TextEncoder().encode(msg), { reliable: true });
//         toggleStethoBtn.textContent = `Stetho: ${activeAudioMode === 'stetho' ? 'on' : 'off'}`;
//       } else {
//         const next = activeAudioMode === 'stetho' ? 'patient' : 'stetho';
//         await setPublishedAudioMode(next);
//         toggleStethoBtn.textContent = `Stetho: ${activeAudioMode === 'stetho' ? 'on' : 'off'}`;
//       }
//     } catch (e) {
//       setStatus(e?.message || String(e));
//     }
//   });
// }

// // init defaults
// identityBadge.textContent = String(desktopConfig?.identity || '');

// audioTrackCountEl.textContent = String(
//   Number.isFinite(Number(desktopConfig?.audioTrackCount)) ? Number(desktopConfig.audioTrackCount) : 2
// );

// callView.classList.add('hidden');
// homeView.classList.remove('hidden');

// (async () => {
//   try {
//     setStatus('Init...');
//     await ensureDeviceLabels();
//     const d = await listDevices();
//     setDebug(d);
//     setStatus('Ready');
//   } catch (e) {
//     setStatus(e?.message || String(e));
//   }
// })();
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
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
const patientMicSelect = document.getElementById('patientMicSelect');
const stethoMicSelect = document.getElementById('stethoMicSelect');
const audioConfigStatus = document.getElementById('audioConfigStatus');
const stethoPresetSelect = document.getElementById('stethoPreset');
const stethoNotchSelect = document.getElementById('stethoNotch');

const startCallBtn = document.getElementById('startCall');
const toggleMicBtn = document.getElementById('toggleMic');
const toggleCamBtn = document.getElementById('toggleCam');
const toggleStethoBtn = document.getElementById('toggleStetho');

const refreshDevicesBtn = document.getElementById('refreshDevices');
const resetDevicesBtn = document.getElementById('resetDevices');
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
const STETHO_PRESET_KEY = 'desktopversion.stethoPreset.v1';

// Variables pour le traitement audio stéthoscope
let stethoAudioContext = null;
let stethoSourceNode = null;
let stethoAnalyserNode = null;
let stethoGainNode = null;
let stethoOutputGainNode = null;
let stethoBiquadFilterLow = null;
let stethoBiquadFilterHigh = null;
let stethoNotchFilter = null;
let stethoNotchFilter2 = null;
let stethoLowShelfFilter = null;
let stethoCompressor = null;
let stethoIsProcessing = false;
let stethoVisualizationId = null;
let stethoStream = null;
let stethoMediaStream = null;
let stethoProcessedTrack = null;
let stethoLocalAudioTrack = null;

function loadStethoPreset() {
  try {
    const raw = localStorage.getItem(STETHO_PRESET_KEY);
    if (!raw) return { preset: 'heart', notchHz: 50 };
    const p = JSON.parse(raw);
    const preset = ['heart', 'lung', 'wide'].includes(p?.preset) ? p.preset : 'heart';
    const notchHz = Number(p?.notchHz) === 60 ? 60 : 50;
    return { preset, notchHz };
  } catch {
    return { preset: 'heart', notchHz: 50 };
  }
}

function saveStethoPreset(v) {
  localStorage.setItem(STETHO_PRESET_KEY, JSON.stringify(v));
}

function getPresetParams() {
  const { preset, notchHz } = loadStethoPreset();
  if (preset === 'lung') {
    return {
      preset,
      notchHz,
      hp: 100,
      lp: 1800,
      lowShelfHz: 120,
      lowShelfGainDb: 6,
      compThreshold: -34,
      compKnee: 18,
      compRatio: 4,
      compAttack: 0.004,
      compRelease: 0.22,
      gainDb: 12,
    };
  }
  if (preset === 'wide') {
    return {
      preset,
      notchHz,
      hp: 25,
      lp: 2200,
      lowShelfHz: 90,
      lowShelfGainDb: 4,
      compThreshold: -36,
      compKnee: 20,
      compRatio: 3,
      compAttack: 0.005,
      compRelease: 0.25,
      gainDb: 6,
    };
  }
  return {
    preset: 'heart',
    notchHz,
    hp: 25,
    lp: 220,
    lowShelfHz: 80,
    lowShelfGainDb: 10,
    compThreshold: -38,
    compKnee: 22,
    compRatio: 6,
    compAttack: 0.003,
    compRelease: 0.28,
    gainDb: 16,
  };
}

function applyStethoPreset() {
  if (!stethoAudioContext || !stethoIsProcessing) return;

  const preset = getPresetParams();
  
  if (stethoBiquadFilterHigh) {
    stethoBiquadFilterHigh.frequency.value = preset.hp;
  }
  
  if (stethoBiquadFilterLow) {
    stethoBiquadFilterLow.frequency.value = preset.lp;
  }
  
  if (stethoNotchFilter) {
    stethoNotchFilter.frequency.value = preset.notchHz;
  }
  
  if (stethoNotchFilter2) {
    stethoNotchFilter2.frequency.value = preset.notchHz * 2;
  }
  
  if (stethoLowShelfFilter) {
    stethoLowShelfFilter.frequency.value = preset.lowShelfHz;
    stethoLowShelfFilter.gain.value = preset.lowShelfGainDb;
  }
  
  if (stethoCompressor) {
    stethoCompressor.threshold.value = preset.compThreshold;
    stethoCompressor.knee.value = preset.compKnee;
    stethoCompressor.ratio.value = preset.compRatio;
    stethoCompressor.attack.value = preset.compAttack;
    stethoCompressor.release.value = preset.compRelease;
  }
  
  if (stethoGainNode) {
    stethoGainNode.gain.value = Math.pow(10, preset.gainDb / 20);
  }
  
  if (stethoPresetSelect) {
    stethoPresetSelect.value = preset.preset;
  }
  
  if (stethoNotchSelect) {
    stethoNotchSelect.value = String(preset.notchHz);
  }
}

async function buildProcessedStethoTrack(deviceId) {
  if (stethoLocalAudioTrack) {
    return stethoLocalAudioTrack;
  }

  try {
    setStatus('Initialisation du traitement audio stéthoscope...');
    
    stethoStream = await navigator.mediaDevices.getUserMedia({
      audio: deviceId ? {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        sampleRate: 44100
      } : {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
        sampleRate: 44100
      },
      video: false,
    });

    stethoAudioContext = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 44100,
      latencyHint: 'interactive'
    });

    stethoSourceNode = stethoAudioContext.createMediaStreamSource(stethoStream);

    stethoBiquadFilterHigh = stethoAudioContext.createBiquadFilter();
    stethoBiquadFilterHigh.type = 'highpass';

    stethoNotchFilter = stethoAudioContext.createBiquadFilter();
    stethoNotchFilter.type = 'notch';
    stethoNotchFilter.Q.value = 10;

    stethoNotchFilter2 = stethoAudioContext.createBiquadFilter();
    stethoNotchFilter2.type = 'notch';
    stethoNotchFilter2.Q.value = 10;

    stethoBiquadFilterLow = stethoAudioContext.createBiquadFilter();
    stethoBiquadFilterLow.type = 'lowpass';

    stethoLowShelfFilter = stethoAudioContext.createBiquadFilter();
    stethoLowShelfFilter.type = 'lowshelf';

    stethoCompressor = stethoAudioContext.createDynamicsCompressor();
    stethoCompressor.threshold.value = -36;
    stethoCompressor.knee.value = 20;
    stethoCompressor.ratio.value = 4;
    stethoCompressor.attack.value = 0.005;
    stethoCompressor.release.value = 0.25;

    stethoGainNode = stethoAudioContext.createGain();
    stethoOutputGainNode = stethoAudioContext.createGain();

    const destination = stethoAudioContext.createMediaStreamDestination();

    stethoSourceNode.connect(stethoBiquadFilterHigh);
    stethoBiquadFilterHigh.connect(stethoNotchFilter);
    stethoNotchFilter.connect(stethoNotchFilter2);
    stethoNotchFilter2.connect(stethoBiquadFilterLow);
    stethoBiquadFilterLow.connect(stethoLowShelfFilter);
    stethoLowShelfFilter.connect(stethoCompressor);
    stethoCompressor.connect(stethoGainNode);
    stethoGainNode.connect(stethoOutputGainNode);
    stethoOutputGainNode.connect(destination);

    applyStethoPreset();

    stethoMediaStream = destination.stream;
    stethoProcessedTrack = stethoMediaStream.getAudioTracks()[0];

    if (!stethoProcessedTrack) {
      throw new Error('No processed stetho track');
    }

    stethoLocalAudioTrack = new LocalAudioTrack(stethoProcessedTrack, {
      name: 'audio:stetho:processed'
    });

    stethoIsProcessing = true;

    if (debugEl) {
      const vizContainer = document.getElementById('stethoVisualization');
      if (vizContainer) {
        vizContainer.style.display = 'block';
      }
      startStethoVisualization();
    }

    setStatus('Traitement audio stéthoscope actif');
    return stethoLocalAudioTrack;

  } catch (error) {
    console.error('Error building processed stetho track:', error);
    setStatus(`Erreur traitement audio: ${error.message}`);
    await teardownStethoProcessing();
    throw error;
  }
}

async function teardownStethoProcessing() {
  try {
    if (stethoVisualizationId) {
      cancelAnimationFrame(stethoVisualizationId);
      stethoVisualizationId = null;
    }
    
    if (stethoLocalAudioTrack) {
      try { stethoLocalAudioTrack.stop(); } catch {}
    }
    
    if (stethoProcessedTrack) {
      try { stethoProcessedTrack.stop(); } catch {}
    }
    
    if (stethoStream) {
      stethoStream.getTracks().forEach(track => track.stop());
    }
    
    if (stethoAudioContext) {
      try { await stethoAudioContext.close(); } catch {}
    }
  } finally {
    stethoAudioContext = null;
    stethoSourceNode = null;
    stethoAnalyserNode = null;
    stethoGainNode = null;
    stethoOutputGainNode = null;
    stethoBiquadFilterLow = null;
    stethoBiquadFilterHigh = null;
    stethoNotchFilter = null;
    stethoNotchFilter2 = null;
    stethoLowShelfFilter = null;
    stethoCompressor = null;
    stethoIsProcessing = false;
    stethoStream = null;
    stethoMediaStream = null;
    stethoProcessedTrack = null;
    stethoLocalAudioTrack = null;
    
    const vizContainer = document.getElementById('stethoVisualization');
    if (vizContainer) {
      vizContainer.style.display = 'none';
    }
  }
}

function startStethoVisualization() {
  if (!stethoAnalyserNode && stethoAudioContext && stethoOutputGainNode) {
    stethoAnalyserNode = stethoAudioContext.createAnalyser();
    stethoAnalyserNode.fftSize = 2048;
    stethoAnalyserNode.smoothingTimeConstant = 0.7;
    
    const splitter = stethoAudioContext.createChannelSplitter(1);
    stethoOutputGainNode.connect(splitter);
    splitter.connect(stethoAnalyserNode, 0, 0);
    
    createStethoVisualizationCanvas();
  }
  
  if (stethoAnalyserNode && stethoIsProcessing) {
    updateStethoVisualization();
  }
}

function createStethoVisualizationCanvas() {
  let vizContainer = document.getElementById('stethoVisualization');
  if (!vizContainer) {
    vizContainer = document.createElement('div');
    vizContainer.id = 'stethoVisualization';
    vizContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 300px;
      height: 180px;
      background: rgba(10, 25, 47, 0.95);
      border: 2px solid #4fc3f7;
      border-radius: 10px;
      padding: 12px;
      z-index: 1000;
      display: none;
      font-family: 'Segoe UI', Arial, sans-serif;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(10px);
    `;
    
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(79, 195, 247, 0.3);
    `;
    
    const title = document.createElement('div');
    title.textContent = '🎵 Stéthoscope Audio';
    title.style.cssText = 'color: #4fc3f7; font-weight: bold; font-size: 14px;';
    
    const presetInfo = document.createElement('div');
    presetInfo.id = 'stethoPresetInfo';
    presetInfo.style.cssText = 'color: #90caf9; font-size: 12px;';
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      cursor: pointer;
      font-size: 18px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    closeBtn.onclick = () => {
      vizContainer.style.display = 'none';
    };
    closeBtn.onmouseover = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    };
    
    const canvas = document.createElement('canvas');
    canvas.id = 'stethoWaveform';
    canvas.width = 276;
    canvas.height = 100;
    canvas.style.cssText = 'width: 100%; height: 100px; background: rgba(0, 20, 40, 0.7); border-radius: 5px;';
    
    const metrics = document.createElement('div');
    metrics.id = 'stethoMetrics';
    metrics.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 11px;
      color: #b0d0ff;
    `;
    metrics.innerHTML = `
      <div>Freq: <span id="stethoFreq">-- Hz</span></div>
      <div>Niveau: <span id="stethoLevel">-- dB</span></div>
      <div>Filtre: <span id="stethoFilter">Cœur</span></div>
    `;
    
    header.appendChild(title);
    header.appendChild(presetInfo);
    header.appendChild(closeBtn);
    vizContainer.appendChild(header);
    vizContainer.appendChild(canvas);
    vizContainer.appendChild(metrics);
    document.body.appendChild(vizContainer);
  }
  
  vizContainer.style.display = 'block';
  
  const preset = loadStethoPreset();
  const presetNames = { heart: 'Cœur', lung: 'Poumon', wide: 'Large' };
  const presetInfo = document.getElementById('stethoPresetInfo');
  if (presetInfo) {
    presetInfo.textContent = `${presetNames[preset.preset]} | ${preset.notchHz}Hz`;
  }
  
  const filterSpan = document.getElementById('stethoFilter');
  if (filterSpan) {
    filterSpan.textContent = presetNames[preset.preset];
  }
}

function updateStethoVisualization() {
  if (!stethoAnalyserNode || !stethoIsProcessing) return;
  
  const canvas = document.getElementById('stethoWaveform');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  const bufferLength = stethoAnalyserNode.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);
  const freqData = new Uint8Array(bufferLength);
  
  stethoAnalyserNode.getByteTimeDomainData(timeData);
  stethoAnalyserNode.getByteFrequencyData(freqData);
  
  ctx.fillStyle = 'rgba(10, 25, 47, 0.95)';
  ctx.fillRect(0, 0, width, height);
  
  // Dessiner la grille
  ctx.strokeStyle = 'rgba(79, 195, 247, 0.15)';
  ctx.lineWidth = 1;
  
  // Lignes verticales
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Lignes horizontales
  for (let y = 0; y < height; y += 25) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  // Dessiner le signal
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4fc3f7';
  ctx.beginPath();
  
  const sliceWidth = width / bufferLength;
  let x = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    const v = timeData[i] / 128.0;
    const y = v * height / 2;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    
    x += sliceWidth;
  }
  
  ctx.stroke();
  
  // Ligne centrale
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, height / 2);
  ctx.lineTo(width, height / 2);
  ctx.stroke();
  
  // Calculer les métriques
  let maxIndex = 0;
  let maxValue = 0;
  for (let i = 0; i < freqData.length; i++) {
    if (freqData[i] > maxValue) {
      maxValue = freqData[i];
      maxIndex = i;
    }
  }
  const dominantFreq = maxIndex * stethoAudioContext.sampleRate / stethoAnalyserNode.fftSize;
  
  let sum = 0;
  for (let i = 0; i < timeData.length; i++) {
    const value = (timeData[i] - 128) / 128;
    sum += value * value;
  }
  const rms = Math.sqrt(sum / timeData.length);
  const audioLevel = Math.max(20 * Math.log10(rms), -96);
  
  // Mettre à jour les métriques
  const freqSpan = document.getElementById('stethoFreq');
  const levelSpan = document.getElementById('stethoLevel');
  if (freqSpan) freqSpan.textContent = `${dominantFreq.toFixed(1)} Hz`;
  if (levelSpan) levelSpan.textContent = `${audioLevel.toFixed(1)} dB`;
  
  // Dessiner le spectre en fond
  const spectrumHeight = height * 0.3;
  const spectrumY = height - spectrumHeight;
  ctx.fillStyle = 'rgba(46, 213, 115, 0.15)';
  const barWidth = (width / freqData.length) * 2.5;
  let barX = 0;
  
  for (let i = 0; i < Math.min(freqData.length, 100); i++) {
    const barHeight = (freqData[i] / 255) * spectrumHeight;
    ctx.fillRect(barX, spectrumY - barHeight, barWidth, barHeight);
    barX += barWidth + 1;
  }
  
  stethoVisualizationId = requestAnimationFrame(updateStethoVisualization);
}

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

function hydrateStethoPresetUi() {
  if (!stethoPresetSelect || !stethoNotchSelect) return;
  const p = loadStethoPreset();
  stethoPresetSelect.value = p.preset;
  stethoNotchSelect.value = String(p.notchHz);

  stethoPresetSelect.onchange = () => {
    const cur = loadStethoPreset();
    const preset = ['heart', 'lung', 'wide'].includes(String(stethoPresetSelect.value))
      ? String(stethoPresetSelect.value)
      : cur.preset;
    saveStethoPreset({ preset, notchHz: cur.notchHz });
    applyStethoPreset();
  };

  stethoNotchSelect.onchange = () => {
    const cur = loadStethoPreset();
    const notchHz = Number(stethoNotchSelect.value) === 60 ? 60 : 50;
    saveStethoPreset({ preset: cur.preset, notchHz });
    applyStethoPreset();
  };
}

function saveAudioSelection(sel) {
  localStorage.setItem(AUDIO_SELECTION_KEY, JSON.stringify(sel));
}

function setInlineAudioStatus(message, isError) {
  if (!audioConfigStatus) return;
  const msg = String(message || '').trim();
  if (!msg) {
    audioConfigStatus.classList.add('hidden');
    audioConfigStatus.classList.remove('error');
    audioConfigStatus.textContent = '';
    return;
  }
  audioConfigStatus.textContent = msg;
  audioConfigStatus.classList.remove('hidden');
  if (isError) audioConfigStatus.classList.add('error');
  else audioConfigStatus.classList.remove('error');
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

  if (checkedMicIds.length === 0) {
    setInlineAudioStatus('Aucun micro sélectionné. Coche au moins 1 micro.', true);
  } else if (!next.patientMicId) {
    setInlineAudioStatus('Choisis un Micro Patient.', true);
  } else if (!next.stethoMicId) {
    setInlineAudioStatus('Choisis un Micro Stetho (optionnel si tu n\'envoies qu\'un audio).', false);
  } else {
    setInlineAudioStatus(`Patient + Stetho configurés.`, false);
  }

  return next;
}

function renderAudioRoleDropdowns() {
  if (!patientMicSelect || !stethoMicSelect) return;

  const checkedMicIds = Array.from(micList.querySelectorAll('input[type="checkbox"][data-kind="mic"]'))
    .filter((i) => i.checked)
    .map((i) => i.getAttribute('data-id'))
    .filter(Boolean);

  const current = ensureAudioSelectionIsValid();

  const buildOptions = (selectEl, selectedId, otherId) => {
    selectEl.innerHTML = '';

    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = '—';
    selectEl.appendChild(empty);

    for (const id of checkedMicIds) {
      const opt = document.createElement('option');
      opt.value = id;
      const labelEl = micList.querySelector(`input[data-kind="mic"][data-id="${CSS.escape(id)}"]`)?.closest('label');
      opt.textContent = labelEl?.querySelector('span')?.textContent || id;
      if (id === otherId) opt.disabled = true;
      selectEl.appendChild(opt);
    }

    selectEl.value = selectedId && checkedMicIds.includes(selectedId) ? selectedId : '';
  };

  buildOptions(patientMicSelect, current.patientMicId, current.stethoMicId);
  buildOptions(stethoMicSelect, current.stethoMicId, current.patientMicId);

  patientMicSelect.disabled = checkedMicIds.length === 0;
  stethoMicSelect.disabled = checkedMicIds.length === 0;

  patientMicSelect.onchange = () => {
    const sel = loadAudioSelection();
    sel.patientMicId = String(patientMicSelect.value || '');
    if (sel.stethoMicId === sel.patientMicId) sel.stethoMicId = '';
    saveAudioSelection(sel);
    ensureAudioSelectionIsValid();
    renderAudioRoleDropdowns();
    renderAudioRoleSelectors();
  };

  stethoMicSelect.onchange = () => {
    const sel = loadAudioSelection();
    sel.stethoMicId = String(stethoMicSelect.value || '');
    if (sel.patientMicId === sel.stethoMicId) sel.patientMicId = '';
    saveAudioSelection(sel);
    ensureAudioSelectionIsValid();
    renderAudioRoleDropdowns();
    renderAudioRoleSelectors();
  };

  if (checkedMicIds.length === 1) {
    setInlineAudioStatus('Un seul micro coché: Patient OK, Stetho désactivé.', false);
  }
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

  if (m !== 'stetho') {
    await teardownStethoProcessing();
    if (toggleStethoBtn) {
      toggleStethoBtn.classList.remove('stetho-active');
    }
  }

  if (!micEnabled) {
    if (toggleMicBtn) toggleMicBtn.textContent = 'Mic: off';
    return;
  }

  let t;
  if (m === 'stetho' && deviceId) {
    try {
      t = await buildProcessedStethoTrack(deviceId);
      if (toggleStethoBtn) {
        toggleStethoBtn.classList.add('stetho-active');
      }
    } catch (error) {
      console.error('Failed to create processed stetho track:', error);
      setStatus(`Erreur stéthoscope: ${error.message}`);
      t = deviceId ? await createLocalAudioTrack({ deviceId }) : await createLocalAudioTrack();
    }
  } else {
    t = deviceId ? await createLocalAudioTrack({ deviceId }) : await createLocalAudioTrack();
  }

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
  renderAudioRoleDropdowns();
  hydrateStethoPresetUi();
  renderAudioRoleSelectors();

  return { cams, mics };
}

async function ensureDeviceLabels() {
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

  if (audioTrackCount <= 0) {
    // publish no audio
  } else {
    const roleSel = ensureAudioSelectionIsValid();
    const patientId = roleSel.patientMicId || '';
    const stethoId = roleSel.stethoMicId || '';

    if (patientId) {
      localTracks.push(await createLocalAudioTrack({ deviceId: patientId }));
    } else {
      localTracks.push(await createLocalAudioTrack());
    }

    if (audioTrackCount >= 2) {
      if (stethoId && stethoId !== patientId) {
        setStatus('Stéthoscope configuré (prêt pour traitement audio)');
      }
    }
  }

  setStatus('Connecting to room...');
  room = new Room({ adaptiveStream: true, dynacast: true, autoSubscribe: true });

  room.on(RoomEvent.Connected, () => {
    roomInfo.textContent = `Connected to ${roomName} as ${identity}`;
  });

  room.on(RoomEvent.Disconnected, () => {
    roomInfo.textContent = 'Not connected';
    teardownStethoProcessing();
  });

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
    const mediaTrack = t?.mediaStreamTrack;
    const deviceId = mediaTrack?.getSettings?.().deviceId;
    const label = deviceId ? (deviceLabelMap.get(deviceId) || deviceId) : (mediaTrack?.label || '');
    const kind = mediaTrack?.kind || 'track';

    let name = `${kind}:${label || 'default'}`;
    if (kind === 'audio') {
      const audioSel = loadAudioSelection();
      const did = deviceId || '';
      if (did && audioSel.patientMicId && did === audioSel.patientMicId) name = 'audio:patient';
      else if (did && audioSel.stethoMicId && did === audioSel.stethoMicId) name = 'audio:stetho';
      else if (!published.some((p) => p.kind === 'audio')) name = 'audio:patient';
      else name = 'audio:stetho';
    }

    const pub = await room.localParticipant.publishTrack(t, { name });
    published.push({ kind, name, deviceId: deviceId || null, sid: pub?.trackSid || pub?.sid || null });
  }

  setDebug({ publishedTracks: published });
  renderLocalVideos();

  homeView.classList.add('hidden');
  callView.classList.remove('hidden');

  leaveBtn.disabled = false;
  setStatus('Joined');

  if (toggleStethoBtn) {
    if (getRole() === 'doctor') {
      toggleStethoBtn.classList.remove('hidden');
      toggleStethoBtn.textContent = 'Stetho: off';
    } else {
      toggleStethoBtn.classList.add('hidden');
    }
  }
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

    await teardownStethoProcessing();

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

if (resetDevicesBtn) {
  resetDevicesBtn.addEventListener('click', async () => {
    try {
      resetSelections();
      await ensureDeviceLabels();
      await listDevices();
      setStatus('Selections reset');
    } catch (e) {
      setStatus(e?.message || String(e));
    }
  });
}

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

function resetSelections() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUDIO_SELECTION_KEY);
    localStorage.removeItem(STETHO_PRESET_KEY);
  } catch {}
  setInlineAudioStatus('', false);
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
    renderAudioRoleDropdowns();
    renderAudioRoleSelectors();
    setStatus('Settings saved');
    closeSettings();
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

startCallBtn.addEventListener('click', async () => {
  try {
    await joinRoom();
  } catch (e) {
    setStatus(e?.message || String(e));
  }
});

toggleMicBtn.addEventListener('click', async () => {
  micEnabled = !micEnabled;
  for (const t of localTracks) {
    const kind = t?.mediaStreamTrack?.kind;
    if (kind === 'audio') {
      if (micEnabled) await t.unmute();
      else await t.mute();
    }
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
        if (activeAudioMode === 'stetho') {
          toggleStethoBtn.classList.add('stetho-active');
        } else {
          toggleStethoBtn.classList.remove('stetho-active');
        }
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
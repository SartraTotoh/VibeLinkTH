# VibeLinkTH Live local rehearsal alpha

Implemented 30 October 2026 on top of `fix/pitch-support-analytics` because `main` does not contain the recent production fixes. Keep this dependency when integrating; do not deploy the older main snapshot over the existing application.

## Delivered behavior

Authenticated `/live` uses the existing NextAuth session and is linked from Dashboard. There are no database migrations, new packages, external media requests, stream credentials, or billable services in this increment.

The studio requests camera and microphone access only after a click. It offers a host camera with microphone, an optional second camera on the same device without audio, 16:9 and 9:16 canvas composition, four scenes, and up to 20 product overlays with optional local images. The waiting scene continues to carry host microphone audio unless muted.

Names, prices, aspect and show title persist in browser storage scoped by user ID. Images and recordings remain in memory in the open tab. This is preparation persistence on that browser, not a cloud show register, shared room or secure media archive. Users must download the recording before leaving or reloading.

MediaRecorder records the composed canvas and a clone of the host audio track. Mute controls both the preview source track and the recording audio track. Recording is capped at 15 minutes or approximately 256 MiB; a final encoder chunk may exceed the byte threshold. The output can be played and downloaded. The JSON rehearsal report identifies client timestamps, client elapsed time and `billed: false`; it is neither a usage ledger nor an invoice.

Repeated recording starts are guarded. Changing format or camera is disabled during recording. A camera permission response arriving after close/unmount is discarded and its tracks are stopped. Recording stops when the host source ends or the document is hidden. Stopping the recording releases captured tracks; preview cameras remain active until explicitly closed. Leaving the component closes all camera/microphone tracks and revokes local object URLs.

## Verification

- TypeScript check passed.
- Unit suite passed: 200 tests, including 8 new tests for draft validation, crop geometry, permission races, mute propagation, recording cleanup, tab visibility and source disconnect behavior.
- Production Next.js build passed and includes the dynamic `/live` route.
- Charset and repository security checks passed.
- Managed browser preview could not launch: the preview launcher appends `--host` and `--strictPort`, which this existing Next.js dev command does not accept. No browser camera/audio, mobile layout, real encoder playback or hardware compatibility acceptance is claimed.

## Remaining acceptance work

This is the local studio foundation, not completion of milestone 1 in the Live plan. Before end-to-end streaming acceptance:

1. Connect a media provider project with WebRTC rooms and server-controlled egress. Store credentials as server runtime secrets; do not put them in client props or browser storage.
2. Add authenticated, owner-scoped show and room APIs, short-lived role-specific participant tokens, shared scene state, phone invitation expiry and assistant permissions.
3. Add encrypted destination credentials and a server-authoritative, idempotent output lifecycle. Distinguish output transport from viewer-visible publication. A missing provider must return an unavailable state rather than a simulated live state.
4. Define server usage event IDs, rate snapshots and start/stop boundaries; reconcile provider events, disconnects and resource shutdown before enabling billing.
5. Test a single authorized destination end to end using a real viewer page. Retain video/audio proof, server start/stop evidence and provider resource shutdown evidence.
6. Add cloud recordings and verify retrieval/playback independently of output success. Then test separate-device host, product camera and assistant operation.

The UI keeps live output disabled until that service exists. No platform support, cloud recording, multi-user synchronization, server usage or production Live readiness is advertised by this increment.

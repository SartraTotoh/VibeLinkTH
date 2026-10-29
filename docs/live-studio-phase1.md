# VibeLinkTH Live studio alpha

Updated 30 October 2026. Source: `feat/live-studio-phase1`, based on `fix/pitch-support-analytics` to retain fixes missing from `main`.

## Two sources are enough

The studio owns at most two video slots, Source A and Source B. One video source plus one selected audio input is sufficient. A USB capture card, hardware switcher with USB video output, or virtual camera appears through the browser device picker as one source. An HDMI splitter alone does not provide browser capture. Dedicated RTMP ingest, mobile remote cameras and assistant control are not part of this increment.

Users can compose scenes in the browser, or choose a prepared external program. The external-program mode fits the complete selected source into the output, preserving upstream graphics and aspect ratio, and disables local scene/product overlays. Both modes produce one video program and one selected audio track for recording or cloud publication. Four scene choices do not imply four cameras.

Video devices and the primary audio device are independent. Microphone mode requests echo cancellation, noise suppression and automatic gain; mixer mode requests all three off. An optional Web Audio meter shows signal activity without monitoring through speakers. Changing mute also silences the cloned recording/cloud audio. Browser permissions and device capabilities still determine availability.

A source disconnect switches to the other available video source. Loss of every video source or the primary audio triggers recording stop and cloud stop. Duplicate physical cameras, late permissions and superseded requests are handled without leaving extra capture streams running. Leaving the page disposes tracks, meters and object URLs.

## Preparation and local recording

Authenticated `/live` is linked from Dashboard. Show title, aspect, composition mode and product names/prices persist in user-scoped browser drafts. Product order can be changed. Images and recorded files remain in the current tab and must be downloaded before leaving.

The composed canvas can be recorded as WebM or MP4 when MediaRecorder supports it. Limits are 15 minutes or approximately 256 MiB per recording, with a possible final encoder chunk beyond the threshold. Recording stops on a hidden tab. Play the result to check picture and sound before use. Local reports explicitly use client timing and `billed: false`.

## Cloud output code

The optional LiveKit bridge publishes only Program video/audio, not each camera individually. Server-issued tokens last five minutes, are scoped to a single owned room and cannot subscribe, manage rooms, publish data or start output directly. Cloud output is an admin-only pilot behind disabled-by-default configuration.

The server supports show creation/history, room connection, heartbeat, one RTMP(S) output per show, reconciliation, signed provider webhooks, stop/room closure, a watchdog and a sanitized server summary. It verifies that the requested program tracks exist in that room. Portrait output is explicitly encoded at 720 by 1280; landscape at 1280 by 720, at 30 fps.

A unique reservation prevents repeated starts. Row locking serializes starting output with closing a show. A durable close marker prevents late starts; a durable stop marker handles stops arriving before the original start reply. An ambiguous start remains UNKNOWN and is reconciled against the original tracks rather than being retried. Duplicate/stale provider events cannot create extra usage rows or revive an ended output. Provider processing times and destination transport times remain distinct; no viewer-visible publication or billing is inferred.

Destination credentials stay in the request and provider call. The app stores only the destination hostname, never the RTMP key or raw provider payload. The key field is cleared after submission. Account deletion is blocked until shows are closed; closed records are deleted with the account. Personal data export includes sanitized Live records.

## Validation and remaining acceptance

TypeScript and 234 unit/integration tests pass, including actual PostgreSQL-compatible statements in PGlite for start races, close guards, event deduplication and ownership. Provider calls and browser media are mocked in lifecycle tests. The final Next.js production build and Cloudflare Worker build both passed, including the Prisma Worker patch. Charset and repository security checks also passed. Existing unrelated build warnings remain in the application.

A local component harness was inspected in the cloud browser at desktop and 390px widths. Product creation, draft restoration, format/mode switching and disabled transport controls were checked. The harness uses a stub disabled-cloud configuration. Its HTTP origin does not expose camera/microphone APIs, so this does not establish hardware, encoder, authenticated application or actual streaming acceptance.

See [Live activation](live-studio-activation.md) for prerequisites. No real media account has been connected in this work, no production schema change or deployment has occurred, and end-to-end viewer playback, device compatibility, cloud recording and billing remain unverified. Cloud recording, remote device invitations, shared assistant control and platform commerce APIs are future work.

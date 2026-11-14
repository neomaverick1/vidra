import type { Stream } from './webrtc';

/** Keeps the camera stream opened in the lobby so the call screen can reuse it without a flash. */
export const media: { stream: Stream | null } = { stream: null };

/** Meeting codes look like `kqz-mwpt-ahd` (3-4-3 lowercase letters, no ambiguous i/l/o). */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz';

export function newRoomCode(random: () => number = Math.random): string {
  const pick = (n: number) => Array.from({ length: n }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

/** Accepts a pasted code or link, any case, with or without dashes/spaces. Returns null if invalid. */
export function normalizeRoomCode(input: string): string | null {
  const fromLink = input.trim().match(/(?:room=|call\/|lobby\/)([a-z-]+)/i);
  const raw = (fromLink ? fromLink[1] : input).toLowerCase().replace(/[^a-z]/g, '');
  if (raw.length !== 10) return null;
  if ([...raw].some((c) => !ALPHABET.includes(c))) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
}

export const ECHO_ROOM_PREFIX = 'echo';

/** Rooms that start with "echo" connect to the built-in test peer on this device. */
export function isEchoRoom(room: string) {
  return room.startsWith(ECHO_ROOM_PREFIX);
}

export function inviteLink(room: string, base = 'https://neomaverick1.github.io/vidra') {
  return `${base}/lobby/${room}`;
}

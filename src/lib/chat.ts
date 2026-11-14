export type ChatMessage = { id: string; from: string; name: string; text: string; at: number };

export type ChatWire = { kind: 'chat'; id: string; name: string; text: string; at: number } | { kind: 'typing'; name: string };

const MAX = 2000;

/** Validates a message that came over the data channel. Anything unexpected is dropped. */
export function parseWire(raw: unknown): ChatWire | null {
  if (typeof raw !== 'string' || raw.length > 10_000) return null;
  try {
    const v = JSON.parse(raw);
    if (v?.kind === 'typing' && typeof v.name === 'string') return { kind: 'typing', name: v.name.slice(0, 60) };
    if (
      v?.kind === 'chat' &&
      typeof v.id === 'string' &&
      typeof v.text === 'string' &&
      typeof v.name === 'string' &&
      typeof v.at === 'number' &&
      v.text.trim()
    ) {
      return { kind: 'chat', id: v.id.slice(0, 64), name: v.name.slice(0, 60), text: v.text.slice(0, MAX), at: v.at };
    }
  } catch {
    // ignore malformed payloads
  }
  return null;
}

/** Adds a message once (data channels can redeliver after reconnects) and keeps time order. */
export function addMessage(list: ChatMessage[], m: ChatMessage): ChatMessage[] {
  if (list.some((x) => x.id === m.id)) return list;
  const next = [...list, m];
  next.sort((a, b) => a.at - b.at);
  return next;
}

export function messageId(random: () => number = Math.random) {
  return `${Date.now().toString(36)}-${Math.floor(random() * 1e9).toString(36)}`;
}

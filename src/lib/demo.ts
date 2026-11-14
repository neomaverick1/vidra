export type Contact = { id: string; name: string; role: string; color: string; online: boolean; bot?: boolean };

export const contacts: Contact[] = [
  { id: 'maya', name: 'Maya Chen', role: 'Echo test peer · always online', color: '#7C5CFF', online: true, bot: true },
  { id: 'jordan', name: 'Jordan Reyes', role: 'Product design', color: '#FF7A59', online: true },
  { id: 'priya', name: 'Priya Natarajan', role: 'iOS engineer', color: '#2EC5E6', online: false },
  { id: 'sam', name: 'Sam Okafor', role: 'Customer success', color: '#F5B841', online: true },
  { id: 'lena', name: 'Lena Fischer', role: 'Marketing', color: '#E5487A', online: false },
  { id: 'devon', name: 'Devon Park', role: 'Backend', color: '#3DDC97', online: false },
];

export type CallLog = { id: string; contactId: string; direction: 'out' | 'in' | 'missed'; at: number; seconds: number; video: boolean };

export function seedCalls(now = Date.now()): CallLog[] {
  const h = 3600_000;
  return [
    { id: 'c1', contactId: 'jordan', direction: 'out', at: now - 2 * h, seconds: 1324, video: true },
    { id: 'c2', contactId: 'priya', direction: 'missed', at: now - 5 * h, seconds: 0, video: true },
    { id: 'c3', contactId: 'sam', direction: 'in', at: now - 26 * h, seconds: 512, video: false },
    { id: 'c4', contactId: 'maya', direction: 'out', at: now - 30 * h, seconds: 95, video: true },
    { id: 'c5', contactId: 'lena', direction: 'in', at: now - 3 * 24 * h, seconds: 2210, video: true },
  ];
}

export type Thread = { id: string; contactId: string; messages: { id: string; mine: boolean; text: string; at: number }[] };

export function seedThreads(now = Date.now()): Thread[] {
  const m = 60_000;
  return [
    {
      id: 't-jordan',
      contactId: 'jordan',
      messages: [
        { id: '1', mine: false, text: 'Can we review the onboarding flow on a quick call?', at: now - 50 * m },
        { id: '2', mine: true, text: 'Sure, sending you a link now 👍', at: now - 48 * m },
        { id: '3', mine: false, text: 'Great, joining in 5', at: now - 47 * m },
      ],
    },
    {
      id: 't-maya',
      contactId: 'maya',
      messages: [{ id: '1', mine: false, text: 'Hi! I am the echo peer. Call me any time to test your camera and mic.', at: now - 26 * 60 * m }],
    },
    {
      id: 't-sam',
      contactId: 'sam',
      messages: [
        { id: '1', mine: true, text: 'Thanks for the demo today!', at: now - 28 * 60 * m },
        { id: '2', mine: false, text: 'Anytime. Recording is in the shared folder.', at: now - 27 * 60 * m },
      ],
    },
  ];
}

export function autoReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('call') || t.includes('video')) return 'Tap the camera icon above and I will pick up 📹';
  if (t.includes('hi') || t.includes('hello') || t.includes('hey')) return 'Hey! 👋';
  return 'Got it! (This is the built-in test contact.)';
}

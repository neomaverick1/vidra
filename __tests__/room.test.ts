import { inviteLink, isEchoRoom, newRoomCode, normalizeRoomCode } from '@/lib/room';

describe('room codes', () => {
  it('generates 3-4-3 codes without ambiguous letters', () => {
    for (let i = 0; i < 200; i++) {
      const c = newRoomCode();
      expect(c).toMatch(/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
      expect(c).not.toMatch(/[ilo]/);
    }
  });
  it('normalizes pasted codes and links', () => {
    expect(normalizeRoomCode('KQZ MWPT AHD')).toBe('kqz-mwpt-ahd');
    expect(normalizeRoomCode('kqzmwptahd')).toBe('kqz-mwpt-ahd');
    expect(normalizeRoomCode('https://neomaverick1.github.io/vidra/lobby/kqz-mwpt-ahd')).toBe('kqz-mwpt-ahd');
  });
  it('rejects wrong length or ambiguous letters', () => {
    expect(normalizeRoomCode('abc')).toBeNull();
    expect(normalizeRoomCode('kqz-mwpt-ahl')).toBeNull();
  });
  it('echo rooms and invite links', () => {
    expect(isEchoRoom('echo-test')).toBe(true);
    expect(isEchoRoom('kqz-mwpt-ahd')).toBe(false);
    expect(inviteLink('kqz-mwpt-ahd')).toBe('https://neomaverick1.github.io/vidra/lobby/kqz-mwpt-ahd');
  });
});

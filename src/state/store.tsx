import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type CallLog, seedCalls, seedThreads, type Thread } from '@/lib/demo';

type Settings = { name: string; startMuted: boolean; startCameraOff: boolean; dataSaver: boolean };

type Store = {
  ready: boolean;
  settings: Settings;
  calls: CallLog[];
  threads: Thread[];
  updateSettings: (p: Partial<Settings>) => void;
  logCall: (c: Omit<CallLog, 'id'>) => void;
  sendText: (threadId: string, text: string, mine?: boolean) => void;
};

const KEY = 'vidra:v1';
const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState<Settings>({ name: 'Alex Morgan', startMuted: false, startCameraOff: false, dataSaver: false });
  const [calls, setCalls] = useState<CallLog[]>(() => seedCalls());
  const [threads, setThreads] = useState<Thread[]>(() => seedThreads());

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.settings) setSettings((s) => ({ ...s, ...saved.settings }));
        if (Array.isArray(saved.calls)) setCalls(saved.calls);
        if (Array.isArray(saved.threads)) setThreads(saved.threads);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(KEY, JSON.stringify({ settings, calls, threads })).catch(() => undefined);
  }, [ready, settings, calls, threads]);

  const updateSettings = useCallback((p: Partial<Settings>) => setSettings((s) => ({ ...s, ...p })), []);
  const logCall = useCallback(
    (c: Omit<CallLog, 'id'>) => setCalls((list) => [{ ...c, id: `c${Date.now()}` }, ...list].slice(0, 50)),
    [],
  );
  const sendText = useCallback((threadId: string, text: string, mine = true) => {
    setThreads((list) => {
      const msg = { id: `${Date.now()}-${Math.random()}`, mine, text, at: Date.now() };
      const exists = list.some((t) => t.id === threadId);
      const next = exists
        ? list.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t))
        : [{ id: threadId, contactId: threadId.replace(/^t-/, ''), messages: [msg] }, ...list];
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ ready, settings, calls, threads, updateSettings, logCall, sendText }),
    [ready, settings, calls, threads, updateSettings, logCall, sendText],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside StoreProvider');
  return v;
}

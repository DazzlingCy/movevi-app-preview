import { useCallback, useEffect, useRef, useState } from 'react';
import { matchesMileageTarget, type MileageCommand, type MileageRunRoute, type MileageSnapshot } from './mileageTeams';
import { createLocalMileageService } from './localMileageTeams';
import { MileageError } from '../server/mileageTeamsStore';

class RequestError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

const outboxKey = 'movevi-mileage-outbox-v1';
const sessionKey = 'movevi-mileage-session';
type RunSubmission = Extract<MileageCommand, { action: 'finish' }>;
export type MileageRunSession = { id: string; registered: Promise<void> };

function readOutbox(): RunSubmission[] {
  try {
    const stored = JSON.parse(localStorage.getItem(outboxKey) ?? '[]');
    return Array.isArray(stored) ? stored.filter(item => item?.action === 'finish' && typeof item.runId === 'string' && Number.isSafeInteger(item.meters)) : [];
  } catch { return []; }
}

export function useMileageTeam(visible: boolean) {
  const [snapshot, setSnapshot] = useState<MileageSnapshot>();
  const [error, setError] = useState('');
  const sequence = useRef(0);
  const applied = useRef(0);
  const outbox = useRef(readOutbox());
  const flushing = useRef(false);
  const refreshing = useRef(false);
  const localService = useRef<ReturnType<typeof createLocalMileageService>>();
  const usingLocalPreview = useRef(false);

  const request = useCallback(async (command?: MileageCommand) => {
    const version = ++sequence.current;
    const localRequest = () => {
      localService.current ??= createLocalMileageService(window.localStorage);
      try { return localService.current.request(command); }
      catch (e) {
        if (e instanceof MileageError) throw new RequestError(e.message, e.status);
        throw e;
      }
    };
    let body: MileageSnapshot;
    if (usingLocalPreview.current) body = localRequest();
    else {
      let response: Response | undefined;
      try {
        response = await fetch(new URL('api/mileage-teams', window.location.href), {
          credentials: 'same-origin', cache: 'no-store',
          ...(command && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) }),
        });
      } catch (e) {
        if (!import.meta.env.PROD) throw e;
        usingLocalPreview.current = true;
      }
      if (!response || !response.headers.get('Content-Type')?.includes('application/json')) {
        if (!import.meta.env.PROD) throw new RequestError('小队服务未连接，请使用本地预览', 503);
        usingLocalPreview.current = true;
        body = localRequest();
      } else {
        const payload = await response.json();
        if (!response.ok) throw new RequestError(payload.message ?? '小队服务暂不可用', response.status);
        body = payload as MileageSnapshot;
      }
    }
    try { localStorage.setItem(sessionKey, '1'); } catch { /* The session cookie remains available. */ }
    if (version >= applied.current) {
      applied.current = version;
      setSnapshot(body);
      setError('');
    }
    return body;
  }, []);

  const report = (e: unknown) => e instanceof RequestError ? e.message : '无法连接小队服务，请稍后重试';
  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    try { await request(); }
    catch (e) { setError(report(e)); }
    finally { refreshing.current = false; }
  }, [request]);

  const saveOutbox = () => {
    try { localStorage.setItem(outboxKey, JSON.stringify(outbox.current)); }
    catch { /* A subsequent poll can still retry the current tab's submission. */ }
  };

  const flush = useCallback(async () => {
    if (flushing.current || !outbox.current.length) return;
    flushing.current = true;
    try {
      while (outbox.current.length) {
        try { await request(outbox.current[0]); }
        catch (e) {
          if (!(e instanceof RequestError) || e.status >= 500) {
            setError('小队里程待同步');
            return;
          }
          setError(report(e));
        }
        outbox.current.shift();
        saveOutbox();
      }
    } finally { flushing.current = false; }
  }, [request]);

  const teamStatus = snapshot?.current?.status;
  useEffect(() => {
    const following = teamStatus === 'waiting' || teamStatus === 'active';
    if (!visible && !following && !outbox.current.length) {
      try { if (!teamStatus && localStorage.getItem(sessionKey)) void refresh(); } catch { /* Only active views need to retry. */ }
      return;
    }
    const sync = async () => { await refresh(); await flush(); };
    void sync();
    const timer = window.setInterval(sync, visible ? 2000 : 5000);
    window.addEventListener('focus', sync);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', sync); };
  }, [visible, teamStatus, refresh, flush]);

  const perform = async (command: MileageCommand) => {
    try { await request(command); return true; }
    catch (e) {
      if (command.action === 'join' || command.action === 'simulatePartner') await refresh();
      setError(report(e));
      return false;
    }
  };

  const startRun = (route: MileageRunRoute): MileageRunSession | undefined => {
    const current = snapshot?.current;
    if (current?.status !== 'active' || !matchesMileageTarget(current.target, route)) return;
    const id = crypto.randomUUID();
    const registered = request({ action: 'start', teamId: current.id, runId: id, route }).then(() => undefined);
    void registered.catch(e => setError(report(e)));
    return { id, registered };
  };

  const finishRun = async (session: MileageRunSession, meters: number) => {
    if (!Number.isSafeInteger(meters) || meters <= 0) return;
    try { await session.registered; }
    catch { return; }
    if (!outbox.current.some(item => item.runId === session.id)) {
      outbox.current.push({ action: 'finish', runId: session.id, meters });
      saveOutbox();
    }
    await flush();
  };

  return { snapshot, error, refresh, perform, startRun, finishRun };
}

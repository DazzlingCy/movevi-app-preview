import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import type { MileageCommand } from '../journey/mileageTeams';
import { applyMileageCommand, emptyMileageDatabase, MileageError, mileageSnapshot, type MileageDatabase } from './mileageTeamsStore';

const cookieName = 'movevi_mileage_session';
const endpoint = '/api/mileage-teams';

function identify(req: IncomingMessage, res: ServerResponse) {
  let token = (req.headers.cookie ?? '').match(/(?:^|;\s*)movevi_mileage_session=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) {
    token = randomBytes(32).toString('hex');
    res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`);
  }
  return createHash('sha256').update(token).digest('hex');
}

async function readCommand(req: IncomingMessage): Promise<MileageCommand> {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new MileageError('请求格式无效', 400);
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 8192) throw new MileageError('请求过大', 413);
  }
  try {
    const command = JSON.parse(body);
    if (!command || typeof command.action !== 'string') throw new Error();
    return command;
  } catch { throw new MileageError('请求格式无效', 400); }
}

export function createMileageMiddleware(file: string) {
  let data: MileageDatabase;
  try { data = JSON.parse(readFileSync(file, 'utf8')); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    data = emptyMileageDatabase();
  }

  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const user = identify(req, res);
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        if (origin && new URL(origin).host !== req.headers.host) throw new MileageError('请从活动页操作', 403);
        const command = await readCommand(req);
        // Once the request body arrives, validation and the disk commit run in one turn.
        const next = structuredClone(data);
        applyMileageCommand(next, user, command, Date.now());
        mkdirSync(dirname(file), { recursive: true });
        const pending = `${file}.${process.pid}.tmp`;
        writeFileSync(pending, JSON.stringify(next));
        renameSync(pending, file);
        data = next;
      } else if (req.method !== 'GET') throw new MileageError('请求方法无效', 405);
      res.end(JSON.stringify(mileageSnapshot(data, user)));
    } catch (error) {
      res.statusCode = error instanceof MileageError ? error.status : 500;
      res.end(JSON.stringify({ message: error instanceof MileageError ? error.message : '小队服务暂不可用，请重试' }));
    }
  };
}

export function mileageTeamsPlugin(): Plugin {
  const dataFile = () => resolve(process.env.MOVEVI_MILEAGE_STATE_PATH ?? 'tmp/mileage-teams.json');
  return {
    name: 'movevi-mileage-teams',
    configureServer(server) { server.middlewares.use(endpoint, createMileageMiddleware(dataFile())); },
    configurePreviewServer(server) { server.middlewares.use(endpoint, createMileageMiddleware(dataFile())); },
  };
}

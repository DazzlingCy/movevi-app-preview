import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmdirSync, unlinkSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createMileageMiddleware } from '../server/mileageTeamsPlugin';
import { applyMileageCommand, emptyMileageDatabase, mileageSnapshot } from '../server/mileageTeamsStore';
import { coinBalance, importMileageGrants, readCoinLedger } from './coinRewards';
import { createLocalMileageService } from './localMileageTeams';
import { mileageMemberShortfall, MILEAGE_TEAM_TIERS, type MileageCommand, type MileageRunRoute } from './mileageTeams';

const now = Date.parse('2026-11-24T14:00:00+08:00');
const forest = { kind: 'mode', id: 'forest' } as const;
const forestOne = { modeId:'forest', cityId:'scene-forest-auckland', routeId:'forest-auckland' };
const forestTwo = { modeId:'forest', cityId:'scene-forest-podgorica', routeId:'forest-podgorica' };
const tokyoOne = { cityId:'tokyo', routeId:'tokyo-route-1' };

test('full team is the same for both members and fresh valid runs from different routes accumulate once', () => {
  const data = emptyMileageDatabase();
  const act = (user:string,command:MileageCommand,time=now)=>applyMileageCommand(data,user,command,time);
  assert.throws(()=>act('a',{action:'create',target:{kind:'mode',id:'tag:unavailable'},goalMeters:6000}),/可跑路线/);
  act('a',{action:'create',target:forest,goalMeters:6000});
  const team = mileageSnapshot(data,'a').current!;
  assert.equal(mileageSnapshot(data,'b').lobby[0].id,team.id);
  assert.throws(()=>act('a',{action:'start',teamId:team.id,route:forestOne,runId:randomUUID()}),/满员/);
  act('b',{action:'join',teamId:team.id});
  assert.equal(mileageSnapshot(data,'b').current?.id,team.id);
  assert.equal(mileageSnapshot(data,'c').lobby.length,0);
  assert.throws(()=>act('a',{action:'start',teamId:team.id,route:tokyoOne,runId:randomUUID()}),/目标/);
  assert.throws(()=>act('a',{action:'start',teamId:team.id,route:{...forestOne,modeId:'beach'},runId:randomUUID()}),/目标/);
  const run=(user:string,route:MileageRunRoute,meters:number)=>{
    const runId=randomUUID();
    act(user,{action:'start',teamId:team.id,route,runId});
    assert.throws(()=>act(user,{action:'finish',runId,meters}),/核验/);
    act(user,{action:'finish',runId,meters},now+2_000_000);
    act(user,{action:'finish',runId,meters},now+2_000_000);
  };
  run('a',forestOne,3000);
  run('b',forestTwo,2000);
  assert.equal(mileageMemberShortfall(team,'a'),undefined);
  run('a',forestOne,1000);
  assert.equal(team.status,'complete');
  assert.deepEqual(team.members.map(runner=>runner.meters),[4000,2000]);

  act('a',{action:'claim',teamId:team.id});
  act('a',{action:'claim',teamId:team.id},now+7);
  assert.equal(mileageSnapshot(data,'b').grants.length,0);
  act('b',{action:'claim',teamId:team.id},now+10);
  const ledger = importMileageGrants([],mileageSnapshot(data,'a').grants);
  assert.equal(coinBalance(ledger),300);
  assert.equal(importMileageGrants(ledger,mileageSnapshot(data,'a').grants),ledger);
  assert.deepEqual(readCoinLedger(JSON.stringify(ledger)),ledger);
  assert.equal(mileageSnapshot(data,'b').grants.length,1);

  act('a',{action:'create',target:forest,goalMeters:2000});
  const next=mileageSnapshot(data,'a').current!;
  assert.notEqual(next.id,team.id);
  assert.equal(next.status,'waiting');
  assert.equal(next.members.length,1);
  assert.equal(next.plan?.goalMeters,2000);
  assert.equal(mileageSnapshot(data,'b').current?.id,team.id);
  act('b',{action:'join',teamId:next.id});
  assert.deepEqual(next.members.map(runner=>runner.meters),[0,0]);
  act('a',{action:'leave',teamId:next.id});
  assert.equal(mileageSnapshot(data,'b').history[0].status,'closed');
  act('b',{action:'create',target:{kind:'city',id:'tokyo'},goalMeters:4000});
  assert.equal(mileageSnapshot(data,'b').current?.status,'waiting');
});

test('a city counts matching routes, and 6 + 0 km still requires the other member',()=>{
  const data=emptyMileageDatabase();
  const act=(user:string,command:MileageCommand,time=now)=>applyMileageCommand(data,user,command,time);
  act('a',{action:'create',target:{kind:'city',id:'tokyo'},goalMeters:6000});
  const team=mileageSnapshot(data,'a').current!;
  act('b',{action:'join',teamId:team.id});
  for (const route of [tokyoOne,{cityId:'tokyo',routeId:'tokyo-route-2'}]) {
    const runId=randomUUID();
    act('a',{action:'start',teamId:team.id,route,runId});
    act('a',{action:'finish',runId,meters:3000},now+2_000_000);
  }
  assert.equal(mileageMemberShortfall(team,'a'),'队友还差 1 km');
  assert.equal(mileageMemberShortfall(team,'b'),'你还差 1 km');
  assert.throws(()=>act('a',{action:'claim',teamId:team.id}),/尚未达标/);
  assert.throws(()=>act('b',{action:'start',teamId:team.id,route:forestOne,runId:randomUUID()}),/目标/);
});

test('only the captain can simulate filling an open slot and the new teammate starts at zero', () => {
  const data = emptyMileageDatabase();
  applyMileageCommand(data, 'captain', { action:'create', target:forest, goalMeters:6000 }, now);
  const team = mileageSnapshot(data, 'captain').current!;
  const simulate = { action:'simulatePartner', teamId:team.id } as const;

  assert.throws(() => applyMileageCommand(data, 'other', simulate, now), /尚未加入/);
  applyMileageCommand(data, 'captain', simulate, now + 1);
  applyMileageCommand(data, 'captain', simulate, now + 2);
  assert.equal(team.status, 'active');
  assert.equal(team.startedAt, now + 1);
  assert.equal(team.members[1].name, '林小满');
  assert.deepEqual(team.members.map(person => person.meters), [0, 0]);
  assert.deepEqual(mileageSnapshot(data, 'other').lobby, []);
  assert.throws(() => applyMileageCommand(data, 'other', { action:'join', teamId:team.id }, now), /已满/);
  assert.throws(() => applyMileageCommand(data, 'captain', { action:'claim', teamId:team.id }, now), /尚未达标/);

  applyMileageCommand(data, 'captain', { action:'leave', teamId:team.id }, now);
  applyMileageCommand(data, 'captain', { action:'create', target:forest, goalMeters:6000 }, now);
  const realTeam = mileageSnapshot(data, 'captain').current!;
  applyMileageCommand(data, 'other', { action:'join', teamId:realTeam.id }, now);
  assert.throws(() => applyMileageCommand(data, 'captain', { ...simulate, teamId:realTeam.id }, now), /已满/);
  assert.throws(() => applyMileageCommand(data, 'captain', { action:'simulateMileage', teamId:realTeam.id }, now), /不支持模拟贡献/);
  assert.throws(() => applyMileageCommand(data, 'captain', { action:'simulateMileage', teamId:realTeam.id, member:'self' }, now), /不支持模拟贡献/);
  assert.equal(realTeam.members[1].id, 'other');
});

test('preview teams can reach the reward screen by simulating both contributions without a workout', () => {
  const data = emptyMileageDatabase();
  const act = (command:MileageCommand) => applyMileageCommand(data, 'captain', command, now);
  act({ action:'create', target:forest, goalMeters:4000 });
  const teamId = mileageSnapshot(data, 'captain').current!.id;
  const self = { action:'simulateMileage', teamId, member:'self' } as const;
  assert.throws(() => act(self), /不支持模拟贡献/);
  act({ action:'simulatePartner', teamId });
  act(self);
  act(self);
  const team = mileageSnapshot(data, 'captain').current!;
  assert.deepEqual(team.members.map(person => person.meters), [1000, 0]);
  assert.equal(team.status, 'active');
  assert.throws(() => act({ action:'claim', teamId }), /尚未达标/);

  act({ action:'simulateMileage', teamId, member:'partner' });
  assert.deepEqual(team.members.map(person => person.meters), [1000, 3000]);
  assert.equal(team.status, 'complete');
  assert.deepEqual(data.workouts, {});
  act({ action:'claim', teamId });
  act({ action:'claim', teamId });
  const { grants } = mileageSnapshot(data, 'captain');
  assert.equal(grants.length, 1);
  assert.equal(grants[0].coins, 200);
});

test('simulated contribution and an eligible run unlock one claim in either order', () => {
  for (const [index, plan] of MILEAGE_TEAM_TIERS.entries()) {
    const partnerFirst = index !== 1;
    const partnerMeters = plan.goalMeters - 1000;
    const data = emptyMileageDatabase();
    const act = (command: MileageCommand, time = now) => applyMileageCommand(data, 'captain', command, time);
    act({ action:'create', target:forest, goalMeters:plan.goalMeters });
    const team = mileageSnapshot(data, 'captain').current!;
    const teamId = team.id;
    act({ action:'simulatePartner', teamId });
    const simulate = () => act({ action:'simulateMileage', teamId });
    if (partnerFirst) {
      simulate();
      simulate();
      assert.deepEqual(team.members.map(person => person.meters), [0, partnerMeters]);
      assert.throws(() => act({ action:'claim', teamId }), /尚未达标/);
    }
    const runId = randomUUID();
    act({ action:'start', teamId, runId, route:forestOne });
    act({ action:'finish', runId, meters:1000 }, now + 335_000);
    if (!partnerFirst) simulate();
    simulate();
    assert.equal(team.status, 'complete');
    assert.deepEqual(team.members.map(person => person.meters), [1000, partnerMeters]);
    act({ action:'claim', teamId });
    act({ action:'claim', teamId });
    const ledger = importMileageGrants([], mileageSnapshot(data, 'captain').grants);
    assert.equal(coinBalance(ledger), plan.rewardCoins);
    assert.deepEqual(readCoinLedger(JSON.stringify(ledger)), ledger);
  }
});

test('invalid mileage tiers are refused and older teams retain their promised 180 coins', () => {
  const data = emptyMileageDatabase();
  assert.throws(() => applyMileageCommand(data, 'captain', {
    action:'create', target:forest, goalMeters:3000 as 2000,
  }, now), /请选择 2、4 或 6 公里/);
  assert.equal(data.teams.length, 0);

  const teamId = randomUUID();
  data.teams.push({
    id:teamId, target:{ ...forest, name:'森林' }, status:'complete', createdAt:now, startedAt:now,
    members:[{ id:'captain', name:'队长', meters:1000 },{ id:'other', name:'队友', meters:5000 }],
  });
  applyMileageCommand(data, 'captain', { action:'claim', teamId }, now);
  const ledger = importMileageGrants([], mileageSnapshot(data, 'captain').grants);
  assert.equal(coinBalance(ledger), 180);
  assert.deepEqual(readCoinLedger(JSON.stringify(ledger)), ledger);
});

test('the five preview offers can be joined independently and run with their named captains', () => {
  const data = emptyMileageDatabase();
  const { lobby, previewLobby } = mileageSnapshot(data, 'viewer');
  assert.equal(lobby.length, 0);
  assert.equal(previewLobby.length, 5);
  assert.equal(new Set(previewLobby.map(offer => offer.captain)).size, 5);

  for (const [index, offer] of previewLobby.entries()) {
    const user = `runner-${index}`;
    const join = { action:'join', teamId:offer.id } as const;
    applyMileageCommand(data, user, join, now);
    const team = mileageSnapshot(data, user).current!;
    applyMileageCommand(data, user, join, now + 1);
    assert.equal(mileageSnapshot(data, user).current?.id, team.id);
    assert.equal(team.status, 'active');
    assert.deepEqual(team.target, offer.target);
    assert.equal(team.members[0].name, offer.captain);
    assert.equal(team.members[1].id, user);
    applyMileageCommand(data, user, { action:'simulateMileage', teamId:team.id }, now + 2);
    assert.deepEqual(team.plan, offer.plan);
    assert.deepEqual(team.members.map(person => person.meters), [offer.plan.goalMeters - 1000, 0]);
    assert.deepEqual(mileageSnapshot(data, user).grants, []);
  }

  const offer = previewLobby[0];
  applyMileageCommand(data, 'viewer', { action:'join', teamId:offer.id }, now);
  const otherTeam = mileageSnapshot(data, 'viewer').current!;
  assert.notEqual(otherTeam.members[0].id, mileageSnapshot(data, 'runner-0').current?.members[0].id);
  assert.deepEqual(otherTeam.members.map(person => person.meters), [0, 0]);
  assert.throws(() => applyMileageCommand(data, 'viewer', { action:'join', teamId:previewLobby[1].id }, now), /已有一支小队/);
});

test('the browser preview service persists a team and identity without an API server', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const first = createLocalMileageService(storage);
  const initial = first.request();
  assert.equal(initial.previewLobby.length, 5);
  first.request({ action:'create', target:forest, goalMeters:2000 });
  const created = first.request().current!;
  first.request({ action:'simulatePartner', teamId:created.id });

  const restored = createLocalMileageService(storage).request();
  assert.equal(restored.self, initial.self);
  assert.equal(restored.current?.id, created.id);
  assert.equal(restored.current?.status, 'active');
  assert.deepEqual(restored.current?.members.map(item => item.meters), [0, 0]);
});

test('HTTP lobby accepts one of two simultaneous joins and restores the team from disk',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'movevi-mileage-'));
  const file=join(folder,'state.json');
  const serve=async()=>{
    const server=createServer(createMileageMiddleware(file));
    await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
    const {port}=server.address() as { port:number };
    const client=async()=>{
      const endpoint=`http://127.0.0.1:${port}/api/mileage-teams`;
      const first=await fetch(endpoint);
      const cookie=first.headers.get('set-cookie')!.split(';')[0];
      return {cookie,endpoint, send:(command?:MileageCommand)=>fetch(endpoint,{
        headers:{cookie,'Content-Type':'application/json'},
        ...(command&&{method:'POST',body:JSON.stringify(command)}),
      })};
    };
    return {client,close:()=>new Promise<void>((done,fail)=>server.close(error=>error?fail(error):done()))};
  };
  let host=await serve();
  try {
    const [captain,first,second]=await Promise.all([host.client(),host.client(),host.client()]);
    const response=await captain.send({action:'create',target:forest,goalMeters:4000});
    const team=(await response.json()).current;
    const joinTeam={action:'join',teamId:team.id} as const;
    const results=await Promise.all([first.send(joinTeam),second.send(joinTeam)]);
    assert.deepEqual(results.map(result=>result.status).sort(),[200,409]);
    assert.equal((await (await captain.send()).json()).current.members.length,2);
    await host.close();
    host=await serve();
    const replacement=await host.client();
    const resumed=await fetch(replacement.endpoint,{headers:{cookie:captain.cookie}});
    assert.equal((await resumed.json()).current.id,team.id);
  } finally {
    await host.close();
    try { unlinkSync(file); } catch { /* Initial request may have failed. */ }
    rmdirSync(folder);
  }
});

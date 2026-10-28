import { useState } from 'react';
import { periodParticipation, ownPieces, puzzleComplete, type PuzzlePiece, type PuzzleRoute, type PuzzleState } from '../journey/puzzleTeam';
import { weekendPeriod, periodOpen } from '../journey/weekendRelay';
import styles from './PuzzleDemoControls.module.css';
export default function PuzzleDemoControls({ state, routes, onJoin, onFinish, onOpen, onRunComplete, now:clock, onPeriod, onLobby, onUnjoined }: {
  onLobby:()=>void; onUnjoined:()=>void; now:()=>number; onPeriod:(open:boolean)=>void; state: PuzzleState; routes: PuzzleRoute[]; onJoin: () => void; onFinish: (teamId: string, piece: PuzzlePiece) => unknown;
  onOpen: () => void; onRunComplete?: () => void;
}) {
  const [open,setOpen]=useState(false), [friendId,setFriendId]=useState('');
  const team=periodParticipation(state,weekendPeriod(clock()).id),active=!!team&&!team.archived&&periodOpen(team.period,clock()),friends=team?.members.filter(m=>m.id!=='self') ?? [];
  const friend=friends.find(m=>m.id===friendId) ?? friends[0];
  const friendRoute=routes.find(r=>r.id===team?.city.id&&!team?.pieces.some(p=>p.memberId===friend?.id&&p.route.id===r.id&&p.route.routeId===r.routeId));
  const simulate=()=>{
    if(!team||!friend||!friendRoute)return;
    const now=clock();
    onFinish(team.id,{id:crypto.randomUUID(),memberId:friend.id,slot:team.pieces.length,startedAt:now,finishedAt:now,route:friendRoute,distanceKm:friendRoute.distanceKm});
  };
  return <aside className={styles.controls} aria-label="独立环球搭子演示控制"><button onClick={()=>setOpen(!open)}>{open?'收起演示':'演示'}</button>{open&&<div><strong>仅用于本机原型</strong><button disabled={!!onRunComplete} onClick={()=>onPeriod(true)}>模拟周末进行中</button><button disabled={!!onRunComplete} onClick={()=>onPeriod(false)}>模拟本期结束</button>
    <button disabled={!!onRunComplete} onClick={()=>{onUnjoined();onOpen();setOpen(false);}}>周末进行中 · 未加入小队</button>
    <button disabled={!!onRunComplete} onClick={()=>{onOpen();setOpen(false);}}>打开环球搭子小队</button>
    <button onClick={onLobby}>模拟一支待加入小队</button>
    <button disabled={!active||!team||team.members.length>=2||puzzleComplete(team)||!!onRunComplete} onClick={onJoin}>模拟队友加入</button>
    {friends.length>0&&<label>选择跑友<select aria-label="模拟完成的成员" value={friend?.id} onChange={e=>setFriendId(e.currentTarget.value)} style={{width:'100%',color:'#18202b',padding:8}}>{friends.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>}
    <button disabled={!active||!friend||!team||puzzleComplete(team)||ownPieces(team,friend.id).length>=2||!friendRoute} onClick={simulate}>模拟该跑友跑完一棒</button>
    <button disabled={!onRunComplete} onClick={onRunComplete}>模拟跑完当前路线</button><small>没有真实远程用户或现金交易。普通链接不会显示此面板。</small>
  </div>}</aside>;
}

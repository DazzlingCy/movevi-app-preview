import { drawsLeft, duoGoalComplete, ownPieces, puzzleComplete, puzzleAllPieces, sharedPuzzleRoute, type PuzzleTeam } from './puzzleTeam';

/** Announce newly credited routes, never restored records or repeated callbacks. */
export function puzzleProgressFeedback(previous: PuzzleTeam | undefined, next: PuzzleTeam | undefined, memberId = 'self'): string | undefined {
  if (!previous || !next || previous.id !== next.id) return;
  const added = puzzleAllPieces(next).filter(piece => !puzzleAllPieces(previous).some(old => old.id === piece.id));
  if (!added.length) return;
  if (next.mode === 'duo') {
    if (duoGoalComplete(next)) return '双倍金币已解锁，可以领取了。';
    return added.some(piece => piece.memberId === memberId) ? '你已跑完，等搭子完成即可领取。' : '搭子已跑完，轮到你了。';
  }
  if (!sharedPuzzleRoute(previous) && sharedPuzzleRoute(next)) return '同路挑战完成！你和搭子都已完成这条路线，可以领取额外金币。';
  if (!puzzleComplete(previous) && puzzleComplete(next)) {
    return `小队任务完成！大转盘已解锁，你可抽奖 ${drawsLeft(next)} 次。`;
  }
  const own = ownPieces(next).length;
  if (added.some(piece => piece.memberId === 'self')) {
    return own >= 2 ? '你已完成 2 条路线，下一棒交给搭子。' : `路线完成！小队进度 ${next.pieces.length}/3。`;
  }
  const member = next.members.find(member => member.id === added[added.length - 1].memberId);
  return `${member?.name ?? '搭子'}已完成路线，小队进度 ${next.pieces.length}/3。`;
}

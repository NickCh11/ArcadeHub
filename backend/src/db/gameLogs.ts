import { db } from './client';

export async function createGameLog(params: {
  sessionId: string;
  gameType: string;
  player1Id: string;
  player2Id: string;
}): Promise<string | null> {
  const { data, error } = await db
    .from('game_logs')
    .insert({
      session_id: params.sessionId,
      game_type: params.gameType,
      player1_id: params.player1Id,
      player2_id: params.player2Id,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[GameLog] Failed to create game log:', error.message);
    return null;
  }

  return data.id;
}

export async function finalizeGameLog(params: {
  logId: string;
  winnerId: string | null;
  loserId: string | null;
  endReason: 'win' | 'forfeit';
}): Promise<void> {
  const { error } = await db
    .from('game_logs')
    .update({
      winner_id: params.winnerId,
      loser_id: params.loserId,
      end_reason: params.endReason,
      ended_at: new Date().toISOString(),
    })
    .eq('id', params.logId);

  if (error) {
    console.error('[GameLog] Failed to finalize game log:', error.message);
  }
}

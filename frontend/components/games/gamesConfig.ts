export type GameId = 'billiards';

export interface GameMeta {
  id: GameId;
  name: string;
  description: string;
  players: string;
  icon: string;
  status: 'available' | 'coming-soon';
}

export const GAMES: GameMeta[] = [
  {
    id: 'billiards',
    name: '8-Ball Pool',
    description: 'Classic multiplayer billiards. Sink all your balls then pocket the 8-ball to win.',
    players: '2 Players',
    icon: '🎱',
    status: 'available',
  },
];

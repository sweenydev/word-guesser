declare type VideoInfo = {
  prompt: string;
  title: string;
  videoURL: string;
  channelName: string;
  channelURL: string;
  description: string;
  releaseDate: string;
  thumbnailURL: string;
};

declare type GameState = 'menu' | 'playing' | 'gameover' | 'roundover';
declare type GameMode = 'speed' | 'endurance';
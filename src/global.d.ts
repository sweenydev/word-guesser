declare type VideoInfo = {
  prompt: string;
  title: string;
  videoId: string;
  channelName: string;
  channelId: string;
  description: string;
  releaseDate: string;
  thumbnailURL: string;
  views: number;
};

declare type HintCosts = {
  [key: string]: number | (() => number);
  incorrectGuess: number;
  changeWord: number;
  nextVideo: number;
  revealLetter: () => number;
  newMysteryWord: number;
}

declare type GameState = 'menu' | 'playing' | 'gameover' | 'roundover';
declare type GameMode = 'speed' | 'endurance';
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
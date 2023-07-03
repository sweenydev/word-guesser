import './App.scss';
import { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/buttons/standard-button';
import InputButton from './reusable-components/buttons/input-button';
import MysteryWord from './reusable-components/mystery-word/mystery-word';
import VideoBrowser from './reusable-components/video-browser/video-browser';
import HPBar from './reusable-components/hp-bar/hp-bar';
import { formatTime } from './util';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import useCountdownTimer from './custom-hooks/countdown-timer';
import CountUp from 'react-countup';

const firebaseConfig = {
  apiKey: "AIzaSyCI5pnnoKyC9g1AHSN0qq_xkGc3bOaUSPk",
  authDomain: "word-player-sweeny.firebaseapp.com",
  projectId: "word-player-sweeny",
  storageBucket: "word-player-sweeny.appspot.com",
  messagingSenderId: "904947896904",
  appId: "1:904947896904:web:0a2085a0fed5025e153e7d",
  measurementId: "G-ZHFWCJ21E1"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const searchYoutube = httpsCallable(getFunctions(), 'searchYoutube');

const mysteryWordsFile = require('./words.txt');
const maxHP: number = 100;
const timeLimit: number = 120000;

function App() {
  const wordsList = useRef<Array<string>>([]);
  const currentSearch = useRef<Array<any>>([]);
  const mysteryWordComponentRef = useRef<any>(null);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [guessedWords, setGuessedWords] = useState<Array<string>>([]);
  const [hintPoints, setHintPoints] = useState<number>(maxHP);
  const [roundScores, setRoundScores] = useState<Array<RoundScores>>([]);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videosPurchased, setVideosPurchased] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('1p6ofiJDACk');
  const [videoIsPlaying, setVideoIsPlaying] = useState<boolean>(false);
  const [confettiFalling, setConfettiFalling] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('endurance');
  const [roundNumber, setRoundNumber] = useState<number>(-1);
  const [videoHistory, setVideoHistory] = useState<Array<Array<VideoInfo>>>([]);
  const [timeRemaining, startOrStopTimer, setTimeRemaining] = useCountdownTimer(timeLimit);

  /** Prepare the words list. This code will only run when component mounts */
  useEffect(() => {
    fetch(mysteryWordsFile).then(response => response.text()).then((text) => {
      wordsList.current = text.split('\r\n');
    });
  }, []);

  /** Run searchVids everytime there is a change to userWord or mysteryWord to generate and select new videos */
  useEffect(() => {
    const searchVids = async() => {
      currentSearch.current = [];
      setSearchIndex(0);
      setVideoIsPlaying(false);
      startOrStopTimer(false);
      searchYoutube(`${userWord} ${mysteryWord}`).then(async (searchResults: any) => {
        const newSearchResults: VideoInfo[] = searchResults.data;
        newSearchResults.sort((a, b) => { // Move videos with the words in the title to the top of the results, both words -> mystery word -> user word
          const assignPriority = (title: string): number => {
            let hasMystery: boolean = title.includes(mysteryWord.toLowerCase());
            let hasUser: boolean = title.includes(userWord.toLowerCase());
            return (hasMystery && hasUser) ? 3 :
              (hasMystery) ? 2 :
              (hasUser) ? 1 : 0;
          }
          return assignPriority(b.title.toLowerCase()) - assignPriority(a.title.toLowerCase());
        });
        setVideosPurchased(0);
        setVideoId(newSearchResults[searchIndex].videoId);
        addToVideoHistory(newSearchResults[searchIndex]);
        currentSearch.current = newSearchResults;
      })
      .catch((err: any) => console.log('Search error:', err));
    };
    if (userWord && mysteryWord) searchVids();
  }, [userWord, mysteryWord]);

  /** Change video with previously fetched data when updating search index */
  useEffect(() => {
    if (currentSearch.current.length > 0) setVideoId(currentSearch.current[searchIndex].videoId); 
  }, [searchIndex]);
  
  /** End the game when the countdown timer reaches 0*/
  useEffect(() => {
    if (timeRemaining === 0) endGame();
  }, [timeRemaining]);

  /**
   * Adds a new VideoInfo object to the video history array for the current round.
   * @param {any} newVideoInfo - The youtube search result to add to the video history.
   * @returns {void}
   */
  function addToVideoHistory(newVideoInfo: VideoInfo): void {
    const newVideoHistory: VideoInfo[][] = [...videoHistory];
    (newVideoHistory[roundNumber] ||= []).push(newVideoInfo);
    setVideoHistory(newVideoHistory);
  }

  /**
   * Removes the last video from the video history and current search results if there is an error 
   * loading the video. It then sets the current video ID to the next video in the search results 
   * if there are any left. If there are no more videos left in the search results, it sets the 
   * current video ID to the previous video in the video history.
   * @param error - The error object.
   * @returns void
   */
  function handleVideoLoadError(error: any): void {
    if (gameMode==='speed') startOrStopTimer(false);
    let newVideoHistory: VideoInfo[][] = [...videoHistory];
    newVideoHistory[newVideoHistory.length - 1].splice(-1);
    setVideoHistory(newVideoHistory);
    currentSearch.current.splice(searchIndex, 1);
    if(currentSearch.current.length <= searchIndex) {
      // return to previous video if end of search results
      setSearchIndex(searchIndex - 1);
    } else {
      addToVideoHistory(currentSearch.current[searchIndex]);
    }
    setVideoId(currentSearch.current[searchIndex].videoId);
    console.log('error occurred on vid!', error);
  }

  /**
   * Play video and resume the timer when the video is loaded
   * @returns void
   */
  function onVideoReady(): void {
    setVideoIsPlaying(true);
    if (gameMode === 'speed') startOrStopTimer(true);
  }

  /**
   * Starts a new game with given game mode and user word.
   * @param gameMode The chosen game mode.
   * @param initUserWord The initial user word to use in the game.
   * @returns void if the initUserWord parameter is empty, otherwise returns "incorrect" for inputbutton animation.
   */
  function startGame(gameMode: GameMode, initUserWord: string): void | string {
    if (!initUserWord) return 'incorrect';
    setVideoHistory([]);
    setCurrentScore(0);
    setRoundNumber(-1);
    setGameMode(gameMode);
    changeUserWord(initUserWord, true);
    if (gameMode === 'endurance') {
      setHintPoints(maxHP);
    } else if (gameMode === 'speed') {
      setTimeRemaining(timeLimit);
    }
    startNextRound();
  }

  /**
   * Starts the next round of the game, generates a new mystery word, and resumes video playing.
   * @returns void
   */
  function startNextRound(): void {
    setRoundNumber(roundNumber+1);
    generateNewMysteryWord(true);
    setRoundScores([...roundScores, {independence: 100, certainty: 100}]);
    setGameState('playing');
  }

  /**
   * Changes the gamestate to bring up the gameover screen, stops video playback.
   * @returns void
   */
  function endGame(): void {
    //TODO: Add local leaderboard
    setGameState('gameover');
    setVideoIsPlaying(false);
  }

  /**
   * Charges the user for the cost of a hint based on the current game mode and game state.
   * @param {keyof HintCosts} hintType - The key for the type of hint being used.
   * @returns {void}
   */ 
  function chargeHintCost(hintType: keyof HintCosts): void {
    // Deduct hint cost
    let hintCost: number = getHintCost(hintType);
    switch(gameMode) {
      case 'endurance': 
        const newHintPoints: number = Math.max(0, Math.min(hintPoints + hintCost, maxHP));
        setHintPoints(newHintPoints);
        if (newHintPoints === 0) endGame();
        break;
      case 'speed':
        setTimeRemaining(timeRemaining + hintCost);
        break;
      default:
        console.log(`Add a chargeHintCost case for ${gameMode}!`)
    }
    // Adjust round scores based on hint type
    if (hintType !== 'correctGuess') {
      const newRoundScores: RoundScores[] = [...roundScores];
      switch(hintType) {
        case 'incorrectGuess':
          newRoundScores[roundNumber].certainty-=5;
          break;
        case 'revealLetter':
          newRoundScores[roundNumber].independence-=Math.floor(100 / mysteryWord.length);
          break;
        default:
          newRoundScores[roundNumber].independence-=5;
      }
      setRoundScores(newRoundScores);
    }
  } 

  /**
   * Check if the current hint can be bought with remaining time or hint points
   * @param hintType 
   * @returns boolean - true if the hint can be afforded
   */
  function canAffordHint(hintType: keyof HintCosts): boolean {
    return (gameMode === 'speed' ? timeRemaining : hintPoints) > -1 * getHintCost(hintType);
  }

  /**
   * Returns the cost of using a hint in the game, optionally formatted as a string.
   * @param hintType - The type of hint to use, such as ‘correctGuess’, ‘changeWord’, etc.
   * @param formatCost - Whether to format the cost as a string or not. If true, the cost will be prefixed with ‘+’ or ‘-’ and suffixed with ‘HP’ or time units depending on the game mode. If false, the cost will be a number.
   * @returns The cost of using the hint, either as a number or a string. 
   */ 
  function getHintCost(hintType: keyof HintCosts, formatCost?: boolean): any {
    const hintCosts: { [key in GameMode]: HintCosts } = { 
      endurance: {
        correctGuess: () => hintPoints === maxHP ? 0 : Math.floor((maxHP-hintPoints)/4) + 2,
        incorrectGuess: -2,
        changeWord: -10,
        nextVideo: -3,
        revealLetter: () => -1 * Math.floor(maxHP / mysteryWord.length),
        newMysteryWord: () => Math.min(-1 * Math.floor(hintPoints / 2), -1),
      },
      speed: {
        correctGuess: () => 60000,
        incorrectGuess: 0,
        changeWord: -5000,
        nextVideo: 0,
        revealLetter: () => Math.min(-1000 * Math.floor(timeRemaining / mysteryWord.length / 500), -10000),
        newMysteryWord: () => -1000 * Math.floor(timeRemaining / 2 / 1000) ,
      },
    };
    let hintCost: any = hintCosts[gameMode][hintType];
    if (typeof hintCost === 'function') hintCost = hintCost();
    if (formatCost) {
      if (hintCost === 0) return 'FREE';
      let formattedCost: string = '';
      formattedCost = formattedCost.concat(hintCost > 0 ? '+' : '-');
      formattedCost = formattedCost.concat(gameMode === 'endurance' ? `${Math.abs(hintCost)} HP` : `${formatTime(Math.abs(hintCost))}`);
      return formattedCost;
    } 
    return hintCost;
  }
  /**
   * Checks if guessWord matches the mystery word. If guessWord matches, starts a new round and rewards hint points, if incorrect it charges hintpoints.
   * @param guessWord The word the user guessed.
   * @returns void if the guess is correct, otherwise returns "incorrect" for inputbutton animation.
   */
  function checkAnswer(guessWord: string): void | string {
    setGuessedWords([...guessedWords, guessWord]);
    if (mysteryWord.toLowerCase() === guessWord.toLowerCase()) {
      if (gameMode === 'speed') startOrStopTimer(false);
      setVideoIsPlaying(false);
      setGameState('roundover');
      setConfettiFalling(true);
      chargeHintCost('correctGuess');
      setCurrentScore(currentScore + roundScores[roundNumber].certainty + roundScores[roundNumber].independence);
    } else {
      chargeHintCost('incorrectGuess');
      return 'incorrect';
    }
  }

  /**
   * Generates a new mystery word, sets the search index to 0, and charges hint points.
   * @param isFree if true, generates the new mystery word without a cost to hint points.
   * @returns void.
   */
  function generateNewMysteryWord(isFree?:boolean): void {
    setMysteryWord(wordsList.current[Math.floor(Math.random() * wordsList.current.length) + 1]);
    setGuessedWords([]);
    if (!isFree) chargeHintCost('newMysteryWord');
  }

  /**
   * Validates the user’s guess input for the mystery word.
   * @param input - The user’s input string.
   * @returns A string with an error message if the input is invalid, or null if the input is valid
   */
  function validateGuessMysteryWord(input: string): string | null {
    if (input.length !== mysteryWord.length) return `Must be ${mysteryWord.length} letters long! (${input.length}/${mysteryWord.length})`
    if (guessedWords.includes(input)) return `You already guessed ${input}!`;
    return null;
  }

  /**
   * Changes the user's word and charges hint points.
   * @param newWord The new user word.
   * @param isFree if true, changes the user's word without a cost to hint points.
   * @returns void.
   */
  function changeUserWord(newWord: string, isFree?: boolean): void {
    setUserWord(newWord);
    if (!isFree) chargeHintCost('changeWord');
    if (gameState==='roundover') startNextRound();
  }

  /**
   * Validates the user’s input for the new user word.
   * @param input - The user’s input string.
   * @returns A string with an error message if the input is invalid, or null if the input is valid
   */
  function validateChangeUserWord(input: string): string | null {
    if(input.length === 0) return `Enter your new word!`;
    if (userWord.toLowerCase() === input.toLowerCase()) return `You're already using this word!`;
    return null;
  }
  
  /**
   * Reveals a letter in the mystery word and charges hint points 
   * @returns void.
   */
  function revealLetter(): void {
    mysteryWordComponentRef.current?.revealLetter(); 
    chargeHintCost('revealLetter');
  }

  /**
   * This function buys the next video, adds it to the video history, 
   * and sets the search index to purchased video, triggering it to play
   * @returns void
   */
  function buyNextVideo(): void {
    if (videosPurchased < currentSearch.current.length) {
      const newVideosPurchased = videosPurchased + 1
      setVideosPurchased(newVideosPurchased);
      setSearchIndex(newVideosPurchased);
      addToVideoHistory(currentSearch.current[newVideosPurchased]);
      chargeHintCost('nextVideo');
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        {confettiFalling &&
          <Confetti
            className="confetti"
            numberOfPieces={15000}
            initialVelocityY={100}
            tweenDuration={8000}
            recycle={false}
            onConfettiComplete={()=>{setConfettiFalling(false)}}
            colors={[ //REFERENCE: $rainbow-colors in variables.scss
              `rgb(252, 65, 65)`,
              `orange`,
              `yellow`,
              `rgb(33, 156, 33)`,
              `rgb(94, 94, 255)`,
              `rgb(163, 77, 224)`,
              `rgb(250, 178, 250)`
            ]}/>
        } 
        <div className="tv-bezel">
          {gameState==='menu' && 
          <div className="menu-screen">
            <div className="dancing-letters title">
              <span>W</span><span>O</span><span>R</span><span>D</span>
              <div><StandardButton 
                classNames={`round light`} 
                buttonText={`►`} 
                clickHandler={()=>{setConfettiFalling(true)}} />
              </div>
              <span>P</span><span>L</span><span>A</span><span>Y</span><span>E</span><span>R</span>
            </div>
          </div>
          }
          {gameState==='roundover' && 
          <div className="menu-screen">
            <div>Correct!</div>
            <div className="round-scores">
              <span>Certainty: 
                <CountUp 
                  end={roundScores[roundNumber].certainty}
                  useEasing={false}/> 
              </span>
              <span>Independence: 
                <CountUp 
                  end={roundScores[roundNumber].independence}
                  useEasing={false}/> 
              </span>
              <span>Round Score: 
                <CountUp 
                  end={roundScores[roundNumber].independence + roundScores[roundNumber].certainty}
                  useEasing={false}/> 
              </span>
            </div>
            <VideoBrowser
              videoHistory={videoHistory}
              roundNumber={roundNumber}/>
          </div>
          }
          {gameState==='gameover' && 
          <div className="game-over-screen">
            <div> ━━━ GAME OVER ━━━</div>
            <div>Final Score: {currentScore.toString().padStart(6,'0')}</div>
            <VideoBrowser videoHistory={videoHistory}/>
          </div>
          }
        </div>
        <div className="tv-screen">
          <ReactPlayer
            url={`https://www.youtube.com/embed/${videoId}`}
            width="100%"
            height="100%"
            pip={false}
            playing={videoIsPlaying}
            loop={true}
            config={{
              playerVars: { autoplay: 1 },
            }}
            onReady={onVideoReady}
            onError={handleVideoLoadError}
            position="absolute"/>
        </div>
        {gameState==='playing' &&
        <div className="video-selectors">
          <StandardButton 
            classNames={`round ${searchIndex === 0 && 'hidden'}`} 
            buttonText={`◄`} 
            clickHandler={()=>{setSearchIndex(searchIndex - 1)}} />
          <StandardButton 
            classNames={`round ${searchIndex === videosPurchased && 'hidden'}`} 
            buttonText={`►`} 
            clickHandler={()=>{setSearchIndex(searchIndex + 1)}} />
        </div>
        }
        {(gameState==='playing' || gameState==='roundover') &&
        <div className="score-board">
          <div className="hint-points">
            {gameMode === 'speed' ? 'Time Left:' : 'Hint Points:'}
            <div className="hp-bar-container">
              {gameMode==='speed'
                ? <HPBar maxHP={timeLimit} currentHP={timeRemaining} isTimer={true}/>
                : <HPBar maxHP={maxHP} currentHP={hintPoints}/>
              }
            </div>
          </div>
          <span className="score">Score: {currentScore.toString().padStart(6,'0')}</span>
        </div>
        }
        {gameState==='playing' &&
        <div className="words-container">
          <span>Your Word: 
            <span className="user-word">{userWord}</span>
          </span>
          <span>Mystery Word:
            <MysteryWord ref={mysteryWordComponentRef} mysteryWord={mysteryWord}/>
          </span>
        </div>
        }
        <div className="hint-container">
          {gameState==='playing' &&
          <div className="grid-container">
            <div className="grid-item">
              <InputButton 
                classNames={`hint`} 
                buttonText={`Guess Mystery Word`}
                secondaryButtonText={`${getHintCost('incorrectGuess', true)} or ${getHintCost('correctGuess', true)}`}
                clickHandler={checkAnswer} 
                validationFunction={validateGuessMysteryWord}
                placeholder={`${mysteryWord.length} Letter Mystery Word`}/>
            </div>
            <div className="grid-item">
              <InputButton 
                classNames={`hint ${!canAffordHint('changeWord') && 'disabled'}`} 
                buttonText={`Change Your Word`} 
                secondaryButtonText={getHintCost('changeWord', true)}
                clickHandler={changeUserWord}
                validationFunction={validateChangeUserWord}
                placeholder={`Your New Word`}/>
            </div>
            <div className="grid-item">
              <StandardButton 
                classNames={`hint ${(videosPurchased >= currentSearch.current.length - 1 || !canAffordHint('nextVideo')) && 'disabled'}`} 
                buttonText={`Buy Next Video`} 
                secondaryButtonText={
                  videosPurchased >= currentSearch.current.length - 1 && currentSearch.current.length > 0 
                    ? 'All videos purchased!' 
                    : getHintCost('nextVideo', true)
                }
                clickHandler={buyNextVideo} />
            </div>
            <div className="grid-item">
              <StandardButton 
                classNames={`hint ${!canAffordHint('revealLetter') && 'disabled'}`} 
                buttonText={`Reveal Random Letter`} 
                secondaryButtonText={getHintCost('revealLetter', true)}
                clickHandler={revealLetter} />
            </div>
            <div className="full-row-item">
              <StandardButton 
                classNames={`hint ${!canAffordHint('newMysteryWord') && 'disabled'}`} 
                buttonText={`New Mystery Word`} 
                secondaryButtonText={getHintCost('newMysteryWord', true)}
                clickHandler={()=>{generateNewMysteryWord(false)}} />
            </div>
          </div>
          }
          {(gameState==='menu' || gameState==='gameover') &&
          <div className="start-menu grid-container">
            {gameState==='gameover' && <div className="full-row-item"><div>Play Again?</div></div>}
            <div className="full-row-item">
              <InputButton
                classNames={`hint`}
                buttonText={`Endurance Mode`}
                clickHandler={(initUserWord)=>{return startGame('endurance', initUserWord)}} 
                placeholder={`Enter Your Starting Word Here`}/>
            </div>
            <div className="full-row-item">
              <InputButton
                classNames={`hint`}
                buttonText={`Speed Mode`}
                clickHandler={(initUserWord)=>{return startGame('speed', initUserWord)}}
                placeholder={`Enter Your Starting Word Here`}/>
            </div>
            {gameState==='menu' && 
            <>
            <div className="grid-item">
              <StandardButton
                classNames={`hint`}
                buttonText={`How to Play`}
                clickHandler={()=>{}}/>
            </div>
            <div className="grid-item">
              <StandardButton
                classNames={`hint`}
                buttonText={`Options`}
                clickHandler={()=>{}}/>
            </div>
            </>
            }
          </div>
          }
          {gameState==='roundover' &&
          <div className="grid-container round-over">
            <div className="full-row-item">
              <InputButton
                classNames={`hint`}
                buttonText={`Choose Next Word`}
                secondaryButtonText={`Change your starting word for free`}
                clickHandler={(nextWord)=>{return changeUserWord(nextWord, true);}}
                validationFunction={validateChangeUserWord}
                placeholder={`Current Word: ${userWord}`}/>
            </div>
            <div className="full-row-item">
              <div>OR</div>
            </div>
            <div className="full-row-item">
              <StandardButton
                classNames={`hint`}
                buttonText={`Let it Ride!`}
                secondaryButtonText={`Keep using the same word ("${userWord}")`}
                clickHandler={startNextRound} />
            </div>
          </div>
          }
        </div>      
      </header>
    </div>
  );
}

export default App;
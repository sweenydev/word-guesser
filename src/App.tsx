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
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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

//TODO: Use to track total round times for final speed score
// class Timer {
//   private startTime: number = 0;
//   private endTime: number = 0;

//   start(): void {
//     this.startTime = Date.now();
//   }

//   stop(): number {
//     this.endTime = Date.now();
//     return this.endTime - this.startTime;
//   }
// }

function App() {
  const wordsList = useRef<Array<string>>([]);
  const currentSearch = useRef<Array<any>>([]);
  const currentSearchedIndex = useRef<number>(0);
  const mysteryWordComponentRef = useRef<any>(null);
  const timeChange = useRef<number>(0);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videosPurchased, setVideosPurchased] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('1p6ofiJDACk');
  const [videoIsPlaying, setVideoIsPlaying] = useState<boolean>(false);
  const [confettiFalling, setConfettiFalling] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('endurance');
  const [roundNumber, setRoundNumber] = useState<number>(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState<number>();
  const [videoHistory, setVideoHistory] = useState<Array<Array<VideoInfo>>>([]);

  const hintCosts: { [key in GameMode]: HintCosts }= { 
    endurance: {
      incorrectGuess: -2,
      changeWord: -5,
      nextVideo: -3,
      revealLetter: () => -1 * Math.floor(100 / mysteryWord.length),
      newMysteryWord: -15,
    },
    speed: {
      incorrectGuess: 0,
      changeWord: -5000,
      nextVideo: 0,
      revealLetter: () => -1000 * Math.floor((roundTimeLeft || 0) / mysteryWord.length / 500) - 5000,
      newMysteryWord: -10000,
    },
  };

  const roundTimeLimit: number = 120000;

  /** Prepare words list. This code will only run when component mounts */
  useEffect(() => {
    fetch(mysteryWordsFile).then(response => response.text()).then((text) => {
      wordsList.current = text.split('\r\n');
    });
  }, []);

  /** Run searchVids everytime there is a change to userWord, mysteryWord, or searchIndex, to generate and select new videos */
  useEffect(() => {
    searchVids();
  }, [userWord, mysteryWord, searchIndex]);
  
  /** Counting and gameover logic for countdown timer, updates every 100 ms when roundTimeLeft is defined */
  useEffect(() => {
    if (roundTimeLeft !== undefined) {
      if (roundTimeLeft > 0) {
        if(gameState === 'playing') {
          setTimeout(() => {
            setRoundTimeLeft(prevRoundTimeLeft => (prevRoundTimeLeft || 0) - 100 + timeChange.current);
            if (timeChange.current !== 0) timeChange.current = 0;
          }, 100);
        }
      } else {
        endGame();
      }
    }
  }, [roundTimeLeft]);

  /**
   * Searches Youtube for a video based on userWord and mysteryWord or uses previously fetched data.
   * @returns A Promise that resolves with void when the function completes.
   */
  async function searchVids(): Promise<void> {
    if (searchIndex !== currentSearchedIndex.current) {
      // Use previously fetched data when updating index instead of user/mystery word
      setVideoId(currentSearch.current[searchIndex].videoId); 
      currentSearchedIndex.current = searchIndex;
      console.log('old data used!','\nMYSTERY WORD', mysteryWord, '\nUSER WORD', userWord, '\nSEARCHINDEX', searchIndex);
    } 
    else if (userWord && mysteryWord) {
      setVideoId('1p6ofiJDACk');
      searchYoutube(`${userWord} ${mysteryWord}`).then(async (searchResults: any) => {
        const newSearchResults: VideoInfo[] = searchResults.data;
        setVideosPurchased(0);
        setVideoId(newSearchResults[searchIndex].videoId);
        addToVideoHistory(newSearchResults[searchIndex]);
        currentSearch.current = searchResults.data;
        currentSearchedIndex.current = searchIndex;
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch((err: any) => console.log(err));
    }
  }

  /**
   * Adds a new VideoInfo object to the video history array for the current round.
   * @param {any} newVideoInfo - The youtube search result to add to the video history.
   * @returns {void}
   */
  function addToVideoHistory(newVideoInfo: VideoInfo): void {
    const newVideoHistory = [...videoHistory];
    newVideoHistory[roundNumber] 
      ? newVideoHistory[roundNumber].push(newVideoInfo)
      : newVideoHistory[roundNumber] = [newVideoInfo];
    setVideoHistory(newVideoHistory);
    console.log('Current video history',newVideoHistory);
  }

  /**
   * Charges the user for the cost of a hint based on the current game mode and game state.
   * @param {keyof HintCosts} hintType - The key for the type of hint being used.
   * @returns {void}
   */ 
  function chargeHintCost(hintType: keyof HintCosts): void {
    let hintCost: any = hintCosts[gameMode][hintType];
    if(typeof hintCost === 'function') hintCost = hintCost();
    if(gameState === 'roundover') hintCost = hintCost * .4;
    switch(gameMode) {
      case 'endurance': 
        changeHintPoints(hintCost);
        break;
      case 'speed':
        timeChange.current += hintCost;
        break;
      default:
        console.log(`Add a chargeHintCost case for ${gameMode}!`)
    }
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
    generateNewMysteryWord(true);
    changeUserWord(initUserWord, true);
    setGameState('playing');
    setGameMode(gameMode);
    setCurrentScore(0);
    setRoundNumber(0);
    if (gameMode === 'endurance') {
      setHintPoints(100);
    } else if (gameMode === 'speed') {
      setRoundTimeLeft(roundTimeLimit);
    }
    setVideoIsPlaying(true);
  }

  function startNextRound(): void {
    currentSearchedIndex.current = 0;
    setRoundNumber(roundNumber+1);
    generateNewMysteryWord(true);
    setGameState('playing');
    setVideoIsPlaying(true);
    if(gameMode === 'speed') {
      //restart the countdown timer
      roundTimeLeft && setRoundTimeLeft(roundTimeLeft - 100);
    }
  }

  function endGame(): void {
    setGameState('gameover');
    setVideoIsPlaying(false);
  }

  /**
   * Changes hint points by adding the pointChange value.
   * @param pointChange The amount of points to add/remove from hintPoints.
   * @returns void.
   */
  function changeHintPoints(pointChange: number): void {
    const newHintPoints = Math.max(0, Math.min(hintPoints + pointChange, 100));
    setHintPoints(newHintPoints);
    if (newHintPoints === 0) {
      endGame();
    }
  }
  
  /**
   * Generates a new mystery word, sets the search index to 0, and charges hint points.
   * @param isFree if true, generates the new mystery word without a cost to hint points.
   * @returns void.
   */
  function generateNewMysteryWord(isFree?:boolean): void {
    setMysteryWord(wordsList.current[Math.floor(Math.random() * wordsList.current.length) + 1]);
    setSearchIndex(0);
    if (!isFree) chargeHintCost('newMysteryWord');
  }

  /**
   * Changes the user's word, sets the search index to 0, and charges hint points.
   * @param newWord The new user word.
   * @param isFree if true, changes the user's word without a cost to hint points.
   * @returns void.
   */
  function changeUserWord(newWord: string, isFree?: boolean): void {
    currentSearchedIndex.current = 0;
    setUserWord(newWord);
    setSearchIndex(0);
    if (!isFree) chargeHintCost('changeWord');
  }
  
  /**
   * Reveals a letter in the mystery word and charges hint points 
   * @returns void.
   */
  function revealLetter(): void {
    mysteryWordComponentRef.current?.revealLetter(); 
    chargeHintCost('revealLetter');
  }

  function buyNextVideo(): void | string {
    if (videosPurchased < 10) {
      const newVideosPurchased = videosPurchased + 1
      setVideosPurchased(newVideosPurchased);
      setSearchIndex(newVideosPurchased);
      addToVideoHistory(currentSearch.current[newVideosPurchased]);
      chargeHintCost('nextVideo');
    } else {
      return 'incorrect';
    }
    
  }

  /**
   * Checks if guessWord matches the mystery word. If guessWord matches, starts a new round and rewards hint points, if incorrect it charges hintpoints.
   * @param guessWord The word the user guessed.
   * @returns void if the guess is correct, otherwise returns "incorrect" for inputbutton animation.
   */
  function checkAnswer(guessWord: string): void | string {
    if (mysteryWord.toLowerCase() === guessWord.toLowerCase()) {
      setVideoIsPlaying(false);
      setGameState('roundover');
      changeConfettiFalling(true);
      changeHintPoints(Math.floor((100-hintPoints)/4) + 5);
      setCurrentScore(currentScore+1);
    } else {
      chargeHintCost('incorrectGuess');
      return 'incorrect';
    }
  }

  /**
   * Enables or disables the falling confetti element, and once enabled sets a timer to disable it after the animation.
   * @param newConfettiFalling A boolean that controls whether to start or stop the confetti.
   * @returns void.
   */
  function changeConfettiFalling(newConfettiFalling: boolean): void {
    setConfettiFalling(newConfettiFalling);
    if(newConfettiFalling) {
      setTimeout(()=>{setConfettiFalling(false)}, 8000);
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        {confettiFalling &&
          <Confetti
            className="confetti"
            numberOfPieces={10000}
            opacity={1}
            gravity={0.095}
            initialVelocityY={70}
            tweenDuration={15000}
            recycle={false}
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
            <div>WORD PLAYER</div>
          </div>
          }
          {gameState==='roundover' && 
          <div className="menu-screen">
            <div>Correct!</div>
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
            url={`https://www.youtube.com/watch?v=${videoId}`}
            width="100%"
            height="100%"
            pip={false}
            playing={videoIsPlaying}
            config={{
              playerVars: { autoplay: 1 }
            }}
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
              {gameMode==='speed' && roundTimeLeft
                ? <HPBar maxHP={roundTimeLimit} currentHP={roundTimeLeft} isTimer={true}/>
                : <HPBar maxHP={100} currentHP={hintPoints}/>
              }
            </div>
          </div>
          <span className="score">Score: {currentScore.toString().padStart(6,'0')}</span>
        </div>
        }
        {gameState==='playing' &&
        <div className="words-container">
          <span>Your Word: 
            <span className='user-word'>{userWord}</span>
          </span>
          <span>Mystery Word:
            <MysteryWord ref={mysteryWordComponentRef} mysteryWord={mysteryWord}/>
          </span>
        </div>
        }
        <div className="hint-container">
          {gameState==='playing' &&
          <>
            <div className="grid-container">
              <div className="grid-item">
                <InputButton 
                  classNames={`hint`} 
                  buttonText={`Guess Mystery Word`}
                  secondaryButtonText={
                    gameMode==='endurance'
                      ? `-${-1*hintCosts[gameMode].incorrectGuess} HP`
                      : `FREE`
                  }
                  clickHandler={checkAnswer} 
                  placeholder={`Enter Your Guess Here`}/>
              </div>
              <div className="grid-item">
                <InputButton 
                  classNames={`hint`} 
                  buttonText={`Change Your Word`} 
                  secondaryButtonText={
                    gameMode==='endurance'
                      ? `-${-1*hintCosts[gameMode].changeWord} HP`
                      : `-${formatTime(-1*hintCosts[gameMode].changeWord)}`
                  }
                  clickHandler={changeUserWord}
                  placeholder={`Enter Your Word Here`}/>
              </div>
              <div className="grid-item">
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`Buy Next Video`} 
                  secondaryButtonText={
                    gameMode==='endurance'
                      ? `-${-1*hintCosts[gameMode].nextVideo} HP\n(Videos Purchased: ${videosPurchased} / 10)`
                      : `FREE\n(Videos Purchased: ${videosPurchased} / 10)`
                  }
                  clickHandler={buyNextVideo} />
              </div>
              <div className="grid-item">
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`Reveal Random Letter`} 
                  secondaryButtonText={
                    gameMode==='endurance' 
                      ? `-${-1*hintCosts[gameMode].revealLetter()} HP`
                      : `-${formatTime(-1*hintCosts[gameMode].revealLetter())}`
                  }
                  clickHandler={revealLetter} />
              </div>
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`New Mystery Word`} 
                  secondaryButtonText={
                    gameMode==='endurance'
                      ? `-${-1*hintCosts[gameMode].newMysteryWord} HP`
                      : `-${formatTime(-1*hintCosts[gameMode].newMysteryWord)}`
                  }
                  clickHandler={()=>{generateNewMysteryWord(false)}} />
            </div>
            
          </>
          }
          {(gameState==='menu' || gameState==='gameover') &&
          <div className="start-menu">
            <InputButton
              classNames={`hint`}
              buttonText={`Endurance Mode`}
              clickHandler={(initUserWord)=>{return startGame('endurance', initUserWord)}} 
              placeholder={`Enter Your Starting Word Here`}/>
            <InputButton
              classNames={`hint`}
              buttonText={`Speed Mode`}
              clickHandler={(initUserWord)=>{return startGame('speed', initUserWord)}}
              placeholder={`Enter Your Starting Word Here`}/>
          </div>
          }
          {gameState==='roundover' &&
          <div className="grid-container round-over">
            <InputButton
              classNames={`hint`}
              buttonText={`Choose Next Word`}
              secondaryButtonText={
                gameMode==='endurance'
                  ? `-${-.4*hintCosts[gameMode].changeWord} HP (60% OFF!)`
                  : `-${formatTime(-.4*hintCosts[gameMode].changeWord)} (60% OFF!)`
              }
              clickHandler={(nextWord)=>{changeUserWord(nextWord); startNextRound();}}
              placeholder={`Enter Your Next Word Here`}/>
            OR
            <StandardButton
              classNames={`hint`}
              buttonText={`Let it Ride!`}
              secondaryButtonText={`Keep using the same word for free`}
              clickHandler={startNextRound} />
          </div>
          }
        </div>      
      </header>
    </div>
  );
}

export default App;
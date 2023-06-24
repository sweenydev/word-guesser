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
  const mysteryWordComponentRef = useRef<any>(null);
  const timeChange = useRef<number>(0);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [guessedWords, setGuessedWords] = useState<Array<string>>([]);
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

  const roundTimeLimit: number = 120000;

  /** Prepare words list. This code will only run when component mounts */
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
      setVideoId('1p6ofiJDACk');
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
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch((err: any) => console.log('Search error:', err));
    };
    if (userWord && mysteryWord) searchVids();
  }, [userWord, mysteryWord]);

  // Change video with previously fetched data when updating index
  useEffect(() => {
    if (currentSearch.current.length > 0) setVideoId(currentSearch.current[searchIndex].videoId); 
  }, [searchIndex]);
  
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
   * Adds a new VideoInfo object to the video history array for the current round.
   * @param {any} newVideoInfo - The youtube search result to add to the video history.
   * @returns {void}
   */
  function addToVideoHistory(newVideoInfo: VideoInfo): void {
    const newVideoHistory: VideoInfo[][] = [...videoHistory];
    (newVideoHistory[roundNumber] ||= []).push(newVideoInfo);
    setVideoHistory(newVideoHistory);
    console.log('Current video history',newVideoHistory);
  }

  function handleVideoLoadError(error: any): void {
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
   * Charges the user for the cost of a hint based on the current game mode and game state.
   * @param {keyof HintCosts} hintType - The key for the type of hint being used.
   * @returns {void}
   */ 
    function chargeHintCost(hintType: keyof HintCosts): void {
      let hintCost: number = getHintCost(hintType);
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

    function canAffordHint(hintType: keyof HintCosts): boolean {
      let budget: number = roundTimeLeft ? roundTimeLeft : hintPoints;
      return budget > -1 * getHintCost(hintType);
    }

    function getHintCost(hintType: keyof HintCosts, formatCost?: boolean): any {
      const hintCosts: { [key in GameMode]: HintCosts } = { 
        endurance: {
          correctGuess: () => hintPoints === 100 ? 0 : Math.floor((100-hintPoints)/4) + 2,
          incorrectGuess: -2,
          changeWord: -10,
          nextVideo: -3,
          revealLetter: () => -1 * Math.floor(100 / mysteryWord.length),
          newMysteryWord: () => Math.min(-1 * Math.floor(hintPoints / 2), -1),
        },
        speed: {
          correctGuess: () => 60000,
          incorrectGuess: 0,
          changeWord: -5000,
          nextVideo: 0,
          revealLetter: () => -1000 * Math.floor((roundTimeLeft || 0) / mysteryWord.length / 1000) - 5000,
          newMysteryWord: () => -1000 * Math.floor((roundTimeLeft || 0) / 2 / 1000) ,
        },
      };

      let hintCost: any = hintCosts[gameMode][hintType];
      if (typeof hintCost === 'function') hintCost = hintCost();
      if (formatCost) {
        if (hintCost === 0 ) return 'FREE';
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
      setVideoIsPlaying(false);
      setGameState('roundover');
      changeConfettiFalling(true);
      chargeHintCost('correctGuess');
      setCurrentScore(currentScore+1);
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

  function validateGuessMysteryWord(input: string): string | null {
    if(input.length !== mysteryWord.length) {
      return `Must be ${mysteryWord.length} letters long! (${input.length}/${mysteryWord.length})`
    }
    if (guessedWords.includes(input)) {
      return `You already guessed ${input}!`;
    }
    return null;
  }

  /**
   * Changes the user's word, sets the search index to 0, and charges hint points.
   * @param newWord The new user word.
   * @param isFree if true, changes the user's word without a cost to hint points.
   * @returns void.
   */
  function changeUserWord(newWord: string, isFree?: boolean): void | string {
    if (!newWord || (newWord.toLowerCase() === userWord.toLowerCase())) {
      return 'incorrect';
    }
    setUserWord(newWord);
    if (!isFree) chargeHintCost('changeWord');
    if (gameState==='roundover') startNextRound();
  }

  function validateChangeUserWord(input: string): string | null {
    if(input.length === 0) {
      return `Enter your new word!`
    }
    if (userWord.toLowerCase() === input) {
      return `You're already using this word!`;
    }
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

  function buyNextVideo(): void | string {
    if (videosPurchased < currentSearch.current.length) {
      const newVideosPurchased = videosPurchased + 1
      setVideosPurchased(newVideosPurchased);
      setSearchIndex(newVideosPurchased);
      addToVideoHistory(currentSearch.current[newVideosPurchased]);
      chargeHintCost('nextVideo');
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
            <div className="dancing-letters title">
              <span>W</span><span>O</span><span>R</span><span>D</span>
              <div><StandardButton 
                classNames={`round light`} 
                buttonText={`►`} 
                clickHandler={()=>{changeConfettiFalling(true)}} />
              </div>
              <span>P</span><span>L</span><span>A</span><span>Y</span><span>E</span><span>R</span>
            </div>
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
            url={`https://www.youtube.com/embed/${videoId}`}
            width="100%"
            height="100%"
            pip={false}
            playing={videoIsPlaying}
            config={{
              playerVars: { autoplay: 1 },
            }}
            onReady={(e)=>{/*TODO resume timer here in endurance mode*/ console.log('video ready!', e)}}
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
                <StandardButton 
                  classNames={`hint ${!canAffordHint('newMysteryWord') && 'disabled'}`} 
                  buttonText={`New Mystery Word`} 
                  secondaryButtonText={getHintCost('newMysteryWord', true)}
                  clickHandler={()=>{generateNewMysteryWord(false)}} />
            </div>
            
          </>
          }
          {(gameState==='menu' || gameState==='gameover') &&
          <div className="start-menu">
            {gameState==='gameover' && <div>Play Again?</div>}
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
              secondaryButtonText={`Change your starting word for free`}
              clickHandler={(nextWord)=>{return changeUserWord(nextWord, true);}}
              placeholder={`Current Word: ${userWord}`}/>
            OR
            <StandardButton
              classNames={`hint`}
              buttonText={`Let it Ride!`}
              secondaryButtonText={`Keep using the same word ("${userWord}")`}
              clickHandler={startNextRound} />
          </div>
          }
        </div>      
      </header>
    </div>
  );
}

export default App;
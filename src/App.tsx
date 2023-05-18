import './App.scss';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Confetti from 'react-confetti';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/buttons/standard-button';
import InputButton from './reusable-components/buttons/input-button';
import MysteryWord from './reusable-components/mystery-word/mystery-word';
import VideoBrowser from './reusable-components/video-browser/video-browser';
import HPBar from './reusable-components/hp-bar/hp-bar';
import { formatTime } from './util';

const mysteryWordsFile = require('./words.txt');

//TODO: Use to track total round times for final speed score
class Timer {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = Date.now();
  }

  stop(): number {
    this.endTime = Date.now();
    return this.endTime - this.startTime;
  }
}

function App() {
  const wordsList = useRef<Array<string>>([]);
  const lastSearch = useRef<Array<any>>([]);
  const lastSearchedIndex = useRef<number>(0);
  const youtube = useRef<any>(null);
  const mysteryWordComponentRef = useRef<any>(null);
  const timeChange = useRef<number>(0);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videosPurchased, setVideosPurchased] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
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
      revealLetter: () => -2000 * Math.floor((roundTimeLeft || 0) / mysteryWord.length / 1000) - 5000,
      newMysteryWord: -10000,
    },
  };

  const roundTimeLimit: number = 120000;

  /** Prepare words list and setup youtube api. This code will only run when component mounts */
  useEffect(() => {
    fetch(mysteryWordsFile).then(response => response.text()).then((text) => {
      wordsList.current = text.split('\r\n');
    });
    const fetchData = async () => {
      const response = await fetch('http://localhost:4000/api/data');
      const jsonData = await response.json();
      youtube.current = axios.create({
        baseURL: 'https://www.googleapis.com/youtube/v3',
        params: {
          part:'snippet',
          type:'video',
          maxResults: 11,
          key: jsonData.youtubeApiKey
        }
      });
    };
    fetchData();
  }, []);

  /** Run searchVids everytime there is a change to userWord, mysteryWord, or searchIndex, to generate and select new videos */
  useEffect(() => {
    searchVids();
  }, [userWord, mysteryWord, searchIndex]);
  
  /** Counting and gameover logic for countdown timer, updates every 100 ms when roundTimeLeft is defined */
  useEffect(() => {
    if (roundTimeLeft !== undefined) {
      if (roundTimeLeft > 0) {
        setTimeout(() => {
          setRoundTimeLeft(prevRoundTimeLeft => (prevRoundTimeLeft || 0) - 100 + timeChange.current);
          if (timeChange.current !== 0) timeChange.current = 0;
        }, 100);
      } else {
        setGameState('gameover');
      }
    }
  }, [roundTimeLeft]);

  /**
   * Searches Youtube for a video based on userWord and mysteryWord or uses previously fetched data.
   * @returns A Promise that resolves with void when the function completes.
   */
  async function searchVids(): Promise<void> {
    if (searchIndex !== lastSearchedIndex.current) {
      // Use previously fetched data on searchIndex increment
      setVideoId(lastSearch.current[searchIndex].id.videoId); 
      lastSearchedIndex.current = searchIndex;
      console.log('old data used!','\nMYSTERY WORD', mysteryWord, '\nUSER WORD', userWord, '\nSEARCHINDEX', searchIndex);
    } 
    else if (userWord && mysteryWord) {
      youtube.current.get('/search', {params: {q: `${userWord} ${mysteryWord}`}})
      .then((res: { data: { items: any[]; }; }) => {
        setVideosPurchased(0);
        setVideoId(res.data.items[searchIndex].id.videoId);
        addToVideoHistory(res.data.items[searchIndex]);
        lastSearch.current = res.data.items;
        lastSearchedIndex.current = searchIndex;
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch((err: any) => console.log(err));
    }
  }

  /**
   * Adds a new VideoInfo object to the video history array for the current round.
   * @param {any} apiSearchResult - Object returned from youtube search api containing information about the searched video.
   * @returns {void}
   */
  function addToVideoHistory(apiSearchResult: any): void {
    const publishedDate: Date = new Date(apiSearchResult.snippet.publishedAt);
    const newVideoInfo: VideoInfo = {
      prompt: `${userWord} ${mysteryWord}`,
      title: apiSearchResult.snippet.title,
      videoURL: `https://www.youtube.com/watch?v=${apiSearchResult.id.videoId}`,
      channelName: apiSearchResult.snippet.channelTitle,
      channelURL: `https://www.youtube.com/channel/${apiSearchResult.snippet.channelId}`,
      description: apiSearchResult.snippet.description,
      releaseDate: publishedDate.toLocaleDateString(
        'en-US', { 
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }
      ),
      thumbnailURL: apiSearchResult.snippet.thumbnails.medium.url,
    };
    const newVideoHistory = [...videoHistory];
    newVideoHistory[roundNumber] 
      ? newVideoHistory[roundNumber].push(newVideoInfo)
      : newVideoHistory[roundNumber] = [newVideoInfo];
    setVideoHistory(newVideoHistory);
    console.log('Current video history',newVideoHistory);
  }

  /**
   * Charges the user for the cost of a hint based on the current game mode.
   * @param {keyof HintCosts} hintType - The key for the type of hint being used.
   * @returns {void}
   */ 
  function chargeHintCost(hintType: keyof HintCosts): void {
    let hintCost: any = hintCosts[gameMode][hintType];
    if(typeof hintCost === 'function') hintCost = hintCost();
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
   * @param gameMode The chosen game mode. (TODO, add game modes)
   * @param initUserWord The initial user word to use in the game.
   * @returns void if the initUserWord parameter is empty, otherwise returns "incorrect" for inputbutton animation.
   */
  function startGame(gameMode: GameMode, initUserWord: string): void | string {
    if (!initUserWord) return 'incorrect';
    generateNewMysteryWord(true);
    changeUserWord(initUserWord, true);
    setHintPoints(100);
    setGameState('playing');
    setGameMode(gameMode);
    if (gameMode === 'endurance') {
      setCurrentScore(0);
    } else if (gameMode === 'speed') {
      setRoundTimeLeft(roundTimeLimit);
    }
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
      setGameState('gameover');
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
    lastSearchedIndex.current = 0;
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
      addToVideoHistory(lastSearch.current[newVideosPurchased]);
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
      changeConfettiFalling(true);
      //TODO: Add pre round new word selection menu
      const newWord = null;//prompt('Correct! Choose Your Next Word (leave blank to use previous word)');
      lastSearchedIndex.current = 0;
      changeUserWord(newWord ? newWord : userWord, true);
      generateNewMysteryWord(true);
      changeHintPoints(Math.floor((100-hintPoints)/4) + 5);
      setCurrentScore(currentScore+1);
      setRoundNumber(roundNumber+1);
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
            opacity={0.8}
            gravity={0.05}
            initialVelocityY={40}
            tweenDuration={10000}
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
          {gameState==='gameover' && 
          <div className="game-over-screen">
            <div>GAME OVER</div>
            <div>Final score: {currentScore.toString().padStart(6,'0')}</div>
            <VideoBrowser
              videoHistory={videoHistory}
            />
          </div>
          }
          {gameState==='menu' && 
          <div className="menu-screen">
            <div>VIDEO GUESSER</div>
          </div>
          }
        </div>
        <div className="tv-screen">
          <ReactPlayer
            url={`https://www.youtube.com/watch?v=${videoId}`}
            width="100%"
            height="100%"
            pip={false}
            playing={true}
            config={{
              playerVars: { autoplay: 1 }
            }}
            position="absolute"/>
        </div>
        {gameState==='playing' &&
        <>
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
          <div className="words-container">
            <span>Your Word: 
              <span className='user-word'>{userWord}</span>
            </span>
            <span>Mystery Word:
              <MysteryWord ref={mysteryWordComponentRef} mysteryWord={mysteryWord}/>
            </span>
          </div>
        </>
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
          {gameState==='roundover' && //TODO implement post round screen
          <div className="start-menu"> 
            <InputButton
              classNames={`hint`}
              buttonText={`Next Word`}
              clickHandler={changeUserWord} 
              placeholder={`Enter Your Next Word Here`}/>
          </div>
          }
        </div>      
      </header>
    </div>
  );
}

export default App;
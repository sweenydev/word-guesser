import './App.scss';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Confetti from 'react-confetti';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/buttons/standard-button';
import InputButton from './reusable-components/buttons/input-button';
import MysteryWord from './reusable-components/mystery-word/mystery-word';
import HPBar from './reusable-components/hp-bar/hp-bar';

type GameState = 'menu' | 'playing' | 'gameover' | 'roundover';
const mysteryWordsFile = require('./words.txt');

function App() {
  const wordsList = useRef<Array<string>>([]);
  const lastSearch = useRef<Array<any>>([]);
  const lastSearchedIndex = useRef<number>(0);
  const youtube = useRef<any>(null);
  const mysteryWordComponentRef = useRef<any>(null);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videosPurchased, setVideosPurchased] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('dQw4w9WgXcQ');
  const [confettiFalling, setConfettiFalling] = useState<boolean>(false);
  const [gameState, setGameState] = useState<GameState>('menu');

  const hintPointCosts = {
    incorrectGuess: -2,
    correctGuess: () => Math.floor((100-hintPoints)/4) + 5,
    changeWord: -5,
    nextVideo: -3,
    revealLetter: () => -1 * Math.floor(75 / mysteryWord.length),
    newMysteryWord: -15,
  };

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
  
  /**
   * Searches Youtube for a video based on userWord and mysteryWord or uses previously fetched data.
   * @returns A Promise that resolves with void when the function completes.
   */
  async function searchVids(): Promise<void> {
    if (searchIndex !== lastSearchedIndex.current /*&& searchIndex !== 0*/) {
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
        lastSearch.current = res.data.items;
        lastSearchedIndex.current = searchIndex;
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch((err: any) => console.log(err));
    }
  }

  /**
   * Starts a new game with given game mode and user word.
   * @param gameMode The chosen game mode. (TODO, add game modes)
   * @param initUserWord The initial user word to use in the game.
   * @returns void if the initUserWord parameter is empty, otherwise returns "incorrect" for inputbutton animation.
   */
  function startGame(gameMode: string, initUserWord: string): void | string {
    if (!initUserWord) return 'incorrect';
    generateNewMysteryWord(true);
    changeUserWord(initUserWord, true);
    setHintPoints(100);
    setCurrentScore(0);
    setGameState('playing');
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
    if (!isFree) changeHintPoints(hintPointCosts.newMysteryWord);
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
    if (!isFree) changeHintPoints(hintPointCosts.changeWord);
  }
  
  /**
   * Reveals a letter in the mystery word and charges hint points 
   * @returns void.
   */
  function revealLetter(): void {
    mysteryWordComponentRef.current?.revealLetter(); 
    changeHintPoints(hintPointCosts.revealLetter());
  }

  function buyNextVideo(): void | string {
    if (videosPurchased < 10) {
      changeHintPoints(hintPointCosts.nextVideo);
      const newVideosPurchased = videosPurchased + 1
      setSearchIndex(newVideosPurchased);
      setVideosPurchased(newVideosPurchased); 
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
      changeHintPoints(hintPointCosts.correctGuess());
      setCurrentScore(currentScore+1);
    } else {
      changeHintPoints(hintPointCosts.incorrectGuess);
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
          </div>
          }
          {gameState==='menu' && 
          <div className="menu-screen">
            <div>VIDEO GUESSER</div>
            <div>[placeholder title screen art]</div>
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
              buttonText={`<`} 
              clickHandler={()=>{setSearchIndex(searchIndex - 1)}} />
            {searchIndex < videosPurchased && 
            <StandardButton 
              classNames={`round ${searchIndex === videosPurchased && 'hidden'}`} 
              buttonText={`>`} 
              clickHandler={()=>{setSearchIndex(searchIndex + 1)}} />
            }
          </div>
          <div className="score-board">
            <div className="hint-points">
              Hint Points:
              <div className="hp-bar-container">
                <HPBar maxHP={100} currentHP={hintPoints}/>
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
                  buttonText={`Guess Mystery Word\n(${-1*hintPointCosts.incorrectGuess} HP)`} 
                  clickHandler={checkAnswer} 
                  placeholder={`Enter Your Guess Here`}/>
              </div>
              <div className="grid-item">
                <InputButton 
                  classNames={`hint`} 
                  buttonText={`Change Your Word\n(${-1*hintPointCosts.changeWord} HP)`} 
                  clickHandler={changeUserWord}
                  placeholder={`Enter Your Word Here`}/>
              </div>
              <div className="grid-item">
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`Buy Next Video\n(${-1*hintPointCosts.nextVideo} HP)\n(Videos Purchased: ${videosPurchased} / 10)`} 
                  clickHandler={buyNextVideo} />
              </div>
              <div className="grid-item">
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`Reveal Random Letter\n(${-1*hintPointCosts.revealLetter()} HP)`} 
                  clickHandler={revealLetter} />
              </div>
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`New Mystery Word\n(${-1*hintPointCosts.newMysteryWord} HP)`} 
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
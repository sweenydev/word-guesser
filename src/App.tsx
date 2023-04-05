import './App.scss';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Confetti from 'react-confetti';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/buttons/standard-button';
import InputButton from './reusable-components/buttons/input-button';
import MysteryWord from './reusable-components/mystery-word/mystery-word';
import HPBar from './reusable-components/hp-bar/hp-bar';

const mysteryWordsFile = require('./words.txt');

function App() {
  const wordsList = useRef<Array<string>>([]);
  const lastSearch = useRef<Array<any>>([]);
  const lastSearchedIndex = useRef<number>();
  const youtube = useRef<any>(null);
  const mysteryWordComponentRef = useRef<any>(null);

  const [showStartOptions, setShowStartOptions] = useState<boolean>(true);
  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('dMH0bHeiRNg');
  const [confettiFalling, setConfettiFalling] = useState<boolean>(false);

  const hintPointCosts = {
    incorrectGuess: -2,
    correctGuess: () => Math.floor((100-hintPoints)/4) + 5,
    changeWord: -5,
    nextVideo: -2,
    revealLetter: () => -1 * Math.floor(75 / mysteryWord.length),
    newMysteryWord: -15,
  };

  useEffect(() => {
    // This code will only run when component mounts
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
          maxResults: 10,
          key: jsonData.youtubeApiKey
        }
      });
    };
    fetchData();
  }, []);

  useEffect(() => {
    searchVids();
  }, [userWord, mysteryWord, searchIndex]);
  
  async function searchVids(): Promise<void> {
    if (searchIndex !== lastSearchedIndex.current && searchIndex !==0) {
      // Use previously fetched data on searchIndex increment
      setVideoId(lastSearch.current[searchIndex].id.videoId); 
      lastSearchedIndex.current = searchIndex;
      changeHintPoints(-2);
      console.log('old data used!','\nMYSTERY WORD', mysteryWord, '\nUSER WORD', userWord, '\nSEARCHINDEX', searchIndex);
    } 
    else if (userWord && mysteryWord) {
      youtube.current.get('/search', {params: {q: `${userWord} ${mysteryWord}`}})
      .then((res: { data: { items: any[]; }; }) => {
        setVideoId(res.data.items[searchIndex].id.videoId);
        lastSearch.current = res.data.items;
        lastSearchedIndex.current = searchIndex;
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch((err: any) => console.log(err));
    }
  }

  function startGame(gameMode: string, initUserWord: string): void | string {
    if (!initUserWord) return 'incorrect';
    generateNewMysteryWord(true);
    changeUserWord(initUserWord, true);
    setShowStartOptions(false);
  }

  function changeHintPoints(pointChange: number): void {
    setHintPoints(Math.max(0, Math.min(hintPoints + pointChange, 100)));
  }
  
  function generateNewMysteryWord(isFree?:boolean): void {
    setMysteryWord(wordsList.current[Math.floor(Math.random() * wordsList.current.length) + 1]);
    setSearchIndex(0);
    if (!isFree) changeHintPoints(hintPointCosts.newMysteryWord);
  }

  function changeUserWord(newWord: string, isFree?: boolean): void {
    setUserWord(newWord);
    setSearchIndex(0);
    if (!isFree) changeHintPoints(hintPointCosts.changeWord);
  }
  
  function checkAnswer(guessWord: string): void | string {
    if (mysteryWord.toLowerCase() === guessWord.toLowerCase()) {
      changeConfettiFalling(true);
      //TODO: Add pre round new word selection menu
      const newWord = null;//prompt('Correct! Choose Your Next Word (leave blank to use previous word)');
      changeUserWord(newWord ? newWord : userWord, true);
      generateNewMysteryWord(true);
      changeHintPoints(hintPointCosts.correctGuess());
      setCurrentScore(currentScore+1);
    } else {
      changeHintPoints(hintPointCosts.incorrectGuess);
      return 'incorrect';
    }
  }

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
        <div className="tv-bezel"></div>
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
        {!showStartOptions &&
        <>
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
          {!showStartOptions &&
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
                  buttonText={`Play Next Video\n(${-1*hintPointCosts.nextVideo}  HP)\n(Videos Played: ${searchIndex + 1})`} 
                  clickHandler={()=>{setSearchIndex(searchIndex + 1)}} />
              </div>
              <div className="grid-item">
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`Reveal Random Letter\n(${-1*hintPointCosts.revealLetter()} HP)`} 
                  clickHandler={()=>{mysteryWordComponentRef.current?.revealLetter(); changeHintPoints(hintPointCosts.revealLetter());}} />
              </div>
                <StandardButton 
                  classNames={`hint`} 
                  buttonText={`New Mystery Word\n(${-1*hintPointCosts.newMysteryWord} HP)`} 
                  clickHandler={()=>{generateNewMysteryWord(false)}} />
            </div>
            
          </>
          }
          {showStartOptions &&
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
        </div>      
      </header>
    </div>
  );
}

export default App;
import './App.scss';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Confetti from 'react-confetti';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/buttons/standard-button';
import InputButton from './reusable-components/buttons/input-button';
import MysteryWord from './reusable-components/mystery-word/mystery-word';
import HPBar from './reusable-components/hp-bar/hp-bar';

const mysteryWordsFile = require("./words.txt");
interface MysteryWordComponentRefType {
  revealLetter: () => void;
}

function App() {
  const wordsList = useRef<Array<string>>([]);
  const lastSearch = useRef<Array<any>>([]);
  const lastSearchedIndex = useRef<number>();
  const youtube = useRef<any>(null);

  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('dMH0bHeiRNg');
  const [confettiFalling, setConfettiFalling] = useState<boolean>(false);

  const mysteryWordComponentRef = useRef<MysteryWordComponentRefType>(null);

  async function searchVids() {
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

  useEffect(() => {
    // This code will only run when component mounts
    fetch(mysteryWordsFile).then(response => response.text()).then((text) => {
      wordsList.current = text.split("\r\n");
    });
    const fetchData = async () => {
      const response = await fetch('http://localhost:4000/api/data');
      const jsonData = await response.json();
      youtube.current = axios.create({
        baseURL: "https://www.googleapis.com/youtube/v3",
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
  
  function changeHintPoints(pointChange: number) {
    setHintPoints(Math.max(0, Math.min(hintPoints + pointChange, 100)));
  }
  
  function generateNewMysteryWord(isFree?:boolean) {
    setMysteryWord(wordsList.current[Math.floor(Math.random() * wordsList.current.length) + 1]);
    setSearchIndex(0);
    if (!isFree) changeHintPoints(-15);
  }

  function changeUserWord(newWord: string, isFree?: boolean) {
    setUserWord(newWord);
    setSearchIndex(0);
    if (!isFree) changeHintPoints(-4);
  }
  
  function checkAnswer(guessWord: string) {
    if (mysteryWord.toLowerCase() === guessWord.toLowerCase()) {
      changeConfettiFalling(true);
      const newWord = prompt('Correct! Choose Your Next Word (leave blank to use previous word)');
      changeUserWord(newWord ? newWord : userWord, true);
      generateNewMysteryWord(true);
      changeHintPoints(Math.floor((100-hintPoints)/4) + 5);
      setCurrentScore(currentScore+1);
    } else {
      alert('WRONG. Guess again chump');
      changeHintPoints(-1);
    }
  }

  function changeConfettiFalling(newConfettiFalling: boolean) {
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
        <div className="score-board">
          <div className="hint-points">
            Hint Points:
            <div className="hp-bar-container">
              <HPBar maxHP={100} currentHP={hintPoints}/>
            </div>
          </div>
          <span className='score'>Score: {currentScore.toString().padStart(6,'0')}</span>
        </div>
        <div className="words-container">
          <span>Your Word: 
            <span className='user-word'>{userWord}</span>
          </span>
          <span>Mystery Word:
            <MysteryWord ref={mysteryWordComponentRef} mysteryWord={mysteryWord}/>
          </span>
        </div>
        <div className="hint-container">
          <div className="grid-container">
            <div className="grid-item">
              <InputButton 
                classNames={`hint`} 
                buttonText={`Guess Mystery Word\n(0-1 HP)`} 
                clickHandler={checkAnswer} 
                placeholder={`Enter Your Guess Here`}/>
            </div>
            <div className="grid-item">
              <InputButton 
                classNames={`hint`} 
                buttonText={`Change Your Word\n(4 HP)`} 
                clickHandler={changeUserWord} 
                placeholder={`Enter Your Word Here`}/>
            </div>
            <div className="grid-item">
              <StandardButton 
                classNames={`hint`} 
                buttonText={`Play Next Video\n(2 HP)\n(Videos Played: ${searchIndex + 1})`} 
                clickHandler={()=>{setSearchIndex(searchIndex + 1)}} />
            </div>
            <div className="grid-item">
              <StandardButton 
                classNames={`hint`} 
                buttonText={`Reveal Random Letter\n(10 HP)`} 
                clickHandler={()=>{mysteryWordComponentRef.current?.revealLetter(); changeHintPoints(-10);}} />
            </div>
          </div>
          <StandardButton 
            classNames={`hint`} 
            buttonText={`New Mystery Word\n(15 HP)`} 
            clickHandler={()=>{generateNewMysteryWord(false)}} />
        </div>
      </header>
    </div>
  );
}

export default App;
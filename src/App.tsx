import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { useState } from 'react';
import ReactPlayer from 'react-player/youtube';
import StandardButton from './reusable-components/standard-button';
import InputButton from './reusable-components/input-button';
import MysteryWord from './reusable-components/mystery-word';
import './App.scss';
import HPBar from './reusable-components/hp-bar/hp-bar';

const KEY = 'AIzaSyCYhOPu77ax1f0BzJrRyehh4pn0TMubqj4';
const youtube = axios.create({
  baseURL: "https://www.googleapis.com/youtube/v3",
  params: {
    part:'snippet',
    type:'video',
    maxResults: 10,
    key: KEY
  }
});
const mysteryWordsFile = require("./words.txt");
interface MysteryWordComponentRefType {
  revealLetter: () => void;
}

function App() {
  const wordsList = useRef<Array<string>>([]);
  const lastSearch = useRef<Array<any>>([]);
  const lastSearchedIndex = useRef<number>();
  const [userWord, setUserWord] = useState<string>('');
  const [mysteryWord, setMysteryWord] = useState<string>('');
  const [hintPoints, setHintPoints] = useState<number>(100);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [searchIndex, setSearchIndex] = useState<number>(0);
  const [videoId, setVideoId] = useState<string>('dMH0bHeiRNg');

  const mysteryWordComponentRef = useRef<MysteryWordComponentRefType>(null);

  useEffect(() => {
    // This code will only run when component mounts
    fetch(mysteryWordsFile).then(response => response.text()).then((text) => {
      wordsList.current = text.split("\r\n");
    });
  }, []);

  useEffect(() => {
    searchVids();
  }, [userWord, mysteryWord, searchIndex]);
  
  function generateNewMysteryWord(isFree?:boolean) {
    setMysteryWord(wordsList.current[Math.floor(Math.random() * wordsList.current.length) + 1]);
    setSearchIndex(0);
    if (!isFree) setHintPoints(hintPoints-15);
  }

  function changeUserWord(newWord: string, isFree?: boolean) {
    setUserWord(newWord);
    setSearchIndex(0);
    if (!isFree) setHintPoints(hintPoints-4);
  }
  
  function checkAnswer(guessWord: string) {
    if (mysteryWord.toLowerCase() === guessWord.toLowerCase()) {
      const newWord = prompt('Correct! Choose Your Next Word (leave blank to use previous word)');
      changeUserWord(newWord ? newWord : userWord, true);
      generateNewMysteryWord(true);
      setHintPoints(hintPoints + Math.floor((100-hintPoints)/4) + 5);
      setCurrentScore(currentScore+1);
    } else {
      alert('WRONG. Guess again chump');
      setHintPoints(hintPoints-1);
    }
  }

  async function searchVids() {
    if (searchIndex !== lastSearchedIndex.current && searchIndex !==0) {
      // Use previously fetched data on searchIndex increment
      setVideoId(lastSearch.current[searchIndex].id.videoId); 
      lastSearchedIndex.current = searchIndex;
      setHintPoints(hintPoints-2);
      console.log('old data used!','\nMYSTERY WORD', mysteryWord, '\nUSER WORD', userWord, '\nSEARCHINDEX', searchIndex);
    } 
    else if (userWord && mysteryWord) {
      youtube.get('/search', {params: {q: `${userWord} ${mysteryWord}`}})
      .then(res => {
        setVideoId(res.data.items[searchIndex].id.videoId);
        lastSearch.current = res.data.items;
        lastSearchedIndex.current = searchIndex;
        console.log('MYSTERY WORD:', mysteryWord, '\nUSER WORD:', userWord, '\nSEARCHINDEX:', searchIndex);
      })
      .catch(err => console.log(err));
    }
  }

  return (
    <div className="App">
      <header className="App-header">
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
        <div className="score-board grid-container">
          <div className="hint-points grid-item">
            Hint Points:
            <div className="hp-bar-container">
              <HPBar maxHP={100} currentHP={hintPoints}/>
            </div>
          </div>
          <span className='grid-item'>Score: {currentScore.toString().padStart(6,'0')}</span>
        </div>
        <div className="words-container grid-container">
          <span className='grid-item'>Your Word: 
            <span className='user-word'>{userWord}</span>
          </span>
          <span className='grid-item'>Mystery Word:
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
                clickHandler={()=>{mysteryWordComponentRef.current?.revealLetter(); setHintPoints(hintPoints-10);}} />
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
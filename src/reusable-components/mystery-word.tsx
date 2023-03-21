import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

interface MysteryWordProps {
  ref: any;
  mysteryWord: string;
  classNames?: string;
}

const MysteryWord: React.FC<MysteryWordProps> = forwardRef(({ mysteryWord, classNames }, ref) => {
  
  const [revealedLetterIndices, setRevealedLetterIndices] = useState<Array<number>>([]);
  
  const revealLetter = () => {
    const remainingMysteryLetters = Array.from(Array(mysteryWord.length).keys()).filter((letterIndex)=>!revealedLetterIndices.includes(letterIndex));
    setRevealedLetterIndices([...revealedLetterIndices, (remainingMysteryLetters[Math.floor(Math.random() * remainingMysteryLetters.length)])]);
  }

  useEffect(() => {
    setRevealedLetterIndices([]);
  },[mysteryWord])

  useImperativeHandle(ref, () => ({
    revealLetter,
  }));
  
  //Random key is used to ensure the css rainbow cycle restarts with render changes
  const randomKeyPiece = Math.random();

  return (
    <span className={`mystery-word ${classNames ? classNames : ''}`}>
      {mysteryWord.split('').map((letter, i) => {
        if (revealedLetterIndices.includes(i)) {
          return <span key={i} className='revealed-letter'>{letter}</span>
        } else {
          return <span key={i+randomKeyPiece} className='hidden-letter'>?</span>
        }
      })}
    </span>
  )
})

export default MysteryWord;
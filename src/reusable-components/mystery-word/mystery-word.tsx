import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import './mystery-word.scss';

interface MysteryWordProps {
  ref: any;
  mysteryWord: string;
  classNames?: string;
}

/**
 * A component that displays an animated "mystery word" which can gradually reveal itself letter by letter. 
 * @param ref - component reference, can be used to call revealLetter();
 * @param {string} mysteryWord - The word to be revealed.
 * @param {string} classNames - (Optional) Additional class names to apply to the component.
 */
const MysteryWord: React.FC<MysteryWordProps> = forwardRef(({ mysteryWord, classNames }, ref) => {
  
  const [revealedLetterIndices, setRevealedLetterIndices] = useState<Array<number>>([]);
  
  function revealLetter(): void {
    const remainingMysteryLetters = Array.from(Array(mysteryWord.length).keys()).filter((letterIndex)=>!revealedLetterIndices.includes(letterIndex));
    setRevealedLetterIndices([...revealedLetterIndices, (remainingMysteryLetters[Math.floor(Math.random() * remainingMysteryLetters.length)])]);
  }

  // If the mystery word changes, reset revealed letter indices
  useEffect(() => {
    setRevealedLetterIndices([]);
  },[mysteryWord])

  useImperativeHandle(ref, () => ({
    revealLetter,
  }));

  return (
    <span className={`mystery-word ${classNames ? classNames : ''}`}>
      {mysteryWord.split('').map((letter, i) => {
        if (revealedLetterIndices.includes(i)) {
          return <span key={i} className='revealed-letter'>{letter}</span>
        } else {
          return <span key={i+'hidden'} className='hidden-letter'>?</span>
        }
      })}
    </span>
  )
})

export default MysteryWord;
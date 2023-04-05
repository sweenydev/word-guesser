import { useState } from "react";
import StandardButton from "./standard-button";
import './buttons.scss';

interface InputButtonProps {
  buttonText: string;
  clickHandler(inputValue: string): any;
  classNames?: string;
  placeholder?: string;
}

const InputButton: React.FC<InputButtonProps> = ({ buttonText, clickHandler, classNames, placeholder }) => {
  const [input, setInput] = useState('');
  const [runIncorrectAnimation, setRunIncorrectAnimation] = useState<boolean>(false);
  
  function onInputChange(e: any): void {
    setInput(e.target.value);
  }

  function onClick(): void {
    const result = clickHandler(input);
    if(result === 'incorrect') {
      setRunIncorrectAnimation(true);
      setTimeout(()=>{setRunIncorrectAnimation(false)},500);
    }
  }

  return (
    <div style={{display:`inline-flex`, width:`100%`}}>
      <StandardButton classNames={`input ${classNames}`} buttonText={buttonText} clickHandler={onClick} />
      <input
        className={`button-input-text ${classNames} ${runIncorrectAnimation ? 'incorrect' : ''}`}
        type="text"
        placeholder={placeholder}
        onChange={(event) => {onInputChange(event)}}
        value={input} />
    </div>
  )
}

export default InputButton;
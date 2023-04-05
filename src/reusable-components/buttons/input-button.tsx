import { useState } from "react";
import StandardButton from "./standard-button";
import './buttons.scss';

interface InputButtonProps {
  buttonText: string;
  clickHandler(inputValue: string): any;
  classNames?: string;
  placeholder?: string;
}

/**
 * An input button component with optional classes and placeholder.
 * @param {string} buttonText - The text to be displayed on the button.
 * @param {(inputValue: string) => any} clickHandler - The function to be called when the button is clicked. It receives the current input value as string parameter and returns any value.
 * @param {string} [classNames] - (Optional) classes to be added to the component button and input.
 * @param {string} [placeholder] - (Optional) placeholder to be displayed inside the input field.
 */
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
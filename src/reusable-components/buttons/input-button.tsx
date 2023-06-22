import { useEffect, useState } from "react";
import StandardButton from "./standard-button";
import './buttons.scss';

interface InputButtonProps {
  buttonText: string;
  secondaryButtonText?: string;
  clickHandler(inputValue: string): string | void;
  validationFunction?: (input: string) => string | null;
  classNames?: string;
  placeholder?: string;
}

/**
 * An input button component with optional classes and placeholder.
 * @param {string} buttonText - The text to be displayed on the button.
 * @param {string} secondaryButtonText - (Optional) The text to be displayed below the buttonText
 * @param {(inputValue: string) => any} clickHandler - The function to be called when the button is clicked. It receives the current input value as string parameter and returns any value.
 * @param {string} [classNames] - (Optional) classes to be added to the component button and input.
 * @param {string} [placeholder] - (Optional) placeholder to be displayed inside the input field.
 */
const InputButton: React.FC<InputButtonProps> = ({ buttonText, secondaryButtonText, clickHandler, classNames, placeholder, validationFunction }) => {
  const [input, setInput] = useState<string>('');
  const [incorrectAnimationPlaying, setIncorrectAnimationPlaying] = useState<boolean>(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [mouseEntered, setMouseEntered] = useState<boolean>(false);

  useEffect(() => {
    if (mouseEntered || inputFocused) {
      validate();
    }
    if(!mouseEntered && !inputFocused) {
      setValidationMessage(null);
    }
  }, [mouseEntered, inputFocused]);

  function validate(newInput?: string) {
    if(!validationFunction || classNames?.includes('disabled')) {
      setValidationMessage(null);
    } else {
      setValidationMessage(validationFunction(newInput !== undefined ? newInput : input));
    }
  }

  function onInputChange(e: any): void {
    setInput(e.target.value);
    validate(e.target.value);
  }

  function onClick(): void {
    if(!validationMessage && !classNames?.includes('disabled') && !incorrectAnimationPlaying) {
      const result = clickHandler(input);
      if(result === 'incorrect') {
        setIncorrectAnimationPlaying(true);
        setTimeout(()=>{
          setIncorrectAnimationPlaying(false);
          setInput('');
          validate('');
        },500);
      } else {
        setInput('');
      }
    }
  }

  function handleKeyDown(e: any): void {
    if (e.key === 'Enter') {
      onClick();
    }
  }

  return (
    <div
      onMouseEnter={()=>setMouseEntered(true)}
      onMouseLeave={()=>setMouseEntered(false)}
      style={{display:`inline-flex`, width:`100%`}}>
      <StandardButton 
        classNames={`input ${classNames} ${validationMessage ? 'disabled' : ''}`} 
        buttonText={buttonText} 
        secondaryButtonText={validationMessage || secondaryButtonText} 
        clickHandler={onClick}/>
      <input
        className={`button-input-text ${classNames} ${incorrectAnimationPlaying ? 'incorrect' : ''}`}
        type="text"
        placeholder={placeholder}
        onChange={(event) => {onInputChange(event)}}
        onKeyDown={handleKeyDown}
        onFocus={()=>setInputFocused(true)}
        onBlur={()=>setInputFocused(false)}
        value={input} />
    </div>
  )
}

export default InputButton;
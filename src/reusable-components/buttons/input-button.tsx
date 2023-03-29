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
  
  const onInputChange = (e: any) => {
    setInput(e.target.value);
  }

  return (
    <div style={{display:`inline-flex`, width:`100%`}}>
      <StandardButton classNames={`input ${classNames}`} buttonText={buttonText} clickHandler={()=>{clickHandler(input)}} />
      <input
        className={`button-input-text ${classNames}`}
        type="text"
        placeholder={placeholder}
        onChange={(event) => {onInputChange(event)}}
        value={input} />
    </div>
  )
}

export default InputButton;
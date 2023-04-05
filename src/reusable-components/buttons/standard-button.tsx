import './buttons.scss';

interface StandardButtonProps {
  buttonText: string;
  clickHandler: any;
  classNames?: string;
}

/**
 * A standard button component with optional classes.
 * @param {string} buttonText - The text to be displayed on the button.
 * @param {any} clickHandler - The function to be called when the button is clicked.
 * @param {string} [classNames] - (Optional) Additional class names to apply to the button element.
 */
const StandardButton: React.FC<StandardButtonProps> = ({ buttonText, clickHandler, classNames }) => {
  return (
    <div onClick={clickHandler} className={`button ${classNames}`}>{buttonText}</div>
  )
}

export default StandardButton;
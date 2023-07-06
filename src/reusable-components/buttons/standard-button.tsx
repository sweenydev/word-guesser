import './buttons.scss';

interface StandardButtonProps {
  buttonText: string;
  secondaryButtonText?: string;
  clickHandler: () => void;
  hoverChangeHandler?: (isHovered: boolean) => void;
  classNames?: string;
}

/**
 * A standard button component with optional classes.
 * @param {string} buttonText - The text to be displayed on the button.
 * @param {string} secondaryButtonText - (Optional) The text to be displayed below the buttonText
 * @param {any} clickHandler - The function to be called when the button is clicked.
 * @param {string} [classNames] - (Optional) Additional class names to apply to the button element.
 */
const StandardButton: React.FC<StandardButtonProps> = ({ buttonText, secondaryButtonText, clickHandler, hoverChangeHandler=()=>{}, classNames }) => {
  function handleClick(e: any): void {
    e.stopPropagation();
    if(classNames?.includes('disabled')) {
      return;
    }
    clickHandler();
  }
  return (
    <div 
      onClick={(e)=>{handleClick(e)}} 
      onMouseEnter={()=>{hoverChangeHandler(true)}}
      onMouseLeave={()=>{hoverChangeHandler(false)}}
      className={`button ${classNames}`}>
      <div className={`primary-text${secondaryButtonText ? ' has-secondary' : ''}`}>{buttonText}</div>
      {secondaryButtonText &&
        <div className="secondary-text">{secondaryButtonText}</div>
      }
    </div>
  )
}

export default StandardButton;
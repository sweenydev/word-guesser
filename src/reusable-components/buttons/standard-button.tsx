import './buttons.scss';

interface StandardButtonProps {
  buttonText: string;
  clickHandler: any;
  classNames?: string;
}

const StandardButton: React.FC<StandardButtonProps> = ({ buttonText, clickHandler, classNames }) => {
  return (
    <div onClick={clickHandler} className={`button ${classNames}`}>{buttonText}</div>
  )
}

export default StandardButton;
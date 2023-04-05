import './hp-bar.scss';

interface HPBarProps {
  maxHP: number;
  currentHP: number;
}

/**
 * A component that displays a responsive health bar with animation
 * @param {number} maxHP - The maximum hp to be a full hp bar.
 * @param {number} currentHP - The current hp.
 */
const HPBar: React.FC<HPBarProps> = ({ maxHP, currentHP }) => {
  return (
    <div className="hp-container">
      <div className="hp-text">{`${currentHP}/${maxHP}`}</div>
      <div 
        className={`hp-bar ${maxHP-currentHP<=0?'full':''}`} 
        style={{width: `${100 * (currentHP/maxHP)}%`}}>
      </div>
    </div>
  )
}

export default HPBar;
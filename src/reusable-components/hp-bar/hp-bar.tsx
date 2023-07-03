import './hp-bar.scss';
import { formatTime } from '../../util';
import CountUp from 'react-countup';

interface HPBarProps {
  maxHP: number;
  currentHP: number | undefined;
  isTimer?: boolean;
}

/**
 * A component that displays a responsive health bar with animation. If currentHP is not yet defined this will display as full
 * @param {number} maxHP - The maximum hp to be a full hp bar.
 * @param {number | undefined} currentHP - The current hp.
 * @param {boolean} isTimer - (optional) If true display a countdown timer for currentHp
 */
const HPBar: React.FC<HPBarProps> = ({ maxHP, currentHP, isTimer }) => {
  return (
    <div className="hp-container">
      <div className="hp-text">
        {isTimer && formatTime(currentHP || maxHP)}
        {!isTimer && 
        <>
          <CountUp end={currentHP as number} preserveValue={true}/>{`/${maxHP}`}
        </>
        }
        
      </div>
      <div 
        className={`hp-bar ${maxHP-(currentHP || maxHP)<=0?'full':''}`} 
        style={{width: `${100 * ((currentHP || maxHP)/maxHP)}%`}}>
      </div>
    </div>
  )
}

export default HPBar;
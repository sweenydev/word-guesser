import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  timeLeft: number;
}

/**
 * A component that displays a countdown timer in minutes and seconds, with milliseconds as decimals.
 * @param {number} timeLeft - The number of milliseconds left on the timer.
 */
const CountdownTimer: React.FC<CountdownTimerProps> = ({ timeLeft }) => {
  const [millisLeft, setMillisLeft] = useState(timeLeft);
  
  useEffect(() => {
    if (millisLeft > 0) {
      setTimeout(() => {
        setMillisLeft(millisLeft - 10);
      }, 10);
    }
  }, [millisLeft]);
  
  function formatTime(): string {
    const totalSecondsLeft = Math.floor(millisLeft / 1000);
    const minutes = Math.floor(totalSecondsLeft / 60);
    const seconds = totalSecondsLeft % 60;
    const millis = millisLeft % 1000;
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };
  
  return (
    <div>{formatTime()}</div>
  );
};

export default CountdownTimer;
import React, { useState, useEffect } from 'react';

const CountdownTimer = ({ timeLeft }) => {
  const [millisLeft, setMillisLeft] = useState(timeLeft);
  
  useEffect(() => {
    if (millisLeft > 0) {
      setTimeout(() => {
        setMillisLeft(millisLeft - 10);
      }, 10);
    }
  }, [millisLeft]);
  
  const formatTime = () => {
    const totalSecondsLeft = Math.floor(millisLeft / 1000);
    const minutes = Math.floor(totalSecondsLeft / 60);
    const seconds = totalSecondsLeft % 60;
    const millis = millisLeft % 1000;
    
    return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  };
  
  return (
    <div>
      {formatTime()}
    </div>
  );
};

export default CountdownTimer;
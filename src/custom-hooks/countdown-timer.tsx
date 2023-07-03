import { useState, useEffect } from 'react';

/**
 * A custom hook that takes an initial time in seconds and returns the time remaining, a function to toggle the timer, and a function to change the timeRemaining value.
 * @param initialTime - The initial time in milliseconds.
 * @returns the time remaining in milliseconds, a function to start or stop the timer, and a function to set the time remaining.
 */
function useCountdownTimer(initialTime: number): [number, (startTimer: boolean) => void, (newTimeRemaining: number) => void] {
  const [timeRemaining, setTime] = useState<number>(initialTime);
  const [isActive, setIsActive] = useState<boolean>(false);

  /**
   * Starts or stops the timer.
   * @param startTimer - A boolean value indicating whether to start or stop the timer.
   */
  function startOrStopTimer(startTimer: boolean): void {
    setIsActive(startTimer);
  }

  /**
   * Sets the time remaining in milliseconds.
   * @param newTimeRemaining - The new time remaining in milliseconds.
   */
  function setTimeRemaining(newTimeRemaining: number): void {
    setTime(newTimeRemaining);
  }

  // update the time state every 100ms if the timer is active
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setTime((prev) => prev - 100);
      }, 100);
    } else if (interval !== null) {
      clearInterval(interval as NodeJS.Timeout);
    }
    // Clear the interval when the component unmounts or the timer stops
    return () => clearInterval(interval as NodeJS.Timeout);
  }, [isActive]);

  return [timeRemaining, startOrStopTimer, setTimeRemaining];
}

export default useCountdownTimer;
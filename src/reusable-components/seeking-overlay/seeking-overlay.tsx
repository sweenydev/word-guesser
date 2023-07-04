import React, { useState, useRef, useEffect } from "react";
import './seeking-overlay.scss';

interface Props {
  calculateSeekFraction: () => number; // function to calculate the current seek fraction;
  onSeek: (newSeekFraction: number) => void; // the callback function when the seek is clicked
}

/**
 * A component that renders a seeking overlay for a video player.
 * It shows two lines: one for the current seek position and one for the hovered seek position.
 * The user can click on the overlay to change the seek position. 
 * @param {() => number} calculateSeekFraction - The function to calculate the current seek fraction of the playing video (0 - 1).
 * @param {(newSeekFraction: number) => void} onSeek - The function to apply the new seek position to the playing video.
 */
const SeekingOverlay: React.FC<Props> = ({calculateSeekFraction, onSeek}) => {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [seekFraction, setSeekFraction] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  function getSeekFractionFromX(x: number): number {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      return Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    }
    return 0;
  };

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>): void {
    setHoverX(e.clientX);
  };

  function handleClick(): void {
    if (hoverX !== null) {
      const newSeekFraction = getSeekFractionFromX(hoverX);
      onSeek(newSeekFraction);
      setSeekFraction(newSeekFraction);
    }
  };

  //Update the current seek fraction every 50 milliseconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(() => {
      setSeekFraction(calculateSeekFraction());
    }, 50);
    // Clear the interval when the component unmounts
    return () => clearInterval(interval as NodeJS.Timeout);
  }, []);


  return (
    <div
      className="video-seek-overlay"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}>
      <div className="line seeking" style={{left: `${getSeekFractionFromX(hoverX as number) * 100}%`}}></div>
      <div className="line current" style={{left: `${seekFraction as number * 100}%`}}></div>
    </div>
  );
};

export default SeekingOverlay;

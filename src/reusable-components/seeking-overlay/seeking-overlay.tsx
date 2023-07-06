import React, { useState, useRef, useEffect } from "react";
import './seeking-overlay.scss';
import { formatTime } from "../../util";
import StandardButton from "../buttons/standard-button";

interface SeekingOverlayProps {
  getCurrentTime: () => number;
  videoDuration: number;
  isPlaying: boolean;
  onSeek: (newSeekFraction: number) => void;
  onPauseOrPlay: (newIsPaused: boolean) => void;
}

/**
 * A component that renders a seeking overlay for a video player.
 * It shows two lines with time labels: one for the current seek position and one for the hovered seek position.
 * The current position line has a pause/play button which triggers onPauseOrPlay when clicked.
 * The user can click anywhere else on the overlay to change the seek position. 
 * @param {() => number} getCurrentTime - function that returns current time
 * @param {number} videoDuration - duration of the current video
 * @param {boolean} isPlaying - tells whether the video is paused or playing
 * @param {(newSeekFraction: number) => void} onSeek - The function to apply the new seek position to the playing video.
 * @param {(newIsPaused: boolean) => void} onPauseOrPlay - The function that runs when the pause/play button is clicked
 */
const SeekingOverlay: React.FC<SeekingOverlayProps> = ({getCurrentTime, videoDuration, isPlaying, onSeek, onPauseOrPlay}) => {
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [pauseOrPlayHovered, setPauseOrPlayHovered] = useState<boolean>(false);
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
      onSeek(getSeekFractionFromX(hoverX));
    }
  };

  //Update the current time every 100 milliseconds
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    interval = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 100);
    // Clear the interval when the component unmounts
    return () => clearInterval(interval as NodeJS.Timeout);
  }, []);


  return (
    <div
      className="video-seek-overlay"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onClick={handleClick}>
      { !pauseOrPlayHovered &&
      <div className="line seeking" style={{left: `${getSeekFractionFromX(hoverX as number) * 100}%`}}>
        <div className="time-label">
          {formatTime(getSeekFractionFromX(hoverX as number) * videoDuration * 1000, true)}
        </div>
      </div>
      }
      <div className="line current" style={{left: `${currentTime as number / videoDuration * 100}%`}}>
        <div className={`play-pause-button ${isPlaying ? 'playing' : 'paused'}`}>
          <StandardButton 
            classNames="round primary" 
            buttonText={isPlaying ? `⏸` : `▶`} 
            hoverChangeHandler={setPauseOrPlayHovered}
            clickHandler={()=>{onPauseOrPlay(!isPlaying)}}/>
        </div>
        <div className="time-label">
          {formatTime(currentTime as number * 1000, true)}
        </div>
      </div>
    </div>
  );
};

export default SeekingOverlay;

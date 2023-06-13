import './video-browser.scss';

interface VideoBrowserProps {
  videoHistory: Array<Array<VideoInfo>>;
  roundNumber?: number;
}

function VideoCard({ video }: { video: VideoInfo }): JSX.Element {
  return (
    <div className="video-card">
      <img className="thumbnail" src={video.thumbnailURL} alt={video.title} />
      <div>
        <div className="title">
          <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank">{video.title}</a>
        </div>
        <div className="channel">
          By <a href={`https://www.youtube.com/channel/${video.channelId}`} target="_blank">{video.channelName}</a>
        </div>
        <div className="description">{video.description}</div>
        <div className="release-date">Released {video.releaseDate}</div>
        <div className="views">Views: {video.views.toLocaleString('en-US')}</div>
      </div>
    </div>
  );
}

function RoundHeader({ prompt, videoRoundNumber }: { prompt: string; videoRoundNumber?: number }): JSX.Element {
  return (
    <div className="section-header">
      <div className="prompt">Search: {prompt}</div>
      {videoRoundNumber!==undefined &&
      <div className="round-number">
        Round {videoRoundNumber + 1}
      </div>
      }
    </div>
  );
}

/**
 * A component that displays either a specific round's video history, or the entire game's video history
 * @param {Array<Array<VideoInfo>>} videoHistory - Info for all of the videos the user has watched, organized by round.
 * @param {number} roundNumber - (Optional) The round number to show history for, pass if you only want to show one round.
 */
const VideoBrowser: React.FC<VideoBrowserProps> = ({ videoHistory, roundNumber }) => {
  
  function generateRoundVideoCards(roundVideos: VideoInfo[], videoRoundNumber?: number): JSX.Element[] {
    let prompt: string;
    let returnElements: JSX.Element[] = [];
    roundVideos.forEach((video) => {
      if (video.prompt !== prompt) {
        prompt = video.prompt;
        returnElements.push(<RoundHeader key={`header-${prompt}`} prompt={prompt} videoRoundNumber={videoRoundNumber} />)
      }
      returnElements.push(<VideoCard key={video.videoId} video={video} />)
    });
    returnElements.push(<br></br>);
    return returnElements;
  }

  const videoCards = roundNumber !== undefined
    ? generateRoundVideoCards(videoHistory[roundNumber])
    : videoHistory.flatMap((roundVideos, roundNumber) => generateRoundVideoCards(roundVideos, roundNumber));

  return (
    <div className="video-browser">
      {videoCards}
    </div>
  )
}

export default VideoBrowser;
const {onCall} = require("firebase-functions/v2/https");
const {log, info, debug, warn, error, write} = require("firebase-functions/logger");
const { Client } = require("may-youtubei");

const youtubeSearch = new Client();

exports.searchYoutube = onCall(async(request) => {
  const results = await youtubeSearch.search(request.data, {
    type: "video",
  });
  debug('search results', results);
  let videoInfoArray = [];
  results.items.forEach((video) => {
    videoInfoArray.push(
      {
        prompt: request.data,
        videoId: video.id,
        title: video.title,
        description: video.description,
        thumbnailURL: video.thumbnails.min,
        releaseDate: video.uploadDate,
        views: video.viewCount,
        channelName: video.channel.name,
        channelId: video.channel.id,
      }
    )
  })
  debug('search results filtered', videoInfoArray);
  return videoInfoArray;
})
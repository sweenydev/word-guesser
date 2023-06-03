const {onCall} = require("firebase-functions/v2/https");
const {defineString} = require('firebase-functions/params');

const youtubeApiKey = defineString('YOUTUBE_API_KEY');

exports.getYoutubeApiKey = onCall((data, context) => {
    return {
      youtubeApiKey: youtubeApiKey.value()
    };
});
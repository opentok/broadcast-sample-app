/* eslint-env es6 */

/** Consfig */
const config = require('../config');
const apiKey = config.apiKey;
const apiSecret = config.apiSecret;

/** Imports */
const R = require('ramda');
const Promise = require('bluebird');
// http://bluebirdjs.com/docs/api/promisification.html
const request = Promise.promisify(require('request'));
Promise.promisifyAll(request);

/** Constants */
const broadcastURL = `https://api.opentok.com/v2/partner/${apiKey}/broadcast`;
const stopBroadcastURL = id => `${broadcastURL}/${id}/stop`;
const headers = {
  'Content-Type': 'application/json',
  'X-TB-PARTNER-AUTH': `${apiKey}:${apiSecret}`
};

/**
 * There is currently a ~15 second delay between the interactive session due to the
 * encoding process and the time it takes to upload the video to the CDN.  Currently
 * using a 20-second delay to be safe.
 */
const broadcastDelay = 20 * 1000;

/** Exports */

/**
 * Start the broadcast, update in-memory and redis data, and schedule cleanup
 * @param {String} broadcastSessionId - Spotlight host session id
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const startBroadcast = broadcastSessionId => {

  const requestConfig = {
    headers,
    url: broadcastURL,
    body: JSON.stringify({
      sessionId: broadcastSessionId
    })
  };

  return new Promise((resolve, reject) => {

    request.postAsync(requestConfig)
      .then(response => {
        const data = JSON.parse(response.body);

        const broadcastData = {
          broadcastSession: broadcastSessionId,
          broadcastUrl: R.path(['broadcastUrls', 'hls'], data),
          broadcastId: R.path('id', data),
          broadcastKey: R.path('partnerId', data),
          availableAt: R.path('createdAt', data) + broadcastDelay
        };
        resolve(broadcastData);
      }).catch(error => reject(error));
  });

};

/**
 * End the broadcast
 * @param {String} broadcastId
 */
const endBroadcast = (broadcastId) => {

  const requestConfig = () => ({ headers, url: stopBroadcastURL(broadcastId) });

  const sendEndRequest = () => {
    request.postAsync(requestConfig(broadcastId))
      .then(response => {
        console.log('Broadcast has ended: ', JSON.parse(response.body));
      })
      .catch(error => {
        console.log('Error occured while trying to end broadcast: ', error);
      });
  };

  /**
   * The broadcast API will immediately end the CDN stream when we make the
   * request.  Thus, we want to delay the request so that the CDN viewers are
   * able to watch the broadcast in its entirety.
   */
  setTimeout(sendEndRequest, broadcastDelay);
};

module.exports = {
  startBroadcast,
  endBroadcast,
};

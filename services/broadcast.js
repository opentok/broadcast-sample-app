'use strict';
/* eslint-env es6 */

/** Config */
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

/** Let's store the active broadcast */
let activeBroadcast;

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
        activeBroadcast = broadcastData;
        resolve(broadcastData);
      }).catch(error => reject(error));
  });

};

const getActiveBroadcast = () => activeBroadcast;

/**
 * End the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const endBroadcast = () => {

  const id = activeBroadcast.broadcastId;
  const requestConfig = () => ({ headers, url: stopBroadcastURL(id) });
  return new Promise((resolve, reject) => {
    request.postAsync(requestConfig(id))
      .then(response => {
        resolve(JSON.parse(response.body));
      })
      .catch(error => {
        reject(error);
      });
  });
};



module.exports = {
  startBroadcast,
  getActiveBroadcast,
  endBroadcast,
};

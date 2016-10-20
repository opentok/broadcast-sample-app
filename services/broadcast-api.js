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
const updateLayoutURL = id => `https://api.opentok.com/v2/project/${apiKey}/broadcast/${id}/layout`;
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


// https://tokbox.com/developer/guides/broadcast/#custom-layouts
const horizontalLayout = {
  layout: {
    type: 'custom',
    stylesheet: `stream {
        float: left;
        height: 100%;
        width: 33.33%;
      }`
  }
};

// https://tokbox.com/developer/guides/broadcast/#predefined-layout-types
const bestFitLayout = {
  layout: {
    type: 'bestFit'
  }
};

/** Exports */

/**
 * Start the broadcast and keep the active broadcast in memory
 * @param {String} broadcastSessionId - Spotlight host session id
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const start = (broadcastSessionId, streams) => {

  const layout = streams > 3 ? bestFitLayout : horizontalLayout;

  const requestConfig = {
    headers,
    url: broadcastURL,
    body: JSON.stringify(R.merge({ sessionId: broadcastSessionId }, layout))
  };

  return new Promise((resolve, reject) => {

    if (R.path(['session'], activeBroadcast) === broadcastSessionId) {
      resolve(activeBroadcast);
    }

    request.postAsync(requestConfig)
      .then(response => {
        const data = JSON.parse(response.body);

        const broadcastData = {
          id: R.path(['id'], data),
          session: broadcastSessionId,
          url: R.path(['broadcastUrls', 'hls'], data),
          apiKey: R.path(['partnerId'], data),
          availableAt: R.path(['createdAt'], data) + broadcastDelay
        };
        activeBroadcast = broadcastData;
        resolve(broadcastData);
      }).catch(error => reject(error));
  });

};

/**
 * Dynamically update the broadcast layout
 * @param {Number} streams - The number of active streams in the broadcast session
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const updateLayout = (streams) =>
  new Promise((resolve, reject) => {
    const id = R.path(['id'], activeBroadcast);
    if (!id) {
      reject({ error: 'No active broadcast session found' });
    }
    const layout = streams > 3 ? bestFitLayout : horizontalLayout;
    const requestConfig = {
      headers,
      url: updateLayoutURL(id),
      body: JSON.stringify(layout)
    };
    request.postAsync(requestConfig)
      .then(response => {
        const data = JSON.parse(response.body);
        resolve({ data });
      }).catch(error => reject(error));
  });

/**
 * End the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const end = () =>
  new Promise((resolve, reject) => {
    const id = R.path(['id'], activeBroadcast);
    if (!id) {
      reject({ error: 'No active broadcast session found' });
    }
    const requestConfig = () => ({ headers, url: stopBroadcastURL(id) });
    request.postAsync(requestConfig(id))
      .then(response => resolve(JSON.parse(response.body)))
      .catch(error => reject(error))
      .finally(() => {
        activeBroadcast = null;
      });
  });

module.exports = {
  start,
  updateLayout,
  end,
};

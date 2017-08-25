'use strict';

/* eslint-env es6 */

/** Config */
const { apiKey, apiSecret } = require('../config');

/** Imports */
const R = require('ramda');
const Promise = require('bluebird');
const request = Promise.promisify(require('request'));
const jwt = require('jsonwebtoken');

// http://bluebirdjs.com/docs/api/promisification.html
Promise.promisifyAll(request);

/** Constants */
const broadcastURL = `https://api.opentok.com/v2/project/${apiKey}/broadcast`;
const updateLayoutURL = id => `https://api.opentok.com/v2/project/${apiKey}/broadcast/${id}/layout`;
const stopBroadcastURL = id => `${broadcastURL}/${id}/stop`;

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

/**
 * Get auth header
 * @returns {Object}
 */
const headers = () => {
  const createToken = () => {
    const options = {
      issuer: apiKey,
      expiresIn: '1m',
    };
    return jwt.sign({ ist: 'project' }, apiSecret, options);
  };

  return { 'X-OPENTOK-AUTH': createToken() };
};

/** Exports */

/**
 * Start the broadcast and keep the active broadcast in memory
 * @param {String} broadcastSessionId - Spotlight host session id
 * @param {Number} streams - The current number of published streams
 * @param {String} [rtmpUrl] - The (optional) RTMP stream url
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const start = (broadcastSessionId, streams, rtmp) =>
  new Promise((resolve, reject) => {

    if (R.path(['session'], activeBroadcast) === broadcastSessionId) {
      resolve(activeBroadcast);
    } else {
      const layout = streams > 3 ? bestFitLayout : horizontalLayout;

      /**
       * This outputs property must be included in the request body
       * in order to broadcast to RTMP streams
       */
      const { serverUrl, streamName } = rtmp;
      const outputs =
        R.and(!!serverUrl, !!streamName) ?
          { outputs: { hls: {}, rtmp: { serverUrl, streamName } } } :
          {};

      const requestConfig = {
        headers: headers(),
        url: broadcastURL,
        json: true,
        body: R.mergeAll([{ sessionId: broadcastSessionId }, layout, outputs]),
      };

      // Parse the response from the broadcast api
      const setActiveBroadcast = ({ body }) => {
        const broadcastData = {
          id: R.path(['id'], body),
          session: broadcastSessionId,
          rtmp: !!R.path(['broadcastUrls', 'rtmp'], body),
          url: R.path(['broadcastUrls', 'hls'], body),
          apiKey: R.path(['partnerId'], body),
          availableAt: R.path(['createdAt'], body) + broadcastDelay
        };
        activeBroadcast = broadcastData;
        return Promise.resolve(broadcastData);
      };

      request.postAsync(requestConfig)
        .then(setActiveBroadcast)
        .then(resolve)
        .catch(reject);

    }
  });


/**
 * Dynamically update the broadcast layout
 * @param {Number} streams - The number of active streams in the broadcast session
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const updateLayout = streams =>
  new Promise((resolve, reject) => {
    const id = R.path(['id'], activeBroadcast);

    if (!id) {
      reject({ error: 'No active broadcast session found' });
    }

    const layout = streams > 3 ? bestFitLayout : horizontalLayout;
    const requestConfig = {
      headers: headers(),
      url: updateLayoutURL(id),
      json: true,
      body: R.pick(['type', 'stylesheet'], R.prop('layout', layout)),
    };

    request.putAsync(requestConfig)
      .then(({ body }) => resolve(body))
      .catch(reject);
  });

/**
 * End the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const end = () =>
  new Promise((resolve, reject) => {
    const id = R.path(['id'], activeBroadcast);
    if (!id) {
      return reject({ error: 'No active broadcast session found' });
    }
    const requestConfig = () => ({ headers: headers(), url: stopBroadcastURL(id) });
    request.postAsync(requestConfig(id))
      .then(({ body }) => resolve(body))
      .catch(reject)
      .finally(() => { activeBroadcast = null; });
  });

module.exports = {
  start,
  updateLayout,
  end,
};

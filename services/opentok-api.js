'use strict';

const { apiKey, apiSecret } = require('../config');

const OpenTok = require('opentok');
const OT = new OpenTok(apiKey, apiSecret);

const defaultSessionOptions = { mediaMode: 'routed' };

const customStyle = `
stream {
  width: 15%;
  height: 15%;
}
stream.focus {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 100%;
  z-index: 1;
}
stream.sub {
  position: absolute;
  z-index: 5;
}
stream.item0 {
  top: 85%;
  left: 0;
}
stream.item1 {
  top: 85%;
  right: 0;
}
stream.item2 {
  top: 70%;
  left: 0;
}
stream.item3 {
  top: 70%;
  right: 0;
}
stream.item4 {
  top: 85%;
  left: 15%;
}
stream.item5 {
  top: 85%;
  right: 15%;
}
stream.item6 {
  top: 85%;
  left: 30%;
}
stream.item7 {
  top: 85%;
  right: 30%;
}`;

/**
 * There is currently a ~15 second delay between the interactive session due to the
 * encoding process and the time it takes to upload the video to the CDN.  Currently
 * using a 20-second delay to be safe.
 */
const broadcastDelay = 20 * 1000;

let activeSession;
let activeBroadcast;

/**
 * Returns options for token creation based on user type
 * @param {String} userType Host, guest, or viewer
 */
const tokenOptions = (userType) => {
  const role = {
    host: 'moderator',
    guest: 'publisher',
    viewer: 'subscriber',
  }[userType];

  return { role };
};

/**
 * Create an OpenTok session
 * @param {Object} [options]
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const createSession = async (options) => {
  return new Promise((resolve, reject) => {
    try {
      OT.createSession({ ...defaultSessionOptions, ...options }, (err, session) => {
        if (err) resolve(err);

        activeSession = session;
        resolve(session);
      });
    }
    catch (err) {
      reject(err);
    }
  });
}

/**
 * Create an OpenTok token
 * @param {String} userType Host, guest, or viewer
 * @returns {String}
 */
const createToken = userType => OT.generateToken(activeSession.sessionId, tokenOptions(userType));

/**
 * Creates an OpenTok session and generates an associated token
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const getCredentials = async (userType) => {
  return new Promise(async (resolve, reject) => {
    if (!activeSession) {
      try {
        await createSession();
      }
      catch (err) {
        reject(err);
      }
    }
    const token = createToken(userType);
    resolve({ apiKey, sessionId: activeSession.sessionId, token });
  });
}

/**
 * Start the broadcast and keep the active broadcast in memory
 * @param {Number} streams - The current number of published streams
 * @param {String} [rmtp] - The (optional) RTMP stream url
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const startBroadcast = async (streams, rmtp) => {
  return new Promise((resolve, reject) => {

    let layout;
    if (streams > 3) {
      layout = {
        type: 'bestFit'
      };
    }
    else {
      layout = {
        type: 'custom',
        stylesheet: customStyle,
      };
    }
    const outputs = {
      hls: {},
    };
    const sessionId = activeSession.sessionId;

    const { serverUrl, streamName } = rmtp;

    if (serverUrl && streamName) {
      outputs.rmtp = rmtp;
    }

    try {
      OT.startBroadcast(sessionId, { layout, outputs, }, function (err, broadcast) {
        if (err) reject(err);

        activeBroadcast = {
          id: broadcast.id,
          session: broadcast.sessionId,
          rmtp: broadcast.broadcastUrls.rmtp,
          url: broadcast.broadcastUrls.hls,
          apiKey: apiKey,
          availableAt: broadcast.createdAt + broadcastDelay
        };
        resolve(activeBroadcast);
      });
    }
    catch (err) {
      reject(err);
    }
  });
}

/**
 * End the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const stopBroadcast = async () => {
  return new Promise((resolve, reject) => {
    if (!activeBroadcast) {
      reject({ error: 'No active broadcast session found' });
    }

    try {
      OT.stopBroadcast(activeBroadcast.id, function (err, broadcast) {
        if (err) reject(err);
        resolve(broadcast);
      });
    }
    catch (err) {
      reject(err);
    }
    finally {
      activeBroadcast = null;
    }
  });
}

/**
 * Dynamically update the broadcast layout
 * @param {Number} streams - The number of active streams in the broadcast session
 * @param {String} type - OPTIONAL: type of layout
 * @returns {Promise} <Resolve => null, Reject => {Error}>
 */
const updateLayout = async (streams, type) => {
  return new Promise((resolve, reject) => {
    if (!activeBroadcast) {
      reject({ error: 'No active broadcast session found' });
    }
    let stylesheet;

    if (!type) {
      if (streams > 3) {
        type = 'bestFit';
      }
      else {
        type = 'custom';
        stylesheet = customStyle;
      }
    }
    else if (type === 'custom') {
      stylesheet = customStyle;
    }

    try {
      OT.setBroadcastLayout(activeBroadcast.id, type, stylesheet, function (err) {
        if (err) reject(err);
        resolve();
      });
    }
    catch (err) {
      reject(err);
    }
  });
}

/**
 * Dynamically update class lists for streams
 * @param {Array} classListArray - The number of active streams in the broadcast session
 * <pre>
 * const classListArray = [
 *   { id: '7b09ec3c-26f9-43d7-8197-f608f13d4fb6', layoutClassList: ['focus'] },
 *   { id: '567bc941-6ea0-4c69-97fc-70a740b68976', layoutClassList: ['top'] },
 *   { id: '307dc941-0450-4c09-975c-705740d08970', layoutClassList: ['bottom'] }
 * ];
 * </pre>
 * @returns {Promise} <Resolve => null, Reject => {Error}>
 */
const updateStreamClassList = async (classListArray) => {
  return new Promise((resolve, reject) => {
    try {
      OT.setStreamClassLists(activeSession.sessionId, classListArray, function (err) {
        if (err) reject(err);
        resolve();
      });
    }
    catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  getCredentials,
  startBroadcast,
  stopBroadcast,
  updateLayout,
  updateStreamClassList
};
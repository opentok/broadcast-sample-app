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
const activeBroadcast = {};

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
        resolve(session);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Create an OpenTok token
 * @param {String} userType Host, guest, or viewer
 * @returns {String}
 */
const createToken = (userType, sessionId) => OT.generateToken(sessionId, tokenOptions(userType));

/**
 * Creates an OpenTok session and generates an associated token
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const getCredentials = async (userType, sessionId = null) => {
  return new Promise(async (resolve, reject) => {
    let session;
    if (!session) {
      try {
        session = await createSession();
      } catch (err) {
        reject(err);
      }
    }
    const token = createToken(userType, session.sessionId);
    resolve({ apiKey, sessionId: session.sessionId, token });
  });
};

/**
 * Start the broadcast and keep the active broadcast in memory
 * @param {String} [rtmp] - The (optional) RTMP stream url
 * @param {Boolean} [lowLatency] - The (optional) low Latency option for HLS
 * @param {fhd} [fhd] - The (optional) Full HD parameter for streaming
 * @param {dvr} [dvr] - The (optional) DVR option for HLS
 * @param {sessionId} [sessionId] - The sessionId to start the broadcast for
 * @returns {Promise} <Resolve => {Object} Broadcast data, Reject => {Error}>
 */
const startBroadcast = async (rtmp, lowLatency, fhd = false, dvr = false, sessionId) => {
  return new Promise((resolve, reject) => {
    console.log('StartBroadcast API');

    const layout = {
      type: 'bestFit',
      screenshareType: 'pip',
    };
    let dvrConfig = dvr;
    let lowLatencyConfig = lowLatency;
    if (dvrConfig) {
      lowLatencyConfig = false; // DVR and LL are not compatible
    }
    let outputs = {
      hls: {
        dvr: dvrConfig,
        lowLatency: lowLatencyConfig,
      },
    };

    const { serverUrl, streamName } = rtmp;

    if (serverUrl && streamName) {
      outputs.rtmp = [rtmp];
      console.log(outputs);
    }

    const resolution = fhd ? '1920x1080' : process.env.broadcastDefaultResolution ? process.env.broadcastDefaultResolution : '1280x720';

    try {
      OT.startBroadcast(sessionId, { layout, outputs, resolution }, function (err, broadcast) {
        if (err) {
          console.log('error starting broadcast ' + err);

          reject(err);
        }

        activeBroadcast[sessionId] = {
          id: broadcast.id,
          session: broadcast.sessionId,
          rtmp: broadcast.broadcastUrls.rtmp,
          url: broadcast.broadcastUrls.hls,
          apiKey: apiKey,
          availableAt: broadcast.createdAt + broadcastDelay,
        };
        console.log('activeBroadcast', activeBroadcast);
        resolve(activeBroadcast[sessionId]);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * End the broadcast
 *  @param {String} [sessionId] - The sessionId to stop the broadcast
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const stopBroadcast = async (sessionId) => {
  return new Promise((resolve, reject) => {
    console.log('StopBroadcast API');
    if (!activeBroadcast[sessionId]) {
      reject({ error: 'No active broadcast session found' });
    }

    try {
      OT.stopBroadcast(activeBroadcast[sessionId].id, function (err, broadcast) {
        if (err) reject(err);
        resolve(broadcast);
      });
    } catch (err) {
      reject(err);
    } finally {
      activeBroadcast[sessionId] = null;
    }
  });
};

/**
 * Dynamically update the broadcast layout
 * @param {Number} streams - The number of active streams in the broadcast session
 * @param {String} type - OPTIONAL: type of layout
 * @returns {Promise} <Resolve => null, Reject => {Error}>
 */
const updateLayout = async (streams, type, sessionId) => {
  return new Promise((resolve, reject) => {
    if (!activeBroadcast) {
      reject({ error: 'No active broadcast session found' });
    }
    let stylesheet;

    if (!type) {
      if (streams > 3) {
        type = 'bestFit';
      } else {
        type = 'custom';
        stylesheet = customStyle;
      }
    } else if (type === 'custom') {
      stylesheet = customStyle;
    }

    try {
      OT.setBroadcastLayout(activeBroadcast[sessionId].id, type, stylesheet, function (err) {
        if (err) reject(err);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

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
const updateStreamClassList = async (classListArray, sessionId) => {
  return new Promise((resolve, reject) => {
    try {
      OT.setStreamClassLists(sessionId, classListArray, function (err) {
        if (err) reject(err);
        resolve();
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  getCredentials,
  startBroadcast,
  stopBroadcast,
  updateLayout,
  updateStreamClassList,
  createToken,
  apiKey,
  activeBroadcast,
};

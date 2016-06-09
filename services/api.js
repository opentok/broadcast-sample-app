/* eslint-env es6 */

/** Config */
const config = require('../config');
const apiKey = config.apiKey;
const apiSecret = config.apiSecret;

/** Imports */
const R = require('ramda');
const Promise = require('bluebird');
const OpenTok = require('opentok');
const OT = Promise.promisifyAll(new OpenTok(apiKey, apiSecret));

/** Private */

/**
 * Returns options for token creation based on user type
 * @param {String} userType Host, guest, or viewer
 */
const tokenOptions = userType => {

  const role = {
    host: 'moderator',
    guest: 'publisher',
    viewer: 'subscriber',
  }[userType];

  return { role };
};

const defaultSessionOptions = { mediaMode: 'routed' };
let activeSession;

/** Exports */

/**
 * Create an OpenTok session
 * @param {Object} [options]
 * @returns {Promise.<Object, Error>}
 */
const createSession = options =>
  new Promise((resolve, reject) => {
    OT.createSessionAsync(R.defaultTo(defaultSessionOptions)(options))
      .then(session => {
        activeSession = session;
        resolve(session);
      })
      .catch(error => reject(error));
  });

/**
 * Create an OpenTok token
 * @param {String} userType Host, guest, or viewer
 * @returns {String}
 */
const createToken = userType => {
  const sessionId = activeSession.id;
  OT.generateToken(sessionId, tokenOptions(userType));
};

/**
 * Creates an OpenTok session and generates an associated token
 * @returns {Promise.<Object, Error>}
 */
const getCredentials = userType =>
  new Promise((resolve, reject) => {
    const token = createToken(tokenOptions(userType));
    if (!!activeSession) {
      resolve({ sessionId: activeSession.id, token });
    } else {
      createSession()
        .then(session => { resolve({ apiKey, sessionId: session.id, token }); })
        .catch(error => reject(error));
    }
  });

module.exports = {
  createSession,
  createToken,
  getCredentials,
};

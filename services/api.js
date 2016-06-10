'use strict';
/* eslint-env es6 */

/** Config */
const config = require('../config');
const apiKey = config.apiKey;
const apiSecret = config.apiSecret;

/** Imports */
const R = require('ramda');
const Promise = require('bluebird');
const OpenTok = require('opentok');
// http://bluebirdjs.com/docs/api/promisification.html
const OT = Promise.promisifyAll(new OpenTok(apiKey, apiSecret));

/** Private */

const defaultSessionOptions = { mediaMode: 'routed' };

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

/**
 * Create an OpenTok session
 * @param {Object} [options]
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
let activeSession;
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
const createToken = userType => OT.generateToken(activeSession.sessionId, tokenOptions(userType));

/** Exports */

/**
 * Creates an OpenTok session and generates an associated token
 * @returns {Promise} <Resolve => {Object}, Reject => {Error}>
 */
const getCredentials = userType =>
  new Promise((resolve, reject) => {
    if (!!activeSession) {
      const token = createToken(tokenOptions(userType));
      resolve({ apiKey, sessionId: activeSession.sessionId, token });
    } else {
      createSession()
        .then(session => {
          const token = createToken(tokenOptions(userType));
          resolve({ apiKey, sessionId: session.sessionId, token });
        })
        .catch(error => reject(error));
    }
  });

module.exports = {
  getCredentials
};

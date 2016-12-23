'use strict';

/* eslint-env es6 */

/** Config */
const { apiKey, apiSecret } = require('../config');

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
let activeSession;
const createSession = options =>
  new Promise((resolve, reject) => {
    const setActiveSession = (session) => {
      activeSession = session;
      return Promise.resolve(session);
    };

    OT.createSessionAsync(R.defaultTo(defaultSessionOptions)(options))
      .then(setActiveSession)
      .then(resolve)
      .catch(reject);
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
    if (activeSession) {
      const token = createToken(userType);
      resolve({ apiKey, sessionId: activeSession.sessionId, token });
    } else {

      const addToken = (session) => {
        const token = createToken(userType);
        return Promise.resolve({ apiKey, sessionId: session.sessionId, token });
      };

      createSession()
        .then(addToken)
        .then(resolve)
        .catch(reject);
    }
  });

module.exports = {
  getCredentials
};

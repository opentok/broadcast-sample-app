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
const defaultTokenOptions = { role: 'publisher' };
const defaultSessionOptions = { mediaMode: 'routed' };

/** Exports */

/**
 * Create an OpenTok session
 * @param {object} [options]
 * @returns {promise.<object, error>}
 */
exports.createSession = options =>
  OT.createSessionAsync(R.defaultTo(defaultSessionOptions)(options));


/**
 * Create an OpenTok token
 * @param {string} sessionId
 * @returns {string}
 */
exports.createToken = (sessionId, options) =>
  OT.generateToken(sessionId, R.defaultTo(defaultTokenOptions)(options));


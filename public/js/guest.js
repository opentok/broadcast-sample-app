/* global analytics */
/* eslint-disable object-shorthand */
(function () {

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  var insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false,
    style: {
      buttonDisplayMode: 'off'
    }
  };

  /**
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  /**
   * Create an OpenTok publisher object
   */
  var initPublisher = function () {
    var properties = Object.assign({ name: 'Guest', insertMode: 'after' }, insertOptions);
    return OT.initPublisher('hostDivider', properties);
  };

  /**
   * Subscribe to a stream
   */
  var subscribe = function (session, stream) {
    var name = stream.name;
    var insertMode = name === 'Host' ? 'before' : 'after';
    var properties = Object.assign({ name: name, insertMode: insertMode }, insertOptions);
    session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  /**
   * Start publishing our audio and video to the session. Also, start
   * subscribing to other streams as they are published.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  var publishAndSubscribe = function (session, publisher) {

    session.publish(publisher);

    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
    });

  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
        analytics.init(session);
        analytics.log('initialize', 'variationAttempt');
        analytics.log('initialize', 'variationError');
      } else {
        publishAndSubscribe(session, publisher);
        analytics.init(session);
        analytics.log('initialize', 'variationAttempt');
        analytics.log('initialize', 'variationSuccess');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);

}());

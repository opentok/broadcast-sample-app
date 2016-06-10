/* global api */
/* eslint-disable object-shorthand */
(function () {

  /** The state of things */
  var state = { session: 'waiting', broadcast: 'waiting' };
  var broadcast = { status: 'waiting' };

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  var insertOptions = {
    insertMode: 'append',
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
    return OT.initPublisher('videoContainer', insertOptions);
  };

  var signal = function (session, options) {
    session.signal(options, function (error) {
      if (error) {
        console.log(['signal error (', error.code, '): ', error.message].join(''));
      } else {
        console.log('signal sent.');
      }
    });
  };

  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */
  var startBroadcast = function (session) {

    api.post('/broadcast/start', { sessionId: session.sessionId })
      .then(function (broadcastData) {
        console.log('broadcast broadcastData after start', broadcastData);
        signal(session, { type: 'broadcast', data: 'start' });
        // broadcast = R.merge(broadcast, broadcastData);
      }).catch(function (error) {
        console.log(error);
      });

    broadcast.status = 'active';
    signal(session, { type: 'broadcast', data: broadcast.status });

  };

  /**
   * Make a request to the server to stop the broadcast
   * @param {String} sessionId
   */
  var stopBroadcast = function () {
    api.post('/broadcast/stop')
      .then(function (broadcastData) {
        console.log('broadcast broadcastData after start', broadcastData);
        broadcast = R.merge(broadcast, broadcastData);
      })
      .catch(function (error) {
        console.log(error);
      });
  };

  /**
   * Subscribe to a stream
   */
  var subscribe = function (session, stream) {
    session.subscribe(stream, 'videoContainer', insertOptions, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  var setEventListeners = function (session) {

    // Subscribe to new streams as they're published
    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
    });

    // Signal the status of the broadcast when requested
    session.on('signal:broadcast', function (event) {
      if (event.data === 'status') {
        signal(session, { type: 'broadcast', data: broadcast.status });
      }
    });

    // Add click handler to the start/stop button
    document.getElementById('startStop').addEventListener('click', function () {
      if (state.broadcast !== 'active') {
        startBroadcast(session);
      } else {
        stopBroadcast(session);
      }
    });
  };

  /**
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  var publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    setEventListeners(session);
  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        publishAndSubscribe(session, publisher);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);

}());

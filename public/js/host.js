/* global api */
/* eslint-disable object-shorthand */
(function () {

  /** The state of things */
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

  /**
   * Send the broadcast status to everyone connected to the session using
   * the OpenTok signaling API
   * @param {Object} session
   * @param {String} status
   */
  var signal = function (session, status) {
    session.signal({ type: 'broadcast', data: status }, function (error) {
      if (error) {
        console.log(['signal error (', error.code, '): ', error.message].join(''));
      } else {
        console.log('signal sent.');
      }
    });
  };


  /**
   * Set the state of the broadcast and update the UI
   */
  var updateStatus = function (session, status) {

    var startStopButton = document.getElementById('startStop');
    broadcast.status = status;

    if (status === 'active') {
      startStopButton.classList.add('active');
      startStopButton.innerHTML = 'End Broadcast';
      document.getElementById('urlContainer').classList.remove('hidden');
      document.getElementById('broadcastURL').innerHTML = broadcast.url;
      signal(session, broadcast.status);
    } else {
      startStopButton.classList.remove('active');
      startStopButton.innerHTML = 'Broadcast Over';
      startStopButton.disabled = true;
      signal(session, broadcast.status);
    }

  };

  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */
  var startBroadcast = function (session) {

    api.post('/broadcast/start', { sessionId: session.sessionId })
      .then(function (broadcastData) {
        broadcast = R.merge(broadcast, broadcastData);
        updateStatus(session, 'active');
      }).catch(function (error) {
        console.log(error);
      });

  };

  /**
   * Make a request to the server to stop the broadcast
   * @param {String} sessionId
   */
  var endBroadcast = function (session) {
    api.post('/broadcast/end')
      .then(function () {
        updateStatus(session, 'ended');
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

    // Add click handler to the start/stop button
    var startStopButton = document.getElementById('startStop');
    startStopButton.classList.remove('hidden');
    startStopButton.addEventListener('click', function () {
      if (broadcast.status !== 'active') {
        startBroadcast(session);
      } else {
        endBroadcast(session);
      }
    });

    // Subscribe to new streams as they're published
    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
    });

    // Signal the status of the broadcast when requested
    session.on('signal:broadcast', function (event) {
      if (event.data === 'status') {
        signal(session, broadcast.status);
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

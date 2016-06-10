/* eslint-disable object-shorthand */
(function () {

  /** The state of things */
  var state = { session: 'waiting', broadcast: 'waiting' };
  var broadcast = { state: 'waiting' };

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
  var startBroadcast = function (sessionId) {
    /* eslint-disable quote-props */
    /* eslint-disable newline-per-chained-call */
    fetch('/broadcast/start', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: sessionId })
    }).then(function (response) {
      return response.json();
    }).then(function (broadcastData) {
      console.log('broadcast broadcastData after start', broadcastData);
      broadcast = R.merge(broadcast, broadcastData);
      // signal();
    }).catch(function (error) {
      console.log(error);
    });
    /* eslint-enable quote-props */
    /* eslint-enable newline-per-chained-call */
  };

  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */
  var stopBroadcast = function (sessionId) {
    /* eslint-disable quote-props */
    /* eslint-disable newline-per-chained-call */
    fetch('/broadcast/stop', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: sessionId })
    }).then(function (response) {
      return response.json();
    }).then(function (data) {
      console.log('broadcast data after start', data);
      signal();
    }).catch(function (error) {
      console.log(error);
    });
    /* eslint-enable quote-props */
    /* eslint-enable newline-per-chained-call */
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

    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
    });

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
    // state.session = 'active';
    // signal(session, { data: state.session, type: 'session' });
    // startBroadcast(session.id);
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

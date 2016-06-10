/* global OT */
/* eslint-disable object-shorthand */
(function () {

  var insertOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    showControls: false,
    style: {
      buttonDisplayMode: 'off'
    }
  };

  var state = { session: 'waiting', broadcast: 'waiting' };

  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

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
    fetch('/broadcast', {
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
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.  We also
   * make an API call to the server to start the broadcast.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  var startSession = function (session, publisher) {
    session.publish(publisher);
    session.on('streamCreated', function (event) {
      var stream = event.stream;
      session.subscribe(stream, 'videoContainer', insertOptions, function (error) {
        if (error) {
          console.log(error);
        }
      });
    });
    state.session = 'active';
    signal(session, { data: state.session, type: 'session' });
    startBroadcast(session.id);
  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        startSession(session, publisher);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);

}());

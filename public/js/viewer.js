/* eslint-disable object-shorthand */
(function () {

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
   * Subscribe to a stream
   */
  var subscribe = function (session, stream) {

    session.subscribe(stream, 'videoContainer', insertOptions, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  /** Ping the host to see if the broadcast has started */
  var checkBroadcastStatus = function (session) {
    session.signal({
      type: 'broadcast',
      data: 'status'
    });
  };

  /**
   * Listen for events on the OpenTok session
   */
  var setEventListeners = function (session) {

    var streams = [];
    var broadcastActive = false;

    /** Subscribe to new streams as they are published */
    session.on('streamCreated', function (event) {
      streams.push(event.stream);
      broadcastActive && subscribe(session, event.stream);
    });

    /** Listen for a broadcast status update from the host */
    session.on('signal:broadcast', function (event) {

      broadcastActive = event.data === 'active';

      if (broadcastActive) {
        streams.forEach(function (stream) {
          subscribe(session, stream);
        });
      } else {
        streams.forEach(function (stream) {
          session.unsubscribe(stream);
        });
      }
    });
  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        setEventListeners(session);
        checkBroadcastStatus(session);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);

}());

/* eslint-disable object-shorthand */
(function () {

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  var insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
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
   * @returns {Object} A subsriber object
   */
  var subscribe = function (session, stream) {
    var name = stream.name;
    var insertMode = name === 'Host' ? 'before' : 'after';
    var properties = Object.assign({ name: name, insertMode: insertMode }, insertOptions);
    return session.subscribe(stream, 'hostDivider', properties, function (error) {
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
   * Update the banner based on the status of the broadcast (active or ended)
   */
  var updateBanner = function (status) {

    var banner = document.getElementById('banner');
    var bannerText = document.getElementById('bannerText');

    if (status === 'active') {
      banner.classList.add('hidden');
    } else if (status === 'ended') {
      bannerText.classList.add('red');
      bannerText.innerHTML = 'The Broadcast is Over';
      banner.classList.remove('hidden');
    }
  };

  /**
   * Listen for events on the OpenTok session
   */
  var setEventListeners = function (session) {

    var streams = [];
    var subscribers = [];
    var broadcastActive = false;

    /** Subscribe to new streams as they are published */
    session.on('streamCreated', function (event) {
      streams.push(event.stream);
      if (broadcastActive) {
        subscribers.push(subscribe(session, event.stream));
      }
      if (streams.length > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
      }
    });

    session.on('streamDestroyed', function (event) {
      var index = streams.indexOf(event.stream);
      streams.splice(index, 1);
      if (streams.length < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
      }
    });

    /** Listen for a broadcast status update from the host */
    session.on('signal:broadcast', function (event) {

      var status = event.data;
      broadcastActive = status === 'active';

      if (status === 'active') {
        streams.forEach(function (stream) {
          subscribers.push(subscribe(session, stream));
        });
      } else if (status === 'ended') {
        subscribers.forEach(function (subscriber) {
          session.unsubscribe(subscriber);
        });
      }
      updateBanner(status);
    });
  };

  var init = function () {
    var credentials = getCredentials();
    var props = { connectionEventsSuppressed: true };
    var session = OT.initSession(credentials.apiKey, credentials.sessionId, props);

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

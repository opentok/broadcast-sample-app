/* eslint-disable object-shorthand */
(function () {
  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  const insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false,
  };

  /**
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  const getCredentials = function () {
    const el = document.getElementById('credentials');
    const credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  /**
   * Subscribe to a stream
   * @returns {Object} A subscriber object
   */
  const subscribe = function (session, stream) {
    const name = stream.name;
    const insertMode = name === 'Host' ? 'before' : 'after';
    const properties = Object.assign({ name: name, insertMode: insertMode }, insertOptions);
    return session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  /** Ping the host to see if the broadcast has started */
  const checkBroadcastStatus = function (session) {
    session.signal({
      type: 'broadcast',
      data: 'status',
    });
  };

  /**
   * Update the banner based on the status of the broadcast (active or ended)
   */
  const updateBanner = function (status) {
    const banner = document.getElementById('banner');
    const bannerText = document.getElementById('bannerText');

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
  const setEventListeners = function (session) {
    let streams = [];
    const subscribers = [];
    let broadcastActive = false;

    /** Subscribe to new streams as they are published */
    session.on('streamCreated', function (event) {
      if (event.stream.name === 'EC') {
        streams.push(event.stream);
      }

      if (broadcastActive) {
        if (event.stream.name === 'EC' || event.stream.name === 'HostScreen') subscribers.push(subscribe(session, event.stream));
        // streams.filter((e) => e.name !== 'Host');
      }
      if (streams.length > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
      }
    });

    session.on('streamDestroyed', function (event) {
      const index = streams.indexOf(event.stream);
      streams.splice(index, 1);
      if (streams.length < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
      }
    });

    /** Listen for a broadcast status update from the host */
    session.on('signal:broadcast', function (event) {
      const status = event.data;
      broadcastActive = status === 'active';

      if (status === 'active') {
        document.getElementById('back-hls').classList.remove('hidden');
        document.getElementById('participate').classList.remove('hidden');

        streams.forEach(function (stream) {
          if (stream.name !== 'EC') return;
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

  const switchToHlsMode = function (e) {
    window.location.href = `hls-viewer${window.location.search}`;
  };

  const switchToLiveMode = function (e) {
    window.location.href = `guest${window.location.search}`;
  };

  const init = function () {
    document.getElementById('participate-button').addEventListener('click', switchToLiveMode);
    document.getElementById('go-hls-btn').addEventListener('click', switchToHlsMode);

    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(credentials.apiKey, credentials.sessionId, props);

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
        if (error.name === 'OT_CONNECTION_LIMIT_EXCEEDED') {
          switchToHlsMode();
        }
      } else {
        setEventListeners(session);
        checkBroadcastStatus(session);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();

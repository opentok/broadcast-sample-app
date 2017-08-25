/* global analytics http Clipboard */
/* eslint-disable object-shorthand */
/* eslint-disable vars-on-top */
(function () {

  /** The state of things */
  var broadcast = { status: 'waiting', streams: 1, rtmp: false };

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  var insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
  };

  /**
   * Get our OpenTok http Key, Session ID, and Token from the JSON embedded
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
    var properties = Object.assign({ name: 'Host', insertMode: 'before' }, insertOptions);
    return OT.initPublisher('hostDivider', properties);
  };

  /**
   * Send the broadcast status to everyone connected to the session using
   * the OpenTok signaling API
   * @param {Object} session
   * @param {String} status
   * @param {Object} [to] - An OpenTok connection object
   */
  var signal = function (session, status, to) {
    var signalData = Object.assign({}, { type: 'broadcast', data: status }, to ? { to } : {});
    session.signal(signalData, function (error) {
      if (error) {
        console.log(['signal error (', error.code, '): ', error.message].join(''));
      } else {
        console.log('signal sent');
      }
    });
  };


  /**
   * Construct the url for viewers to view the broadcast stream
   * @param {Object} params
   * @param {String} params.url The CDN url for the m3u8 video stream
   * @param {Number} params.availableAt The time (ms since epoch) at which the stream is available
   */
  var getBroadcastUrl = function (params) {
    var buildQueryString = function (query, key) {
      return [query, key, '=', params[key], '&'].join('');
    };
    var queryString = R.reduce(buildQueryString, '?', R.keys(params)).slice(0, -1);

    return [window.location.host, '/broadcast', queryString].join('');
  };

  /**
   * Set the state of the broadcast and update the UI
   */
  var updateStatus = function (session, status) {

    var startStopButton = document.getElementById('startStop');
    var playerUrl = getBroadcastUrl(R.pick(['url', 'availableAt'], broadcast));
    var displayUrl = document.getElementById('broadcastURL');
    var rtmpActive = document.getElementById('rtmpActive');

    broadcast.status = status;

    if (status === 'active') {
      startStopButton.classList.add('active');
      startStopButton.innerHTML = 'End Broadcast';
      document.getElementById('urlContainer').classList.remove('hidden');
      displayUrl.innerHTML = playerUrl;
      displayUrl.setAttribute('value', playerUrl);
      if (broadcast.rtmp) {
        rtmpActive.classList.remove('hidden');
      }
    } else {
      startStopButton.classList.remove('active');
      startStopButton.innerHTML = 'Broadcast Over';
      startStopButton.disabled = true;
      rtmpActive.classList.add('hidden');
    }

    signal(session, broadcast.status);
  };

  // Let the user know that the url has been copied to the clipboard
  var showCopiedNotice = function () {
    var notice = document.getElementById('copyNotice');
    notice.classList.remove('opacity-0');
    setTimeout(function () {
      notice.classList.add('opacity-0');
    }, 1500);
  };

  var validRtmp = function () {
    var server = document.getElementById('rtmpServer');
    var stream = document.getElementById('rtmpStream');

    var serverDefined = !!server.value;
    var streamDefined = !!stream.value;
    var invalidServerMessage = 'The RTMP server url is invalid. Please update the value and try again.';
    var invalidStreamMessage = 'The RTMP stream name must be defined. Please update the value and try again.';

    if (serverDefined && !server.checkValidity()) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidServerMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    if (serverDefined && !streamDefined) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidStreamMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    document.getElementById('rtmpLabel').classList.remove('hidden');
    document.getElementById('rtmpError').classList.add('hidden');
    return { serverUrl: server.value, streamName: stream.value };
  };

  var hideRtmpInput = function () {
    ['rtmpLabel', 'rtmpError', 'rtmpServer', 'rtmpStream'].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  };

  /**
   * Make a request to the server to start the broadcast
   * @param {String} sessionId
   */
  var startBroadcast = function (session) {

    analytics.log('startBroadcast', 'variationAttempt');

    var rtmp = validRtmp();
    if (!rtmp) {
      analytics.log('startBroadcast', 'variationError');
      return;
    }

    hideRtmpInput();
    http.post('/broadcast/start', { sessionId: session.sessionId, streams: broadcast.streams, rtmp: rtmp })
      .then(function (broadcastData) {
        broadcast = R.merge(broadcast, broadcastData);
        updateStatus(session, 'active');
        analytics.log('startBroadcast', 'variationSuccess');
      }).catch(function (error) {
        console.log(error);
        analytics.log('startBroadcast', 'variationError');
      });

  };

  /**
   * Make a request to the server to stop the broadcast
   * @param {String} sessionId
   */
  var endBroadcast = function (session) {
    http.post('/broadcast/end')
      .then(function () {
        updateStatus(session, 'ended');
        analytics.log('endBroadcast', 'variationSuccess');
      })
      .catch(function (error) {
        console.log(error);
        analytics.log('endBroadcast', 'variationError');
      });
  };

  /**
   * Subscribe to a stream
   */
  var subscribe = function (session, stream) {
    var properties = Object.assign({ name: 'Guest', insertMode: 'after' }, insertOptions);
    session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  /**
   * Toggle publishing audio/video to allow host to mute
   * their video (publishVideo) or audio (publishAudio)
   * @param {Object} publisher The OpenTok publisher object
   * @param {Object} el The DOM element of the control whose id corresponds to the action
   */
  var toggleMedia = function (publisher, el) {
    var enabled = el.classList.contains('disabled');
    el.classList.toggle('disabled');
    publisher[el.id](enabled);
  };

  var updateBroadcastLayout = function () {
    http.post('/broadcast/layout', { streams: broadcast.streams })
      .then(function (result) { console.log(result); })
      .catch(function (error) { console.log(error); });
  };

  var setEventListeners = function (session, publisher) {

    // Add click handler to the start/stop button
    var startStopButton = document.getElementById('startStop');
    startStopButton.classList.remove('hidden');
    startStopButton.addEventListener('click', function () {
      if (broadcast.status === 'waiting') {
        startBroadcast(session);
      } else if (broadcast.status === 'active') {
        endBroadcast(session);
      }
    });

    // Subscribe to new streams as they're published
    session.on('streamCreated', function (event) {
      var currentStreams = broadcast.streams;
      subscribe(session, event.stream);
      broadcast.streams++;
      if (broadcast.streams > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
        if (broadcast.status === 'active' && currentStreams <= 3) {
          updateBroadcastLayout();
        }
      }
    });

    session.on('streamDestroyed', function () {
      var currentStreams = broadcast.streams;
      broadcast.streams--;
      if (broadcast.streams < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
        if (broadcast.status === 'active' && currentStreams >= 4) {
          updateBroadcastLayout();
        }
      }
    });

    // Signal the status of the broadcast when requested
    session.on('signal:broadcast', function (event) {
      if (event.data === 'status') {
        signal(session, broadcast.status, event.from);
      }
    });

    document.getElementById('copyURL').addEventListener('click', function () {
      showCopiedNotice();
    });

    document.getElementById('publishVideo').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });

    document.getElementById('publishAudio').addEventListener('click', function () {
      toggleMedia(publisher, this);
    });

  };

  var addPublisherControls = function (publisher) {
    var publisherContainer = document.getElementById(publisher.element.id);
    var el = document.createElement('div');
    var controls = [
      '<div class="publisher-controls-container">',
      '<div id="publishVideo" class="control video-control"></div>',
      '<div id="publishAudio" class="control audio-control"></div>',
      '</div>',
    ].join('\n');
    el.innerHTML = controls;
    publisherContainer.appendChild(el.firstChild);
  };

  /**
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  var publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
  };

  var init = function () {
    var clipboard = new Clipboard('#copyURL'); // eslint-disable-line no-unused-vars
    var credentials = getCredentials();
    var props = { connectionEventsSuppressed: true };
    var session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
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

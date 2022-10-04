/* global analytics http Clipboard */
/* eslint-disable object-shorthand */

/* eslint-disable vars-on-top */
(function () {
  /** The state of things */
  let broadcast = { status: 'waiting', streams: 2, rtmp: false };
  let subscribers = [];
  let activeSpeaker;
  let session;
  let lastActiveSpeaker = Date.now();
  let screenSharePublisher;

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  const insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false,
  };

  /**
   * Get our OpenTok http Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  const getCredentials = function () {
    const el = document.getElementById('credentials');
    const credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    credentialData = credentials;
    return credentials;
  };

  let credentialData;

  /**
   * Create an OpenTok publisher object
   */
  const initPublisher = function () {
    const properties = Object.assign(
      {
        name: 'Host',
        insertMode: 'before',
        publishAudio: true,
        resolution: check1080pCamera() ? '1920x1080' : '1280x720',
      },
      insertOptions
    );
    const publisher = OT.initPublisher('hostDivider', properties);

    const subscriberData = {
      subscriber: publisher,
    };
    subscribers.push(subscriberData);

    return publisher;
  };

  /**
   * Check if you can publish at 1080p
   */
  async function check1080pCamera() {
    const constraints = {
      audio: true,
      video: {
        width: { min: 1920 },
        height: { min: 1080 },
      },
    };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      return true;
    } catch (err) {
      if (err.name === 'OverconstrainedError') {
        alert('⚠️ 1080p is not supported on this device!');
        return false;
      }
      return true;
    }
  }

  /**
   * Send the broadcast status to everyone connected to the session using
   * the OpenTok signaling API
   * @param {Object} session
   * @param {String} status
   * @param {Object} [to] - An OpenTok connection object
   */
  const signal = function (session, status, to) {
    const signalData = Object.assign(
      {},
      { type: 'broadcast', data: status },
      to ? { to } : {}
    );
    session.signal(signalData, function (error) {
      if (error) {
        console.log(
          ['signal error (', error.code, '): ', error.message].join('')
        );
      } else {
        console.log('signal sent');
      }
    });
  };

  const signalBroadcastURL = function (session, url, to) {
    console.log('signalBroadcastURL', to, url);
    const signalData = Object.assign(
      {},
      { type: 'broadcast-url', data: url },
      to ? { to } : {}
    );
    console.log('signalBroadcastURL#1', signalData);
    session.signal(signalData, function (error) {
      if (error) {
        console.log(
          [
            '[signalBroadcastURL] -  error (',
            error.code,
            '): ',
            error.message,
          ].join('')
        );
      } else {
        console.log('[signalBroadcastURL] - signal sent');
      }
    });
  };

  /**
   * Construct the url for viewers to view the broadcast stream
   * @param {String} url The CDN url for the m3u8 video stream
   * @param {Number} availableAt The time (ms since epoch) at which the stream is available
   */
  const getBroadcastUrl = function (url, availableAt) {
    return `${window.location.host}/broadcast?url=${url}&availableAt=${availableAt}`;
  };

  /**
   * Set the state of the broadcast and update the UI
   */
  const updateStatus = function (session, status) {
    const startStopButton = document.getElementById('startStop');
    const { url, availableAt } = broadcast;
    const playerUrl = getBroadcastUrl(url, availableAt);
    const displayUrl = document.getElementById('broadcastURL');
    const rtmpActive = document.getElementById('rtmpActive');

    broadcast.status = status;

    if (status === 'active') {
      startStopButton.classList.add('active');
      startStopButton.innerHTML = 'End Broadcast';
      document.getElementById('urlContainer').classList.remove('hidden');
      if (broadcast.rtmp) {
        rtmpActive.classList.remove('hidden');
      }
    } else {
      startStopButton.classList.remove('active');
      startStopButton.innerHTML = 'Start Broadcast';
      rtmpActive.classList.add('hidden');
      document.getElementById('rtmpLabel').classList.remove('hidden');
      document.getElementById('rtmp-options').classList.remove('hidden');
    }

    signal(session, broadcast.status);
  };

  // Let the user know that the url has been copied to the clipboard

  const validRtmp = function () {
    const server = document.getElementById('rtmpServer');
    const stream = document.getElementById('rtmpStream');

    const serverDefined = !!server.value;
    const streamDefined = !!stream.value;
    const invalidServerMessage =
      'The RTMP server url is invalid. Please update the value and try again.';
    const invalidStreamMessage =
      'The RTMP stream name must be defined. Please update the value and try again.';

    if (serverDefined && !server.checkValidity()) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmp-options').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidServerMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    if (serverDefined && !streamDefined) {
      document.getElementById('rtmpLabel').classList.add('hidden');
      document.getElementById('rtmp-options').classList.add('hidden');
      document.getElementById('rtmpError').innerHTML = invalidStreamMessage;
      document.getElementById('rtmpError').classList.remove('hidden');
      return null;
    }

    document.getElementById('rtmpLabel').classList.remove('hidden');
    document.getElementById('rtmp-options').classList.remove('hidden');
    document.getElementById('rtmpError').classList.add('hidden');
    return { id: 'testId', serverUrl: server.value, streamName: stream.value };
  };

  const hideRtmpInput = function () {
    [
      'rtmpLabel',
      'rtmpError',
      'rtmpServer',
      'rtmpStream',
      'rtmp-options',
    ].forEach(function (id) {
      document.getElementById(id).classList.add('hidden');
    });
  };

  const showRtmpInput = function () {
    [
      'rtmpLabel',
      'rtmpError',
      'rtmpServer',
      'rtmpStream',
      'rtmp-options',
    ].forEach(function (id) {
      document.getElementById(id).classList.remove('hidden');
    });
  };

  /**
   * Make a request to the server to start the broadcast
   */
  const startBroadcast = function () {
    analytics.log('startBroadcast', 'variationAttempt');

    const rtmp = validRtmp();
    if (!rtmp) {
      analytics.log('startBroadcast', 'variationError');
      return;
    }

    const HLS_LL = document.querySelector('#hls-ll').checked;
    const HLS_HD = document.querySelector('#hls-HD').checked;
    const HLS_DVR = document.querySelector('#hls-dvr').checked;

    if (HLS_LL && HLS_DVR)
      alert(
        'DVR is not supported with Low latency HLS, DVR will regular HLS will be selected'
      );

    hideRtmpInput();
    http
      .post('/broadcast/start', {
        streams: broadcast.streams,
        rtmp: rtmp,
        lowLatency: HLS_LL,
        fhd: HLS_HD,
        dvr: HLS_DVR,
        sessionId: credentialData.sessionId,
      })
      .then(function (broadcastData) {
        broadcast = broadcastData;
        updateStatus(session, 'active');
        signalBroadcastURL(session, broadcast.url, null);
        analytics.log('startBroadcast', 'variationSuccess');
      })
      .catch(function (error) {
        console.log(error);
        analytics.log('startBroadcast', 'variationError');
      });
  };

  /**
   * Make a request to the server to stop the broadcast
   */
  const endBroadcast = function () {
    http
      .post('/broadcast/end', {
        sessionId: credentialData.sessionId,
      })
      .then(function () {
        updateStatus(session, 'ended');
        showRtmpInput();
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
  const subscribe = function (session, stream) {
    const properties = Object.assign(
      { name: 'Guest', insertMode: 'after' },
      insertOptions
    );
    const subscriber = session.subscribe(
      stream,
      'hostDivider',
      properties,
      function (error) {
        if (error) {
          console.log(error);
        }
      }
    );
    subscribers.push({ subscriber });
    subscriber.on('audioLevelUpdated', audioLevelUpdate);

    if (subscribers.length > 3) {
      updateBroadcastLayout();
    }
  };

  /**
   * Updates the subscriber with its current audio level
   * @param {Object} event AudioLevelUpdatedEvent
   */
  const audioLevelUpdate = function (event) {
    const now = Date.now();

    const subData = subscribers.find(
      (f) => f.subscriber.streamId === event.target.streamId
    );
    if (event.audioLevel > 0.2) {
      if (!subData.activity) {
        subData.activity = {
          timestamp: now,
          talking: true,
          audioLevel: event.audioLevel,
        };
      } else if (
        subData.activity.talking &&
        now - subData.activity.timestamp > 1000
      ) {
        subData.activity.timestamp = now;
        subData.activity.audioLevel = event.audioLevel;
      } else if (now - subData.activity.timestamp > 1000) {
        // detected audio activity for more than 1s
        // for the first time.
        subData.activity.talking = true;
        subData.activity.audioLevel = event.audioLevel;
      }
    } else if (subData.activity && now - subData.activity.timestamp > 3000) {
      // detected low audio activity for more than 3s
      if (subData.activity.talking) {
        subData.activity.talking = false;
        subData.activity.audioLevel = event.audioLevel;
      }
    }

    subscribers = [
      ...subscribers.filter(
        (f) => f.subscriber.streamId !== event.target.streamId
      ),
      subData,
    ];
  };

  /**
   * Toggle publishing audio/video to allow host to mute
   * their video (publishVideo) or audio (publishAudio)
   * @param {Object} publisher The OpenTok publisher object
   * @param {Object} el The DOM element of the control whose id corresponds to the action
   */
  const toggleMedia = function (publisher, el) {
    const enabled = el.classList.contains('disabled');
    el.classList.toggle('disabled');
    publisher[el.id](enabled);
  };

  /**
   * Toggle publishing audio/video to allow host to mute
   * their video (publishVideo) or audio (publishAudio)
   * @param {Object} publisher The OpenTok publisher object
   * @param {Object} el The DOM element of the control whose id corresponds to the action
   */
  const toggleScreenShare = function (el) {
    const enabled = el.classList.contains('disabled');
    el.classList.toggle('disabled');

    if (!enabled) {
      screenSharePublisher = OT.initPublisher(
        'hostDivider',
        { videoSource: 'screen', name: 'HostScreen', insertMode: 'before' },
        function (error) {
          if (error) {
            // Look at error.message to see what went wrong.
          } else {
            session.publish(screenSharePublisher, function (error) {
              if (error) {
                // Look error.message to see what went wrong.
              }
            });
          }
        }
      );

      //settig up event listener for when the user clicks on the native browser prompt to stop screen-sharing

      screenSharePublisher.on('mediaStopped', function (e) {
        const screenShareButton = document.getElementById('screenshare');
        screenShareButton.classList.toggle('disabled');
      });
    } else {
      screenSharePublisher.destroy();
    }
  };

  /**
   * Update broadcast layouts
   */
  const updateBroadcastLayout = function () {
    if (broadcast.status === 'active') {
      // streams, type, stylesheet
      http
        .post('/broadcast/layout', {
          streams: subscribers.length,
          type: subscribers.length > 3 ? 'custom' : 'bestFit',
          sessionId: credentialData.sessionId,
        })
        .then(function (result) {
          console.log(result);
        })
        .catch(function (error) {
          console.log(error);
        });
    }
  };

  const setEventListeners = function (session, publisher) {
    // Add click handler to the start/stop button

    const startStopButton = document.getElementById('startStop');
    startStopButton.classList.remove('hidden');
    startStopButton.addEventListener('click', function () {
      if (broadcast.status === 'waiting' || broadcast.status === 'ended') {
        startBroadcast(session);
      } else if (broadcast.status === 'active') {
        endBroadcast(session);
      }
    });

    // Subscribe to new streams as they're published
    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
      if (subscribers.length > 2) {
        document.getElementById('videoContainer').classList.add('wrap');
        if (broadcast.status === 'active' && subscribers.length <= 3) {
          updateBroadcastLayout();
        }
      }
    });

    session.on('streamDestroyed', function (event) {
      subscribers = subscribers.filter(
        (f) => f.subscriber.streamId !== event.stream.id
      );
      if (subscribers.length <= 3) {
        document.getElementById('videoContainer').classList.remove('wrap');
        if (broadcast.status === 'active' && subscribers.length < 3) {
          updateBroadcastLayout();
        }
      }
    });

    // Signal the status of the broadcast when requested
    session.on('signal:broadcast', function (event) {
      console.log('pinging broadcast status');

      if (event.data === 'status') {
        signal(session, broadcast.status, event.from);
        if (broadcast.status === 'active') {
          signalBroadcastURL(session, broadcast.url, event.from);
        }
      }
    });

    document.getElementById('copyURL').addEventListener('click', function () {
      showCopiedNotice();
    });

    document.getElementById('videoInputs').addEventListener('change', (e) => {
      onVideoSourceChanged(e, publisher);
    });

    document.getElementById('audioInputs').addEventListener('change', (e) => {
      onAudioSourceChanged(e, publisher);
    });

    navigator.mediaDevices.ondevicechange = () => {
      refreshDeviceList(publisher);
    };

    publisher.on('accessAllowed', () => {
      refreshDeviceList(publisher);
    });

    document
      .getElementById('publishVideo')
      .addEventListener('click', function () {
        toggleMedia(publisher, this);
      });

    document
      .getElementById('publishAudio')
      .addEventListener('click', function () {
        toggleMedia(publisher, this);
      });

    document
      .getElementById('screenshare')
      .addEventListener('click', function () {
        toggleScreenShare(this);
      });
  };

  const addPublisherControls = function (publisher) {
    const publisherContainer = document.getElementById(publisher.element.id);
    const el = document.createElement('div');

    const controls = [
      '<div>',
      '<div class="btn-group">',
      '<div class="publisher-controls-container">',
      '<div id="publishVideo" class="control video-control"></div>',

      '<select style="width:15px" class="btn btn-secondary dropdown-toggle  dropdown-toggle-split" id="videoInputs" data-bs-toggle="dropdown" aria-expanded="false"  data-bs-reference="parent">',
      '<option selected class="dropdown-item"></option>',
      '</select>',
      '</div>',
      '</div>',

      '<div style="margin-left: 40px" class="btn-group">',
      '<div class="publisher-controls-container">',
      '<div id="publishAudio" class="control audio-control"></div>',
      '<select style="width:15px" class="btn btn-secondary dropdown-toggle  dropdown-toggle-split" id="audioInputs" data-bs-toggle="dropdown" aria-expanded="false"  data-bs-reference="parent">',
      '<option selected class="dropdown-item"></option>',
      '</select>',
      '</div>',
      '</div>',

      '<div style="margin-top:100px; height:40px" class="publisher-controls-container">',
      '<div  id="screenshare" class="control screenshare"></div>',
      '</div>',

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
  const publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
    // refreshDeviceList(publisher);
  };

  const refreshDeviceList = (pub) => {
    console.log('refreshDeviceList');
    listVideoInputs().then((devices) => {
      console.log(devices);
      const videoSelect = document.getElementById('videoInputs');
      videoSelect.innerHTML = '';

      const currentVideoSource = pub.getVideoSource();

      if (currentVideoSource) {
        // Select Input
        const currentVideoOption = document.createElement('option');
        //disabledOption.disabled = true;
        currentVideoOption.innerText = currentVideoSource?.track?.label;
        currentVideoOption.classList.add('dropdown-item');
        currentVideoOption.value = currentVideoSource.track?.label;
        currentVideoOption.selected = true;
        videoSelect.appendChild(currentVideoOption);
      }

      for (let i = 0; i < devices.length; i += 1) {
        if (devices[i].deviceId != currentVideoSource.deviceId) {
          const deviceOption = document.createElement('option');
          deviceOption.classList.add('dropdown-item');
          deviceOption.innerText = devices[i].label || `Video Input ${i + 1}`;
          // deviceOption.value = `video-source-${i}`;
          deviceOption.value = devices[i].label;

          videoSelect.appendChild(deviceOption);
        }
      }

      if (devices.length === 0) {
        const deviceOption = document.createElement('option');
        deviceOption.innerText = 'Default Video Input';
        deviceOption.value = `default-video`;

        videoSelect.appendChild(deviceOption);
      }
    });

    listAudioInputs().then((devices) => {
      const audioSelect = document.getElementById('audioInputs');
      audioSelect.innerHTML = '';
      const currentAudioSource = pub.getAudioSource();
      console.log(devices);

      // Select Input
      const currentAudioOption = document.createElement('option');
      currentAudioOption.innerText = currentAudioSource?.label;

      currentAudioOption.value = currentAudioSource?.label;
      currentAudioOption.selected = true;
      audioSelect.appendChild(currentAudioOption);

      for (let i = 0; i < devices.length; i += 1) {
        if (devices[i].label != currentAudioSource.label) {
          const deviceOption = document.createElement('option');
          deviceOption.innerText = devices[i].label || `Audio Input ${i + 1}`;
          deviceOption.value = devices[i].label;

          audioSelect.appendChild(deviceOption);
        }
      }

      if (devices.length === 0) {
        const deviceOption = document.createElement('option');
        deviceOption.innerText = 'Default Audio Input';
        deviceOption.value = `default-audio`;

        audioSelect.appendChild(deviceOption);
      }
    });
  };

  const onVideoSourceChanged = async (event, publisher) => {
    console.log(event);
    const labelToFind = event.target.value;
    const videoDevices = await listVideoInputs();

    const deviceId = videoDevices.find(
      (e) => e.label === labelToFind
    )?.deviceId;

    if (deviceId != null) {
      publisher.setVideoSource(deviceId);
    }
  };

  const onAudioSourceChanged = async (event, publisher) => {
    const labelToFind = event.target.value;
    const audioDevices = await listAudioInputs();

    const deviceId = audioDevices.find(
      (e) => e.label === labelToFind
    )?.deviceId;

    if (deviceId != null) {
      publisher.setAudioSource(deviceId);
    }
  };

  const listAudioInputs = async () => {
    try {
      const devices = await listDevices();
      const filteredDevices = devices.filter(
        (device) => device.kind === 'audioInput'
      );
      return Promise.resolve(filteredDevices);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const listVideoInputs = async () => {
    try {
      const devices = await listDevices();
      const filteredDevices = devices.filter(
        (device) => device.kind === 'videoInput'
      );
      return Promise.resolve(filteredDevices);
    } catch (error) {
      return Promise.reject(error);
    }
  };

  const listDevices = () => {
    return new Promise((resolve, reject) => {
      OT.getDevices((error, devices) => {
        if (error) {
          reject(error);
        } else {
          resolve(devices);
        }
      });
    });
  };

  const init = function () {
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    const publisher = initPublisher();

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
})();

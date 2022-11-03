/* global analytics */
/* eslint-disable object-shorthand */
(function () {
  const backgroundUrls = {
    0: 'https://wallpaperaccess.com/full/5497307.jpg',
    1: 'https://raw.githubusercontent.com/nexmo-community/video-green-screen/main/vonage-gradient.png',
    2: 'https://wallpaperaccess.com/full/6060256.jpg',
  };

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);

  /**
   * When round divs is selected, this will round the video divs
   */

  function editDivs() {
    for (var i = 0; i < videoContainer.childNodes.length; i++) {
      if (videoContainer.childNodes[i].nodeName.toLowerCase() == 'div') {
        videoContainer.childNodes[i].style.borderRadius = '50%';
        videoContainer.childNodes[i].style.maxWidth = '360px';
      }
    }
  }

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
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  const addSubscriberOverlay = function (subscriber) {
    const subscriberContainer = document.getElementById(subscriber.element.id);
    const el = document.createElement('div');

    const controls = [
      // '<div class="publisher-controls-container">',
      '<img src="https://upload.wikimedia.org/wikipedia/commons/5/5a/Vonage_Logo.png" width="140" height="40" style="position: absolute; margin-top: 20px; margin-left: 30px; z-index: 100"></img>',
      // '<span  style="position: absolute; margin-bottom: 200px; margin-left: 30px; z-index: 100">User</span>',
      // '</div>',
    ].join('\n');
    el.innerHTML = controls;
    subscriberContainer.appendChild(el.firstChild);
  };

  /**
   * Subscribe to a stream
   */
  const subscribe = function (session, stream) {
    const name = stream.name;

    const insertMode = 'after';
    const properties = Object.assign({ name: name, insertMode: insertMode }, insertOptions);
    const subscriber = session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
    const roundDivs = params.get('round');
    if (roundDivs === 'true') editDivs();
    else {
      addSubscriberOverlay(subscriber);
    }
  };

  /**
   * Start publishing our audio and video to the session. Also, start
   * subscribing to other streams as they are published.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  const subscribeAndSetUpListeners = function (session) {
    session.on('streamCreated', function (event) {
      if (event.stream.name === 'EC' || event.stream.name === 'HostScreen') return;
      subscribe(session, event.stream);
    });

    session.on('streamDestroyed', function (event) {
      subscribe(session, event.stream);
    });
  };

  const init = function () {
    let url = new URL(window.location.href);
    let params = new URLSearchParams(url.search);
    const backgroundId = params.get('bg');
    const imageUrl = backgroundUrls[backgroundId];
    const videoContainer = document.getElementById('videoContainer');
    document.body.style.backgroundImage = `url(${imageUrl})`;
    document.body.style.backgroundRepeat = 'no-repeat';
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(credentials.apiKey, credentials.sessionId, props);

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
        analytics.init(session);
        analytics.log('initialize', 'variationAttempt');
        analytics.log('initialize', 'variationError');
      } else {
        subscribeAndSetUpListeners(session);
        analytics.init(session);
        analytics.log('initialize', 'variationAttempt');
        analytics.log('initialize', 'variationSuccess');
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);
})();

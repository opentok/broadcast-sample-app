/* global analytics */
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
   * Create an OpenTok publisher object
   */
  const initPublisher = function () {
    const properties = Object.assign(
      { name: 'Guest', insertMode: 'after' },
      insertOptions
    );
    return OT.initPublisher('hostDivider', properties);
  };

  /**
   * Subscribe to a stream
   */
  const subscribe = function (session, stream) {
    const name = stream.name;
    const insertMode = name === 'Host' ? 'before' : 'after';
    const properties = Object.assign(
      { name: name, insertMode: insertMode },
      insertOptions
    );
    session.subscribe(stream, 'hostDivider', properties, function (error) {
      if (error) {
        console.log(error);
      }
    });
  };

  const switchToViewerMode = function () {
    window.location.href = `viewer${window.location.search}`;
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

  const addPublisherControls = function (publisher) {
    const publisherContainer = document.getElementById(publisher.element.id);
    const el = document.createElement('div');
    const controls = [
      '<div class="publisher-controls-container">',
      '<div id="publishVideo" class="control video-control"></div>',
      '<div id="publishAudio" class="control audio-control"></div>',
      '</div>',
    ].join('\n');
    el.innerHTML = controls;
    publisherContainer.appendChild(el.firstChild);
  };

  /**
   * Start publishing our audio and video to the session. Also, start
   * subscribing to other streams as they are published.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  const publishAndSubscribe = function (session, publisher) {
    let streams = 1;

    session.publish(publisher);
    addPublisherControls(publisher);

    session.on('streamCreated', function (event) {
      subscribe(session, event.stream);
      streams++;
      if (streams > 3) {
        document.getElementById('videoContainer').classList.add('wrap');
      }
    });

    session.on('streamDestroyed', function (event) {
      subscribe(session, event.stream);
      streams--;
      if (streams < 4) {
        document.getElementById('videoContainer').classList.remove('wrap');
      }
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
      .getElementById('back-viewer')
      .addEventListener('click', switchToViewerMode);
  };

  const init = function () {
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(
      credentials.apiKey,
      credentials.sessionId,
      props
    );
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

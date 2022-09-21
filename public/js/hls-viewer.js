/* eslint-disable object-shorthand */
(function () {

  /**
   * Options for adding OpenTok publisher and subscriber video elements
   */
  const insertOptions = {
    width: '100%',
    height: '100%',
    showControls: false
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
  // const subscribe = function (session, stream) {
  //   const name = stream.name;
  //   const insertMode = name === 'Host' ? 'before' : 'after';
  //   const properties = Object.assign({ name: name, insertMode: insertMode }, insertOptions);
  //   return session.subscribe(stream, 'hostDivider', properties, function (error) {
  //     if (error) {
  //       console.log(error);
  //     }
  //   });
  // };

  /** Ping the host to see if the broadcast has started */
  const checkBroadcastStatus = function (session) {
    session.signal({
      type: 'broadcast',
      data: 'status'
    });
  };

  /**
   * Update the banner based on the status of the broadcast (active or ended)
   */
  const updateBanner = function (status) {
    const banner = document.getElementById('banner');
    const videoContainer = document.getElementById('videoContainer');
    const bannerText = document.getElementById('bannerText');
    const playVideoContainer = document.getElementById('play-video-container');

    if (status === 'active') {
      banner.classList.add('hidden');
      videoContainer.classList.remove('hidden');
      playVideoContainer.classList.remove('hidden');
    } else if (status === 'ended') {
      bannerText.classList.add('red');
      bannerText.innerHTML = 'The Broadcast is Over';
      banner.classList.remove('hidden');
      videoContainer.classList.add('hidden');
      playVideoContainer.classList.add('hidden');
    }
  };

  /**
   * Listen for events on the OpenTok session
   */
  const setEventListeners = function (session) {
    const streams = [];
    const subscribers = [];
    let broadcastActive = false;

    /** Subscribe to new streams as they are published */
    // session.on('streamCreated', function (event) {
    //   streams.push(event.stream);
    //   if (broadcastActive) {
    //     subscribers.push(subscribe(session, event.stream));
    //   }
    //   if (streams.length > 3) {
    //     document.getElementById('videoContainer').classList.add('wrap');
    //   }
    // });

    // session.on('streamDestroyed', function (event) {
    //   const index = streams.indexOf(event.stream);
    //   streams.splice(index, 1);
    //   if (streams.length < 4) {
    //     document.getElementById('videoContainer').classList.remove('wrap');
    //   }
    // });

    /** Listen for a broadcast status update from the host */

    session.on('signal:broadcast-url', function (event) {
      console.log("signal:broadcast-url", event);
      const broadcastUrl = event.data;
      var video = document.getElementById('video');
      if (Hls.isSupported()) {
        var hls = new Hls();
        console.log("signal:broadcast-url - ", broadcastUrl)
        hls.loadSource(broadcastUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          playVideo()

        });
      }
      else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = broadcastUrl;
        video.addEventListener('canplay', function () {
          video.play();
        });
      }
      updateBanner('active');
    });
  };

  const playVideo = function () {
    var video = document.getElementById('video');
    if (video) {
      video.play().then((res) => {
        console.log("Play Video Successfull", res);
        const playVideoContainer = document.getElementById('play-video-container');
        playVideoContainer.classList.add('hidden');
      }).catch(err => {
        console.log("Play Video error", err)
      });
    }
  }

  const switchToLiveMode = function () {
    window.location.href = 'viewer.html'
  }

  const addClickEventListeners = function () {
    document.getElementById('play-video').addEventListener('click', playVideo);
    document.getElementById('go-live-btn').addEventListener('click', switchToLiveMode);
  }

  const init = function () {
    addClickEventListeners();
    const credentials = getCredentials();
    const props = { connectionEventsSuppressed: true };
    const session = OT.initSession(credentials.apiKey, credentials.sessionId, props);
    setEventListeners(session);
    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        checkBroadcastStatus(session);
      }
    });
  };



  document.addEventListener('DOMContentLoaded', init);
}());

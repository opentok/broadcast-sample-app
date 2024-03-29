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

  const getBroadcastUrl = async function () {
    const response = await fetch(`/broadcast/${window.location.search.split('=')[1]}`);
    return response.json();
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

    /** Listen for a broadcast status update from the host */

    session.on('signal:broadcast-url', function (event) {
      console.log('signal:broadcast-url', event);
      const broadcastUrl = event.data;
      var video = document.getElementById('video');
      if (Hls.isSupported()) {
        var hls = new Hls();
        console.log('signal:broadcast-url - ', broadcastUrl);
        hls.loadSource(broadcastUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          playVideo();
        });
        hls.on(Hls.Events.BUFFER_EOS, function () {
          updateBanner('ended');
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
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
      video
        .play()
        .then((res) => {
          console.log('Play Video Successfull', res);
          const playVideoContainer = document.getElementById('play-video-container');
          playVideoContainer.classList.add('hidden');
        })
        .catch((err) => {
          console.log('Play Video error', err);
        });
    }
  };

  const switchToLiveMode = function () {
    window.location.href = `viewer${window.location.search}`;
  };

  const addClickEventListeners = function () {
    document.getElementById('play-video').addEventListener('click', playVideo);
    document.getElementById('go-live-btn').addEventListener('click', switchToLiveMode);
  };

  const init = function () {
    addClickEventListeners();
    getBroadcastUrl()
      .then((data) => {
        updateBanner('active');

        const { url } = data;

        var video = document.getElementById('video');
        if (Hls.isSupported()) {
          var hls = new Hls();
          console.log('broadcast-url - ', url);
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, function () {
            playVideo();
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('canplay', function () {
            video.play();
          });
        }
      })
      .catch((e) => console.log(e));
  };

  document.addEventListener('DOMContentLoaded', init);
})();

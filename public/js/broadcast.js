/* global flowplayer */
(function () {

  /**
   * Get our OpenTok API Key, Session ID, and Token from the JSON embedded
   * in the HTML.
   */
  var getBroadcastData = function () {
    var el = document.getElementById('broadcast');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
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

  var play = function (source) {

    updateBanner('active');

    flowplayer('#videoContainer', {
      splash: false,
      embed: false,
      ratio: 9 / 16,
      autoplay: true,
      clip: {
        autoplay: true,
        live: true,
        hlsjs: {
          // listen to hls.js ERROR
          listeners: ['hlsError'],
        },
        sources: [{
          type: 'application/x-mpegurl',
          src: source
        }]
      }
    }).on('hlsError', function (e, api, error) {

      // Broadcast end
      if (error.type === 'networkError' && error.details === 'levelLoadError') {
        api.stop();
        updateBanner('ended');
        document.getElementById('videoContainer').classList.add('hidden');
      }
    });
  };

  var init = function () {

    var broadcast = getBroadcastData();
    if (broadcast.availableAt <= Date.now()) {
      play(broadcast.url);
    } else {
      setTimeout(function () { play(broadcast.url); },
        broadcast.availableAt - Date.now());
    }

  };

  document.addEventListener('DOMContentLoaded', init);

}());

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

    var video = document.getElementById('video');
    if (Hls.isSupported()) {
      var hls = new Hls();
      hls.loadSource(source);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        video.play();
      });
    }
    else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = source;
      video.addEventListener('loadedmetadata', function () {
        video.play();
      });
    }
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

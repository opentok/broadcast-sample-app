/* global OT */
/* eslint-env es5 */
/* eslint-disable no-var prefer-arrow-callback */

(function () {


  var broadcastState = 'waiting';

  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  var initPublisher = function () {

    var options = {
      insertMode: 'append',
      width: '100%',
      height: '100%',
      showControls: false,
      style: {
        buttonDisplayMode: 'off'
      }
    };

    return OT.initPublisher('videoContainer', options);
  };

  /**
   * A few things need to happen here:
   * => Host starts publishing
   * => Sends a signal so that guests and viewers can publish/subscribe
   * => Sends a post request to the server to start the broadcast
   *    => When this returns, set a timeout, then signal the broadcast viewers
   *       so that they can init the player and start viewing the stream
   */
  var startBroadcast = function (session, publisher) {
    session.publish(publisher);
    session.signal({ data: 'active', type: 'broadcast' }, function (error) {
      if (error) {
        console.log(['signal error (', error.code, '): ', error.message].join(''));
      } else {
        console.log('signal sent.');
      }
    });

    /* eslint-disable quote-props */
    fetch('/broadcast', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sessionId: session.id })
    });
    /* eslint-enable quote-props */
  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        startBroadcast(session, publisher);
      }
    });
  };






  document.addEventListener('DOMContentLoaded', init);

}());

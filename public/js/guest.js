/* global OT */
/* eslint-disable object-shorthand */
(function () {

  var insertOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
    showControls: false,
    style: {
      buttonDisplayMode: 'off'
    }
  };

  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  var initPublisher = function () {
    return OT.initPublisher('videoContainer', insertOptions);
  };

  /**
   * The host starts publishing and signals everyone else connected to the
   * session so that they can start publishing and/or subscribing.  We also
   * make an API call to the server to start the broadcast.
   * @param {Object} session The OpenTok session
   * @param {Object} publisher The OpenTok publisher object
   */
  var startSession = function (session, publisher) {
    session.publish(publisher);

    session.on('streamCreated', function (event) {
      var stream = event.stream;
      session.subscribe(stream, 'videoContainer', insertOptions, function (error) {
        if (error) {
          console.log(error);
        }
      });
    });
  };

  var init = function () {
    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {
      if (error) {
        console.log(error);
      } else {
        startSession(session, publisher);
      }
    });
  };

  document.addEventListener('DOMContentLoaded', init);

}());

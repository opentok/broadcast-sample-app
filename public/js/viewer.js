/* global OT */

(function () {



  var getCredentials = function () {
    // get creds from html and then delete
    return {};
  };


  var init = function () {

    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);

    session.connect(credentials.token, function(){

    })
  };

  init();

}());

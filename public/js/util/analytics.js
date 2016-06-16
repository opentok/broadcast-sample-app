/* global OTKAnalytics */
(function () {

  var _otkanalytics;

  var _logEventData = {
    // vars for the analytics logs. Internal use
    clientVersion: 'js-vsol-1.0.0',
    source: 'broadcast_sample_app',
    actionInitialize: 'initialize',
    actionStartBroadcast: 'start_broadcast',
    actionEndBroadcast: 'end_broadcast',
    variationAttempt: 'Attempt',
    variationError: 'Failure',
    variationSuccess: 'Success'
  };

  var init = function (session) {

    var otkanalyticsData = {
      sessionId: session.id,
      connectionId: session.connection.connectionId,
      partnerId: session.apiKey,
      clientVersion: _logEventData.clientVersion,
      source: _logEventData.source
    };

    // init the analytics logs
    _otkanalytics = new OTKAnalytics(otkanalyticsData);
  };

  var log = function (action, variation) {
    var data = {
      action: _logEventData[action],
      variation: _logEventData[variation]
    };
    _otkanalytics.logEvent(data);
  };

  window.analytics = { init: init, log: log };

}());

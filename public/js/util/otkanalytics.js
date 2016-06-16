/* global define */
(function () {
  var _this;
  var OTKAnalytics = function (data) {
    this.url = 'https://hlg.tokbox.com/prod/logging/ClientEvent';
    this.analyticsData = data;
    _this = this;
  };

  var _generateUuid = function () {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = '0123456789abcdef';
    var i;
    for (i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = '4'; // bits 12-15 of the time_hi_and_version field to 0010
    // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);
    s[8] = s[13] = s[18] = s[23] = '-';

    return s.join('');
  };

  var _checkData = function () {
    /* eslint-disable max-len */
    if (_this.analyticsData.sessionId === null || _this.analyticsData.sessionId.length === 0) {
      console.log('Error. The sessionId field cannot be null in the log entry');
      throw new Error('The sessionId field cannot be null in the log entry');
    }
    if (_this.analyticsData.connectionId == null || _this.analyticsData.connectionId.length === 0) {
      console.log('Error. The connectionId field cannot be null in the log entry');
      throw new Error('The connectionId field cannot be null in the log entry');
    }
    if (_this.analyticsData.partnerId === 0) {
      console.log('Error. The partnerId field cannot be null in the log entry');
      throw new Error('The partnerId field cannot be null in the log entry');
    }
    if (_this.analyticsData.clientVersion == null || _this.analyticsData.clientVersion.length === 0) {
      console.log('Error. The clientVersion field cannot be null in the log entry');
      throw new Error('The clientVersion field cannot be null in the log entry');
    }
    if (_this.analyticsData.source == null || _this.analyticsData.source.length === 0) {
      console.log('Error. The source field cannot be null in the log entry');
      throw new Error('The source field cannot be null in the log entry');
    }
    if (_this.analyticsData.logVersion == null || _this.analyticsData.logVersion.length === 0) {
      _this.analyticsData.logVersion = '2';
    }
    if (_this.analyticsData.guid == null || _this.analyticsData.guid.length === 0) {
      _this.analyticsData.guid = _generateUuid();
    }
    if (_this.analyticsData.clientSystemTime === 0) {
      _this.analyticsData.clientSystemTime = new Date().getTime();
    }
    /* eslint-enable max-len */
  };

  var _sendData = function () {
    var http = new XMLHttpRequest();
    var payload = _this.analyticsData.payload || '';

    if (typeof (payload) === 'object') {
      payload = JSON.stringify(payload);
    }

    _this.analyticsData.payload = payload;

    http.open('POST', _this.url, true);
    http.setRequestHeader('Content-type', 'application/json');
    http.send(JSON.stringify(_this.analyticsData));
  };

  OTKAnalytics.prototype = {
    constructor: OTKAnalytics,
    logEvent: function (data) {
      _this.analyticsData.action = data.action;
      _this.analyticsData.variation = data.variation;
      _this.analyticsData.clientSystemTime = new Date().getTime();
      // check values
      _checkData();

      // send data to analytics server
      _sendData();
    },
  };

  if (typeof exports === 'object') {
    module.exports = OTKAnalytics;
  } else if (typeof define === 'function' && define.amd) {
    define(function () {
      return OTKAnalytics;
    });
  } else {
    this.OTKAnalytics = OTKAnalytics;
  }
}.call(this));

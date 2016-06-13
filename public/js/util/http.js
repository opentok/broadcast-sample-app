/* eslint-disable object-shorthand */
(function () {

  var http = {
    post: function (url, data) {

      var requestHeaders = {
        /* eslint-disable quote-props */
        'Accept': 'application/json',
        'Content-Type': 'application/json'
          /* eslint-enable quote-props */
      };

      var parseJSON = function (response) {
        return response.json();
      };

      var params = {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(data)
      };

      return new Promise(function (resolve, reject) {
        fetch(url, params)
          .then(parseJSON)
          .then(function (json) {
            resolve(json);
          })
          .catch(function (error) {
            reject(error);
          });
      });
    }
  };

  window.http = http;

}());

![logo](./tokbox-logo.png)

# OpenTok Broadcast Sample App for JavaScript<br/>Version 1.0

This document describes how to use the OpenTok Broadcast Sample App for JavaScript. Through the exploration of this sample application, you will learn best practices for setting up and managing hosts, guests, and viewers in a web-based broadcasting application. 

In the OpenTok Broadcast Sample App, the host is the individual who controls and publishes the broadcast. The sample app supports up to 3 guests who can publish in the broadcast. 

The sample app also supports the following recommended numbers of viewers, based on the number of publishers in the broadcast:

  - 1 host, 3 guests: 75 viewers
  - 1 host, 2 guests: 100 viewers
  - 1 host, 1 guest:  150 viewers


**NOTE**: These viewer limits do not apply to HLS, since all publishing streams are transcoded to a single HLS stream that can be accessed from an HLS player. The expected latency for HLS is 15-20 seconds. When the host clicks the broadcast button, an HLS URL is provided, which the host can then share with all prospective viewers.

You can configure and run this sample app within just a few minutes!


This guide has the following sections:

* [Prerequisites](#prerequisites): A checklist of everything you need to get started.
* [Quick start](#quick-start): A step-by-step tutorial to help you quickly run the sample app.
* [Exploring the code](#exploring-the-code): This describes the sample app code design, which uses recommended best practices to implement the text chat features. 

## Prerequisites

To be prepared to develop your OpenTok Broadcast app:

1. Review the [OpenTok.js](https://tokbox.com/developer/sdks/js/) requirements.
2. Your app will need a **Session ID**, **Token**, and **API Key**, which you can get at the [OpenTok Developer Dashboard](https://dashboard.tokbox.com/).
3. You will need the **Instance ID** and **Backend Base URL** provided by TokBox.

_**NOTE**: The OpenTok Developer Dashboard allows you to quickly run this sample program. For production deployment, you must generate the **Session ID** and **Token** values using one of the [OpenTok Server SDKs](https://tokbox.com/developer/sdks/server/)._

_**IMPORTANT:** In order to deploy an OpenTok Broadcast app, your web domain must use HTTPS._

## Quick start

To get up and running quickly with your app, go through the following steps in the tutorial provided below:

1. [Configuring the App](#configuring-the-app)
2. [Deploying and running](#deploying-and-running)

To learn more about the best practices used to design this app, see [Exploring the code](#exploring-the-code).


### Configuring the app

Now you are ready to add the configuration detail to your app. These will include the **Session ID**, **Token**, and **API Key** you retrieved earlier (see [Prerequisites](#prerequisites)).

In **app.js**, replace the following empty strings with the required detail:


   ```javascript
    apiKey: '',    // Replace with your OpenTok API Key
    sessionId: '', // Replace with a generated Session ID
    token: '',     // Replace with a generated token (from the dashboard or using an OpenTok server SDK)
   ```

_At this point you can try running the app! See [Deploying and running](#deploying-and-running) for more information._


### Deploying and running

The web page that loads the sample app for JavaScript must be served over HTTP/HTTPS. Browser security limitations prevent you from publishing video using a `file://` path, as discussed in the OpenTok.js [Release Notes](https://www.tokbox.com/developer/sdks/js/release-notes.html#knownIssues). To support clients running [Chrome 47 or later](https://groups.google.com/forum/#!topic/discuss-webrtc/sq5CVmY69sc), HTTPS is required. A web server such as [MAMP](https://www.mamp.info/) or [XAMPP](https://www.apachefriends.org/index.html) will work, or you can use a cloud service such as [Heroku](https://www.heroku.com/) to host the application.

To try out the Broadcast Sample App, visit the following URLs:

Host:   <a href=“http://broadcast-viewer.herokuapp.com/host”>http://broadcast-viewer.herokuapp.com/host</a>
Guest:  <a href=“http://broadcast-viewer.herokuapp.com/guest”>http://broadcast-viewer.herokuapp.com/guest</a>
Viewer: <a href=“http://broadcast-viewer.herokuapp.com/viewer”>http://broadcast-viewer.herokuapp.com/viewer</a>


## Exploring the code

This section describes how the sample app code design uses recommended best practices to deploy the broadcast features. 

For detail about the APIs used to develop this sample, see the [OpenTok.js Reference](https://tokbox.com/developer/sdks/js/reference/).

  - [Web page design](#web-page-design)
  - [Text Chat Accelerator Pack](#text-chat-accelerator-pack)


For more information, see [Initialize, Connect, and Publish to a Session](https://tokbox.com/developer/concepts/connect-and-publish/) and [Signaling](https://www.tokbox.com/developer/guides/signaling/js/).


_**NOTE:** The sample app contains logic used for logging. This is used to submit anonymous usage data for internal TokBox purposes only. We request that you do not modify or remove any logging code in your use of this sample application._

### Web page design

While TokBox hosts [OpenTok.js](https://tokbox.com/developer/sdks/js/), you must host the sample app yourself. This allows you to customize the app as desired. The sample app has the following design, focusing primarily on the text chat features. For details about the one-to-one communication audio-video aspects of the design, see the [OpenTok One-to-One Communication Sample App](https://github.com/opentok/one-to-one-sample-apps/tree/master/one-to-one-sample-app/js).

* **[server.js](./server.js)**: The server configures the routes for the host, guests, and viewers.  

* **[host.js](./public/js/host.js)**: The host is the individual who controls and publishes the broadcast, but does not control audio or video for guests or viewers. The host uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to send the signals to all clients in the session.

* **[guest.js](./public/js/guest.js)**: Guests can publish in the broadcast. They can control their own audio and video, but only the host can control whether they are broadcasting. Each guest uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to send the signals to all clients in the session.

* **[viewer.js](./public/js/viewer.js)**: Viewers can control their own audio and video but can only view the broadcast. 

* **[CSS files](./public/css)**: Defines the client UI style. 


#### Server

The methods in server.js include the host, guest, and viewer routes. Each API retrieves the credentials and creates the token for each user type (moderator, publisher, subscriber) defined in api.js:

```javascript
const tokenOptions = userType => {

  const role = {
    host: 'moderator',
    guest: 'publisher',
    viewer: 'subscriber',
  }[userType];

  return { role };
};
```

The credentials are embedded in an EJS template as JSON. For example, the following host route is configured in server.js:

```javascript
app.get('/host', (req, res) => {
  api.getCredentials('host')
    .then(credentials => res.render('pages/host', { 
      credentials: JSON.stringify(credentials) 
    }))
    .catch(error => res.status(500).send(error));
});
```

The credentials are then retrieved in host.js and used to connect to the host to the session:

```javascript
  var getCredentials = function () {
    var el = document.getElementById('credentials');
    var credentials = JSON.parse(el.getAttribute('data'));
    el.remove();
    return credentials;
  };

  . . .

  var init = function () {

    . . .

    var credentials = getCredentials();
    var session = OT.initSession(credentials.apiKey, credentials.sessionId);
    var publisher = initPublisher();

    session.connect(credentials.token, function (error) {

      . . .

    });
  };

```



When the web page is loaded, those credentials are retrieved from the HTML and are used to initialize the session.


#### Host

The methods in host.js retrieve the credentials from the HTML, set the state of the broadcast and update the UI, control the broadcast stream, subscribe to the guest streams, create the URL for viewers to watch the broadcast, and monitor broadcast status. The host UI includes a button to start and end the broadcast, as well as a control to get a sharable link that can be distributed to all potential viewers to watch the CDN stream. The host makes calls the OpenTok API to start and end the broadcast and send a signal to the CDN live stream. Once the broadcast ends, the client player will trigger an error event and display a message that the broadcast is over. For more information, see [Initialize, Connect, and Publish to a Session](https://tokbox.com/developer/concepts/connect-and-publish/).

The following line in host.js creates a control that allows the host to copy the URL of the CDN stream to their clipboard so they can paste it for distribution to potential viewers:


```javascript
  var init = function () {
    var clipboard = new Clipboard('#copyURL');

    . . .

    });
  };

```

The following method in host.js sets up the publisher session for the host, configures the custom UI, and sets up event listeners for the broadcast button.

```javascript
  var publishAndSubscribe = function (session, publisher) {
    session.publish(publisher);
    addPublisherControls(publisher);
    setEventListeners(session, publisher);
  };
```

When the broadcast button is clicked, the `setEventListeners()` method calls the `startBroadcast()` method, which submits a request to the server endpoint to begin the broadcast. The server endpoint relays the request to the OpenTok API, which returns the URL


#### Guest

The functions in guest.js retrieve the credentials from the HTML, subscribe to the host stream and other guest streams, publish audio and video to the session, and monitor broadcast status. Each guest uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to send and receive the signals in the broadcast.


#### Viewer

The functions in viewer.js retrieve the credentials from the HTML, subscribe to the broadcast stream, and monitor broadcast status. Once the broadcast begins, the viewer can see the host and guests. Each viewer uses the OpenTok [Signaling API](https://www.tokbox.com/developer/guides/signaling/js/) to receive the signals sent in the broadcast.


#### Initialization

  The following `options` fields are used in the `TextChatAccPack` constructor:

  | Feature        | Field  |
  | ------------- | ------------- |
  | Set the chat container.   | `container`  |
  | Sets the position of the element that displays the information for the character count within the UI.   | `charCountElement`  |
  | Set the maximum chat text length.   | `limitCharacterMessage`  |
  | Set the sender alias and the sender ID of the outgoing messages.  | `senderAlias`, `senderId`  |


  In this initialization code, the `TextChatAccPack` object is initialized.

  ```javascript
  _textChat = new TextChatAccPack(
    {
      charCountElement: options.textChat.charCountElement,
      acceleratorPack: self,
      sender: options.textChat.user,
      limitCharacterMessage: options.textChat.limitCharacterMessage
    });
  ```


  #### Sending and receiving messages

  The `TextChat` component defines `showTextChat()` and `hideTextChat()` methods to show or hide text chat view.

  The `TextChat` component defines `isDisplayed()` method to know if the text chat accelerator pack is displayed or not.

  The `TextChat` component defines `isEnabled()` method to know if the text chat accelerator pack is enabled or not.
  
  ```javascript
  var displayed = _textChat.isDisplayed();

  ```

  #### Events

   The `TextChat` component emits a `messageReceived` event when a new message is received.

  The `TextChat` component emits a `messageSent` event when a new message is sent.

  The `TextChat` component emits an `errorSendingMessage` event when there is an error sending a message.
  
  These events can be subscribed to in the following manner:

  ```javascript
      _accPack.registerEventListener('messageReceived', function() {
        . . .
      });

      _accPack.registerEventListener('messageSent', function() {
        . . .
      });

      _accPack.registerEventListener('errorSendingMessage', function() {
        . . .
      });
  ```



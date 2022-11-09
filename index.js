const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const sessions = {};

const opentok = require('./services/opentok-api');

const generateCredentials = async (usertype, roomName) => {
  if (sessions[roomName]) {
    const token = opentok.createToken(usertype, sessions[roomName]);
    credentials = {
      apiKey: opentok.apiKey,
      sessionId: sessions[roomName],
      token: token,
    };
    return credentials;
  } else {
    try {
      const credentials = await opentok.getCredentials(usertype);
      sessions[roomName] = credentials.sessionId;
      return credentials;
    } catch (e) {
      return e;
    }
  }
};

/*
 * Routes
 */
app.get('/', (req, res) => {
  res.redirect('/viewer');
});

app.get('/host', async (req, res) => {
  const roomName = req.query.room;
  try {
    const credentials = await generateCredentials('host', roomName);
    res.render('pages/host', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/viewer', async (req, res) => {
  const roomName = req.query.room;
  try {
    const credentials = await generateCredentials('viewer', roomName);
    res.render('pages/viewer', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/hls-viewer', async (req, res) => {
  const roomName = req.query.room;
  try {
    const credentials = await generateCredentials('viewer', roomName);
    res.render('pages/hls-viewer', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/guest', async (req, res) => {
  const roomName = req.query.room;
  try {
    const credentials = await generateCredentials('guest', roomName);
    res.render('pages/guest', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/ec', async (req, res) => {
  try {
    const roomName = req.query.room;
    const credentials = await generateCredentials('guest', roomName);
    res.render('pages/ec', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/broadcast/:room', (req, res) => {
  const { room } = req.params;

  if (!room) res.status(500);
  if (sessions[room] && opentok.activeBroadcast[sessions[room]]) res.json({ url: opentok.activeBroadcast[sessions[room]].url });
  else {
    res.status(500).send('no broadcast url found');
  }
});

/*
 * API Endpoints
 */
app.post('/broadcast/start', (req, res) => {
  const { rtmp, lowLatency, fhd, dvr, sessionId, streamMode } = req.body;

  opentok
    .startBroadcast(rtmp, lowLatency, fhd, dvr, sessionId, streamMode)
    .then((data) => res.send(data))
    .catch((error) => {
      console.log(error);

      res.status(500).send(error);
    });
});

app.post('/broadcast/layout', (req, res) => {
  const { streams, type, sessionId } = req.body;
  opentok
    .updateLayout(streams, type, sessionId)
    .then((data) => res.status(200).send({}))
    .catch((error) => res.status(500).send(error));
});

app.post('/broadcast/classes', (req, res) => {
  const { classList, sessionId } = req.body;
  opentok
    .updateStreamClassList(classList, sessionId)
    .then((data) => res.status(200).send({}))
    .catch((error) => res.status(500).send(error));
});

app.post('/broadcast/end', (req, res) => {
  const { sessionId } = req.body;
  opentok
    .stopBroadcast(sessionId)
    .then((data) => res.send(data))
    .catch((error) => res.status(500).send(error));
});

app.post('/addStream', (req, res) => {
  const { streamId, roomName } = req.body;
  const broadcastId = opentok.activeBroadcast[sessions[roomName]]?.id;
  console.log('broadcastId ' + broadcastId);
  console.log('streamId ' + streamId);

  opentok
    .addStreamToBroadcast(broadcastId, streamId)
    .then(() => res.status(200).send('okay'))
    .catch((err) => {
      console.log('error' + err.message);
      //this is temporary due to an issue on opentok nodeJS 2.14.3
      if (err.message.includes('204')) {
        res.status(200).send('okay');
      } else {
        res.status(500).send('something went wrong');
      }
    });
});

app.post('/render', async (req, res) => {
  try {
    const { sessionId, roomName, bgChoice, round } = req.body;
    console.log('request to start render in ' + sessionId + bgChoice);
    if (sessionId && roomName) {
      const data = await opentok.createRender(sessionId, roomName, bgChoice, round);
      console.log(data);
      const { id } = data;
      sessions[roomName].renderId = id;
      res.status(200).send({ id });
    } else {
      res.status(500);
    }
  } catch (e) {
    console.log(e);

    res.status(500).send({ message: e });
  }
});

app.get('/render/stop/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);

    if (id) {
      const data = await opentok.deleteRender(id);
      console.log(data);
      res.status(200).send(data);
    } else {
      res.status(500);
    }
  } catch (e) {
    res.status(500).send({ message: e });
  }
});

app.get('*', (req, res) => {
  res.redirect('/viewer');
});

/*
 * Listen
 */
app.listen(port, () => console.log(`app listening on port ${port}`));

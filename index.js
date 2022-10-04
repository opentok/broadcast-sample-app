const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const sessions = {};

const opentok = require('./services/opentok-api');

const giveMeCredentials = async (usertype, roomName) => {
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
    const credentials = await giveMeCredentials('host', roomName);
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
    const credentials = await giveMeCredentials('viewer', roomName);
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
    const credentials = await giveMeCredentials('viewer', roomName);
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
    const credentials = await giveMeCredentials('guest', roomName);
    res.render('pages/guest', {
      credentials: JSON.stringify(credentials),
    });
  } catch (e) {
    res.status(500).send(error);
  }
});

app.get('/broadcast/:room', (req, res) => {
  const { room } = req.params;

  if (!room) res.status(500);
  if (sessions[room] && opentok.activeBroadcast[sessions[room]])
    res.json({ url: opentok.activeBroadcast[sessions[room]].url });
  else {
    res.status(500).send('no broadcast url found');
  }
});

app.get('*', (req, res) => {
  res.redirect('/viewer');
});

/*
 * API Endpoints
 */
app.post('/broadcast/start', (req, res) => {
  const { streams, rtmp, lowLatency, fhd, dvr, sessionId } = req.body;

  opentok
    .startBroadcast(streams, rtmp, lowLatency, fhd, dvr, sessionId)
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

/*
 * Listen
 */
app.listen(port, () => console.log(`app listening on port ${port}`));

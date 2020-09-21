const express = require('express');
const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

const opentok = require('./services/opentok-api');

/*
 * Routes
 */
app.get('/', (req, res) => {
  res.redirect('/viewer');
});

app.get('/viewer', async (req, res) => {
  opentok.getCredentials('viewer')
    .then(credentials => res.render('pages/viewer', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
})

app.get('/host', (req, res) => {
  opentok.getCredentials('host')
    .then(credentials => res.render('pages/host', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/guest', (req, res) => {
  opentok.getCredentials('guest')
    .then(credentials => res.render('pages/guest', { credentials: JSON.stringify(credentials) }))
    .catch(error => res.status(500).send(error));
});

app.get('/broadcast', (req, res) => {
  const url = req.query.url;
  const availableAt = req.query.availableAt;
  res.render('pages/broadcast', { broadcast: JSON.stringify({ url, availableAt }) });
});

app.get('*', (req, res) => {
  res.redirect('/viewer');
});

/*
 * API Endpoints
 */
app.post('/broadcast/start', (req, res) => {
  const { streams, rtmp } = req.body;
  opentok.startBroadcast(streams, rtmp)
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/layout', (req, res) => {
  const { streams, type } = req.body;
  opentok.updateLayout(streams, type)
    .then(data => res.status(200).send({}))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/classes', (req, res) => {
  const { classList } = req.body;
  opentok.updateStreamClassList(classList)
    .then(data => res.status(200).send({}))
    .catch(error => res.status(500).send(error));
});

app.post('/broadcast/end', (req, res) => {
  opentok.stopBroadcast()
    .then(data => res.send(data))
    .catch(error => res.status(500).send(error));
});

/*
 * Listen
 */
app.listen(port, () => console.log(`app listening on port ${port}`));

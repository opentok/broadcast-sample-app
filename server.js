/* eslint-env es6 */

/*
 * Dependencies
 */
const express = require('express');
const bodyParser = require('body-parser');
const R = require('ramda');

/*
 * Config
 */
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(`${__dirname}/public`));
app.use(bodyParser.json());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

/** Services */
const api = require('./services/api');
const broadcast = require('./services/broadcast');

/*
 * User Routes
 */
app.get('/host', (req, res) => {
  api.getCredentials('host')
  .then(credentials => {
    res.render('pages/host', { credentials: JSON.stringify(credentials) });
  })
  .catch(error => res.status(500).send(error));
});

app.get('/guest', (req, res) => {
  api.getCredentials('guest')
  .then(credentials => {
    res.render('pages/guest', { credentials: JSON.stringify(credentials) });
  })
  .catch(error => res.status(500).send(error));
});

// Live stream
app.get('/viewer', (req, res) => {
  api.getCredentials('viewer')
  .then(credentials => res.render('viewer.ejs', { credentials: JSON.stringify(credentials) }))
  .catch(error => res.status(500).send(error));
});

 // Broadcast stream
app.get('/broadcast', (req, res) => {
  res.send('yes');
  // broadcast.start()
  // .then(data => res.send(data))
  // .catch(error => res.status(500).send(error));
});

/*
 * API Endpoints
 */
app.post('/broadcast/start', (req, res) => {
  const sessionId = R.path(['body', 'sessionId'], req);
  broadcast.start(sessionId)
  .then(data => res.send(data))
  .catch(error => res.status(500).send(error));
});

app.post('/broadcast/end', (req, res) => {
  const broadcastId = R.path(['body', 'broadcastId'], req);
  broadcast.end(broadcastId)
  .then(data => res.send(data))
  .catch(error => res.status(500).send(error));
});

app.get('*', (req, res) => {
  res.redirect('/broadcast');
});

/*
 * Listen
 */
app.listen(process.env.PORT || port);
console.log(`app listening on port ${port}`);

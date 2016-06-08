/* eslint-env es6 */

/*
 * Dependencies
 */
const express = require('express');
const bodyParser = require('body-parser');

/*
 * Config
 */
const app = express();
const port = process.env.PORT || 3000;
app.use(express.static(`${__dirname}/public`));
app.use(bodyParser.json());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');

/*
 * Routes
 */
app.get('/host', (req, res) => {
  const session = 'a';
  const token = 'a';
  res.render('host.ejs', { session, token });
});

app.get('/guest', (req, res) => {
  const session = 'a';
  const token = 'a';
  res.render('guest.ejs', { session, token });
});


// Live stream
app.get('/viewer', (req, res) => {
  const session = 'a';
  const token = 'a';
  res.render('viewer.ejs', { session, token });
});

 // Broadcast stream
app.get('/broadcast', (req, res) => {
  const session = 'a';
  const token = 'a';
  res.render('broadcast.ejs', { session, token });
});

app.get('*', (req, res) => {
  res.redirect('/broadcast');
});

/*
 * Listen
 */
app.listen(process.env.PORT || port);
console.log(`app listening on port ${port}`);

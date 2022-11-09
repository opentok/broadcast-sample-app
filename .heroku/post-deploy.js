const fs = require('fs');

let config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

config.apiKey = process.env.apiKey;
config.apiSecret = process.env.apiSecret;
config.production_url = process.env.apiSecret;

fs.writeFileSync('./config.json', JSON.stringify(config));

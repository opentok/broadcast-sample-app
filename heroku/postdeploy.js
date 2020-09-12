let config = require('../config.json');

config.apiKey = process.env.apiKey;
config.apiSecret = process.env.apiSecret;

require('fs').writeFileSync('../config.json', JSON.stringify(config));
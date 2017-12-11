# node-nude

Node.js port of [nude.js](https://github.com/pa7/nude.js) by [Patrick Wied](https://github.com/pa7).

## Installation

`npm install nude`

## Usage overview
```
  var nude = require('nude');

  nude.scan('<FILE_PATH>', function(res) {
    console.log('Contains nudity: ' + res);
  });

  var isNude = await nude.scanAsync('<FILE_PATH>');

  nude.scanUrl('<FILE_URL>', function(res) {
    console.log('Contains nudity: ' + res);
  });

  var isNude = await nude.scanUrlAsync('<FILE_URL>');
```

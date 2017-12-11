var nude = require('../nude'),
  images = [
    { id: 1, expected: false },
    { id: 2, expected: false },
    { id: 3, expected: false },
    { id: 4, expected: true }
  ],
  url = 'https://i.ytimg.com/vi/FLdK7Hatm0w/hqdefault.jpg'

images.forEach(function(image) {
  nude.scan(__dirname + '/images/' + image.id + '.jpg', function(res) {
    console.log('Image ' + image.id + ': ' + res);
    console.log('Expected: ' + image.expected);
  });
});


nude.scanUrl(url, function(res) {
  console.log('Scan Url:', res)
})

async function asynchronous() {
  var isNudeFromDisk = await nude.scanAsync(__dirname + '/images/' + '4.jpg')
  console.log('Async local test: ', isNudeFromDisk)

  var isNudeRemote = await nude.scanUrlAsync(url)
  console.log('Async remote test: ', isNudeRemote)
}


asynchronous()

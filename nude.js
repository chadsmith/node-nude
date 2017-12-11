var request = require('request').defaults({ encoding: null })
var Canvas = require('canvas'),
  fs = require('fs'),
  Image = Canvas.Image;

var classifySkin = function(r, g, b) {
    var rgbClassifier = r > 95 && g > 40 && g < 100 && b > 20 && (Math.max(r, g, b) - Math.min(r, g, b)) > 15 && Math.abs(r - g) > 15 && r > g && r > b,
      nurgb = toNormalizedRgb(r, g, b),
      nr = nurgb[0],
      ng = nurgb[1],
      nb = nurgb[2],
      normRgbClassifier = (nr / ng) > 1.185 && (r * b / Math.pow(r + g + b, 2)) > 0.107 && (r * g / Math.pow(r + g + b, 2)) > 0.112,
      hsv = toHsvTest(r, g, b),
      h = hsv[0],
      s = hsv[1],
      hsvClassifier = h > 0 && h < 35 && s > 0.23 && s < 0.68;
    return rgbClassifier || normRgbClassifier || hsvClassifier;
  },
  toHsvTest = function(r, g, b) {
	  var h = 0,
	    mx = Math.max(r, g, b),
	    mn = Math.min(r, g, b),
	    dif = mx - mn;
	  if(mx == r)
		  h = (g - b) / dif;
	  else if(mx == g)
		  h = 2 + (g - r) / dif;
	  else
		  h = 4 + (r - g) / dif;
	  h *= 60;
	  if(h < 0)
		  h += 360;
	  return [h, 1 - 3 * (Math.min(r, g, b) / (r + g + b)), 1 / 3 * (r + g + b)];
  },
  toNormalizedRgb = function(r, g, b) {
	  var sum = r + g + b;
	  return [r / sum, g / sum, b / sum];
  };


function scanUrlAsync(url) {
	return new Promise((resolve, reject) => {
		scanUrl(url, function(result, err) {
			if (err)
				return reject(err)

			return resolve(result)
		})
	})
}

function scanAsync(src) {
	return new Promise((resolve, reject) => {
		scan(src, function(result, err) {
			if (err)
				return reject(err)

			return resolve(result)
		})
	})
}

function scanUrl(url, callback) {
	request({
  	method: 'GET',
  	uri: url,
  	timeout: 6 * 1000,
  	gzip: true
  }, function (err, res, data) {
  	if(err) {
    	return callback && callback(null, err)
  	}

  	process(data, callback)
  })
}

function scan(src, callback) {
  fs.readFile(src, function(err, data) {
  	if(err)
    	return callback && callback(null, err)

    process(data, callback)
  })
}

function process(data, callback) {
  var canvas = new Canvas(1, 1),
    ctx = canvas.getContext('2d'),
    img = new Image,
    skinRegions = [],
	  skinMap = [],
	  detectedRegions = [],
	  mergeRegions = [],
	  detRegions = [],
	  lastFrom = -1,
	  lastTo = -1,
    totalSkin = 0,
	  addMerge = function(from, to) {
		  lastFrom = from;
		  lastTo = to;
		  var len = mergeRegions.length,
		    fromIndex = -1,
		    toIndex = -1,
		    region,
		    rlen;
		  while(len--) {
			  region = mergeRegions[len];
			  rlen = region.length;
			  while(rlen--) {
				  if(region[rlen] == from)
					  fromIndex = len;
				  if(region[rlen] == to)
					  toIndex = len;
			  }
		  }
		  if(fromIndex != -1 && toIndex != -1 && fromIndex == toIndex)
			  return;
		  if(fromIndex == -1 && toIndex == -1)
			  return mergeRegions.push([from, to]);
		  if(fromIndex != -1 && toIndex == -1)
			  return mergeRegions[fromIndex].push(to);
		  if(fromIndex == -1 && toIndex != -1)
			  return mergeRegions[toIndex].push(from);
		  if(fromIndex != -1 && toIndex != -1 && fromIndex != toIndex) {
			  mergeRegions[fromIndex] = mergeRegions[fromIndex].concat(mergeRegions[toIndex]);
			  mergeRegions = [].concat(mergeRegions.slice(0, toIndex), mergeRegions.slice(toIndex + 1));
		  }
	  },
	  totalPixels,
	  imageData,
	  length;
  img.src = data;
  canvas.width = img.width;
  canvas.height = img.height;
  totalPixels = canvas.width * canvas.height;
  ctx.drawImage(img, 0, 0);
  imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
	length = imageData.length;
	for(var i = 0, u = 1; i < length; i += 4, u++) {
		var r = imageData[i],
		  g = imageData[i + 1],
		  b = imageData[i + 2],
		  x = u > canvas.width ? u % canvas.width - 1 : u,
		  y = u > canvas.width ? Math.ceil(u / canvas.width) - 1 : 1;
		if(classifySkin(r, g, b)) {
			skinMap.push({id: u, skin: true, region: 0, x: x, y: y, checked: false});
			var region = -1,
			  checkIndexes = [u - 2, u - canvas.width - 2, u - canvas.width - 1, u - canvas.width],
			  checker = false;
			for(var o = 0, index; o < 4; o++) {
				index = checkIndexes[o];
				if(skinMap[index] && skinMap[index].skin) {
					if(skinMap[index].region != region && region != -1 && lastFrom != region && lastTo != skinMap[index].region)
						addMerge(region, skinMap[index].region);
					region = skinMap[index].region;
					checker = true;
				}
			}
			if(!checker) {
				skinMap[u - 1].region = detectedRegions.length;
				detectedRegions.push([skinMap[u - 1]]);
				continue;
			}
			else
				if(region > -1) {
					if(!detectedRegions[region])
						detectedRegions[region] = [];
					skinMap[u - 1].region = region;
					detectedRegions[region].push(skinMap[u - 1]);
				}
		}
		else
			skinMap.push({ id: u, skin: false, region: 0, x: x, y: y, checked: false });
	}
	length = mergeRegions.length;
	while(length--) {
		region = mergeRegions[length];
		var rlen = region.length;
		if(!detRegions[length])
			detRegions[length] = [];
		while(rlen--) {
			index = region[rlen];
			detRegions[length] = detRegions[length].concat(detectedRegions[index]);
			detectedRegions[index] = [];
		}
	}
	length = detectedRegions.length;
	while(length--)
		if(detectedRegions[length].length > 0)
			detRegions.push(detectedRegions[length]);
	length = detRegions.length;
	for(var i = 0; i < length; i++)
		if(detRegions[i].length > 30)
			skinRegions.push(detRegions[i]);
	length = skinRegions.length;
	if(length < 3)
		return callback && callback(false);
	(function() {
		var sorted = false, temp;
		while(!sorted) {
			sorted = true;
			for(var i = 0; i < length-1; i++)
				if(skinRegions[i].length < skinRegions[i + 1].length) {
					sorted = false;
					temp = skinRegions[i];
					skinRegions[i] = skinRegions[i + 1];
					skinRegions[i + 1] = temp;
				}
		}
	})();
	while(length--)
		totalSkin += skinRegions[length].length;
	if((totalSkin / totalPixels) * 100 < 15)
		return callback && callback(false);
	if((skinRegions[0].length / totalSkin) * 100 < 35 && (skinRegions[1].length / totalSkin) * 100 < 30 && (skinRegions[2].length / totalSkin) * 100 < 30)
		return callback && callback(false);
	if((skinRegions[0].length / totalSkin) * 100 < 45)
		return callback && callback(false);
	if(skinRegions.length > 60)
		return callback && callback(false);
	return callback && callback(true);
}

module.exports = {
	scan: scan,
	scanAsync: scanAsync,
	scanUrl: scanUrl,
	scanUrlAsync: scanUrlAsync
}

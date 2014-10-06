// Copyright 2014, Jason Davies, http://www.jasondavies.com/
// modified by Steven M. Ottens https://github.com/stvno
//SMO global json
var gjson = {};
var gid = [];
var G1, G2, G3, G4, G5;
var path;
(function() {

d3.geo.vector = function(projection,style) {
   path = d3.geo.path().projection(projection),
      url = null,      
      scaleExtent = [0, Infinity],
      subdomains = ["a", "b", "c", "d"];  
	var features = {};
  //check if there is a style object given
  typeof style == "undefined"?style = function(){return 'vector'}:style;
  
  function redraw(layer) {
    // TODO improve zoom level computation
     var z = Math.max(scaleExtent[0], Math.min(scaleExtent[1], (Math.log(projection.scale()) / Math.LN2 | 0) - 6)),
        pot = z + 6,
        ds = projection.scale() / (1 << pot),
        t = projection.translate();

    layer.style(prefix + "transform", "translate(" + t.map(pixel) + ")scale(" + ds + ")").attr("class","test");

    var tile = layer.selectAll(".tile")
        .data(d3.quadTiles(projection, z), key);

    tile.enter().append("tile")
        .attr("hidden", "true")
        .each(function(d) {            
            var svg = this,              
            k = d.key;
            //retrieve the topojson and send it to the onload funtion
            this._xhr = d3.json(url({x: k[0], y: k[1], z: k[2], subdomain: subdomains[(k[0] * 31 + k[1]) % subdomains.length]}), function(error, json) { onload(d, json)
            });
        });
    tile.exit().remove();
  }
  
  function onload(d, json) {
		var geojson = topojson.feature(json, json.objects.vectile);
	    var features = redraw.features();
		geojson.features.forEach(function(f){					
			var id = f.id;
			var key = d.key.toString();		
			if(!features[id]){
				var item = {};
				item.feature = {};
				item.feature.properties  = f.properties;
				item.feature.id = f.id;
				item.feature.type = f.type;
				item.geoms = {};
				item.geoms[key] = f.geometry;
				features[id] = item;
			}
			else {
				features[id].geoms[key] = f.geometry;
				//merge the lot
				features[id].merged = true;
			};
		});
		redraw.features(features);
	
				
	
  }

  redraw.url = function(_) {
    if (!arguments.length) return url;
    url = typeof _ === "string" ? urlTemplate(_) : _;
    return redraw;
  };
  
  redraw.features = function(_) {
	  return arguments.length ? (features = _, redraw) : features;
  };

  redraw.scaleExtent = function(_) {
    return arguments.length ? (scaleExtent = _, redraw) : scaleExtent;
  };

  redraw.subdomains = function(_) {
    return arguments.length ? (subdomains = _, redraw) : subdomains;
  };

  return redraw;
};

function key(d) { return d.key.join(", "); }
function pixel(d) { return (d | 0) + "px"; }

function urlTemplate(s) {
  return function(o) {
    return s.replace(/\{([^\}]+)\}/g, function(_, d) {
      var v = o[d];
      return v != null ? v : d === "quadkey" && quadkey(o.x, o.y, o.z);
    });
  };
}

function quadkey(column, row, zoom) {
  var key = [];
  for (var i = 1; i <= zoom; i++) {
    key.push((((row >> zoom - i) & 1) << 1) | ((column >> zoom - i) & 1));
  }
  return key.join("");
}

})();

// Check for vendor prefixes, by Mike Bostock.
var prefix = prefixMatch(["webkit", "ms", "Moz", "O"]);

function prefixMatch(p) {
  var i = -1, n = p.length, s = document.body.style;
  while (++i < n) if (p[i] + "Transform" in s) return "-" + p[i].toLowerCase() + "-";
  return "";
}

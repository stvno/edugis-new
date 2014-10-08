// Copyright 2014, Jason Davies, http://www.jasondavies.com/
// modified by Steven M. Ottens https://github.com/stvno

(function() {

d3.geo.vector = function(projection,style) {
  var path = d3.geo.path().projection(projection),
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
	
	var svg = layer.select("svg");
		
	
	
    var tile = layer.selectAll(".tile")
        .data(d3.quadTiles(projection, z), key);

    tile.enter().append("tile")
        .attr("hidden", "true")
        .each(function(d) {            
            var k = d.key;
            //retrieve the topojson and send it to the onload funtion
            this._xhr = d3.json(url({x: k[0], y: k[1], z: k[2], subdomain: subdomains[(k[0] * 31 + k[1]) % subdomains.length]}), function(error, json) { onload(d, json, svg)
            });
        });
    tile.exit().remove();
  }
  
  function onload(d, json, svg) {
		var geojson = topojson.feature(json, json.objects.vectile);
	    var features = redraw.features();
		geojson.features.forEach(function(f){					
			var id = f.id;
			var key = d.key.toString();		
			if(!features[id]){
				var item = {};
				item.first = f;
				item.geometries = {};
				item.geometries[key] = f.geometry;
				features[id] = item;
			}
			else {
				//TODO: add line functionality
				var item = features[id];
				item.geometries[key] = f.geometry;
				//merge the lot
				var geometry = {type:"MultiPolygon",coordinates:[]};
				for(k in item.geometries) {
					if(item.geometries[k].type=="Polygon"){
						geometry.coordinates.push(item.geometries[k].coordinates);
					}
					else {
					
						geometry.coordinates = geometry.coordinates.concat(item.geometries[k].coordinates);
					}
				}
				var temp = item.first;
				temp.geometry = geometry;
				var buffer = turf.buffer(temp,0);
				for(var i = 0; i < buffer.features.length;i++) {
					buffer.features[i].properties = item.first.properties;
					buffer.features[i].id = item.first.id;
				}
				item.feature = buffer;
				features[id] = item;
				
			};
		});
		redraw.features(features);
		svg.select("g")
		.selectAll("path")
		 .data(features,function(d){return d.feature})
				
	
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

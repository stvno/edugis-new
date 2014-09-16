// Copyright 2014, Jason Davies, http://www.jasondavies.com/
// modified by Steven M. Ottens https://github.com/stvno
(function() {

d3.geo.vector = function() {
  var path = d3.geo.path().projection(projection),
      url = null,
      scaleExtent = [0, Infinity],
      subdomains = ["a", "b", "c", "d"];  

  function redraw(layer) {
    // TODO improve zoom level computation
    var z = Math.max(scaleExtent[0], Math.min(scaleExtent[1], (Math.log(projection.scale()) / Math.LN2 | 0) - 6)),
        pot = z + 6,
        ds = projection.scale() / (1 << pot),
        t = projection.translate();


		
    layer.style(prefix + "transform", "translate(" + t.map(pixel) + ")scale(" + ds + ")");

    var tile = layer.selectAll(".tile")
        .data(d3.quadTiles(projection, z), key);
		
		//SMO: hier gaan we dus een SVG inzetten
    tile.enter().append("svg")
        .attr("class", "tile")
        .each(function(d) {    		
			var svg = this,		      
			k = d.key;
			  //width = 1 << d.key[2];      
			this._xhr = d3.json("/buurtenid/" + d.key[2] + "/" + d.key[0] + "/" + d.key[1] + ".topojson", function(error, json) { onload(d, svg, pot, json)
			});
        });
    tile.exit().remove();
  }
  
  function onload(d, svg, pot, json) {
			var t = projection.translate(),
				s = projection.scale(),
				c = projection.clipExtent(),
				dx = svg.clientWidth,
				dy = svg.clientHeight,
				k = d.key,
				width = 1 << k[2];
		  
		  projection.translate([0, 0]).scale(1 << pot).clipExtent(null);
		  
		  svg.width = dx, svg.height = dy;
			var bounds = path.bounds(d),
				x0 = d.x0 = bounds[0][0] | 0,
				y0 = d.y0 = bounds[0][1] | 0,
				x1 = bounds[1][0] + 1 | 0,
				y1 = bounds[1][1] + 1 | 0;
			
			var λ0 = k[0] / width * 360 - 180,
				λ1 = (k[0] + 1) / width * 360 - 180,
				φ0 = k[1] / width * 360 - 180,
				φ1 = (k[1] + 1) / width * 360 - 180;
				mφ0 = mercatorφ(φ0),
				mφ1 = mercatorφ(φ1);			
			
			 var width =x1 - x0,
				height =y1 - y0;
			d3.select(svg).style("width", width+"px");
			d3.select(svg).style("height", height+"px");
	
			
			 if (width > 0 && height > 0) {
				var s = Math.pow(2, k[2]) * 256;
			   path.projection()
				//.translate([s / 2 - k[0] * 256, s / 2 - k[1] * 256]) // [0°,0°] in pixels
              //.scale(s / 2 / Math.PI);
				var features = topojson.feature(json, json.objects.vectile);
				d3.select(svg).selectAll("path")
				.data(features.features,function(d){
					return d.properties.bu_code;
				})
				.enter().append("path")
				.attr("class", function(d) { 
					return quantize(rateById.get(d.properties.bu_code)); 
				})
				.attr("d", path);
			 }
			 d3.select(svg)
				.style("left", x0 + "px")
				.style("top", y0 + "px");
			projection.translate(t).scale(s).clipExtent(c);
			/*
			var k = Math.pow(2, d[2]) * 256; // size of the world in pixels
			//SMO: hier gaat het mis: hij gaat er van uit dat het een tegel van 256x256 is
			path.projection()
              .translate([k / 2 - d[0] * 256, k / 2 - d[1] * 256]) // [0°,0°] in pixels
              .scale(k / 2 / Math.PI);*/
  }

  redraw.url = function(_) {
    if (!arguments.length) return url;
    url = typeof _ === "string" ? urlTemplate(_) : _;
    return redraw;
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

// Find latitude based on Mercator y-coordinate (in degrees).
function mercatorφ(y) {
  return Math.atan(Math.exp(-y * Math.PI / 180)) * 360 / Math.PI - 90;
}

mercatorφ.invert = function(φ) {
  return -Math.log(Math.tan(Math.PI * .25 + φ * Math.PI / 360)) * 180 / Math.PI;
};

function bilinear(f) {
  return function(x, y, o) {
    var x0 = Math.floor(x),
        y0 = Math.floor(y),
        x1 = Math.ceil(x),
        y1 = Math.ceil(y);
    if (x0 === x1 || y0 === y1) return f(x0, y0, o);
    return (f(x0, y0, o) * (x1 - x) * (y1 - y)
          + f(x1, y0, o) * (x - x0) * (y1 - y)
          + f(x0, y1, o) * (x1 - x) * (y - y0)
          + f(x1, y1, o) * (x - x0) * (y - y0)) / ((x1 - x0) * (y1 - y0));
  };
}

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

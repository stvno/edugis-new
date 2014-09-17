// Copyright 2014, Jason Davies, http://www.jasondavies.com/
// modified by Steven M. Ottens https://github.com/stvno
(function() {

d3.geo.vector = function(projection,style) {
  var path = d3.geo.path().projection(projection),
      url = null,      
      scaleExtent = [0, Infinity],
      subdomains = ["a", "b", "c", "d"];  

  //check if there is a style object given
  typeof style == "undefined"?style = function(){return 'vector'}:style;
  
  function redraw(layer) {
    // TODO improve zoom level computation
    var z = Math.max(scaleExtent[0], Math.min(scaleExtent[1], (Math.log(projection.scale()) / Math.LN2 | 0) - 6)),
        pot = z + 6,
        ds = projection.scale() / (1 << pot),
        t = projection.translate();

    layer.style(prefix + "transform", "translate(" + t.map(pixel) + ")scale(" + ds + ")");

    var tile = layer.selectAll(".tile")
        .data(d3.quadTiles(projection, z), key);

    tile.enter().append("svg")
        .attr("class", "tile")
        .each(function(d) {            
            var svg = this,              
            k = d.key;
            //retrieve the topojson and send it to the onload funtion
            this._xhr = d3.json(url({x: k[0], y: k[1], z: k[2], subdomain: subdomains[(k[0] * 31 + k[1]) % subdomains.length]}), function(error, json) { onload(d, svg, pot, json)
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
        k = d.key;
               
    projection.translate([0, 0]).scale(1 << pot).clipExtent(null);
          
    svg.width = dx, svg.height = dy;
    var bounds = path.bounds(d),
        x0 = d.x0 = bounds[0][0] | 0,
        y0 = d.y0 = bounds[0][1] | 0,
        x1 = bounds[1][0] + 1 | 0,
        y1 = bounds[1][1] + 1 | 0;
        
    var width = svg.clientWidth = x1 - x0,
        height = svg.clientHeight = y1 - y0;
        d3.select(svg).style("width", width+"px");
        d3.select(svg).style("height", height+"px");
    
    if (width > 0 && height > 0) {
        //reproject the features within the SVG tile
        path.projection()
            .translate([-x0,-y0])
             
        d3.select(svg).selectAll("path")
            .data(topojson.feature(json, json.objects.vectile).features,function(d){
                return d.properties.bu_code;
            })
            .enter().append("path")
            .attr("class", style)
            .attr("d", path);
    }
    d3.select(svg)
        .style("left", x0 + "px")
        .style("top", y0 + "px");
    projection.translate(t).scale(s).clipExtent(c);
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

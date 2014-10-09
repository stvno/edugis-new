// Copyright 2014, Jason Davies, http://www.jasondavies.com/
// modified by Steven M. Ottens https://github.com/stvno

(function() {

d3.geo.vector = function(projection,style) {
  var path = d3.geo.path().projection(projection),
      url = null,      
      scaleExtent = [0, Infinity],
      subdomains = ["a", "b", "c", "d"];  
  var features = [];
  //check if there is a style object given
  typeof style == "undefined"?style = function(){return 'vector'}:style;
  
  function redraw(layer) {
    // TODO improve zoom level computation
    var z = Math.max(scaleExtent[0], Math.min(scaleExtent[1], (Math.log(projection.scale()) / Math.LN2 | 0) - 6)),
        pot = z + 6,
        ds = projection.scale() / (1 << pot),
        t = projection.translate();

    layer.style(prefix + "transform", "translate(" + t.map(pixel) + ")scale(" + ds + ")").attr("class","gd3-layer");
    
    var tile = layer.selectAll(".tile")
        .data(d3.quadTiles(projection, z), key);

    tile.enter().append("g")        
        .attr("class", "tile")
        .each(function(d) { 
            var tile = this;
            var k = d.key;
            //retrieve the topojson and send it to the onload funtion
            d3.json(url({x: k[0], y: k[1], z: k[2], subdomain: subdomains[(k[0] * 31 + k[1]) % subdomains.length]}), function(error, json) { onload(d, json, layer, pot, tile)
            });
        });
    tile.exit()
        .each(removeFeatures)
        .remove();
    }
   
  /*   
   *  removeFeatures is called after a "tile" is outside the current view
   *  It loops through all the features in the layer to see if there are
   *  features which are also on the removed tile.
   *  If that is the case, remove the geometries of the tile from the feature
   *  and if there are no geometries left, remove the entire feature;
  **/
  function  removeFeatures(d){
    var k = d.key;
    var features = redraw.features();
    for(var i = features.length; i>0 ;i--) {
        if(features[i-1].geometries[k]) {
            delete features[i-1].geometries[k];
            var empty = true;
            for (var key in features[i-1].geometries) {
                if (hasOwnProperty.call(features[i-1].geometries, key)) empty = false;
            }
            if(empty) {                    
                features.splice(i-1,1)
            }
        }
    };
    redraw.features(features);
  }
  
  /*
   *  onload is called after a "tile" is loaded.
   *  It parses the topojson and loops through all the features to see if they
   *  already exists in the list of the layer.
   *  If that is not the case it creates a new feature object and adds it to the
   *  list.
   *  If it is the case it adds the geometry to the feature object and merges these
   *  geometries.
  **/
  function onload(d, json, layer, pot, tile) {
    var t = projection.translate(),
        s = projection.scale(),
        c = projection.clipExtent(),
        dx = tile.clientWidth,
        dy = tile.clientHeight,
        k = d.key;
               
    projection.translate([0, 0]).scale(1 << pot).clipExtent(null);
          
    var geojson = topojson.feature(json, json.objects.vectile);
    var features = redraw.features();
    geojson.features.forEach(function(f){                    
        var id = f.id;
        var key = d.key.toString();        
        var merge = false;
        var mergeid;
        for(var i=0; i<features.length; i++) {
            if(features[i].id == id) {
            merge = true;
            mergeid=i;
            }
        }
        if(!merge){
            var item = {};
            item.id = id;
            item.first = f;
            item.feature = f;
            item.geometries = {};
            item.geometries[key] = f.geometry;
            features.push(item);
        }
        else {
            //TODO: add line functionality
            var item = features[mergeid];
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
            //TODO: check for empty coordinates
            var temp = item.first;
            temp.geometry = geometry;
            var buffer = turf.buffer(temp,0);
            for(var i = 0; i < buffer.features.length;i++) {
                buffer.features[i].properties = item.first.properties;
                buffer.features[i].id = item.first.id;
            }
            item.feature = buffer;
            features[mergeid] = item;
        };
    });
    redraw.features(features);

    var bounds = path.bounds(d),
        x0 = d.x0 = bounds[0][0] | 0,
        y0 = d.y0 = bounds[0][1] | 0,
        x1 = bounds[1][0] + 1 | 0,
        y1 = bounds[1][1] + 1 | 0;
        
    var width = tile.width = x1 - x0,
        height = tile.height = y1 - y0;
  
    d3.select(tile)
        .style("height", height+"px")
        .style("width", width+"px")
        .style("left", x0 + "px")
        .style("top", y0 + "px");
    
    projection.translate(t).scale(s).clipExtent(c);    
    var paths = layer.select("g")
        .selectAll("path").data(features,function(d){return d.id});
        
    paths
        .enter().append("path")
        .attr("id", function(d){return d.id})
        .attr("class", style)
        
    paths
        .attr("d", function(d){
            var p = path(d.feature);
            if(p==undefined) p="M0,0Z"
            return p}) 
        
    //TODO: filter out the empty paths
    paths
         .enter().append("path")
         .attr("id", function(d){return d.id})
         .attr("class", style)
          
    paths.exit().each(function(d){console.log('remove path')}).remove();
    
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

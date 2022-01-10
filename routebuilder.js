
mapboxgl.accessToken = 'pk.eyJ1Ijoic2h1NzExIiwiYSI6ImNrY3d2aDEyajAwNm0yc28wamFpanphejIifQ.HNygBT192Xfu5W4lhGXjRw';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11',
    center: [139.220500, 35.427528], // starting position
    zoom: 12
});

var data = {
    // A labels array that can contain any sort of values
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    // Our series array that contains series objects or in this case series data arrays
    series: [
        [5, 2, 4, 2, 0]
    ]
};

// Create a new line chart object where as first parameter we pass in a selector
// that is resolving to our chart container element. The Second parameter
// is the actual data object.
new Chartist.Line('.ct-chart', data);

// Create variables to use in getIso()
var urlBase = 'https://api.mapbox.com/isochrone/v1/mapbox/';
var profile = 'driving';
var minutes = 60;

var click_times = 0;
// initialize the map canvas to interact with later
var canvas = map.getCanvasContainer();

// an arbitrary start will always be the same
// only the end or destination will change
var start = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [139.220500, 35.427528]
        }
    }
    ]
};
var end = {
    type: 'FeatureCollection',
    features: [{
        type: 'Feature',
        properties: {},
        geometry: {
            type: 'Point',
            coordinates: [139.220500, 35.427528]
        }
    }
    ]
};


// this is where the code for the next step will go
// create a function to make a directions request
function getRoute(start_co, end_co) {
    // make a directions request using driving profile
    // an arbitrary start will always be the same
    // only the end or destination will change
    console.log("debug a");

    console.log(start_co);
    console.log(end_co);

    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + start_co[0] + ',' + start_co[1] + ';' + end_co[0] + ',' + end_co[1] + '?steps=true&geometries=geojson&exclude=motorway&language=ja&access_token=' + mapboxgl.accessToken;

    // make an XHR request https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.onload = function () {
        var json = JSON.parse(req.response);
        var data = json.routes[0];
        console.log(json);
        var route = data.geometry.coordinates;
        var geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route
            }
        };
        var points = turf.explode(geojson); // where line is a GeoJSON LineString
        console.log(points);
        // get the sidebar and add the instructions
        var instructions = document.getElementById('instructions');
        var steps = data.legs[0].steps;

        var tripInstructions = [];
        for (var i = 0; i < steps.length; i++) {
            // tripInstructions.push('<br><li>' + steps[i].maneuver.instruction) + '</li>';
            instructions.innerHTML = '<br><span class="distance">Trip distance: ' + Math.floor(data.distance / 1000) + ' km 🚴 </span>' + tripInstructions;
        }
        console.log(route);
        console.log(geojson);
        // if the route already exists on the map, reset it using setData
        if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
        } else { // otherwise, make a new request
            console.log("debug route");
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: geojson
                        }
                    }
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3887be',
                    'line-width': 5,
                    'line-opacity': 0.75
                }
            });
        }
        // add turn instructions here at the end
    };
    req.send();
}
// Create a function that sets up the Isochrone API query then makes an Ajax call
function getIso(in_minutes, isoid, in_coordinates) {
    var query =
        urlBase +
        profile +
        '/' +
        in_coordinates[0] +
        ',' +
        in_coordinates[1] +
        '?contours_minutes=' +
        in_minutes +
        '&polygons=true&access_token=' +
        mapboxgl.accessToken;

    $.ajax({
        method: 'GET',
        url: query
    }).done(function (data) {
        // Set the 'iso' source's data to what's returned by the API query
        map.getSource(isoid).setData(data);
    });
}

function getElevation(lon, lat) {
    var ajax = new XMLHttpRequest();
    var url_ele = 'https://cyberjapandata2.gsi.go.jp/general/dem/scripts/getelevation.php?lon=' +
        lon +
        '&lat=' +
        lat +
        '&outtype=JSON';
    ajax.open("get", url_ele);
    ajax.send(); // 通信させます。
    ajax.addEventListener("load", function () { // loadイベントを登録します。
        console.log(this.response); // 通信結果を出力します。
    }, false);
}

map.on('load', function () {
    console.log("debug3");

    // make an initial directions request that
    // starts and ends at the same location
    if (click_times == 1) {
        // Add starting point to the map
        map.addLayer({
            id: 'point',
            type: 'circle',
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: start.features[0].geometry.coordinates
                        }
                    }
                    ]
                }
            },
            paint: {
                'circle-radius': 10,
                'circle-color': '#3887be'
            }

        });
    } else if (click_times >= 2) {
        getRoute(start.features[0].geometry.coordinates, end.features[0].geometry.coordinates);
    }

    // When the map loads, add the source and layer

    map.addSource('iso60', {
        type: 'geojson',
        data: {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    map.addLayer(
        {
            'id': 'isoLayer60',
            'type': 'fill',
            'source': 'iso60',
            'layout': {},
            'paint': {
                'fill-color': '#7a3fc0',
                'fill-opacity': 0.3
            }
        },
        'poi-label'
    );

    map.addSource('iso40', {
        type: 'geojson',
        data: {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    map.addLayer(
        {
            'id': 'isoLayer40',
            'type': 'fill',
            'source': 'iso40',
            'layout': {},
            'paint': {
                'fill-color': '#6a3fc0',
                'fill-opacity': 0.3
            }
        },
        'poi-label'
    );

    map.addSource('iso20', {
        type: 'geojson',
        data: {
            'type': 'FeatureCollection',
            'features': []
        }
    });

    map.addLayer(
        {
            'id': 'isoLayer20',
            'type': 'fill',
            'source': 'iso20',
            'layout': {},
            'paint': {
                'fill-color': '#123fc0',
                'fill-opacity': 0.3
            }
        },
        'poi-label'
    );

    // Initialize the marker at the query coordinates
    // marker.setLngLat(lngLat).addTo(map);

    // Make the API call
    // this is where the code from the next step will go

    console.log("debug4");

});

map.on('click', function (e) {
    var coordsObj = e.lngLat;
    canvas.style.cursor = '';
    var coords = Object.keys(coordsObj).map(function (key) {
        return coordsObj[key];
    });
    console.log("debug");
    console.log(click_times);
    // console.log(start);
    // console.log(end);
    // console.log(coords);
    // console.log(start.features);
    // console.log(start.features[0].geometry.coordinates);
    // console.log(start.features[0].geometry.type);

    if (click_times == 0) {
        start.features[0].geometry.coordinates = coords;
    } else if (click_times == 1) {
        end.features[0].geometry.coordinates = coords;
    } else {
        start.features[0].geometry.coordinates = end.features[0].geometry.coordinates;
        end.features[0].geometry.coordinates = coords;
    }

    if (map.getLayer('start')) {
        map.getSource('start').setData(start);
    } else {
        map.addLayer({
            id: 'start',
            type: 'circle',
            source: {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: [{
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'Point',
                            coordinates: start.features[0].geometry.coordinates
                        }
                    }]
                }
            },
            paint: {
                'circle-radius': 10,
                'circle-color': '#f30'
            }
        });
    }

    if (click_times >= 1) {
        if (map.getLayer('end')) {
            console.log("debug end1");

            map.getSource('end').setData(end);
        } else {
            console.log("debug end2");
            map.addLayer({
                id: 'end',
                type: 'circle',
                source: {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: [{
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'Point',
                                coordinates: end.features[0].geometry.coordinates
                            }
                        }]
                    }
                },
                paint: {
                    'circle-radius': 10,
                    'circle-color': '#130'
                }
            });
        }
    }

    click_times++;
    if (click_times == 1) {
        getIso(20, "iso20", start.features[0].geometry.coordinates);
        getIso(40, "iso40", start.features[0].geometry.coordinates);
        getIso(60, "iso60", start.features[0].geometry.coordinates);
    }
    if (click_times >= 2) {
        getRoute(start.features[0].geometry.coordinates, end.features[0].geometry.coordinates);
        getRoute(start.features[0].geometry.coordinates, end.features[0].geometry.coordinates); //なぜか二回叩かないと1回目の描画がされない
        getIso(20, "iso20", end.features[0].geometry.coordinates);
        getIso(40, "iso40", end.features[0].geometry.coordinates);
        getIso(60, "iso60", end.features[0].geometry.coordinates);
    }
    console.log("debug2");
    getElevation(end.features[0].geometry.coordinates[0], end.features[0].geometry.coordinates[1]);
});
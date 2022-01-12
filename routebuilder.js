
mapboxgl.accessToken = 'pk.eyJ1Ijoic2h1NzExIiwiYSI6ImNrY3d2aDEyajAwNm0yc28wamFpanphejIifQ.HNygBT192Xfu5W4lhGXjRw';
var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v11',
    center: [139.220500, 35.427528], // starting position
    zoom: 12
});


//標高チャート作成
var data = {
    // A labels array that can contain any sort of values
    // labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    // Our series array that contains series objects or in this case series data arrays
    series: [
        []
    ]
};
var options = {
    showPoint: false,
};

// Create a new line chart object where as first parameter we pass in a selector
// that is resolving to our chart container element. The Second parameter
// is the actual data object.
new Chartist.Line('.ct-chart', data, options);

// Create variables to use in getIso()
var urlBase = 'https://api.mapbox.com/isochrone/v1/mapbox/';
// var profile = 'driving';
var profile = 'cycling';
var minutes = 60;

var click_times = 0;
// initialize the map canvas to interact with later
var canvas = map.getCanvasContainer();
let way_points = [];

// this is where the code for the next step will go
// create a function to make a directions request
function getRoute(in_way_points) {
    // make a directions request using driving profile
    // an arbitrary start will always be the same
    // only the end or destination will change

    // console.log("get route start position:", start_co, ", end position:", end_co);s
    let str_coordinates = '';
    for (let i = 0; i < in_way_points.length; i++){
        str_coordinates += in_way_points[i].coordinates[0] + ',' + in_way_points[i].coordinates[1];
        if(i != in_way_points.length - 1){
            str_coordinates += ';';
        }
    }
    console.log("str_coordinates:", str_coordinates);
    var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + str_coordinates + '?steps=true&geometries=geojson&exclude=motorway&language=ja&access_token=' + mapboxgl.accessToken;

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

        // get the sidebar and add the instructions
        var instructions = document.getElementById('instructions');
        var steps = data.legs[0].steps;

        var tripInstructions = [];
        for (var i = 0; i < steps.length; i++) {
            // tripInstructions.push('<br><li>' + steps[i].maneuver.instruction) + '</li>';
            instructions.innerHTML = '<br><span class="distance">Trip distance: ' + Math.floor(data.distance / 1000) + ' km 🚴 </span>' + tripInstructions;
        }
        console.log(route);
        // console.log(geojson);
        // if the route already exists on the map, reset it using setData
        if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
            for(let i = 0; i < route.length; i++){
                getElevation(route[i][0], route[i][1]);
            }
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
        let ele = JSON.parse(this.response);
        console.log("elevation:", ele.elevation); // 通信結果を出力します。
        //標高チャート作成
        data.series[0].push(Number(ele.elevation));
        new Chartist.Line('.ct-chart', data, options);
    }, false);
}

map.on('load', function () {
    console.log("load event!");

    // make an initial directions request that
    // starts and ends at the same location
    getRoute([start = { coordinates : [139.220500, 35.427528]}, end = { coordinates :[139.220500, 35.427528]}]);

    
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
                            coordinates: way_points[0].coordinates
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
        getRoute(way_points[0].coordinates, way_points[1].coordinates);
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
});

map.on('click', function (e) {
    var coordsObj = e.lngLat;
    canvas.style.cursor = '';
    var coords = Object.keys(coordsObj).map(function (key) {
        return coordsObj[key];
    });
    console.log("clicked!!", click_times, " times");

    let point = {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: coords,
            }
        }
        ],
        elevation: 0,
    };

    let way_point = {
        coordinates : coords,
    }

    way_points.push(way_point);

    if (map.getLayer('start')) {
        map.getSource('start').setData(point);
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
                            coordinates: way_point.coordinates
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
            map.getSource('end').setData(way_points[1]);
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
                                coordinates: way_points[1].coordinates
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
        getIso(20, "iso20", way_point.coordinates);
        getIso(40, "iso40", way_point.coordinates);
        getIso(60, "iso60", way_point.coordinates);
    }
    if (click_times >= 2) {
        getRoute(way_points);
        getIso(20, "iso20", way_points[click_times-1].coordinates);
        getIso(40, "iso40", way_points[click_times-1].coordinates);
        getIso(60, "iso60", way_points[click_times-1].coordinates);
    }
});
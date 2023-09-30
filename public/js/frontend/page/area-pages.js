kvCORE.Area_Pages = (new function($, kv, config) {

    function listings_button(polygon_key){
        var propertiesPage = kv.Config.get('pages', 'properties');
        var url = propertiesPage + '?perRow=auto&limit=24&polygonKey=county%3A' + polygon_key + '&page=1&limited=true&layout=map';

        $(".kv-listing-button").attr("href", url);

    }

    function renderListings(){ 
            var polygon_key = jQuery('.kv-listing-button').data('key');
            var geo_key = jQuery('.kv-listing-button').data('geo');
            var params = {};
            params.polygonKey2 = 'county:' + polygon_key;
            listings_button(geo_key);
            kvCORE.Remote.get('public/listings', params, function (data) {
                if ('undefined' !== typeof (data.data) && 'function' === typeof (data.data.map)) {
                    data.data.map(kvCORE.Property.addCustomData);
                }

                data.notShowSold = false;
                
                //listings_button(listing_data);
                kvCORE.View.render('properties-listings', data, jQuery(".kv-area-page-area-listings"), null);
                $('.kv-area-page-area-listings a.kv-box-footer-item.kv-small.add-favorite').click(function(e) {
                    e.preventDefault();
                    console.log(data);
            
                    if (kv.User.getLeadId()) {
                        kv.Property.addFavoriteCallback.apply(this);
                    } else {
                        var mls = $(this).data('mls');
                        var mlsid = $(this).data('mls_id');
                        var propertySelector = '.add-favorite[data-mls_id="'+ mlsid +'"]';
            
                        kv.Login.loginQueue.add({obj: 'Properties', method: 'addListingToFavoriteAfterLogin'}, propertySelector);
            
                        config.query['by-mls'] = mls;
                        config.query['by-mlsid'] = mlsid;
            
                        kv.Login.showModal();
                    }
                });
                $('.kv_view_all').addClass('d-block et_pb_button btn-spark');
            });
    }

    function mapbox(){
        mapboxgl.accessToken = jQuery('#kv-hero-mapbox').data('key');
        var coordinates = jQuery('#kv-hero-mapbox').data('coordinates');
        var center = jQuery('#kv-hero-mapbox').data('center');
        var branding = jQuery('#kv-hero-mapbox').data('branding');
        var map = new mapboxgl.Map({
            container: 'kv-hero-mapbox',
            style: 'mapbox://styles/mapbox/streets-v11',
            center: center,
            zoom: 12
        });

        map.on('load', function() {
            map.addSource('maine', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [ coordinates
                        ]
                    }
                }
            });
            map.addLayer({
                'id': 'maine',
                'type': 'fill',
                'source': 'maine',
                'layout': {},
                'paint': {
                    'fill-color': branding,
                    'fill-opacity': 0.8
                }
            });
            var allLat = coordinates.map(function(cords) { return cords[0] });
            var allLng = coordinates.map(function(cords) { return cords[1] });
            var latMin = Math.min.apply(map, allLat);
            var lngMin = Math.min.apply(map, allLng);
            var latMax = Math.max.apply(map, allLat);
            var lngMax = Math.max.apply(map, allLng);
            var mapBounds = [
            [latMin, lngMin],
            [latMax, lngMax]
            ];
            map.fitBounds(mapBounds, {
                padding: 20
            });
        });
        map.scrollZoom.disable();
    }

    function market_chart(){
        var new_listings = jQuery('#kv-area-market').data('listings');
        var reductions = jQuery('#kv-area-market').data('reductions');
        var foreclosures = jQuery('#kv-area-market').data('foreclosures');
        var short_sale = jQuery('#kv-area-market').data('shortsales');


        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];
        var today = new Date()
        var d;
        var month;
        var labels = [];
        for(var i = 6; i > 0; i -= 1) {
        d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        month = monthNames[d.getMonth()];
        labels.push(month); 
        }
        var ctx = document.getElementById("marketHealth").getContext('2d');
        var myChart = new Chart(ctx, {
            type: 'line',
            data: {
            labels: labels,
            datasets: [
            {
                label: 'New Listings', // Name the series
                data: new_listings, // Specify the data values array
                fill: false,
                borderColor: '#22546E', // Add custom color border (Line)
                backgroundColor: '#22546E', // Add custom color background (Points and Fill)
                borderWidth: 4 // Specify bar border width
            },
            {
                label: 'Reductions', // Name the series
                data: reductions, // Specify the data values array
                fill: false,
                borderColor: '#33A02C', // Add custom color border (Line)
                backgroundColor: '#33A02C', // Add custom color background (Points and Fill)
                borderWidth: 4 // Specify bar border width
            },
            {
                label: 'Foreclosures', // Name the series
                data: foreclosures, // Specify the data values array
                fill: false,
                borderColor: '#B2DF8A', // Add custom color border (Line)
                backgroundColor: '#B2DF8A', // Add custom color background (Points and Fill)
                borderWidth: 4 // Specify bar border width
            },
            {
                label: 'Shortsales', // Name the series
                data: short_sale, // Specify the data values array
                fill: false,
                borderColor: '#A6CEE3', // Add custom color border (Line)
                backgroundColor: '#A6CEE3', // Add custom color background (Points and Fill)
                borderWidth: 4 // Specify bar border width
            },
            ]},
            options: {
            responsive: true, // Instruct chart js to respond nicely.
            maintainAspectRatio: false, // Add to prevent default behaviour of full-width/height 
            legend: {
                    display: true,
                    position: "top",
                    align: "start",
                    boxWidth: 10
                },
            }
        });
    }

    function set_quicklinks(){
        var propertiesPage = kv.Config.get('pages', 'properties');
        var polygon_key = jQuery('.kv-listing-button').data('geo');
        var just_listed_url = propertiesPage + '?polygonKey=county%3A' + polygon_key + '&options=justListed&page=1&limited=true&layout=map';
        var luxury_url = propertiesPage + '?polygonKey=county%3A' + polygon_key + '&priceMin=500000&order=price%7Cdesc&page=1&limited=true&layout=map';
        var open_house_url = propertiesPage + '?polygonKey=county%3A' + polygon_key + '&options=openHouse&page=1&limited=true&layout=map';
        var popular_homes_url = propertiesPage + '?polygonKey=county%3A' + polygon_key + '&order=visits%7Cdesc&page=1&limited=true&layout=map';

        $("#just-listed").attr("href", just_listed_url);
        $("#luxury-homes").attr("href", luxury_url);
        $("#open-houses").attr("href", open_house_url);
        $("#popular-homes").attr("href", popular_homes_url);

    }

    function processPolygon(polygons) {
        console.log(polygons);
        var polygons = polygons.toString();
        var poly = polygons.replace(/[^A-Za-z,0-9.-]/g, "");
        
		if(polygons){
			var polyCount = 0;
			var polyArray = poly.split(',');
			polygon = [[]];
			//When a polygon comes over from search alerts, it's in a single array with long then lat. Just reformatting here to how the plugin handles it.
			for(var i = 0; i < polyArray.length; i+=2){
				polygon[0][polyCount++] = {
					lat: polyArray[i + 1],
					lon: polyArray[i]
				};
			}
		}
        return polygon;
    }
    
    var area_pages_init = document.getElementById("area-page");
    

    if (area_pages_init){
        market_chart();
        renderListings();
        set_quicklinks();
        mapbox();
        
    }
   
    
} (jQuery, kvCORE, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : {}) );
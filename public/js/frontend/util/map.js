kvCORE.Map = (new function($, mb, mbDraw, mbGeo, kv) {
	var mapsMarkers = {};
	var mapsOpenedPopups = {};
	var draw;
	var MAP_SOURCE_ID = 'records';
	var MAP_CLUSTER_CIRCLE_LAYER = 'cluster-circles';
	var MAP_CLUSTER_SYMBOL_LAYER = 'cluster-symbols';
	var allMarkers = {};
	var drawnMarkers = [];
	var debounceWheelEvent = debounce(debounceMapBounds, 2000);

	function self() {
		return kvCORE.Map;
	}

	this.generateMap = function(targetId, args, controls) {
		if (typeof controls === 'undefined') {
			controls = {zoom: true};
		}

		var map = generateMapByArgs(targetId, args);
		
		if (map) {
			if (controls.zoom === true) {
				map.addControl(getNavigationControl());
			}

			if (!kv.isEmpty(controls.geocoder)) {
				addGeocoder(map, controls.geocoder);
			}

			if (!kv.isEmpty(controls.polygon)) {
				addPolygon(map, controls.polygon);
			}

			if (!kv.isEmpty(controls.drive) && controls.drive.enabled) {
				map.addControl(controls.drive.control, controls.drive.config.position);
			}
			if (controls.disableScroll === true) {
				map.scrollZoom.disable();
			}
		}

		return map;
	};

	this.generateMapWithMarker = function(lat, lng, price, targetId, args, controls) {
		if (typeof controls === 'undefined') {
			controls = {zoom: true};
		}

		var map = generateMapByMarkers(lat, lng, targetId, args);

		if (map) {
			if (price) {
				var marker = getMapboxMarker(lat, lng, price);
				marker.addTo(map);
			}
			

			if (controls.zoom === true) {
				map.addControl(getNavigationControl());
			}

			if (!kv.isEmpty(controls.geocoder)) {
				addGeocoder(map, controls.geocoder);
			}

			if (!kv.isEmpty(controls.polygon)) {
				addPolygon(map, controls.polygon);
			}

			if (!kv.isEmpty(controls.fullscreen)) {
				map.addControl(getFullScreenControl());
			}

			if (!kv.isEmpty(controls.drive) && controls.drive.enabled) {
				map.addControl(controls.drive.control, controls.drive.config.position);
			}
		}

		return map;
	};

	/**
	 * @param {Object} markers {
     *      lat: {Number},
     *      lng: {Number},
     *      popupData: {Object}
     *  }
	 * @param {String} targetId
	 * @param {Object} args
	 * @param {Object} controls
	 * @returns {Map}
	 */
	//hits this on page load no on update
	this.generateMapWithMarkers = function(markers, targetId, args, controls) {
		if (typeof controls === 'undefined') {
			controls = {zoom: true};
		}
		
		var allLat = markers.map(function(marker) { return marker.lat });
		var allLng = markers.map(function(marker) { return marker.lng; });

		var latsMedian = median(allLat);
		var lngsMedian = median(allLng);
		var latMin = Math.min.apply(self(), allLat);
		var lngMin = Math.min.apply(self(), allLng);
		var latMax = Math.max.apply(self(), allLat);
		var lngMax = Math.max.apply(self(), allLng);
		var mapBoundsMargin = (Math.abs(Math.abs(latMin) - Math.abs(latMax)) + Math.abs(Math.abs(lngMin) - Math.abs(lngMax))) / 15;
		var mapBounds = [
			[lngMin - mapBoundsMargin, latMin - mapBoundsMargin],
			[lngMax + mapBoundsMargin, latMax + mapBoundsMargin]
		];

		args = $.extend(args, {center: [lngsMedian, latsMedian]});

		var map = generateMapByArgs(targetId, args);
		if (map) {
			map.on('moveend', function (event) {
				return onMapMoveEnd(map, event);
			});
			map.on('click', MAP_CLUSTER_CIRCLE_LAYER, function (event) {
				return onMapClusterClick(map, event);
			});
			map.on('mouseenter', MAP_CLUSTER_CIRCLE_LAYER, function (event) {
				return map.getCanvas().style.cursor = 'pointer';
			});
			map.on('mouseleave', MAP_CLUSTER_CIRCLE_LAYER, function (event) {
				return map.getCanvas().style.cursor = '';
			});
			map.fitBounds(mapBounds);
			mapsOpenedPopups[map.getContainer().id] = [];
			map.on('load', function() {
				addMarkerCollectionToMap(map, markers);
			});
		}

		if (controls.zoom === true) {
			map.addControl(getNavigationControl());
		}

		if (!kv.isEmpty(controls.geocoder)) {
			addGeocoder(map, controls.geocoder);
		}

		if (!kv.isEmpty(controls.polygon)) {
			if (controls.polygonType) {
				controls.polygonType === 'multipolygon' ? addGeoJsonPolygon(map, controls.polygon) : addPolygonOnPageLoad(map, controls.polygon);	
			} else {
				addPolygon(map, controls.polygon);
			}
					
		}

		if (!kv.isEmpty(controls.drive) && controls.drive.enabled) {
			map.addControl(controls.drive.control, controls.drive.config.position);
		}

		if (controls.enableScroll === true) {
			map.scrollZoom.enable();
			// a change of viewing area drag or zoom should trigger loading of properties only in those bounds
			map.on('dragend', function (event) {
				return getMapBounds(map);
			});
			map.on('wheel', function (event) {
				debounceWheelEvent(map);
			});
		} else {
			map.scrollZoom.disable();
		}

		return map;
	};
	//hits this when search is executed not on initial load
	this.updateMap = function(map, markers, coordinates, polygonType) {
		var markersToRemove = mapsMarkers[map.getContainer().id];
		if (markersToRemove) {
			Object.keys(markersToRemove).map(function(markerId) {
				markersToRemove[markerId].remove();
			});
		}

		if (kv.isEmpty(markers)) {
			return map;
		}

		var allLat = markers.map(function(marker) { return marker.lat });
		var allLng = markers.map(function(marker) { return marker.lng; });

		var latsMedian = median(allLat);
		var lngsMedian = median(allLng);
		var latMin = Math.min.apply(self(), allLat);
		var lngMin = Math.min.apply(self(), allLng);
		var latMax = Math.max.apply(self(), allLat);
		var lngMax = Math.max.apply(self(), allLng);
		var mapBoundsMargin = (Math.abs(Math.abs(latMin) - Math.abs(latMax)) + Math.abs(Math.abs(lngMin) - Math.abs(lngMax))) / 15;
		var mapBounds = [
			[lngMin - mapBoundsMargin, latMin - mapBoundsMargin],
			[lngMax + mapBoundsMargin, latMax + mapBoundsMargin]
		];
		map.fitBounds(mapBounds);
		addMarkerCollectionToMap(map, markers);
		if (!kv.isEmpty(coordinates)) {
			if (polygonType) {
				polygonType === 'multipolygon' ? addGeoJsonPolygon(map, coordinates) : addPolygonAfterLoad(map, coordinates);;	
			} else {
				addPolygonAfterLoad(map, coordinates);
			}
			
		}
		return map;
	};

	function debounceMapBounds(map) {
		getMapBounds(map);
	}

	function generateMapByArgs(targetId, args) {
		if (!mb) {
			return null;
		}

		mb.accessToken = kv.Config.get('mapsApi');

		if ('object' !== typeof(args)) {
			args = {};
		}
		if ('string' === typeof(targetId)) {
			args.container = targetId;
		}
		if ('number' === typeof(args.zoomLevel)) {
			args.zoom = args.zoomLevel;
		}
		if ('undefined' === typeof(args.zoom)) {
			args.zoom = 9;
		}
		if ('undefined' === typeof(args.style)) {
			args.style = 'mapbox://styles/mapbox/streets-v9';
		}
		if ('undefined' === typeof(args.center)) {
			args.center = [0, 0];
		}
		if ('undefined' === typeof(args.scrollZoom)) {
			args.scrollZoom = false;
		}

		var map = new mb.Map(args);

		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();

		return map;
	}

	function generateMapByMarkers(lat, lng, targetId, args) {
		if('number' === typeof(lat) && 'number' === typeof(lng) && 'string' === typeof(targetId)) {
			if('object' !== typeof(args)){
				args = {};
			}
			
			args.center = [ lng, lat ];

			return generateMapByArgs(targetId, args);
		}

		return null;
	}

	function createMapMarker(map, marker) {
		mapsMarkers[map.getContainer().id] = [];
		var element = createMapMarkerIcon(marker);
		var coords = [marker.lng, marker.lat];
		if ('undefined' !== typeof(marker.popupData)) {
			kv.View.load(marker.popupData.template, marker.popupData, function(popupHtml) {
				mapsMarkers[map.getContainer().id][marker.popupData.id] = new mb.Marker(element)
					.setLngLat(coords)
					.setPopup(new mb.Popup(marker.popupData.popupOptions).setHTML(popupHtml));
				var markerElement = mapsMarkers[map.getContainer().id][marker.popupData.id].getElement();
				markerElement.addEventListener("click", function() {
					var filter = { size: 1, from: 0 }
					var params = kv.Config.get('request', 'args');
					var isOnMarket = params.sold === '1' ? false : true;
					var body = '{"query":{"bool":{"filter":{"bool":{"must":[{"term":{"mlsid":"'+marker.popupData.id+'"}},{"term":{"mls":"'+marker.popupData.mls+'"}},{"match":{"is_on_market":'+isOnMarket+'}}]}}}}}';
					var query = '{listings(filter: { size: $size, from: $from, body: $body }) {listings { mls mlsid baths halfbaths beds address city state footage zip agentname brokername } } }';
					var stringifyBody = body.replace(/"/g, '\\\"');
					stringifyBody = '"' + stringifyBody + '"';
					var finalQuery = query.replace('$from', 0).replace('$size', 1).replace('$body', stringifyBody);
					$.ajax({
						url: 'https://listing-api.kvcore.com/graphql',
						type: 'POST',
						dataType: 'json',
						contentType: 'application/json',
						data: JSON.stringify({ query: finalQuery }),
						beforeSend: function(jqXHR) {
							jqXHR.setRequestHeader('Authorization', kv.Config.get('listingApi'));
						},
						success: function(response) {
							var popupData = $.extend({}, response.data.listings.listings[0], marker.popupData);
							fillPopupData(popupData);
						},
						error: function(jqXHR) {
							console.log("error getting listing", jqXHR);
						}
					});
				});
			});

			return mapsMarkers[map.getContainer().id][marker.popupData.id];
		}
	}

	function addMarkerCollectionToMap(map, markers) {
		allMarkers = markers.reduce(function(markersMap, properties){
			var marker = createMapMarker(map, properties);
			markersMap[properties.popupData.id] = marker;
			return markersMap;
		}, {});
		
		if (map.getSource(MAP_SOURCE_ID)) {
			map.removeLayer(MAP_CLUSTER_SYMBOL_LAYER);
			map.removeLayer(MAP_CLUSTER_CIRCLE_LAYER);
			map.removeSource(MAP_SOURCE_ID);
		}

		map.addSource(MAP_SOURCE_ID, createMapClusterMarkersSource(markers));
		map.addLayer(createMapClustersLayer(MAP_CLUSTER_CIRCLE_LAYER, MAP_SOURCE_ID));
		map.addLayer(createMapClusterCountsLayer(MAP_CLUSTER_SYMBOL_LAYER, MAP_SOURCE_ID));
		
		var bounds = createMapMarkersBounds(markers);
		map.fitBounds(bounds, {
			padding: 120
		});
		redrawMarkers(map);
	}

	function onMapMoveEnd(map, event) {
		if (!map.getSource(MAP_SOURCE_ID) || !map.isSourceLoaded(MAP_SOURCE_ID)) {
		  return;
		}
		redrawMarkers(map);
	}

	function onMapClusterClick(map, event) {
		var features = map.queryRenderedFeatures(event.point, {
		  layers: [MAP_CLUSTER_CIRCLE_LAYER]
		});
		var clusterId = features[0].properties.cluster_id;
		map.getSource(MAP_SOURCE_ID).getClusterExpansionZoom(clusterId, function (error, zoom) {
			if (error) {
				return;
			}
		
			map.easeTo({
				center: features[0].geometry.coordinates,
				zoom: zoom
			});
		});
	  }

	function redrawMarkers(map) {
		//there was a bug that timeout gets around where pins don't have time to render
		setTimeout(function() { 
			var unclusteredMarkers = getUnclusteredMarkers(map);
			var addedMarkers = unclusteredMarkers.filter(function (marker) {
				return !drawnMarkers.includes(marker);
			});
			addedMarkers.forEach(function (marker) {
				return marker.addTo(map);
			});
			var removedMarkers = drawnMarkers.filter(function (marker) {
				return !unclusteredMarkers.includes(marker);
			});
			removedMarkers.forEach(function (marker) {
				return marker.remove();
			});
			drawnMarkers = unclusteredMarkers;
		}, 200);
	  }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function getUnclusteredMarkers(map) {
		return [].concat(_toConsumableArray(map.querySourceFeatures(MAP_SOURCE_ID).reduce(function (documentIds, feature) {
			var document = JSON.parse(feature.properties.popupData || null);

			if (document) {
					documentIds.add(document.id);
			}

			return documentIds;
		}, new Set()))).map(function (documentId) {
			return allMarkers[documentId];
		});
	}

	function fillPopupData(data) {
		var $popupContainer = $('.mapboxgl-popup .kv-map-popup');
		var link = kv.Property.getUrl(data);
		$('#kv-map-popup-link').attr("href", link);
		$popupContainer.find('.kv-map-popup-address-wrapper .address').html(data.address);
		var otherTxt = data.beds+' bed '+data.baths+'/'+data.halfbaths+' bath '+data.footage+' sqft';
		$popupContainer.find('.kv-map-popup-address-wrapper .other-info').html(otherTxt);
		var attribution = '';
		if (data.addtoresults == 15) {
			attribution = 'Courtesy of '+data.brokername;
		} else if (data.addtoresults == 1) {
			attribution = data.brokername;
		} else if (data.addtoresults == 2) {
			attribution = data.brokername+' ACT #'+data.mlsid;
		} else if (data.addtoresults == 3) {
			attribution = data.brokername+' #'+data.mlsid;
		} else if (data.addtoresults == 4) {
			attribution = 'Courtesy of '+data.agentname+' of '+data.brokername;
		} else if (data.addtoresults == 5) {
			attribution = data.brokername+' = '+data.brokerphone;
		}
		$popupContainer.find('.kv-map-popup-disclaimer-wrapper').html(attribution);
	}

	function getMapboxMarker(lat, lng, price, className) {
		if (Array.isArray(className)) {
			className = className.join(' ');
		} else if ('string' !== typeof(className)) {
			className = "";
		}
		if (price) {
			var element = document.createElement('div');
			element.className = 'kv-marker';
			element.innerHTML = price;

			if (className) {
				element.className += ' ' + className;
			}
			return new mb.Marker(element)
			.setLngLat([lng, lat])
		}
	}

	function getMapBounds(map) {
		if (kv.Config.get('options', 'listings', 'enable_zoom_on_map') === "1") {
			var bounds = map.getBounds().toArray();
			kv.Properties.passTheMapBounds(bounds);
		}
	}

	this.scaleMarker = function(map, markerId) {
		closePopups(map);
		var marker = findMarker(map, markerId);
		if (!isMarkerInBounds(map, marker)) {
			map.easeTo({
				center: marker.getLngLat(),
				zoom: 9
			});
		}
		$(marker.getElement()).addClass('kv-marker-scaled');
	};

	this.unscaleMarker = function(map, markerId) {
		$(findMarker(map, markerId).getElement()).removeClass('kv-marker-scaled');
	};

	this.zoomToMarker = function(map, markerId) {
		var marker = findMarker(map, markerId);
		map.setCenter(marker.getLngLat())
			.zoomTo(15);

		if (!marker.getPopup().isOpen()) {
			mapsOpenedPopups[map.getContainer().id].push(markerId);
			marker.togglePopup();
		}
	};

	function removeDrivingLayer(map) {
		var fillLayer = map.getLayer('drivingtimelayerfill');
		console.log(fillLayer);
		if (typeof fillLayer !== 'undefined') { map.removeLayer('drivingtimelayerfill') }
		var lineLayer = map.getLayer('drivingtimelayerline');
		if (typeof lineLayer !== 'undefined') { map.removeLayer('drivingtimelayerline') }
		var source = map.getSource('drivingtime');
		if (typeof source !== 'undefined') { map.removeSource('drivingtime') }
	}

	this.removeDrivingLayer = function(map) {
		removeDrivingLayer(map);
	};

	function removeAreaPolygon(map) {
		if (map !== null) {
			var fillLayer = map.getLayer('polyafterloadfill');
			if (typeof fillLayer !== 'undefined') { map.removeLayer('polyafterloadfill') }
			var lineLayer = map.getLayer('polyafterloadline');
			if (typeof lineLayer !== 'undefined') { map.removeLayer('polyafterloadline') }
			var source = map.getSource('polyafterload');
			if (typeof source !== 'undefined') { map.removeSource('polyafterload') }
		}
		
	}

	this.removeAreaPolygon = function(map) {
		removeAreaPolygon(map);
	};

	this.loadDrivingTimePolygons = function(map, markers, drivingCoordinatesArray, duration) {
		removeDrivingLayer(map);
		var coordinatesArray = $.extend(true, [], drivingCoordinatesArray);
		coordinatesArray.forEach(function(polygon) {
			polygon.forEach(function(coordinate, coordinateIndex) {
				polygon[coordinateIndex] = [parseFloat(coordinate.lon), parseFloat(coordinate.lat)];
			});
		});
		
		map.addSource('drivingtime', {
			'type': 'geojson',
			'data': {
				'type': 'FeatureCollection',
				'features': [{
					'type': 'Feature',
					'geometry': {
						'type': 'Polygon',
						'coordinates': coordinatesArray
					}
				}]
			}
		});

		map.addLayer({
			'id': 'drivingtimelayerfill',
			'type': 'fill',
			'source': 'drivingtime',
			'paint': {
			'fill-color': '#000000',
			'fill-opacity': 0.2
			}
		});

		map.addLayer({
			'id': 'drivingtimelayerline',
			'type': 'line',
			'source': 'drivingtime',
			'layout': {},
			'paint': {
			'line-color': '#000000',
			'line-width': 2,
			'line-opacity':1
			}
		});

		var allLat = markers.map(function(marker) { return marker.lat; });
		var allLng = markers.map(function(marker) { return marker.lng; });
		var latMin = Math.min.apply(self(), allLat);
		var lngMin = Math.min.apply(self(), allLng);
		var latMax = Math.max.apply(self(), allLat);
		var lngMax = Math.max.apply(self(), allLng);
		var mapBoundsMargin = (Math.abs(Math.abs(latMin) - Math.abs(latMax)) + Math.abs(Math.abs(lngMin) - Math.abs(lngMax))) / 15;
		var mapBounds = [
			[lngMin - mapBoundsMargin, latMin - mapBoundsMargin],
			[lngMax + mapBoundsMargin, latMax + mapBoundsMargin]
		];

		map.fitBounds(mapBounds);
		map.panTo(map.getCenter());
		var zoomVal;
		switch (duration) {
			case '5':
				zoomVal = 13;
				break;
			case '10':
				zoomVal = 12;
				break;
			case '15':
				zoomVal = 11;
				break;
			case '20':
			case '25':
			case '30':
			case '35':
				zoomVal = 9;
				break;
			case '40':
			case '45':
				zoomVal = 8;
				break;
			case '50':
			case '55':
			case '60':
				zoomVal = 7;
				break;
			default:
				zoomVal = 9;
		}
		map.zoomTo(zoomVal);
	};	

	function findMarker(map, markerId) {
		var marker = mapsMarkers[map.getContainer().id][markerId];
		if (typeof marker !== 'undefined') {
			return marker;
		}
	}

	function closePopups(map) {
		var openedPopups = mapsOpenedPopups[map.getContainer().id];
		if (typeof openedPopups === 'undefined') {
			return;
		}

		var popupsToClose = mapsOpenedPopups[map.getContainer().id];
		popupsToClose.map(function(markerId) {
			var marker = findMarker(map, markerId);
			if (marker.getPopup().isOpen()) {
				marker.togglePopup();
			}
		});

		mapsOpenedPopups[map.getContainer().id] = [];
	}

	function isMarkerInBounds(map, marker) {
		var bounds = map.getBounds();
		var n = bounds.getNorth();
		var e = bounds.getEast();
		var s = bounds.getSouth();
		var w = bounds.getWest();

		var lng = marker.getLngLat().lng;
		var lat = marker.getLngLat().lat;

		return lat > s && lat < n && lng > w && lng < e;
	}

	function getNavigationControl() {
		return new mb.NavigationControl({ showCompass: false });
	}

	function getFullScreenControl() {
		return new mb.FullscreenControl();
	}

	function addGeocoder(map, controlsGeocoder) {
        var geocoder = new mbGeo($.extend(controlsGeocoder.config, {
			accessToken: kv.Config.get('mapsApi'),
			mapboxgl: mapboxgl
        }));

        if (!kv.isEmpty(controlsGeocoder.handleAddInCallback) && controlsGeocoder.handleAddInCallback === true) {
            map.addControl(geocoder);
        }

        if (typeof controlsGeocoder.callback === 'function') {
            controlsGeocoder.callback(geocoder, map)
        }
	}

	function addGeoJsonPolygon(map, controlsPolygon) {
		removeAreaPolygon(map);

		if (!kv.isEmpty(controlsPolygon.callbacks) && !kv.isEmpty(controlsPolygon.coordinates)) {
			var callbacks = controlsPolygon.callbacks;
			var coordinates = controlsPolygon.coordinates;
		} else {
			var coordinates = controlsPolygon;
		}
		draw = createDraw();

		if (Array.isArray(coordinates)) {
			//should only be on load when page is first loaded, a search bar result is different
			if (!kv.isEmpty(controlsPolygon.callbacks)) {
				map.on('load', function() {
					map.addControl(draw);
					map.addSource('polyafterload', {
						'type': 'geojson',
						'data': {
							'type': 'FeatureCollection',
							'features': [{
								'type': 'Feature',
								'geometry': {
									'type': 'Polygon',
									'coordinates': coordinates
								}
							}]
						}
					});	
					map.addLayer({
						'id': 'polyafterloadfill',
						'type': 'fill',
						'source': 'polyafterload',
						'paint': {
						  'fill-color': '#000000',
						  'fill-opacity': 0.2
						}
					});
					map.addLayer({
						'id': 'polyafterloadline',
						'type': 'line',
						'source': 'polyafterload',
						'layout': {},
						'paint': {
						  'line-color': '#000000',
						  'line-width': 2,
						  'line-opacity':1
						}
					});
				});

				map.on('draw.render', callbacks.render.bind(undefined, draw));
				map.on('draw.create', callbacks.create.bind(undefined, draw));
				map.on('draw.update', callbacks.update.bind(undefined, draw));
				map.on('draw.delete', callbacks.delete.bind(undefined, draw));
			} else {
				map.addSource('polyafterload', {
					'type': 'geojson',
					'data': {
						'type': 'FeatureCollection',
						'features': [{
							'type': 'Feature',
							'geometry': {
								'type': 'Polygon',
								'coordinates': coordinates
							}
						}]
					}
				});	
				map.addLayer({
					'id': 'polyafterloadfill',
					'type': 'fill',
					'source': 'polyafterload',
					'paint': {
						'fill-color': '#000000',
						'fill-opacity': 0.2
					}
				});
				map.addLayer({
					'id': 'polyafterloadline',
					'type': 'line',
					'source': 'polyafterload',
					'layout': {},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity':1
					}
				});
			}
			
					
		}

	}

	function createDraw() {
		draw = new mbDraw({
			displayControlsDefault: false,
			controls: {
				polygon: true,
				trash: true
			},
			styles: [
				// default themes provided by MB Draw	
				{
					'id': 'gl-draw-polygon-fill-inactive',
					'type': 'fill',
					'filter': ['all', ['==', 'active', 'false'],
						['==', '$type', 'Polygon'],
						['!=', 'mode', 'static']
					],
					'paint': {
						'fill-color': '#000000',
						'fill-outline-color': '#000000',
						'fill-opacity': 0.2
					}
				},
				{
					'id': 'gl-draw-polygon-fill-active',
					'type': 'fill',
					'filter': ['all', ['==', 'active', 'true'],
						['==', '$type', 'Polygon']
					],
					'paint': {
						'fill-color': '#000000',
						'fill-outline-color': '#000000',
						'fill-opacity': 0.2
					}
				},
				{
					'id': 'gl-draw-polygon-midpoint',
					'type': 'circle',
					'filter': ['all', ['==', '$type', 'Point'],
						['==', 'meta', 'midpoint']
					],
					'paint': {
						'circle-radius': 3,
						'circle-color': '#fbb03b'
					}
				},
				{
					'id': 'gl-draw-polygon-stroke-inactive',
					'type': 'line',
					'filter': ['all', ['==', 'active', 'false'],
						['==', '$type', 'Polygon'],
						['!=', 'mode', 'static']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-polygon-stroke-active',
					'type': 'line',
					'filter': ['all', ['==', 'active', 'true'],
						['==', '$type', 'Polygon']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-line-inactive',
					'type': 'line',
					'filter': ['all', ['==', 'active', 'false'],
						['==', '$type', 'LineString'],
						['!=', 'mode', 'static']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-line-active',
					'type': 'line',
					'filter': ['all', ['==', '$type', 'LineString'],
						['==', 'active', 'true']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
					'type': 'circle',
					'filter': ['all', ['==', 'meta', 'vertex'],
						['==', '$type', 'Point'],
						['!=', 'mode', 'static']
					],
					'paint': {
						'circle-radius': 5,
						'circle-color': '#fff'
					}
				},
				{
					'id': 'gl-draw-polygon-and-line-vertex-inactive',
					'type': 'circle',
					'filter': ['all', ['==', 'meta', 'vertex'],
						['==', '$type', 'Point'],
						['!=', 'mode', 'static']
					],
					'paint': {
						'circle-radius': 3,
						'circle-color': '#fbb03b'
					}
				},
				{
					'id': 'gl-draw-point-point-stroke-inactive',
					'type': 'circle',
					'filter': ['all', ['==', 'active', 'false'],
						['==', '$type', 'Point'],
						['==', 'meta', 'feature'],
						['!=', 'mode', 'static']
					],
					'paint': {
						'circle-radius': 5,
						'circle-opacity': 1,
						'circle-color': '#fff'
					}
				},
				{
					'id': 'gl-draw-point-inactive',
					'type': 'circle',
					'filter': ['all', ['==', 'active', 'false'],
						['==', '$type', 'Point'],
						['==', 'meta', 'feature'],
						['!=', 'mode', 'static']
					],
					'paint': {
						'circle-radius': 3,
						'circle-color': '#3bb2d0'
					}
				},
				{
					'id': 'gl-draw-point-stroke-active',
					'type': 'circle',
					'filter': ['all', ['==', '$type', 'Point'],
						['==', 'active', 'true'],
						['!=', 'meta', 'midpoint']
					],
					'paint': {
						'circle-radius': 7,
						'circle-color': '#fff'
					}
				},
				{
					'id': 'gl-draw-point-active',
					'type': 'circle',
					'filter': ['all', ['==', '$type', 'Point'],
						['!=', 'meta', 'midpoint'],
						['==', 'active', 'true']
					],
					'paint': {
						'circle-radius': 5,
						'circle-color': '#fbb03b'
					}
				},
				{
					'id': 'gl-draw-polygon-fill-static',
					'type': 'fill',
					'filter': ['all', ['==', 'mode', 'static'],
						['==', '$type', 'Polygon']
					],
					'paint': {
						'fill-color': '#000000',
						'fill-outline-color': '#000000',
						'fill-opacity': 0.2
					}
				},
				{
					'id': 'gl-draw-polygon-stroke-static',
					'type': 'line',
					'filter': ['all', ['==', 'mode', 'static'],
						['==', '$type', 'Polygon']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-line-static',
					'type': 'line',
					'filter': ['all', ['==', 'mode', 'static'],
						['==', '$type', 'LineString']
					],
					'layout': {
						'line-cap': 'round',
						'line-join': 'round'
					},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-point-static',
					'type': 'circle',
					'filter': ['all', ['==', 'mode', 'static'],
						['==', '$type', 'Point']
					],
					'paint': {
						'circle-radius': 5,
						'circle-color': '#404040'
					}
				},
	
				// end default themes provided by MB Draw
				// new styles for toggling colors
	
				{
					'id': 'gl-draw-polygon-color-picker',
					'type': 'fill',
					'filter': ['all', ['==', '$type', 'Polygon'],
						['has', 'user_portColor']
					],
					'paint': {
						'fill-color': ['get', 'user_portColor'],
						'fill-outline-color': ['get', 'user_portColor'],
						'fill-opacity': 0.2
					}
				},
				{
					'id': 'gl-draw-line-color-picker',
					'type': 'line',
					'filter': ['all', ['==', '$type', 'LineString'],
						['has', 'user_portColor']
					],
					'paint': {
						'line-color': ['get', 'user_portColor'],
						'line-width': 2,
						'line-opacity': 0.8
					}
				},
				{
					'id': 'gl-draw-point-color-picker',
					'type': 'circle',
					'filter': ['all', ['==', '$type', 'Point'],
						['has', 'user_portColor']
					],
					'paint': {
						'circle-radius': 3,
						'circle-color': ['get', 'user_portColor']
					}
				},
	
			]
		});
		return draw;
	}

	function clearAllDrawnPolygons() {
		try { 
		  draw.deleteAll();
		} catch (error) { 
		  //failsafe way
		};
	}

	this.clearAllDrawnPolygons = function() {
		clearAllDrawnPolygons();
	}

	function addPolygon(map, controlsPolygon) {
		var callbacks = controlsPolygon.callbacks;
		var coordinates = controlsPolygon.coordinates;
		draw = createDraw();

		if (Array.isArray(coordinates)) {
			map.on('load', function() {
				map.addControl(draw);
				var coordinatesArray = $.extend(true, [], coordinates);
				coordinatesArray.forEach(function(polygon, polygonIndex) {
					polygon.forEach(function(coordinate, coordinateIndex) {
						polygon[coordinateIndex] = [parseFloat(coordinate.lon), parseFloat(coordinate.lat)];
					});

					var feature = {
						id: 'queryPolygon' + polygonIndex,
						type: 'Feature',
						properties: {},
						geometry: {
							type: 'Polygon', 
							coordinates: [polygon]
						},
						paint: {
							'line-color': '#000000',
							'line-width': 2,
							'line-opacity': 0.8
						}
					};

					draw.add(feature);
				});
			});	

			map.on('draw.render', callbacks.render.bind(undefined, draw));
			map.on('draw.create', callbacks.create.bind(undefined, draw));
			map.on('draw.update', callbacks.update.bind(undefined, draw));
			map.on('draw.delete', callbacks.delete.bind(undefined, draw));			
		}
	}

	function addPolygonOnPageLoad(map, controlsPolygon) {
		removeAreaPolygon(map);

		var callbacks = controlsPolygon.callbacks;
		var coordinates = controlsPolygon.coordinates;
		draw = createDraw();
		var cor = [coordinates];

		if (Array.isArray(coordinates)) {
			map.on('load', function() {
				map.addControl(draw);
				map.addSource('polyafterload', {
					'type': 'geojson',
					'data': {
						'type': 'Feature',
						'geometry': {
							'type': 'Polygon',
							'coordinates': cor
						}
					}
				});
				map.addLayer({
					'id': 'polyafterloadfill',
					'type': 'fill',
					'source': 'polyafterload',
					'layout': {},
					'paint': {
						'fill-color': '#000000',
						'fill-outline-color': '#000000',
						'fill-opacity': 0.2
					}
				});	

				map.addLayer({
					'id': 'polyafterloadline',
					'type': 'line',
					'source': 'polyafterload',
					'layout': {},
					'paint': {
						'line-color': '#000000',
						'line-width': 2,
						'line-opacity': 0.8
					}
				});	
			});

			map.on('draw.render', callbacks.render.bind(undefined, draw));
			map.on('draw.create', callbacks.create.bind(undefined, draw));
			map.on('draw.update', callbacks.update.bind(undefined, draw));
			map.on('draw.delete', callbacks.delete.bind(undefined, draw));		
		}
	}


	function addPolygonAfterLoad(map, coordinates) {
		removeAreaPolygon(map);

		var cor = [coordinates];

		if (Array.isArray(coordinates)) {
			map.addSource('polyafterload', {
				'type': 'geojson',
				'data': {
					'type': 'Feature',
					'geometry': {
						'type': 'Polygon',
						'coordinates': cor
					}
				}
			});
			map.addLayer({
				'id': 'polyafterloadfill',
				'type': 'fill',
				'source': 'polyafterload',
				'layout': {},
				'paint': {
					'fill-color': '#000000',
					'fill-outline-color': '#000000',
					'fill-opacity': 0.2
				}
			});	

			map.addLayer({
				'id': 'polyafterloadline',
				'type': 'line',
				'source': 'polyafterload',
				'layout': {},
				'paint': {
					'line-color': '#000000',
					'line-width': 2,
					'line-opacity': 0.8
				}
			});
		}
		
	}

	this.getLatLngFromAddress = function(data, success, error) {
		var hasOneKey = function(address) {
			if (Object.keys(address).length !== 1) {
				return;
			}

			Object.keys(address).map(function(key) {
				address[key] = maybeRemoveState(address[key]);
			});
		};

		var maybeRemoveState = function(areaName) {
			return (areaName.indexOf(',') !== -1 && areaName.indexOf(',') >= areaName.length - 5)
				? areaName.split(',')[0]
				: areaName;
		};

		if (Array.isArray(data.addresses)) {
			data.addresses.map(hasOneKey);
		} else {
			hasOneKey(data.addresses);
		}

		$.ajax({
			url: kv.Config.get('restNamespace') + 'get-lat-lng-from-address',
			type: 'POST',
			dataType: 'json',
			data: data,
			success: success,
			error: error
		});
	};

	function median(numbers) {
		// median of [3, 5, 4, 4, 1, 1, 2, 3] = 3
		var median = 0,
			numsLen = numbers.length;
		numbers.sort();
		if (numsLen % 2 === 0) { // is even
			// average of two middle numbers
			median = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
		} else { // is odd
			// middle number only
			median = numbers[(numsLen - 1) / 2];
		}
		return median;
	}
	
	function createMapMarkerIcon(properties) {
		var markerElement = document.createElement('div');
		markerElement.className = 'kv-marker';
		if (!properties.priceAbbreviated) {
			markerElement.innerHTML = properties.name;
		} else {
			markerElement.innerHTML = properties.priceAbbreviated;
		}
	
		return markerElement;
	}
	
	
	function createMapMarkersBounds(markers) {
		var bounds = new mb.LngLatBounds();
		markers.forEach(function(marker) {bounds.extend(new mb.LngLat(marker.lng, marker.lat))});
		return bounds;
	}
	
	function createMapMarkersGeoJson(markers) {
		return {
			type: 'FeatureCollection',
			features: markers.map(function(properties) {
				//object is too large to process remove this
				delete properties.popupData.kvcoreidx;
				return {
					type: 'Feature',
					geometry: {
						type: 'Point',
						//have to flip coords here because of geojson
						coordinates: [properties.lng, properties.lat],
					},
					properties: properties
				}
			})
		}
	}
	
	function createMapClusterMarkersSource(markers) {
	  return {
		type: 'geojson',
		data: createMapMarkersGeoJson(markers),
		cluster: true,
		clusterMaxZoom: 13,
		clusterRadius: 25
	  }
	}
	
	function createMapClustersLayer(id, source) {
		return {
			id: id,
			type: 'circle',
			source: source,
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': ['step', ['get', 'point_count'], '#000000', 100, '#000000', 750, '#000000'],
				'circle-radius': ['step', ['get', 'point_count'], 15, 100, 25, 750, 30],
				'circle-stroke-width': 5,
				'circle-stroke-opacity': 0.6
			}
		}
	}
	
	function createMapClusterCountsLayer(id, source) {
		return {
			id: id,
			type: 'symbol',
			source: source,
			filter: ['has', 'point_count'],
			layout: {
				'text-field': '{point_count_abbreviated}',
				'text-size': 13,
			},
			paint: {
				'text-color': '#ffffff'
			}
		}
	}

	function debounce(func, delay) {
		var timerId;

		return function() {
			var context = this;
			var args = arguments;

			clearTimeout(timerId);

			timerId = setTimeout(function() {
				func.apply(context, args);
			}, delay);
		};
	}
} (jQuery, typeof mapboxgl !== 'undefined' ? mapboxgl : null, typeof MapboxDraw !== 'undefined' ? MapboxDraw : null,
	typeof MapboxGeocoder !== 'undefined' ? MapboxGeocoder : null, kvCORE));
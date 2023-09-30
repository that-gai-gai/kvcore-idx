kvCORE.Properties = (new function($, kv, config) {
	var $propertiesPageContainer = $('#kvcoreidx-properties-page');
	var $marketReportModal = $('#modal--market-report');
	var $similarResultsPageContainer = $('#kv-detail-v2-similar');
	var defaultPropertiesNumber = 800;
	var listingsLoop = 1;

	$(".crawlable-paginator").on('click', function(event){
		window.location = window.location.href.split('?')[0] + "?paginate=" + event.target.value;
	});

	//conditional to make it not fire twice from detail page
	if ($propertiesPageContainer.length > 0) {
		kv.User.maybeAuthenticateViaURLToken(function () {
		});
	}

	var currentFilters = {};
	var shortcodeFilters = {};
	var manualListings = false;
	var forced = [];
	var firstLoad = true;
	var hasData = true;
	var mapLoaded = false;
	var propertiesFullList = {};
	var propertyMap = null;
	var currentLayout = null;
	var blocksLoaded = 0;
	var isHotsheet = false;
	var polygon = null;
	var drivePolygon = [[]];
	var loadDrivingTimePolygons = null;
	var allowedTypes = getSupportedTypes();

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass;

	var allowedFilters = {
		acresmax: 'acresMax',
		acresmin: 'acresMin',
		agents: 'agents',
		area: 'area',
		polygonkey: 'polygonKey',
		baths: 'baths',
		beds: 'beds',
		footagemax: 'footageMax',
		footagemin: 'footageMin',
		forcedfilters: 'forcedFilters',
		garagecapacity: 'garageCapacity',
		halfbaths: 'halfBaths',
		keywords: 'keywords',
		layout: 'layout',
		listingend: 'listingEnd',
		listingstart: 'listingStart',
		maxdaysonsite: 'maxDaysOnSite',
		maxyear: 'maxYear',
		mindaysonsite: 'minDaysOnSite',
		options: 'options',
		order: 'order',
		ourlistings: 'ourListings',
		ownerlistings: 'ownerListings',
		perrow: 'perRow',
		perpage: 'limit',
		polygon: 'polygon',
		mapbounds: 'mapbounds',
		pricemax: 'priceMax',
		pricemin: 'priceMin',
		propertyfeature: 'propertyFeature',
		propertystatus: 'propertyStatus',
		propertytypes: 'propertyTypes',
		propertyviews: 'propertyViews',
		searchstring: 'searchString',
		showallbutton: 'showAllButton',
		similarmls: 'similarMls',
		similarmlsid: 'similarMlsId',
		stories: 'stories',
		styles: 'styles',
		year: 'year',
		mlsids: 'mlsids',
		type: 'type',
		disable_reg: 'disable_reg',
		noreg: 'noreg',
		view_timing: 'view_timing',
		buildingstyles: 'buildingStyles',
		sold: 'sold',
		vowKey: 'vowKey',
		searchtype: 'searchtype',
		subtype: 'subType'
	};

	// List of filters to keep on search update (reload)
	var filtersToKeep = ['limit', 'perRow', 'layout', 'disable_reg', 'noreg', 'view_timing'];

	var nonApiFilters = [
		'forcedFilters', 'garageCapacity', 'layout', 'perRow',
		'propertyFeature', 'propertyViews', 'similarMls', 'similarMlsId',
		'stories', 'disable_reg', 'noreg', 'view_timing', 'vowKey', 'searchtype'
	];

	var firstLoadFilters = ['forcedFilters'];
	var firstLoadFilters = ['forcedFilters','mapbounds'];

	var additionalFilters = {
		acresmax: 'acresMax',
		acresmin: 'acresMin',
		agents: 'agents',
		beds: 'beds',
		baths: 'baths',
		footagemax: 'footageMax',
		footagemin: 'footageMin',
		garagecapacity: 'garageCapacity',
		keywords: 'keywords',
		maxdaysonsite: 'maxDaysOnSite',
		maxyear: 'maxYear',
		mindaysonsite: 'minDaysOnSite',
		options: 'options',
		pricemin: 'priceMin',
		pricemax: 'priceMax',
		propertyfeature: 'propertyFeature',
		propertystatus: 'propertyStatus',
		propertytypes: 'propertyTypes',
		propertyviews: 'propertyViews',
		stories: 'stories',
		styles: 'styles',
		year: 'year',
		ourlistings: 'ourListings',
		buildingstyles: 'buildingStyles',
		sold: 'sold'
	};

	var optionsInOtherFields = [
		'views', 'waterView', 'waterfront',
		'1story', '2story', '3story',
		'1garage', '2garage', '3garage'
	];

	var nonShortcodeFilters = ['page'];

	this.displayListings = displayListings;
	this.updateFilters = updateFilters;
	this.updateFilter = updateFilter;
	this.deleteFilter = deleteFilter;
	this.setFilters = setFilters;
	this.bind = bindProperties;

	/**
	 * render listings using specific filters
	 *
	 * if no filters passed, determine default
	 * filters based on:
	 * - URL params
	 * - defaultFilters passed to config
	 * - WP shortcode attributes
	 *
	 * @param filters
	 */
	function displayListings(filters) {
		if ('undefined' === typeof(filters) || !kv.isUsableObject(filters)) {
			// no filters passed to function, determine
			// filters we should used based on priority:
			// - defaultFilters lowest priority
			// - filters passed to WP shortcode (containerFilters),
			//   merge them with any default filters, REPLACING
			//   defaults with shortcode params
			// - if url params set, merge into above filters
			// - if none of the above are set, or are empty,
			//   use no filters
			currentFilters = {};
			var containerFilters = $propertiesPageContainer.data('filters');
			var configDefaultFilters = kv.getUsableObject(kv.Config.get('defaultFilters'));
			var selfContainerFilters = kv.getUsableObject(containerFilters);
			var configRequestArgs = kv.getUsableObject(kv.Config.get('request', 'args'));


			var queryArea = kv.Config.get('query', 'area');
			var queryAreas = kv.Config.get('query', 'areas');
			var polygonKey = kv.Config.get('query', 'polygonKey');
			var pakKey = kv.Config.get('query', 'pak');
			var priceMin = kv.Config.get('query', 'min');
			var priceMax = kv.Config.get('query', 'max');
			var acresMax = kv.Config.get('query', 'maxacres');
			var acresMin = kv.Config.get('query', 'minacres');
			var footageMin = kv.Config.get('query', 'minfootage');
			var footageMax = kv.Config.get('query', 'maxfootage');
			var propertyTypes = kv.Config.get('query', 'types');
			var sold = kv.Config.get('query', 'sold');
			var options = kv.Config.get('query', 'options');
			var mlsids = kv.Config.get('query', 'mlsids');
			var showalerts = kv.Config.get('query', 'showalerts');
			var kvkey = kv.Config.get('query', 'key');
			var type = kv.Config.get('query', 'type');
			var disable_reg = kv.Config.get('query', 'disable_reg');
			var ourListings = kv.Config.get('query', 'ourListings');
			var noreg = kv.Config.get('query', 'noreg');
			var view_timing = kv.Config.get('query', 'view_timing');
			var keywords = kv.Config.get('query', 'keywords');
			var vowKey = kv.Config.get('query', 'vowKey');
			var searchtype = kv.Config.get('query', 'searchtype');
			var subType = kv.Config.get('query', 'subType');

			if (disable_reg) {
				kv.Cookie.delete('disable_reg');
				kv.Cookie.delete('noreg');
				kv.Cookie.delete('view_timing');
				kv.Cookie.set('disable_reg', disable_reg);
			}
			if (noreg) {
				kv.Cookie.delete('disable_reg');
				kv.Cookie.delete('noreg');
				kv.Cookie.delete('view_timing');
				kv.Cookie.set('noreg', noreg);
			}
			if (view_timing) {
				kv.Cookie.delete('disable_reg');
				kv.Cookie.delete('noreg');
				kv.Cookie.delete('view_timing');
				kv.Cookie.set('view_timing', view_timing);
			}

			if (showalerts && kvkey){

				kv.User.maybeAuthenticateViaURLToken(function() {

					kv.Remote.get('public/alerts', {lead_id: kv.User.getLeadId()}, function(response) {

						var data = response[showalerts - 1];

						if ('undefined' !== typeof(data.max_price) && data.max_price){
							configRequestArgs.pricemax = decodeURIComponent(data.max_price);
						}

						if ('undefined' !== typeof(data.min_price) && data.min_price){
							configRequestArgs.pricemin = decodeURIComponent(data.min_price);
						}

						// Max & Min Acres
						if ('undefined' !== typeof(data.max_acres) && data.max_acres){
							configRequestArgs.acresmax = decodeURIComponent(data.max_acres);
						}

						if ('undefined' !== typeof(data.min_acres) && data.min_acres){
							configRequestArgs.acresmin = decodeURIComponent(data.min_acres);
						}

						// Max & Min footage
						if ('undefined' !== typeof(data.max_sqft) && data.max_sqft){
							configRequestArgs.footagemax = decodeURIComponent(data.max_sqft);
						}

						if ('undefined' !== typeof(data.min_sqft) && data.min_sqft){
							configRequestArgs.footagemin = decodeURIComponent(data.min_sqft);
						}

						// Property Types
						if ('undefined' !== typeof(data.types) && data.types.length){
							var types = [];

							data.types.forEach(function(v){
								types.push(v.id);
							});

							if (types.length){
								configRequestArgs.propertytypes = decodeURIComponent(types.join('|'));
							}
						}

						// Options
						if ('undefined' !== typeof(data.options) && data.options){

							var optionsArr = JSON.parse(data.options);

							if (optionsArr.length){
								var options = [];

								options.forEach(function(item){
									if ('name' in item && item.name){
										options.push(item.name)
									}
								});

								if (options.length){
									configRequestArgs.options = decodeURIComponent(options.join('|'));
								}
							}
						}

						if ('undefined' !== typeof(data.areas) && data.areas){
							if (data.areas.length){
								var areas = '';

								data.areas.forEach(function(v) {

									if ('name' in v && v.name){
										areas += v.type + '|' + v.name + ';';
									}
								});

								if (areas.length){
									areas = areas.slice(0, -1);
									configRequestArgs.area = decodeURIComponent(areas);
								}
							}
						}

						currentFilters = $.extend(
							true, currentFilters, configDefaultFilters, selfContainerFilters, configRequestArgs
						);

						currentFilters = processFilterValues(currentFilters);
						updateListings();
					});
				});

				return;

			} else {

				//price min & max
				if ('undefined' === typeof(configRequestArgs.pricemin) && 'string' === typeof(priceMin) && '' !== priceMin){
					configRequestArgs.pricemin = decodeURIComponent(priceMin);
				}
				if ('undefined' === typeof(configRequestArgs.pricemax) && 'string' === typeof(priceMax) && '' !== priceMax){
					configRequestArgs.pricemax = decodeURIComponent(priceMax);
				}

				//acres min & max
				if ('undefined' === typeof(configRequestArgs.acresmin) && 'string' === typeof(acresMin) && '' !== acresMin){
					configRequestArgs.acresmin = decodeURIComponent(acresMin);
				}
				if ('undefined' === typeof(configRequestArgs.acresmax) && 'string' === typeof(acresMax) && '' !== acresMax){
					configRequestArgs.acresmax = decodeURIComponent(acresMax);
				}

				//footage min & max
				if ('undefined' === typeof(configRequestArgs.footagemin) && 'string' === typeof(footageMin)) {
					configRequestArgs.footagemin = decodeURIComponent(footageMin);
				}
				if ('undefined' === typeof(configRequestArgs.footagemax) && 'string' === typeof(footageMax)) {
					configRequestArgs.footagemax = decodeURIComponent(footageMax);
				}

				//Property types
				if ('undefined' === typeof(configRequestArgs.propertytypes) && 'object' == typeof(propertyTypes) && propertyTypes) {
					propertyTypes = propertyTypes.join('|');
					configRequestArgs.propertytypes = decodeURIComponent(propertyTypes);
				}

				//Keywords
				if ('undefined' === typeof(configRequestArgs.keywords) && 'object' == typeof(keywords) && keywords) {
					keywords = keywords.join('|');
					configRequestArgs.keywords = decodeURIComponent(keywords);
				}

				//Options
				if ('undefined' === typeof(configRequestArgs.options) && 'object' == typeof(options) && options) {
					options = options.join('|');
					configRequestArgs.options = decodeURIComponent(options);
				}

				//area
				if ('undefined' === typeof(configRequestArgs.area) && 'string' == typeof(queryArea)) {
					configRequestArgs.area = decodeURIComponent(queryArea);
				}

				if ('undefined' === typeof(configRequestArgs.area) && 'object' == typeof(queryAreas) && queryAreas){
					//areas can be formatted like city:dallas:tx and have to work and multiple areas have to work
					var formattedAreas = []
					for (var i = 0; i < queryAreas.length; i++) {
						queryAreas[i] = queryAreas[i].replace(":", "|").replace(":", ",");
						formattedAreas.push(queryAreas[i]);
					}
					queryAreas = formattedAreas.join(';');
					configRequestArgs.area = decodeURIComponent(queryAreas);
				}

				if ('string' == typeof(pakKey) && '' !== pakKey) {
					configRequestArgs.polygonKey = decodeURIComponent(pakKey)
				}

				if ('undefined' === typeof(configRequestArgs.mlsids) && 'string' == typeof(mlsids) && '' !== mlsids) {
					configRequestArgs.mlsids = decodeURIComponent(mlsids);
				}

				if (!kv.isEmpty(selfContainerFilters['hotsheet'])) {
					isHotsheet = true;
					currentFilters = $.extend(true, currentFilters, selfContainerFilters, configRequestArgs);
				} else if ( ! kv.isEmpty(selfContainerFilters['exclusives'] ) ) {
					manualListings = kvCORE.Config.get('query', 'listings-exclusives');

					if ( ! manualListings ) {
						manualListings = selfContainerFilters['exclusives'];
					} else {
						manualListings = manualListings.replace(/[^a-z0-9]+/g, ' ');
					}
				} else {
					currentFilters = $.extend(
						true, currentFilters, configDefaultFilters, selfContainerFilters, configRequestArgs
					);
				}
				//type used for manual listings only
				if ('undefined' === typeof(configRequestArgs.type) && 'string' === typeof(type) && '' !== type){
					configRequestArgs.type = decodeURIComponent(type);
				}
			}

		}
		else {
			currentFilters = filters;
		}

		currentFilters = processFilterValues(currentFilters);

		if (searchtype !== 'forsale') {
			if (searchtype === 'sold') {
				currentFilters.sold = '1';
			}
			if (searchtype === 'forrent') {
				currentFilters.propertyTypes = '6';
			}
		}

		if (vowKey) {
			kv.User.maybeAuthenticateVowToken(function() {
				if (kv.Cookie.get('has_vow_access')) {
					currentFilters.sold = '1';
					currentFilters = processFilterValues(currentFilters);
					updateListings();
				}
			});
		} else {
			currentFilters = processFilterValues(currentFilters);
			updateListings();
		}
	}

	function obscureSoldData() {
		if (currentFilters.sold === '1' && kv.Cookie.get('has_vow_access') && !kv.Cookie.get('lead_id')) {
			return true;
		} else {
			return false;
		}
	}

	function getSupportedTypes() {
		var $searchContainer = $('#kvcoreidx-properties-search');
		if ($searchContainer.length > 0) {
			var context = $searchContainer.data('context');
			var supportedTypes = [];
			context['supportedTypes'].forEach(function (key) {
				supportedTypes.push(key.id);
			});
			supportedTypes.sort(function(a,b){return a - b});
			return supportedTypes.join("|");
		}
	}

	function processSupportedCounties() {
		var countyFilter = kv.Config.get('options', 'listings', 'inherit_kvcore_county_settings') === '1' ? true : false;
		if (countyFilter) {
			currentFilters.countyFilter = 1;
		}
	}

	function guessArea(filters) {
		if (typeof filters['searchString'] === 'undefined' || filters['searchString'] === '') {
			return filters;
		}

		var searchArea = filters['searchString'];
		var newArea = null;

		var datasetResult = kv.Search.search('area', searchArea, 1, 1, 'name');
		var isDatasetEmpty = datasetResult.length === 0 || datasetResult.data.length === 0;
		if (!isDatasetEmpty && datasetResult.data[0].name.toLowerCase() === searchArea.toLowerCase()) {
			newArea = datasetResult.data[0].type + '%7c' + datasetResult.data[0].name;
		} else if (searchArea.match(/^\d{5}$/)) {
			newArea = 'zip%7c' + searchArea;
		} else if (searchArea.match(/^\d/)) {
			newArea = 'address%7c' + searchArea;
		}

		if (newArea !== null) {
			if (Array.isArray(filters.area) && filters.area.indexOf(newArea) === -1) {
				filters.area.push(newArea);
			} else {
				filters.area = [newArea];
			}
		}

		return filters;
	}

	function processFilterValues(filters) {
		filters = guessArea(filters);
		var processed = {};

		for (var originalKey in filters) {
			if (!filters.hasOwnProperty(originalKey)) {
				continue;
			}

			var value = filters[originalKey];
			var key = originalKey.replace('[]', '').toLowerCase();
			var requestKey = allowedFilters.hasOwnProperty(key) ? allowedFilters[key] : null;


			if (!requestKey || [0, '0', ''].indexOf(value) !== -1) {
				continue;
			}

			switch (requestKey) {
				case 'area':
					if (value.indexOf(';') === -1) {
						processed[requestKey] = value;
					} else {
						processed[requestKey] = typeof value === 'string'
							? value.split(';').map(function(item) { return item.trim(); })
							: processed[requestKey] = value;
					}
					//squeeze pages can come in with : fix
					for (var i = 0; i < processed[requestKey].length; i++) {
						//case when someone types a zipcode does not manually select it but then clicks search can create wierd chars in there fix
						processed[requestKey][i] = processed[requestKey][i].replace("%7c", "|");
						processed[requestKey][i] = processed[requestKey][i].replace(":", "|");
					}
					//we don't want address searches to actually return since it will open in detail page
					if (processed[requestKey][0].indexOf('address|') !== -1) {
						processed[requestKey] = '';
					}
					//shortcode can be formed like area= instead of area[]= causing api issue fix
					processed['area[]'] = processed[requestKey];
					delete processed['area'];
					break;

				case 'baths':
					processed[requestKey] = parseInt(value, 10);
					if (parseFloat(value) % 1 !== 0) {
						processed['halfBaths'] = 1;
					}
					break;

				case 'polygon': 
					//if it comes in shortcode as string and needs to be parsed
					//depending on if they use elementor or not can come in as &lt;&lt; or << fix both ways
					var couldBeParsed = typeof value === 'string';
					if (couldBeParsed) {
						if (value.indexOf("<") !== -1 && value.indexOf(">") !== -1) {
							var parsed = JSON.parse(value.replace(/</g, '[').replace(/>/g, ']').replace(/'/g, '"'));
						} else {
							var parsed = JSON.parse(value.replace(/&lt;/g, '[').replace(/&gt;/g, ']').replace(/'/g, '"'));
						}
					}
					processed[requestKey] = couldBeParsed ? parsed : value;
					polygon = processed[requestKey];
					break;

				case 'subType':
					processed[requestKey] = value;
					break;

				default:
					processed[requestKey] = value instanceof Array ? value.join('|') : value;
					break;
			}

		}

		if (firstLoad) {
			parseForceFilters(processed);
			deleteFirstLoadFilters(processed);
		}

		return processed;
	}

	function parseForceFilters(processed) {
		var filters = $.extend({}, processed);

		if (typeof filters['forcedFilters'] === 'undefined') {
			return;
		}

		forced = filters['forcedFilters'].split(',').map(function(filter) {
			return filter.trim();
		});

		deleteFilter('forcedFilters', false);
	}

	function deleteFirstLoadFilters(processed) {
		Object.keys(processed).map(function(key) {
			if (firstLoadFilters.indexOf(key) !== -1) {
				deleteFilter(key, false);
			}
		});
	}

	function processPage() {
		if (typeof currentFilters.page === 'undefined') {
			currentFilters.page =  Math.max(kv.Config.get('query', 'page'), 1);
		}
	}

	this.getPropertyTypesSetOrOtherwise = function () {
		if (kv.isEmpty(currentFilters.propertyTypes)) {
			return allowedTypes;
		} else {
			return currentFilters.propertyTypes;
		}
	}

	this.passTheMapBounds = function (bounds) {
		if (kv.isEmpty(currentFilters.polygonKey) && kv.isEmpty(currentFilters.polygon)) {
			var convertedSquare = [];
			var coordinates = [];
			coordinates[0] = {lat: bounds[0][1], lon: bounds[0][0]};
			coordinates[1] = {lat: bounds[0][1], lon: bounds[1][0]};
			coordinates[2] = {lat: bounds[1][1], lon: bounds[1][0]};
			coordinates[3] = {lat: bounds[1][1], lon: bounds[0][0]};
			coordinates[4] = {lat: bounds[0][1], lon: bounds[0][0]};
			convertedSquare.push(coordinates);
			currentFilters.mapbounds = convertedSquare;
			updateListings();
		} else { //otherwise unset
			deleteFilter('mapbounds', false);
		}
	}

	function processPropertyTypes() {
		//when no types we want types to be only allowed types
		if (kv.isEmpty(currentFilters.actualtypes)) {
			currentFilters.actualtypes = allowedTypes;
		}
	}

	function processOptions() {
		var features = typeof currentFilters.options !== 'undefined'
			? currentFilters.options.split('|')
			: [];
		var views = typeof currentFilters.propertyViews !== 'undefined'
			? currentFilters.propertyViews.split('|')
			: [];
		var stories = typeof currentFilters.stories !== 'undefined'
			? currentFilters.stories.split('|')
			: [];
		var garageCapacity = typeof currentFilters.garageCapacity !== 'undefined'
			? currentFilters.garageCapacity.split('|')
			: [];

		var options = features.concat(views, stories, garageCapacity).join('|');
		if (options.length !== 0) {
			currentFilters.options = options;
		}
	}

	function processLimited() {
		//this should always pass
		currentFilters.limited = true;
	}

	function processOrder() {
		if (!currentFilters.order) {
			currentFilters.order = 'visits|desc';
		}
	}

	function processSimilarMlsMlsId() {
		if (!firstLoad) {
			deleteFilter('similarMls', false);
			deleteFilter('similarMlsId', false);
		}
	}

	function setRemoteActions() {
		kv.Remote.onEarliestRequest('public/listings', 'get', function(endpoint, method, args) {
			Object.keys(args.data).map(function(key) {
				var value = args.data[key];
				if (nonApiFilters.indexOf(key) !== -1) {
					delete args.data[key];
				} else if (value === null || value === undefined || value === '') {
					delete args.data[key];
				}
			});

			return args;
		});
	}

	function processPolygon() {

		var polygons = kv.Config.get('query', 'polygons');

		if (polygons){
			var polyCount = 0;
			var polyArray = polygons[0].split(',');
			polygon = [[]];
			//When a polygon comes over from search alerts, it's in a single array with long then lat. Just reformatting here to how the plugin handles it.
			for(var i = 0; i < polyArray.length; i+=2){
				polygon[0][polyCount++] = {
					lat: polyArray[i + 1],
					lon: polyArray[i]
				};
			}
		}

		if (typeof currentFilters.polygon === 'undefined' && !kv.isEmpty(polygon) && kv.isEmpty(currentFilters.area)) {
			currentFilters.polygon = polygon;
		}
	}

	function updateListings() {
		processPage();
		processOptions();
		processPropertyTypes();
		processSupportedCounties();
		processLimited();
		processOrder();
		processSimilarMlsMlsId();
		processPolygon();

		if (currentFilters.searchtype === 'sold') {
			currentFilters.sold = '1';
		}

		if (currentFilters.sold === '1') {
			if (kv.Config.get('vowWebsiteConfiguration') !== '0') {
				//if they don't have cookie set don't let them see sold yet
				if (!kv.Cookie.get('has_vow_access') && !kv.Cookie.get('vow_pending')) {
					setTimeout(function() {
						kv.VowRegistration.showModal();
					}, 200);
					deleteFilter('sold', false);
				}
				//pending have not activated thru email yet
				if (kv.Cookie.get('vow_pending') && !kv.Cookie.get('has_vow_access')) {
					setTimeout(function() {
						kv.VowPending.showModal();
					}, 200);
					deleteFilter('sold', false);
				}
				
			}
		}

		if (0 === $propertiesPageContainer.length) {
			return false;
		}

		//new changes require passing propertyTypes into api as actualtypes
		if (currentFilters.propertyTypes) {
			if (currentFilters.searchtype === 'forrent') {
				currentFilters.actualtypes = '6';
			} else {
				deleteFilter('subType', false);
				currentFilters.actualtypes = currentFilters.propertyTypes;
			}
			deleteFilter('propertyTypes', false);
		}

		if (currentFilters.polygonKey) {
			deleteFilter('polygon', false);
		}

		if (currentFilters['area[]']) {
			deleteFilter('polygon', false);
		}

		$propertiesPageContainer.addClass(loadingWithMarginClass);

		var renderAjax = firstLoad || !hasData;

		var mls = currentFilters.similarMls;
		var mlsId = currentFilters.similarMlsId;

		var forRentSubTypes = ['single', 'condo', 'townhouse', 'apartment'];
		
		//special processing when forrent is set in shortcode, on first page load only
		var containerFilters = $propertiesPageContainer.data('filters');
		if (containerFilters.searchtype === 'forrent' && kv.isEmpty(currentFilters.subType) && firstLoad) {
			currentFilters.subType = [];
			forRentSubTypes.forEach(function (key) {
				currentFilters.subType.push(key);
			});
			currentFilters.actualtypes = '6';
			
			currentFilters.searchtype = 'forrent';
		}

		if (renderAjax && typeof mls !== 'undefined' && typeof mlsId !== 'undefined') {
			var endpoint = 'public/listings/' + mls + '/' + mlsId + '/similar';
			kv.Remote.addDataFilter(endpoint, filterListingsData);

			kv.View.renderAjax(
				'properties-divided', endpoint, {},
				$propertiesPageContainer, similarCallback.bind(undefined, 3, renderBlockTemplates)
			);
		} else if ( false !== manualListings ) {
			var containerFilters = $propertiesPageContainer.data('filters');
			var configRequestArgs = kv.getUsableObject(kv.Config.get('request', 'args'));
			var selfContainerFilters = kv.getUsableObject(containerFilters);

			if (configRequestArgs.type) {
				currentFilters.type = configRequestArgs.type;
			} else if (selfContainerFilters.type) {
				currentFilters.type = selfContainerFilters.type;
			}

			if ( "1" !== manualListings ) {
				currentFilters.type = manualListings;
			}
			currentFilters.limit = kv.Config.get('options', 'listings', 'per_page' );

			if (renderAjax){
				kv.View.renderAjax('properties-divided', 'public/listings/manualListings', currentFilters, $propertiesPageContainer, renderAjaxCallback);
			} else {
				kv.Remote.get('public/listings/manualListings', currentFilters, remoteGetCallback);
			}
		} else if (renderAjax) {
			var containerFilters = $propertiesPageContainer.data('filters');
			var configRequestArgs = kv.getUsableObject(kv.Config.get('request', 'args'));
			if (configRequestArgs.layout === 'card' || currentFilters.layout === 'card')  {
				//shortcode val should take precedence
				if (containerFilters.perpage) {
					currentFilters.limit = containerFilters.perpage;
				} else {
					currentFilters.limit = kv.Config.get('options', 'listings', 'per_page' );
				}
			} else if (typeof currentFilters.layout == 'undefined'){
				var perPage = kv.Config.get('options', 'listings', 'per_page' ) !== null ? kv.Config.get('options', 'listings', 'per_page' ) : 24;
				perPage = currentFilters.limit == defaultPropertiesNumber ?  perPage : currentFilters.limit;
				currentFilters.perPage = perPage;
				currentFilters.limit = defaultPropertiesNumber;
			} else {
				var perPage = kv.Config.get('options', 'listings', 'per_page' ) !== null ? kv.Config.get('options', 'listings', 'per_page' ) : 24;
				perPage = currentFilters.limit == defaultPropertiesNumber ?  perPage : currentFilters.limit;
				currentFilters.perPage = perPage;
				currentFilters.limit = defaultPropertiesNumber;
			}
			kv.View.renderAjax(
				'properties-divided', 'public/listings', currentFilters, $propertiesPageContainer, renderAjaxCallback
			);
		} else {
			if (currentFilters.layout === 'map' && kv.Config.get('options', 'listings', 'enable_zoom_on_map') === '1') {
				//this is to make the map perform better when a mapbounds change has happened
				var dataAccumulated = [];
				//get the 1st call
				listingsLoop = 1;
				var firstCall = new Promise(function(resolve, reject) {
					currentFilters.limit = 200;
					currentFilters.page = 1;
					//kv.Remote.skipCacheOnNextRequest = true;
					kv.Remote.get('public/listings', currentFilters, function(response) {
						dataAccumulated.push(response.data);
						response.data = dataAccumulated.flat();
						remoteGetCallback(response);
						resolve();
					});
				});
				//tally the other listings
				firstCall.then(
					function(message) {
						new Promise(function (resolve, reject) {
							for (var i = 2; i < 5; i++) {
								currentFilters.limit = 200;
								currentFilters.page = i;
								resolveListingsLoop(i, dataAccumulated, resolve);
							}
						}).then (function (res) {
							//have to set these we don't want the url params to be incorrect
							currentFilters.limit = 800;
							currentFilters.page = 1;
							remoteGetCallback(res);
						})
					}
				);
			} else {
				//caching causing problem w/ this new pagination method
				kv.Remote.skipCacheOnNextRequest = true;
				kv.Remote.get('public/listings', currentFilters, remoteGetCallback);
			}
		}
	}

	function resolveListingsLoop(i, dataAccumulated, resolve) {
		currentFilters.limit = 200;
		currentFilters.page = i;
		kv.Remote.get('public/listings', currentFilters, function(response) {
			dataAccumulated.push(response.data);
			response.data = dataAccumulated.flat();
			listingsLoop++;
			if (listingsLoop === 4) {
				resolve(response);
			}
		});
	}

	function renderAjaxCallback(view, data) {
		renderBlockTemplates(data);
	}

	function remoteGetCallback(data) {

		data = filterListingsData(data);

		if ( false !== manualListings) {
			data = addCustomData(data);
			data = addCustomManualListingsData(data);
		}

		if (data.currentFilters.layout) {
			$propertiesPageContainer.find('.kv-properties-container').attr('class', function(i, className) {
				return className.replace(/(^|\s)kv-layout-\S+/g, ' kv-layout-' + data.currentFilters.layout + ' ');
			});
		}

		$propertiesPageContainer.find('#kv-properties-alerts').data('listings-total', data.total);
		renderBlockTemplates(data);
	}

	function renderBlockTemplates(data) {
		data.kvcoreidx = config;
		if (Array.isArray(data.data) && data.data.length) {
			hasData = true;

			if ( false !== manualListings) {
				data.data.map(kv.Property.addManualListingCustomData);
			} else {
				data.data.map(kv.Property.addCustomData);
			}
		}
		addShortcodeData(data);

		['filters', 'listings', 'pagination'].map(function(name, i, array) {
			var target = $('.kv-property-' + name + '-container');
			kv.View.render(
				'properties-' + name, data, target, blockTemplatesCallback.bind(undefined, data, array.length)
			);
		});
		// Remove scroll for now
		// var shouldScroll = $('#kvcoreidx-properties-page .kv-map-grey-area-filters').length > 0 && kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1';
		// if (shouldScroll) {
		// 	kv.DOM.scrollToElement($('#kvcoreidx-properties-page .kv-map-grey-area-filters'), function(){}, true);
		// }


	}

	function blockTemplatesCallback(data, templatesLength) {
		blocksLoaded++;
		// run only last callback
		if (blocksLoaded !== templatesLength) {
			return;
		}

		// reinit
		blocksLoaded = 0;

		$propertiesPageContainer.removeClass(loadingWithMarginClass);
		updateStateUrl(data);
		maybeScrollIntoView();
		bindProperties($propertiesPageContainer, data);
		bindDriveTime();
	}

	function updateStateUrl(data) {
		if (typeof history.pushState !== 'function' || false !== manualListings) {
			return;
		}

		var page = kv.Config.get('pages', 'properties');

		if ('undefined' !== typeof(document.location.pathname)) {
			page = document.location.pathname;
		}

		var urlFilters = $.extend({}, currentFilters);

		// no need to put most filters in url on hotsheet page
		if (isHotsheet) {
			Object.keys(urlFilters).map(function(filter) {
				if (nonShortcodeFilters.indexOf(filter) === -1) {
					delete urlFilters[filter];
				}
			});
		}

		// remove duplicate options
		if (typeof urlFilters.options !== 'undefined') {
			var options = urlFilters.options.split('|');
			options = options.filter(function(option) {
				return optionsInOtherFields.indexOf(option) === -1;
			});
			if (options.length !== 0) {
				urlFilters.options = options.join('|');
			} else {
				delete urlFilters.options;
			}
		}

		// Those filters has no reason to keep on page reload,
		// as they are taken from shortcode
		firstLoadFilters.forEach(function(filter) {
			delete urlFilters[filter];
		});

		// keep propertyTypes in the url
		if (!kv.isEmpty(urlFilters['actualtypes'])) {
			urlFilters['propertyTypes'] = urlFilters['actualtypes'];
			delete urlFilters['actualtypes'];
		} 

		// object is a bit too large for firefox pushState remove some unused
		if (!kv.isEmpty(data.data)) {
			for (var i = 0; i < data.data.length; i++) {
				data.data[i].features = [];
			}
			history.pushState(data, 'Listings Search', page + '?' + $.param(urlFilters));
		}

	}

	function maybeScrollIntoView() {
		if (!firstLoad) {
			$('.kv-property-listings-container').scrollTop(0);
		}
	}

	function updateFilters(filters) {
		if (!kv.isUsableObject(filters)) {
			return;
		}

		Object.keys(filters).forEach(function(key) {
			updateFilter(key, filters[key], false);
		});

		if ('undefined' === typeof(filters.page)) {
			updateFilter('page', 1, false);
		}

		updateListings();
	}

	function updateFilter(name, value, runUpdate) {
		if ('undefined' !== typeof(name)) {
			if ('undefined' === typeof(runUpdate)) {
				runUpdate = true;
			}

			if ('undefined' === typeof(value) || !value) {
				deleteFilter(name, false);
			} else {
				currentFilters[name] = value;
			}

			if ('page' !== name && 'layout' !== name) {
				currentFilters.page = 1;
			}

			if ('layout' === name) {
				currentLayout = value;
			}

			if (true === runUpdate) {
				updateListings();
			}
		}
	}

	function deleteFilter(name, runUpdate) {
		if (typeof runUpdate === 'undefined') {
			runUpdate = true;
		}

		if (forced.indexOf(name) === -1) {
			delete currentFilters[name];
		}

		if (runUpdate) {
			updateListings();
		}
	}

	function setFilters(filters) {
		if ('undefined' === typeof(filters.order) && 'undefined' !== typeof(currentFilters.order)) {
			filters.order = currentFilters.order;
		}

		// Keep some filters between reloads
		Object.keys(currentFilters).map(function(key) {
			if (filtersToKeep.indexOf(key) === -1) {
				deleteFilter(key, false);
			}
		});

		currentFilters = $.extend(currentFilters, filters);
		updateFilter('page', 1);
	}

	function prepareFiltersForUrl() {
		var filters = $.extend({}, currentFilters);
		//area comes with bracket adjustment
		if (Array.isArray(filters['area[]'])) {
			filters.area = filters['area[]'].join(';');
		}
		return filters;
	}

	this.submitFilterForm = function(obj) {
		var filters = kv.Form.toArray(obj);
		if (!kv.isEmpty(filters.area) || !kv.isEmpty(filters.polygonKey)) {
			kv.Map.clearAllDrawnPolygons();
		}

		// We cannot pass an area and a polygonKey
		if ('undefined' !== typeof(filters.polygonKey) && kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
			delete filters.area;
		} else {
			delete filters.polygonKey;
		}


		// We have a race condition when the user clicks enter when searching and the area isn't set before the form is submitted.
		// We're adding a 500 ms timeout here so that the dom has time to set the area.
		if (!filters.hasOwnProperty('area')) {
			setTimeout(function() {
				var filters = kv.Form.toArray(obj);
				// We cannot pass an area and a polygonKey
				if ('undefined' !== typeof(filters.polygonKey) && kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
					delete filters.area;
				} else {
					delete filters.polygonKey;
				}
				filters = processFilterValues(filters);
				setFilters(filters);

				if (0 === $propertiesPageContainer.length) {
					kv.Url.redirect(kv.Config.get('pages', 'properties'), prepareFiltersForUrl());
				}
			}, 500);
		} else {
			filters = processFilterValues(filters);
			var $filterAgentsContainer = $('.kv-filters-container #kv-filters-agents');
			//is a user site (agents div hidden) and has a shortcode agents passed
			if ($filterAgentsContainer.css('display') == 'none' && !kv.isEmpty(shortcodeFilters.agents)) {
				filters.agents = shortcodeFilters.agents;
			}

			setFilters(filters);

			if (0 === $propertiesPageContainer.length) {
				kv.Url.redirect(kv.Config.get('pages', 'properties'), prepareFiltersForUrl());
			}
		}
	};

	function loadPage() {
		setRemoteActions();

		setRequestFilters();
		setDataFilters();

		if ($propertiesPageContainer.length) {
			displayListings();
		}
	}

	/**
	 * Need responseIndex, because ajaxRender and remoteGet return
	 * response data at different argument index
	 *
	 * @param {Number} responseIndex
	 * @param {Function} callback
	 */
	function similarCallback(responseIndex, callback) {
		var response = arguments[responseIndex];
		var length = 0;

		if ( 'undefined' !== typeof(response.data) && response.data.length) {
			length = response.data.length;
		}

		if (length === 0) {
            var mlsId = currentFilters.similarMlsId;

            if (mlsId) {
            	kv.Message.warning('No similar properties found for MLS#' + mlsId );
			} else {
                kv.Message.warning('Similar properties not found');
			}
			$propertiesPageContainer.removeClass(loadingWithMarginClass);
			return;
		}

		response.from = 1;
		response.to = length;
		response.last_page = 1;
		response.total = length;

		if (typeof callback === 'function') {
			callback(response);
		}
	}

	function bindProperties($propertiesContainer, data) {
		$('.kv-filters-clear').click(function() {
			kv.Url.redirect(kvCORE.Config.get('pages', 'properties'), {});
		});

		if ('undefined' === typeof($propertiesContainer)) {
			$propertiesContainer = $propertiesPageContainer;
		}

		var $propertiesPageForm = $propertiesContainer.find('.kv-property-filters');

		if (1 === $propertiesPageContainer.length) {
			$propertiesContainer.find('.kv-similar-properties[target!="_blank"]').click(function(e) {
				e.preventDefault();

				var $this = $(this);
				var mls = $this.data('mls');
				var mlsId = $this.data('mlsid');

				if (!mls || !mlsId) {
					kv.Message.warning('Similar properties not found');
					return;
				}

				kv.Remote.get(
					'public/listings/' + mls + '/' + mlsId + '/similar', {},
					similarCallback.bind(undefined, 2, remoteGetCallback)
				);
			});
		}

		$propertiesContainer.find('.kv-card-price').click(function(e) {
			e.preventDefault();
			kv.Login.loginQueue.add({obj: 'Properties', method: 'propertiesPageRefresh'});
			kv.Login.showModal();
		});

		$propertiesContainer.find('.add-favorite').click(function(e) {
			e.preventDefault();

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

		$propertiesPageForm.find('select, [type="checkbox"], [type="radio"]').change(function() {
			var $this = $(this);
			var name = $this.attr('name');
			var value = $this.val();
			//grid view should update the filter
			//map view should just change the page with existing data
			if (name === 'page') {
				if (currentFilters.layout === 'card') {
					updateFilter(name, value);
				} else {
					//we want to rerender the twig file with the chunked data, but how
					//data gets set back to the 800 result so that it can be rechunked on page change
					data.data = propertiesFullList;
					data = getChunkedResults(data, value, true);
					updateFilter(name, value, false);
					data.current_page = value;
					renderBlockTemplates(data);
				}
			} else if (name === 'layout') {
				if (value === 'card') {
					var kvcoreConfPerPage = kv.Config.get('options', 'listings', 'per_page' ) !== null ? kv.Config.get('options', 'listings', 'per_page' ) : 24;
					var perPage = currentFilters.perPage ?  currentFilters.perPage : kvcoreConfPerPage;
					updateFilter('limit', perPage, false);
				} else {
					var perPage = kv.Config.get('options', 'listings', 'per_page' ) !== null ? kv.Config.get('options', 'listings', 'per_page' ) : 24;
					perPage = currentFilters.limit == defaultPropertiesNumber ?  perPage : currentFilters.limit;
					updateFilter('perPage', perPage, false);
					updateFilter('limit', '800', false);
				}

				updateFilter(name, value);
			} else {
				updateFilter(name, value);
			}
		});

		$propertiesPageForm.find('.kv-filters-get-shortcode button').click(function(e) {
			var $input = $(e.target).prev();
			$input.focus().select();
			document.execCommand('copy');
			kv.Message.success('Shortcode copied to clipboard');
		});

		$propertiesPageForm.submit(function(e) {
			e.preventDefault();
			var form = kv.Form.toArray(this);

			if (!kv.isEmpty(form['hotsheet-name']) && kv.isEmpty(shortcodeFilters)) {
				kv.Message.info('Hotsheet not saved, as filters are empty');
			}

			if (kv.isEmpty(form['hotsheet-name']) || kv.isEmpty(shortcodeFilters)) {
				return;
			}

			$.ajax({
				url: kv.Config.get('adminRestNamespace') + 'add-hotsheet',
				type: 'POST',
				dataType: 'json',
				data: {name: form['hotsheet-name'], filters: shortcodeFilters},
				beforeSend: function(jqXHR) {
					jqXHR.setRequestHeader('X-WP-Nonce', kv.Config.get('nonce'));
				},
				success: function(response) {
					kv.Message.success(response);
				},
				error: function(jqXHR) {
					if (jqXHR.status === 409) {
						kv.Message.warning(jqXHR.responseText.replace(/"/g, ''));
					} else if (typeof jqXHR.responseJSON.message !== 'undefined') {
						kv.Message.error(jqXHR.responseJSON.message);
					} else {
						kv.Message.error(jqXHR.responseText.replace(/"/g, ''));
					}
				}
			});
		});

		$propertiesPageForm.find('.kv-filters-save-hotsheet input').on('input', function(e) {
			e.target.setCustomValidity('');
		});

		$propertiesPageForm.find('.kv-filters-save-hotsheet input').on('invalid', function(e) {
			e.target.setCustomValidity('');
			if ($(e.target).is(':invalid')) {
				e.target.setCustomValidity(
					'Hotsheet name should only contain lowercase letters, numbers and hyphens, e.g. "recent-properties-1"'
				);
			}
		});

		$('.kv-filters-market-report-link:not(.bound)').addClass('bound').click(function(e) { //prevent click action adding twice when switch views
			e.preventDefault();
			e.stopPropagation();

			var marketReportPage = kv.Config.get('pages', 'market_report');
			if (!marketReportPage) {
				return;
			}

			if (!kv.Config.compare('activeIdxPage', 'properties')) {
				kv.Url.redirect(marketReportPage, {}, true);
			}

			var area = kv.PropertiesSearch.getFirstArea();

			var state = null;
			var $datasetArea = $('#dataset-area').find('[value="' + area + '"]');

			if ($datasetArea.length !== 0) {
				var item = $datasetArea.data('item');
				if (typeof item !== 'undefined' && typeof item.state !== 'undefined' && item.state.length !== 0) {
					state = item.state;
				}
			}

			var args = {area: area};
			if (state) {
				args.state = state;
			}

			if (!area) { args = {}; }

			if (args.area === null) {
				//when using polygon key market report data not passed right fix
				if (!kv.isEmpty(currentFilters.polygonKey)) {
					var areaParts = currentFilters.polygonKey.split(":");
					var query = 'query getGeoAreas($filter: ESQuery!) { geoAreas(filter: $filter) {geo_areas { name_en state } } }';
					var filter = { size: 1, from: 0 }
					filter.body = '{"query": {"term": {"geog_id": {"value": "'+areaParts[1]+'"}}}}';

					$.ajax({
						url: 'https://listing-api.kvcore.com/graphql',
						type: 'GET',
						dataType: 'json',
						data: { query: query, operationName: 'getGeoAreas', variables: JSON.stringify({ filter: filter })},
						beforeSend: function(jqXHR) {
							jqXHR.setRequestHeader('Authorization', kv.Config.get('listingApi'));
						},
						success: function(response) {
							args.state = response.data.geoAreas.geo_areas[0].state;
							args.area = areaParts[0] + '|' + response.data.geoAreas.geo_areas[0].name_en;
							kv.Url.redirect(marketReportPage, args, true);
						},
						error: function(jqXHR) {
							kv.Message.info('Please select an area');
						}
					});
				} else {
					kv.Message.info('Please select an area');
				}
			} else {
				kv.Url.redirect(marketReportPage, args, true);
			}

		});

		if ($similarResultsPageContainer.length === 0) { //they are on simmilar results page this map data should not run
			if (hasData && currentFilters && currentFilters.layout && currentFilters.layout === 'map' && $propertiesPageContainer.length > 0) {

				//polygons should be cleared also when no polygon or no polygonKey
				if (!currentFilters.polygon && !currentFilters.polygonKey) {
					kv.Map.clearAllDrawnPolygons();
					kv.Map.removeAreaPolygon(propertyMap);
				}
				var polygon = [];
				//areas polygon is passed
				if ('undefined' !== typeof(data.polygon)) {
					var polygonType = data.polygon_type;
					var polygonUnprocessed;
					if (data.polygon_type === 'multipolygon') {
						polygon = data.polygon;
						polygonUnprocessed = data.polygon[0];
					} else if (data.polygon_type === 'polygon') {
						polygon = data.polygon[0];
						polygonUnprocessed = data.polygon[0];
					} else {
						var coordinates = [];
						data.polygon[0].forEach(function(coordinate) {
							coordinates.push({lat: coordinate[1], lon: coordinate[0]});
						});
						polygon.push(coordinates);
						polygonUnprocessed = data.polygon[0];
					}
				}
				//saved polygon is passed
				if ('undefined' !== typeof(currentFilters.polygon)) {
					polygon = currentFilters.polygon;
				}

				var mapId = 'kv-properties-map';

				var mapScrollSetting = kv.Config.get('options', 'listings', 'enable_zoom_on_map') === '1' ? true : false;

				var controls = {
					zoom: true,
					polygon: {
						callbacks: {
							render: polygonRender,
							create: polygonUpdate,
							update: polygonUpdate,
							delete: polygonUpdate
						},
						coordinates: polygon
					},
					drive: {
						control: {
							onAdd: onAddDriveTimeControl,
							onRemove: onRemoveDriveTimeControl
						},
						enabled: (kv.Config.get('hasDriveTime') === 'true'),
						config: {
							position: 'top-right'
						}
					},
					polygonType: data.polygon_type,
					geocoder: {
						handleAddInCallback: false,
						config: {
							placeholder: 'Enter drive time location'
						},
						callback: onAddDriveTimeSearchBar
					},
					// disable map zoom when using scroll
					enableScroll: mapScrollSetting
				};

				function createDriveTimeButton() {
					return $('<button>').addClass('drive-button')
						.append($('<i>').addClass('fa fa-car'))
						.click(function() {
							$('#kv-drive-search').find('.kv-drive-search-form').show();
						}).get(0);
				}

				function onAddDriveTimeControl(map) {
					this.map = map;
					this.container = $('<div>').addClass('mapboxgl-ctrl mapboxgl-ctrl-group')
						.append(createDriveTimeButton()).get(0);
					return this.container;
				}

				function onRemoveDriveTimeControl() {
					this.container.parentNode.removeChild(this.container);
				}

				function onAddDriveTimeSearchBar(geocoder, map) {
					document.getElementById('kv-drive-address-search-bar').appendChild(geocoder.onAdd(map));
				}

				propertyMap = !mapLoaded ? kv.Map.generateMapWithMarkers(createPropertyMarkersData(), mapId, {maxZoom: 16}, controls) : kv.Map.updateMap(propertyMap, createPropertyMarkersData(), polygonUnprocessed, polygonType);

				mapLoaded = true;

				// scale marker on property hover
				/*
				$propertiesContainer.find('.kv-property')
					.mouseenter(function(e) {
						var markerId = $(e.currentTarget).data('marker-id');
						if (parseInt(markerId) !== 0) {
							kv.Map.scaleMarker(propertyMap, markerId);
						}
					})
					.mouseleave(function(e) {
						var markerId = $(e.currentTarget).data('marker-id');
						if (parseInt(markerId) !== 0) {
							kv.Map.unscaleMarker(propertyMap, markerId);
						}
					});
				*/

				$propertiesContainer.find('.kv-property .kv-marker').click(function(e) {
					e.preventDefault();
					e.stopPropagation();

					//kv.Map.zoomToMarker(propertyMap, $(this).data('marker-id'));
				});

				var $driveSearchForm = $propertiesPageContainer.find('.kv-drive-search-form');

				$driveSearchForm.find('.cancel-button').click(function(e) {
					e.stopImmediatePropagation();
					$driveSearchForm.hide();
					kv.Map.removeDrivingLayer(propertyMap);
					drivePolygon = [[]];
					if (!hasData) {
						mapLoaded = false;
					}
					kv.Remote.skipCacheOnNextRequest = true;
					updateListings();
				});

				$driveSearchForm.find('.apply-button').click(function(e) {
					e.stopImmediatePropagation();
					kv.Map.removeDrivingLayer(propertyMap);
					var address = JSON.parse('[{"address": "' + $driveSearchForm.find('#kv-drive-address-search-bar input').val() + '"}]');
					var duration = $driveSearchForm.find('[name="duration"]').val();

					var addressData = {
						namespace: 'default',
						addresses: address,
						page: 1,
						perPage: 1,
						doNotCache: true
					};

					var addressSuccess = function(response) {
						if (!Array.isArray(response.data) || response.data.length !== 1 ||
							typeof response.data[0].lat === 'undefined' ||
							typeof response.data[0].lng === 'undefined') {
							return;
						}
						var drivetimeArgs = {
							duration: duration,
							center: response.data[0].lat + '|' + response.data[0].lng,
							date_time: kv.Date.getNextWednesday(),
							range_type: 'A'
						};
						kv.Remote.get('drivetime-polygon', drivetimeArgs, function(data) {

							if (!Array.isArray(data)) {
								kv.Message.warning('Address is out of reach');
								return;
							}

							for (var y = 0; y < data.length; y++) {
								var lat = Number(data[y][0]);
								var lon = Number(data[y][1]);
								drivePolygon[0][y] = {'lat': lat, 'lon': lon};
							}

							loadDrivingTimePolygons = kv.Map.loadDrivingTimePolygons.bind(
								kv.Map, propertyMap, createPropertyMarkersData(), drivePolygon, duration
							);
							updateListings();
						});

					};
					var addressFail = function() {
						console.log('Address longitude lookup fail');
					};
					kv.Map.getLatLngFromAddress(addressData, addressSuccess, addressFail);
				});
			} else {
				//clean up map w/ no results
				if (currentFilters.layout === 'map') {
					kv.Map.removeAreaPolygon(propertyMap);
					deleteFilter('polygonKey', false);
					if (!kv.isEmpty(propertyMap)) {
						kv.Map.updateMap(propertyMap, null, {});
					}
				}
			}
		}


		firstLoad = false;
		$(document).trigger('properties-loaded');
	}

	function bindDriveTime() {
		if (!kv.isEmpty(drivePolygon[0])) {
			loadDrivingTimePolygons();
		}
	}

	this.addListingToFavoriteAfterLogin = function(selector) {
		kv.Property.addFavoriteCallback.apply($(selector));
	};

	this.propertiesPageRefresh = function() {
		location.reload();
	}

	function setRequestFilters() {
		kv.Remote.addRequestFilter('public/listings', function(requestData) {
			if (!kv.isEmpty(currentFilters.polygon) || (currentFilters.layout === 'map' && !kv.isEmpty(drivePolygon[0]))) {
				requestData.type = 'POST';
				requestData.contentType = 'application/json';

				if (!kv.isEmpty(currentFilters.polygon)) {
					requestData.data = JSON.stringify($.extend(true, {}, requestData.data));
				}

				if (!kv.isEmpty(drivePolygon[0])) {
					requestData.data = JSON.stringify({polygon: drivePolygon});
				}
			}

			return requestData;
		});
	}

	function setDataFilters() {
		kv.Remote.addDataFilter('public/listings', filterListingsData);
		kv.Remote.addDataFilter('public/listings/openHouses', filterListingsData);
		kv.Remote.addDataFilter('public/listings', addCustomData);
		kv.Remote.addDataFilter('public/listings/openHouses', addCustomData);

		kv.Remote.addDataFilter('public/listings/manualListings', filterListingsData);
		kv.Remote.addDataFilter('public/listings/manualListings', addCustomData);
		kv.Remote.addDataFilter('public/listings/manualListings', addCustomManualListingsData);
	}

	function addCustomManualListingsData(data) {
		data.manual_listings_view = true;

		return data;
	}

	function getThisPageResult(myArray, chunk_size, page){
		var index = 0;
		var arrayLength = myArray.length;
		var tempArray = [];
		var chunkSize = Number(chunk_size);

		for (index = 0; index < arrayLength; index = index + chunkSize) {
			myChunk = myArray.slice(index, index+chunkSize);
			tempArray.push(myChunk);
		}
		return tempArray[page - 1];
	}

	function filterListingsData(data) {
		if (kv.isEmpty(data.data)) {
			hasData = false;
		}
		if (typeof currentFilters.layout === 'undefined') {
			var configLayout = kv.Config.get('request', 'args', 'layout');
			var defaultLayout = kv.Config.get('options', 'listings', 'default_to_map_view') === '1' ? 'map' : null;

			currentFilters.layout = currentLayout
				? currentLayout
				: configLayout
					? configLayout
					: defaultLayout
						? defaultLayout
						:'card';
		}

		var hasMapKey = !kv.isEmpty(kv.Config.get('mapsApi'));

		if (currentFilters.layout === 'map' && !hasMapKey) {
			currentFilters.layout = 'card';
		}

		currentLayout = currentFilters.layout;

		data.currentFilters = currentFilters;
		data.filters = {
			order: [
				{
					value: 'visits|desc',
					label: 'Popularity'
				},
				{
					value: 'price|asc',
					label: 'Price Low to High'
				},
				{
					value: 'price|desc',
					label: 'Price High to Low'
				},
				{
					value: 'beds|desc',
					label: 'Beds'
				},
				{
					value: 'baths|desc',
					label: 'Baths'
				},
				{
					value: 'footage|desc',
					label: 'Sq. Footage'
				}
			],
			layout: [
				{
					value: 'card',
					label: '<i class="fa fa-table"></i><span class="kv-pl-1">GRID VIEW</span>'
				}
			]
		};

		if (hasMapKey) {
			data.filters.layout.push({
				value: 'map',
				label: '<i class="fa fa-map"></i><span class="kv-pl-1">MAP VIEW</span>'
			});
		}

		if (currentFilters.layout === 'card') {
			return data;
		} else {
			return getChunkedResults(data, 1, false);
		}		
	}

	function getChunkedResults(data, page, DoNotRefreshMapFlag) {
		//we used to get just the results per page basis with every call now we get 800 and divide the result set for pagination		
		//pagination data from api is incorrect the way we are doing this have to override those values
		var thePage = 1;
		window.DoNotRefreshMapFlag = DoNotRefreshMapFlag;
		if (currentFilters.layout === 'card') {
			thePage = currentFilters.page;
		}
		if (currentFilters.layout === 'map') {
			if (page) {
				thePage = page;
			} else {
				thePage = 1;
			}
		}

		perpageUserSet = kv.Config.get('options', 'listings', 'per_page' ) !== null ? kv.Config.get('options', 'listings', 'per_page' ) : 24;

		if(data.currentFilters.perPage){
			perpageUserSet = data.currentFilters.perPage;
		}

		if (!kv.isEmpty(data.data)) {
			var totalRecords = data.data.length;
			data.from = (thePage - 1) * perpageUserSet + 1;
			data.to = totalRecords;

			if (perpageUserSet < totalRecords) {
				data.to = perpageUserSet * thePage;
				if (data.to > totalRecords) {
					data.to = totalRecords;
				}
			}
			data.total = data.recordsTotal;

			//if passing as public/listings/similar this is undefined workaround
			if (!data.recordsTotal) {
				data.recordsTotal = totalRecords;
			}

			data.notShowSold = obscureSoldData();
			propertiesFullList = data.data.map(kv.Property.addCustomData);
			var chunkedResult = getThisPageResult(data.data, perpageUserSet, thePage);
			data.data = chunkedResult;

			var records = data.currentFilters.perPage;
			var pagination = Math.ceil(totalRecords / records);
			data.last_page = pagination;

			if (currentFilters.layout === 'map') {
				data.total = totalRecords;
			}

		}
		return data;
	}

	function addCustomData(data) {
		if ('undefined' !== typeof(data.data) && 'function' === typeof(data.data.map)) {
			data.data.map(kv.Property.addCustomData);
		}

		return data;
	}

	this.getAllowedFiltersCount = function(formData) {
		var filters = $.extend({}, additionalFilters);
		var values = Object.keys(filters).map(function(key) { return filters[key]; });
		var count = 0;

		//when no url parameters this will need to set to account for propertyTypes defaulting to being set
		if (formData.length === 0) {
			count = 1;
		}

		var filtersCount = values.filter(function(filter) {
			var filterValue = false;
			if (Object.keys(formData).indexOf(filter) !== -1) {
				filterValue = formData[filter];
			} else if (Object.keys(formData).indexOf(filter + '[]') !== -1) {
				filterValue = formData[filter + '[]'];
			}
			
			if (!filterValue || filterValue === '' || filterValue === '0') {
				return false;
			}
			return filterValue;
		});

		count = count + filtersCount.length;

		if (formData.options || formData.propertyViews || formData.stories) {
			count = count + optionsTally(formData);
		}

		if (kvCORE.Config.get('popularOptions') && formData.keywords) {
			count = count + popularOptionsTally(kvCORE.Config.get('popularOptions'), formData);
		}

		return count;
	};


	function popularOptionsTally(popularOptions, formData) {
		var count = 0;
		var weShouldDecrement = false;
		for (var i = 0; i < popularOptions.length; i++) {
			var checked = $('#dataset-popularoptions' + i).find('input:checked').length;
			if (checked > 0) {
				weShouldDecrement = true;
				count++;
			}
		}
		//keywords already count as one so we have to adjust here
		var keywordsBarIsChecked = $('#dataset-keywords').find('input:checked').length > 0;
		if (weShouldDecrement && !keywordsBarIsChecked) {
			count--;
		}
		return count; 
	}

	function optionsTally(formData) {
		var count = 0;
		//propertyViews, options, stories all into one
		var optionsArr = formData.options ? formData.options : [];
		var propertyViewsArr = formData.propertyViews ? formData.propertyViews : [];
		var storiesArr = formData.stories ? formData.stories : [];
		var allOptions = optionsArr.concat(propertyViewsArr, storiesArr);

		//options, propertyViews, stories already counted earlier so have to adjust here
		if (optionsArr.length > 0) { count--; }
		if (propertyViewsArr.length > 0) { count--; }
		if (storiesArr.length > 0) { count--; }

		var general = ['justListed', 'walkable', 'fixerUpper', 'newlyBuilt', 'openHouse', 'adult', 'green', 'horse', 'golf', 'pool', 'waterfront', 'waterView', 'views'];
		var financial = ['reduced', 'foreclosures', 'shortSales', 'notdistresssed', 'leasetoown', 'hoa', 'sellerfinance'];
		var structural = ['fireplace', '1garage', '2garage', '3garage', 'deck', 'basement', 'masterOnMain', 'airConditioner', '1story', '2story', '3story'];
		var rental = ['furnished', 'allowsPets'];

		var generalCheck = general.filter(function(n) {
			return allOptions.indexOf(n) !== -1;
		});
		if (generalCheck.length > 0) { count++; }

		var financialCheck = financial.filter(function(n) {
			return allOptions.indexOf(n) !== -1;
		});
		if (financialCheck.length > 0) { count++; }

		var structuralCheck = structural.filter(function(n) {
			return allOptions.indexOf(n) !== -1;
		});
		if (structuralCheck.length > 0) { count++; }
		
		var rentalCheck = rental.filter(function(n) {
			return allOptions.indexOf(n) !== -1;
		});
		if (rentalCheck.length > 0) { count++; }
		return count;
	}

	function createPropertyMarkersData() {
		return propertiesFullList.filter(function(property) {
			return property.lat !== 0 && property.long !== 0 && property.lat !== undefined && property.long !== undefined && property.zip !== '00000' && property.state !== 'PR' && property.state !== 'DR' && property.state !== 'CostaR' && property.state !== 'OC' && property.state !== '';
			}).map(function(property) {
			//these logos look bad on black background
			var mlsLogoList = [49,21,65,103,131,133];
			var showWhiteBackLogo = mlsLogoList.includes(property.mls);
			var logoClassName;

			if (showWhiteBackLogo === true) {
				var logoClassName = "-white";
			}
			var mapPopupTemplate = obscureSoldData() ? 'mapbox-popup-sold-blocked' : 'mapbox-popup';
			var popupData = {
				address: property.address,
				addtoresults: property.addtoresults,
				agentname: property.agentname,
				brokername: property.brokername,
				baths: property.baths,
				beds: property.beds,
				showlogoresults: property.showlogoresults,
				mls: property.mls,
				logoClassName: logoClassName,
				id: property.mlsid,
				link: property.detail_url,
				price: property.price ? property.price.toLocaleString('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0}) : property.price,
				sqft: property.footage ? property.footage.toLocaleString('en-US', {style: 'decimal'}) : property.footage,
				template: mapPopupTemplate,
				thumbnail: property.coverphoto_thumbnail_url,
				popupOptions: {
					closeButton: false,
					offset: 12
				}
			}
			var mapPopupTemplate = obscureSoldData() ? 'mapbox-popup-sold-blocked' : 'mapbox-popup';
			var priceConverted = kv.String.abbreviateNumber(property.price);
			return {lat: property.lat, lng: property.long, priceAbbreviated: priceConverted, popupData: popupData};
		});
	}

	function polygonRender(draw) {
		if (!draw) {
			return;
		}

		var drawAll = draw.getAll();
		var mode = draw.getMode();

		if (mode === 'draw_polygon') {
			//while drawing disable popups
			$('.kv-marker').bind( "click", function(event) {
				event.stopPropagation();
				event.preventDefault();
				return false;
			});
		}

		if (typeof drawAll.features === 'undefined' || !Array.isArray(drawAll.features)) {
			return;
		}
		var featuresLength = drawAll.features.length;

		var $trashControl = $('.mapbox-gl-draw_trash');
		var trashControlIsVisible = $trashControl.is(':visible');

		if (featuresLength > 0) {
			if (!trashControlIsVisible) {
				$trashControl.show();
			}
		} else {
			if (trashControlIsVisible) {
				$trashControl.hide();
			}
		}

		var $polygonControl = $('.mapbox-gl-draw_polygon');
		var polygonControlIsVisible = $polygonControl.is(':visible');

		if (featuresLength >= 2) {
			if (polygonControlIsVisible) {
				$polygonControl.hide();
			}
		} else {
			if (!polygonControlIsVisible) {
				$polygonControl.show();
			}
		}
	}

	function polygonUpdate(draw) {
		//draw is finished reenable click action
		$('.kv-marker').unbind( "click", function() {});
		//area exists then polygon drawn causes area and drawn polygon both fix
		deleteFilter('area', false);
		deleteFilter('area[]', false);
		kv.MultipleSelect.clearMultiSelect($('#container-area'));
		if (currentFilters.polygonKey) {
			//when polygon draw success polygons should be removed
			kv.Map.removeAreaPolygon(propertyMap);
			deleteFilter('polygonKey', false);
		}
		if (!draw) {
			return;
		}

		var drawAll = draw.getAll();

		if (typeof drawAll.features === 'undefined' || !Array.isArray(drawAll.features)) {
			return;
		}

		var featuresLength = drawAll.features.length;

		if (featuresLength === 0) {
			polygon = null;
			return;
		}

		var foundPolygons = [];

		drawAll.features.forEach(function(feature) {
			if (typeof feature.geometry === 'undefined' || typeof feature.geometry.coordinates === 'undefined' ||
				feature.geometry.type !== 'Polygon' ||
				!Array.isArray(feature.geometry.coordinates) || feature.geometry.coordinates.length === 0
			) {
				return;
			}

			var coordinates = [];

			feature.geometry.coordinates[0].forEach(function(coordinate) {
				coordinates.push({lat: coordinate[1], lon: coordinate[0]});
			});

			foundPolygons.push(coordinates);
		});

		updateFilter('polygon', foundPolygons);
		polygon = foundPolygons;
	}

	function  addShortcodeData(data) {
		shortcodeFilters = $.extend({}, data.currentFilters);
		Object.keys(shortcodeFilters).map(function(key) {
			if (nonShortcodeFilters.indexOf(key) !== -1) {
				delete shortcodeFilters[key];
			}
			if (key === 'limit' ) {
				shortcodeFilters.perPage = shortcodeFilters.limit;
				delete shortcodeFilters.limit;
			}
		});

		if (kv.Config.compare('isAdmin', 'true') && !kv.isEmpty(shortcodeFilters)) {
			var filterParts = [];
			for (var key in shortcodeFilters) {
				if (!shortcodeFilters.hasOwnProperty(key)) {
					continue;
				}

				var value = shortcodeFilters[key];
				//brackets in a shortcode not good fix
				if (key === 'area[]') {
					key = 'area';
				}
				
				if (key === 'actualtypes') {
					key = 'propertyTypes';
				}
				
				if (key === 'polygon') {
					var escaped = JSON.stringify(value).replace(/\[/g, '<').replace(/]/g, '>').replace(/"/g, "'");
					filterParts.push(key + '="' + escaped + '"');
				} else if (Array.isArray(value)) {
					filterParts.push(key + '="' + value.join(';') + '"');
				} else {
					filterParts.push(key + '="' + value + '"');
				}
			}

			data.shortcodeStr = '[kvcoreidx_listings ' + filterParts.join(' ') + ']';
		}
	}

	if ($marketReportModal.length && !$marketReportModal.hasClass('show')) {
		$marketReportModal.kvModal('show');
	}

	loadPage();
}(jQuery, kvCORE, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : {}));
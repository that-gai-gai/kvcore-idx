kvCORE.MarketReport = (new function($, kv) {
	var $marketReportPage = $('#kvcoreidx-market-report');
	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	var isValuation = $marketReportPage.data('attributes')['is_valuation'] === true;
	var areaType = null;
	var args = {};

	this.loadPage = function() {
		if (!$marketReportPage.hasClass(loadingCenter)) {
			$marketReportPage.addClass(loadingCenter);
		}
		//it checks lead id before cookie leadid cookie set
		var self = this;
		setTimeout(function () {
			if (!kv.User.getLeadId()) {
				kv.Login.showModal(true);
				kv.Login.loginQueue.add({obj: 'MarketReport', method: 'loadPage'});
				$marketReportPage.removeClass(loadingCenter);
				return;
			}
	
			if (isValuation) {
				loadValuationReport();
			} else {
				self.loadMarketReport();
			}
		}, 800);
		
	};

	this.loadMarketReport = function(params) {
		if (kv.isEmpty(params)) {
			params = kv.Config.get('request', 'args');
		} else {
			var page = kv.Config.get('pages', 'market_report');
			history.pushState({}, 'Market Report', page + '?' + $.param(params));
		}
		var args = getParams(params);	

		if (args) {
			kv.Remote.get('marketreport/' + kv.User.getLeadId(), args, marketReportCallback);
		} else {
			$marketReportPage.removeClass(loadingCenter);
		}
		
	};

	function getParams(params) {
		if (params.length === 0) {
			return null;
		}
		if (params.report) {
			areaType = Object.keys(params.report)[0]; //whatever key name is
			var areaName = params.report[areaType];
			var state = params.report.state;

		} else {
			var area = params.area;
			var state = params.state;

			var areaSplit = area.split(':');
			if (areaSplit.length === 1) {
				areaSplit = area.split('|');
			}
			areaType = areaSplit[0];
			var areaName = areaSplit[1];
		}

		// maybe remove state
		if (areaName.indexOf(',') !== -1 && areaName.indexOf(',') >= areaName.length - 5) {
			areaName = areaName.split(',')[0];
		}

		args = {};
		args[areaType] = areaName;
		if (state) {
			args.state = state;
		}
		return args;
		
	};

	function loadValuationReport() {
		areaType = 'zip';
		kv.Remote.get('marketreport/' + kv.User.getLeadId(), {}, marketReportCallback);
	}

	function marketReportCallback(response) {

		if (kv.isEmpty(response['market_data'])) {
			$marketReportPage.removeClass(loadingCenter);
			if (typeof response.error === 'string' && !kv.isEmpty(response.error)) {
				kv.View.render('market-report', {error: response.error}, $marketReportPage);
			} 
			if (typeof response.responseText === 'string' && !kv.isEmpty(response.responseText)) {
				kv.View.render('market-report', {error: response.responseText}, $marketReportPage);
			}
			return;
		}
		
		if (kv.isEmpty(response['market_data'][areaType])) {
			$marketReportPage.removeClass(loadingCenter);
			kv.View.render('market-report', {error: 'No market report exists'}, $marketReportPage);
			return;
		}
		

		response.areaType = areaType;
		response.area = kv.String.capitalizeFirstLettersOfLongWords(response['market_data'][areaType]);
		response.propertiesUrl = kv.Config.get('pages', 'properties') + '?area=' + response.areaType + '|' + response.area;

		// populate listings with links to detail pages and processed addresses
		var listings = response['market_data']['recent_listings'].concat(
			[response['market_data']['most_expensive']],
			response['market_data']['hot_listings']
		);

		if (!kv.isEmpty(listings[0]) && listings.length !== 0) {
			listings.map(kv.Property.addCustomData).map(function(listing) {
				var full_address = [
					kv.String.capitalizeFirstLettersOfLongWords(listing.address), listing.city, listing.state, listing.zip
				].filter(function(value) {
					return !kv.isEmpty(value);
				});

				listing.full_address = full_address.join(', ');
			});

			response.hasListings = true;
		} else {
			response.hasListings = false;
		}

		kv.View.render('market-report', response, $marketReportPage, bindMarketReport);
	}

	function bindMarketReport(viewName, data) {
		$marketReportPage.removeClass(loadingCenter);
		if (data.areaType === 'city' && data.market_data.state) {
			var areaPassed = data.market_data.city + ' ' + data.market_data.state;
		} else {
			var areaPassed = data.area;
		}

		displayMap(isValuation ? data['valuation'].address : areaPassed);

		kv.Remote.post('marketreport/viewed/' + kv.User.getLeadId(), args);

		$('.kv-mr-subscribe-button').click(function() {
			if (isValuation) {
				args = {zip: data['market_data'].zip};
			} else if (typeof args.zip !== 'undefined') {
				delete args.state;
			}

			kv.Remote.post('marketreport/subscribe/' + kv.User.getLeadId(), args, function(response) {
				if (typeof response.success !== 'undefined' && response.success === true) {
					kv.Message.success('You\'ve been subscribed to this area report');
				} else {
					kv.Message.error('Error subscribing to this area report', 'Please try again later');
				}
			});
		});
	}

	function displayMap(area) {
		var mapboxArea = {};
		mapboxArea[areaType] = area;

		var addressData = {addresses: mapboxArea, hash: kv.getHash(mapboxArea, true)};
		var addressSuccess = function(response) {
			if (!Array.isArray(response.data) || response.data.length !== 1 ||
				typeof response.data[0].lat === 'undefined' ||
				typeof response.data[0].lng === 'undefined') {
				removeMapContainer();
				return;
			}

			var lat = response.data[0].lat;
			var lng = response.data[0].lng;

			var controls = {
				zoom: true,
				fullscreen: true
			}

			kv.Map.generateMapWithMarker(lat, lng, null, 'kv-market-report-map', {}, controls);
		};
		var removeMapContainer = function() {
			$('.kv-mr-map-container').remove();
		};

		kv.Map.getLatLngFromAddress(addressData, addressSuccess, removeMapContainer);
	}

	this.loadPage();
}(jQuery, kvCORE));
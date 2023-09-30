kvCORE.PropertiesAlerts = (new function ($, kv) {
	var $propertiesAlertsContainer = $('#kv-properties-alerts');
	var $form = $('#kv-properties-search-form');
	var $loginModal = $('#modal--login');

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass;

	var form = kv.Form.toArray($form.get(0));
	var source = {};
	var userAlerts = null;
	var search = null;
	var searchSave = null;
	var savedAlert = null;
	var retrySave = false;

	function getUserAlerts() {
		if (kv.User.getLeadId() === null) {
			return;
		}
		kv.Remote.get('public/alerts', {lead_id: kv.User.getLeadId()}, compareSearchWithUserAlerts);
	}

	function get(name, validate, convert) {
		var result = null;

		if (typeof source[name] === 'undefined' || !source[name]) {
			var arrayName = name + '[]';
			result = source[arrayName];

			if (typeof source[arrayName] === 'undefined' || !source[arrayName]) {
				result = null;
			} else if (typeof source[arrayName] === 'string') {
				name = arrayName;
				result = source[name].split(';');
			}
		} else {
			result = source[name];
		}

		result = Array.isArray(result) ? result.sort() : result;

		if (typeof validate === 'function' && !validate(result)) {
			return null;
		}

		if (typeof convert === 'function') {
			result = convert(result);
		}

		return result;
	}

	function compareSearchWithUserAlerts(alertsApi, code) {
		var isCachedResponse = typeof(code) === 'undefined' && Array.isArray(alertsApi);
		if (!isCachedResponse && code !== 200) {
			console.warn('User has no saved searches or Alerts API not available');
			return;
		}

		userAlerts = alertsApi;

		source = form;

		var parseNumber = function(number) {
			return number ? parseInt(number) : 0;
		};

		search = {
			lead_id: kv.User.getLeadId(),
			areas: get('area', function(areas) { return Array.isArray(areas); }, undefined),
			types: get(
				'propertyTypes',
				function(types) {
					return Array.isArray(types)
						? types.length !== 0
						: parseInt(types);
				},
				function(types) {
					return Array.isArray(types)
						? types.map(function(type) { return parseInt(type); })
						: parseInt(types);
				}
			),
			extras: get(
				'options',
				function(extras) {
					return Array.isArray(extras)
						? extras.length !== 0
						: typeof extras === 'string';
				},
				undefined
			) || [],
			beds: get('beds', undefined, parseNumber),
			baths: get('baths', undefined, parseNumber),
			min: get('priceMin', undefined, parseNumber),
			max: get('priceMax', undefined, parseNumber)
		};

		if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1' && !kv.isEmpty(source.polygonKey[0])) {
			search.polygonKey = source.polygonKey[0];
		}

		var searchJson = JSON.stringify(search);

		savedAlert = null;

		for (var alertApiIndex in alertsApi) {
			if (!alertsApi.hasOwnProperty(alertApiIndex)) {
				continue;
			}

			var alertApi = alertsApi[alertApiIndex];

			var alert = {
				lead_id: alertApi['contact_id'],
				areas: alertApi['areas'].map(function(area) { return area.type + '|' + area.name }).sort(),
				types: alertApi['types'].map(function(type) { return type.id }).sort(),
				extras: JSON.parse(alertApi['options']).sort(),
				beds: alertApi['beds'],
				baths: alertApi['baths'],
				min: alertApi['min_price'],
				max: alertApi['max_price']
			};

			if (JSON.stringify(alert) === searchJson) {
				savedAlert = alertApi;
				break;
			}
		}

		if (retrySave) {
			retrySave = false;
			saveSearch();
		}

		loadTemplate();
	}

	function loadTemplate() {
		$propertiesAlertsContainer.addClass(loadingWithMarginClass);

		var data = {
			alertId: savedAlert !== null ? savedAlert.id : null
		};

		kv.View.render('properties-alerts', data, $propertiesAlertsContainer, callback);
	}

	function callback(viewName, data, target) {
		var nestedTemplate = $propertiesAlertsContainer.find('.profile-alerts-link');
		$propertiesAlertsContainer.html(nestedTemplate);
		$propertiesAlertsContainer.removeClass(loadingWithMarginClass);
		bind(target);
	}

	function bind(target) {
		target.find('button.profile-alerts-link').click(saveSearch);
	}

	function validateSearch() {
		searchSave = jQuery.extend(true, {}, search);

		if (kv.User.getLeadId() === null) {
			kv.Message.info('Please log in');
			if ($loginModal.length > 0) {
				$loginModal.kvModal('show');
			}
			$(document).on('kvcoreidx-login-modal-hide', function() {
				retrySave = true;
				getUserAlerts();
			});
			return false;
		}

		if (searchSave === null) {
			retrySave = true;
			getUserAlerts();
			return false;
		}
		
		if (searchSave.areas !== null) {
			searchSave.areas = searchSave.areas.map(function(area) {
				var areaSplit = area.split('|');
				var areaStateSplit = areaSplit[1].split(",");
				areaSplit[1] = areaSplit[1].slice(0, -3);
				var capitalizedResult = areaSplit[1].split(" ");
				for (var i = 0; i < capitalizedResult.length; i++) {
					capitalizedResult[i] = capitalizedResult[i][0].toUpperCase() + capitalizedResult[i].substr(1);
				}
				capitalizedResult.join(" ");

				return areaSplit[0] + ':' + capitalizedResult + ':' + areaStateSplit[1].toUpperCase();
			});
		}

		if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
			//display is a required field when passing polygon areas
			searchSave.display = searchSave.areas[0];
		}

		if (searchSave.types && searchSave.types.length === 0) {
			searchSave.types = null;
		}

		var hasErrors = false;

		for (var fieldIndex in searchSave) {
			if (!searchSave.hasOwnProperty(fieldIndex)) {
				continue;
			}

			var field = searchSave[fieldIndex];

			if (field !== null && field !== 0) {
				continue;
			}

			switch (fieldIndex) {
				case 'lead_id':
					kv.Message.warning('Please log in', 'You should be logged in to save your search', undefined, 6000);
					hasErrors = true;
					break;
				case 'areas':
					var warningMessage = '';

					if ( "1" === kv.Config.get('options', 'optimize_for_canada') ) {
						warningMessage = 'You must include an area, city or postal code in order to save your search';
					} else {
						warningMessage = 'You must include an area, city or zip code in order to save your search';
					}


					kv.Message.warning(
						'Please choose an area',
						warningMessage,
						undefined,
						6000
					);
					hasErrors = true;
					break;
				case 'types': searchSave['types'] = [1]; $('#propertyTypes-1:not(:checked)').click(); $form.trigger('change'); break;
				case 'extras': searchSave['extras'] = ['none']; break;
				case 'beds': searchSave['beds'] = 1; $('#kv-filters-beds-1').click(); break;
				case 'baths': searchSave['baths'] = 1; $('#kv-filters-baths-1').click(); break;
				case 'min':
					searchSave['min'] = 25000;
					$('#kv-radio-container-priceMin').find('input[data-value="25000"]').click();
					break;
				case 'max':
					searchSave['max'] = 5000000;
					$('#kv-radio-container-priceMax').find('input[data-value="500000"]').click();
					break;
			}
		}

		return !hasErrors;
	}

	function saveSearch() {
		if (!validateSearch()) {
			return;
		}
		if (userAlerts.length > 1) {
			//kv.Message.info('Sorry, you cannot create anymore saved searches');
			kv.Message.info('Please delete one saved search to create a new one');
			return;
		}

		searchSave.freq = 'Daily';

		searchSave.alert_number = 1;
		if (userAlerts !== null && userAlerts.length > 0) {
			var lastSavedAlert  = userAlerts[0];
			searchSave.alert_number = (lastSavedAlert.number == 2 ? 1 : 2);
		}

		kv.Remote.put('public/alerts', searchSave, function(response) {
			if (typeof response.success !== 'undefined' && response.success === true) {
				kv.Message.success('Search saved successfully');
				kv.Remote.skipCacheOnNextRequest = true;
				getUserAlerts();
			} else {
				kv.Message.error('Search not saved');
			}
		});
	}

	this.updateSearch = function(formEl) {
		var formObject = kv.Form.toArray(formEl);
		if (Object.keys(formObject).length === 0 || JSON.stringify(form) === JSON.stringify(formObject)) {
			return;
		}
		form = formObject;
		getUserAlerts();
	};

	$(document).on('kv-properties-search-loaded properties-loaded', function() {
		$propertiesAlertsContainer = $('#kv-properties-alerts');
		$form = $('#kv-properties-search-form');
		$loginModal = $('#modal--login');

		if ($form.length === 0) {
			return;
		}

		form = kv.Form.toArray($form.get(0));

		getUserAlerts();
		loadTemplate();
	});
}(jQuery, kvCORE));
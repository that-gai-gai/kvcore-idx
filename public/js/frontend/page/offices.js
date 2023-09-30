kvCORE.Offices = (new function($, kv) {
	var $officesPage = $('#kvcoreidx-offices-page');
	var $officesPageResults = $('#kvcoreidx-offices-page--results');
	var $officesPageHeader = $('#kvcoreidx-offices-page--header');

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass + ' ' + loadingClass + '-mh';

	var wildcardQueryCharacter = '*';
	var defaultQuery = '*';
	var officesMap = null;

	var officesListEndpoint = 'public/entity/list';

	var shortcodeFiltersMap = {
		perrow: 'perRow',
		perpage: 'perPage'
	};

	var currentFilters = {};

	var initialFilters = {
		page: 1,
		perRow: '4',
		perPage: 48,
		query: defaultQuery,
		order: 'relevance|desc'
	};

	function getShortcodeFilters() {
		var shortcodeAttrs = $officesPage.data('attributes');
		for (var attrKey in shortcodeAttrs) {
			if (!shortcodeAttrs.hasOwnProperty(attrKey) || !shortcodeFiltersMap.hasOwnProperty(attrKey)) {
				continue;
			}

			shortcodeAttrs[shortcodeFiltersMap[attrKey]] = shortcodeAttrs[attrKey];
			delete shortcodeAttrs[attrKey];
		}
		return shortcodeAttrs;
	}

	function loadPage() {
		var configDefaultFilters = kv.getUsableObject(kv.Config.get('defaultTeamFilters'));
		var containerFilters = kv.getUsableObject(getShortcodeFilters());

		currentFilters = $.extend(true, currentFilters, initialFilters, configDefaultFilters, containerFilters);

		// convert to int
		for (var filterKey in currentFilters) {
			if (!currentFilters.hasOwnProperty(filterKey)) {
				continue;
			}

			if (typeof initialFilters[filterKey] === 'number') {
				currentFilters[filterKey] = parseInt(currentFilters[filterKey], 10);
			}
		}

		setDataFilters();

		displayOffices();
	}

	function setDataFilters() {
		kv.Remote.addDataFilter(officesListEndpoint, formatOfficesData);
	}

	function displayOffices() {
		if (kv.Search.datasetExists(officesListEndpoint)) {
			updateOfficesList();
		} else {
			kv.View.renderAjax('offices', officesListEndpoint, {}, $officesPageResults, bindOfficesPageResults);
		}

		bindOfficesPage($officesPage);
	}

	function updateOfficesList() {
		var searchResults = kv.Search.search(
			officesListEndpoint, currentFilters.query, currentFilters.perPage, currentFilters.page, currentFilters.order
		);

		kv.View.render(
			'offices',
			formatResultData(searchResults),
			$officesPageResults,
			bindOfficesPageResults
		);
	}

	function formatResultData(data) {
		data.currentFilters = currentFilters;

		return data;
	}

	function bindOfficesPage(target) {
		var $officesOfficeFiltersForm = target.find('#kv-offices-filters-form');
		var $searchBox = $officesOfficeFiltersForm.find('[name="search"]');

		$searchBox.on('keyup', function() {
			var search = $(this).val();

			$('[name="filter[first-letter][]"]').removeAttr('checked');
			$('#kv-filter-first-letter-all').attr('checked', 'checked');

			search = search.replace(/\s+/, '');

			if (search) {
				// append wildcard if none already
				// in search string
				if (-1 === search.indexOf(wildcardQueryCharacter) && -1 === search.indexOf(':')) {
					search = wildcardQueryCharacter + search + wildcardQueryCharacter;
				}
			} else {
				search = defaultQuery;
			}

			if (search !== currentFilters.query && ':' !== search[search.length - 1]) {
				currentFilters.query = search;
				currentFilters.page = 1;

				try {
					updateOfficesList();
				} catch (e) {
					// search query error
					// due to bad search string
				}
			}
		});

		$officesOfficeFiltersForm.find('select, [type="checkbox"], [type="radio"]').change(function() {
			var $this = $(this);
			var name = $this.attr('name');
			var value = $this.val();
			var data = getFilterNameAndValueByFormField(name, value);

			if ('undefined' !== typeof(data.name) && 'undefined' !== typeof(data.value)) {
				updateFilter('page', 1);
				updateFilter(data.name, data.value);
			} else {
				updateFilter(name, value);
			}
		});
	}

	function getFilterNameAndValueByFormField(name, value) {
		var result = {};

		switch (true) {
			case -1 !== name.indexOf('filter[first-letter]'):
				result.name = 'query';

				var firstLetterFilterField = kvCORE.Config.get('options', 'team', 'filter_offices_by' );

				if ( ! firstLetterFilterField ) {
					firstLetterFilterField = 'city';
				}

				if (value) {
					result.value = firstLetterFilterField + ':' + value;
				} else {
					result.value = value;
				}

				result.value += wildcardQueryCharacter;
				break;

			default:
				var match = /filter\[([^\]]+)]\[]/gi.exec(name);

				if (Array.isArray(match) && 'undefined' !== typeof(match[1]) && match[1]) {
					result = {
						name: match[1],
						value: value
					};
				}
				break;
		}

		return result;
	}

	function bindOfficesPageResults(viewName, data, target) {
		generateOfficesHeader(data);

		var $changePageForm = target.find('.kv-offices-filters');

		$changePageForm.find('select, [type="checkbox"], [type="radio"]').unbind().change(function() {
			var $this = $(this);
			var name = $this.attr('name');
			var value = $this.val();

			target.addClass(loadingWithMarginClass);

			kv.DOM.scrollToElement(target, function() {
				updateFilter(name, value);
			});
		});

		$officesPageResults.removeClass(loadingWithMarginClass);
	}

	function updateFilter(name, value, runUpdate) {
		if ('undefined' !== typeof(name)) {
			if ('undefined' === typeof(value) || !value) {
				deleteFilter(name);
			} else {
				switch (name) {
					case 'page':
					case 'perPage':
						// JS assumes base-8 numbers by default,
						// so we have to specify base-10 (decimal)
						value = parseInt(value, 10);
				}

				currentFilters[name] = value;
			}

			if ('undefined' !== typeof(runUpdate) || false !== runUpdate) {
				updateOfficesList();
			}
		}
	}

	function deleteFilter(name, runUpdate) {
		if ('undefined' !== typeof(currentFilters[name])) {
			delete currentFilters[name];

			if ('undefined' !== typeof(runUpdate) || false !== runUpdate) {
				updateOfficesList();
			}
		}
	}

	function generateOfficesHeader(data) {
		if ('undefined' !== typeof(data.data)) {
			var $mapTarget = $officesPageHeader.find('.kv-map');

			if (kvCORE.Config.get('options', 'team', 'do_not_display_map_offices_page') === '1') {
				$officesPageHeader.hide();
				return;
			}

			if (!$mapTarget.length) {
				return;
			}

			var addressData = {
				namespace: 'office',
				addresses: data.data,
				page: currentFilters.page,
				perPage: currentFilters.perPage
			};
			var addressSuccess = function(result) {
				if ('undefined' !== typeof(data.data) && Array.isArray(data.data)) {
					var id = $mapTarget.attr('id');

					if (!id) {
						id = 'kvcoreidx-map-' + Math.random().toString(36).replace(/[^a-z]+/g, '');

						$mapTarget.attr('id', id);
					}

					result.data.map(function(item) {
						var popupData = JSON.parse(JSON.stringify(item));
						popupData.template = 'offices-mapbox-popup';

						item.popupData = popupData;

						return item;
					});

					var $targetParent = $mapTarget.closest('.kv-offices-map-container');

					if ($targetParent && $targetParent.hasClass(loadingClass)) {
						$targetParent.removeClass(loadingClass);
					}

					officesMap = !officesMap
						? kv.Map.generateMapWithMarkers(result.data, id)
						: kv.Map.updateMap(officesMap, result.data);
				}
			};
			var removeMapContainer = function() {
				var $targetParent = $mapTarget.closest('.kv-offices-container');

				if ($targetParent && $targetParent.hasClass(loadingClass)) {
					$targetParent.removeClass(loadingClass);
				}

				$mapTarget.hide();
			};

			kv.Map.getLatLngFromAddress(addressData, addressSuccess, removeMapContainer);
		} else {
			$officesPageHeader.addClass('kv-hidden');
		}
	}

	function formatOfficesData(data) {
		var result = {};

		if ('undefined' !== typeof(data.data)) {
			data.data.map(addOfficesCustomData);

			kv.orderArrayByKey(data.data, 'name');

			// create search index
			kv.Search.addDataset(officesListEndpoint, data.data, {
				name: 10,
				address: 10,
				city: 10,
				zip: 5,
				website_url: false
			});

			// get first page of unfiltered results
			result = kv.Search.search(officesListEndpoint, currentFilters.query, currentFilters.perPage, currentFilters.page, currentFilters.order);
		}

		result.currentFilters = currentFilters;

		return result;
	}

	function addOfficesCustomData(office) {
		if ('undefined' === typeof(office.website_url) || '' === office.website_url) {
			office.website_url = office.profile_url;
		} else if (-1 === office.website_url.indexOf('://')) {
			office.website_url = 'https://' + office.website_url;
		}

		if ('undefined' === typeof(office.business_photo) || '' === office.business_photo) {
			if ('undefined' !== typeof(office.photo)) {
				office.business_photo = office.photo;
			}
		}

		if ('object' !== typeof(office.social)) {
			office.social = {};
		}

		if (kv.isUsableObject(office.social)) {
			var social = {};

			Object.keys(office.social).forEach(function(key) {
				if (office.social[key]) {
					social[key] = office.social[key];
				}
			});

			office.social = social;
		}

		return office;
	}

	if ($officesPageResults.length) {
		$officesPageResults.addClass(loadingWithMarginClass);
		loadPage();
	}
}(jQuery, kvCORE));

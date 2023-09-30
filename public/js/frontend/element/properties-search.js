kvCORE.PropertiesSearch = (new function ($, kv, p) {
	var $searchContainer = $('#kvcoreidx-properties-search');

	if ($searchContainer.length === 0) {
		return;
	}
	var isCanada = kv.Config.get('options', 'optimize_for_canada');
	var authToken = kv.Config.get('options', 'authorization_token');

	// variable to check for Johnston and Daniel
	var JOHNSTON_AND_DANIEL = 'c299558a-0fb3-4981-8cce-78bb904e3097';

	var context = $searchContainer.data('context');

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass + ' ' + loadingClass + '-mh';

	var blocks = {
		areas: 'public/listings/areas',
		propertyTypes: getSupportedTypes(),
		styles: getStyles(),
		options: getFeatures(),
		propertyViews: getViews(),
		buildingStyles: getBuildingStyles(),
		keywords: 'public/listings/keywords',
		agents: 'public/members/simplelist'
	};

	//setup popularoptions blocks
	if (kvCORE.Config.get('popularOptions')) {
		for (var i = 0; i < kvCORE.Config.get('popularOptions').length; i++) {
			blocks['popularoptions'+i] = 'public/listings/popularoptions?option='+kvCORE.Config.get('popularOptions')[i];
			kv.Remote.addStoredEndpoints([blocks['popularoptions'+i]]);
		}
	}

	var blocksLoaded = 0;

	function loadPage() {
		setDataFilters();

		displaySearchForm();

		kv.Remote.addStoredEndpoints([blocks.areas, blocks.propertyTypes, blocks.agents, blocks.keywords]);
	}

	function setPopularOptionsFilters(item, iteration) {
		var dynamicIdName = 'popularoptions'+iteration;
		kv.Remote.addDataFilter(blocks['popularoptions'+iteration], function(origData) {
			var data = {
				id: dynamicIdName,
				name: item,
				order: 'count|desc',
				defaultValue: kv.Config.get('request', 'converted', 'searchString'),
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(blocks['popularoptions'+iteration], {query: query}, function(response) {
						callback(response.popularoptions);
					});
				}
			};
			data[dynamicIdName] = origData.popularoptions;

			return $.extend(origData, data);
		});
	}

	function setDataFilters() {
		kv.Remote.addDataFilter(blocks.keywords, function(origData) {
			var processKeywords = function(origData) {
				return origData.keywords;
			}
			var data = {
				keywords: processKeywords(origData),
				id: 'keywords',
				name: 'Keywords',
				order: 'count|desc',
				defaultValue: kv.Config.get('request', 'converted', 'searchString'),
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(blocks.keywords, {query: query}, function(response) {
						callback(processKeywords(response));
					});
				}
			};

			return $.extend(origData, data);
		});
		kv.Remote.onSuccessRequest(blocks.areas, 'get', function(response) {
			response.areas = response.areas.slice(0, 250);
		});

		kv.Remote.addDataFilter(blocks.areas, function(origData) {
			var processAreas = function(origData) {

				if (origData.mlsids === undefined) {
					origData.mlsids = [];
				}
				if (!Array.isArray(origData.areas) || !Array.isArray(origData.addresses) || !Array.isArray(origData.mlsids) || !Array.isArray(origData.schools)) {
					return [];
				}

				var areas = origData.areas.filter(function(area) {
					if (area.name) {
						area.id = area.type + '|' + area.name + "," + area.state;
						area.extra = kv.isMobile() ? area.description.replace('averaging', 'avg') : area.description;
						area.data = $.extend({}, area);
						if ("county" === area.type && "1" === isCanada ) {
							area.type = "Region";
						} else if ("county" === area.type && (area.name.indexOf(', la') !== -1 || area.state === 'la')) {
							area.type = "Parish";
						}

						return true;
					}
					return false;
				});

				var schools = origData.schools.filter(function(school) {
					if (school.name) {
						school.id = school.type + '|' + school.name;
						school.extra = kv.isMobile() ? school.description.replace('averaging', 'avg') : school.description;
						school.data = $.extend({}, school);
						return true;
					}
					return false;
				});

				var school_districts = origData.school_districts.filter(function(school_district) {
					if (school_district.name) {
						school_district.id = school_district.type + '|' + school_district.name;
						school_district.extra = kv.isMobile() ? school_district.description.replace('averaging', 'avg') : school_district.description;
						school_district.data = $.extend({}, school_district);
						if ("school_district" === school_district.type) {
							school_district.type = "school district";
						}
						return true;
					}
					return false;
				});

				var addresses = origData.addresses.map(function(address) {
					address.type = 'address';
					address.name = address.address;
					address.id = [address.type, address.address].join('|');
					address.extra = "MLS# " + address.mlsid;
					address.data = $.extend({}, address);
					return address;
				});

				var mlsids = origData.mlsids.map(function(mlsid) {
					mlsid.type = 'mlsid';
					mlsid.name = mlsid.mlsid;
					mlsid.id = [mlsid.type, mlsid.mlsid].join('|');
					mlsid.extra = [mlsid.city, mlsid.zip, mlsid.state]
						.filter(function(value) { return value !== ''; })
						.join(', ');
					mlsid.data = $.extend({}, mlsid);
					return mlsid;
				});

				return areas.concat(schools, school_districts, addresses, mlsids);
			};

			var placeholderText = '';

			if ( "1" === isCanada ) {
				placeholderText = 'Search an address, area, city, postal code or mls';
			} else {
				placeholderText = 'Search an address, area, city, zip or mls'; 
			}

			var data = {
				area: processAreas(origData),
				id: 'area',
				layout: 'token',
				placeholder: placeholderText,
				order: 'count|desc',
				defaultValue: kv.Config.get('request', 'converted', 'searchString'),
				autocompleteCallback: function(query, callback) {
					var countyFilter = kv.Config.get('options', 'listings', 'inherit_kvcore_county_settings') === '1';
					var typesToPass = kv.Properties.getPropertyTypesSetOrOtherwise();

					var areaPayload = {query: query, propertyTypes: typesToPass};
					if(countyFilter) {
						areaPayload = {query: query, countyFilter: 1, propertyTypes: typesToPass};
					}
					//mls search with hyphen should work
					if (areaPayload.query.indexOf(' ') === -1 && areaPayload.query.indexOf('-') >= 0) {
						areaPayload.query = areaPayload.query.replace("-", "");
					} 
					
					kv.Remote.get(blocks.areas, areaPayload, function(response) {
						callback(processAreas(response));
					});
				}
			};

			return $.extend(origData, data);
		});

		kv.Remote.addDataFilter(blocks.agents, function(origData) {
			var data = {
				agents: origData.agents,
				id: 'agents',
				name: 'Agents',
				order: 'count|desc',
				defaultValue: kv.Config.get('request', 'converted', 'searchString'),
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(blocks.agents, {query: query}, function(response) {
						callback(response.agents);
					});
				}
			};

			return $.extend(origData, data);
		});
		if (kvCORE.Config.get('popularOptions')) {
			var popularOptionsConfigSetting = kvCORE.Config.get('popularOptions');
			for (var i = 0; i < popularOptionsConfigSetting.length; i++) {
				setPopularOptionsFilters(kvCORE.Config.get('popularOptions')[i], i);
			}
		}

		
	}

	function getSupportedTypes() {
		return {
			propertyTypes: context['supportedTypes'],
			id: 'propertyTypes',
			name: 'Home Type',
			featured: [1, 2, 3, 4, 11, 18, 31]
		};
	}

	function getStyles() {
		return {
			styles: context.styles,
			id: 'styles',
			name: 'Styles'
		};
	}

	function getFeatures() {
		return {
			options: context.features,
			id: 'options',
			name: 'General Options'
		};
	}

	function getViews() {
		return {
			propertyViews: context.views,
			id: 'propertyViews',
			name: 'Views'
		};
	}

	function getBuildingStyles() {
		return {
			buildingStyles: context.buildingStyle,
			id: 'buildingStyles',
			name: 'Property Styles'
		};
	}

	function displaySearchForm() {
		var request = kv.Config.get('request', 'converted');

		var data = $.extend(context, {request: request});
		data.allowedFiltersCount = p.getAllowedFiltersCount(request);
		data.optimizeForCanada = isCanada;

		data.hasRentals = false;
		for (var i = 0; i < data.supportedTypes.length; i++) {
			if (data.supportedTypes[i].name === "Rentals") {
				data.hasRentals = true;
			}
		}

		if (data.shortcode_attributes.show_filters === 'no') {
			blocks = { areas: 'public/listings/areas' };
		}

		kv.View.render('search', data, $searchContainer, bindPropertiesSearch);
	}

	function bindPropertiesSearch() {
		//in safari the click action will bind multiple times causing open/close scanario unbind first
		$("#kv-imagecheck-other-button").unbind("click");
		$( "#kv-imagecheck-other-button" ).click(function() {
			$( "#kv-filters-property-types-options-list" ).toggle();
		});
		var filterContainers = $searchContainer.find('.kv-filters-container');
		var $form = $searchContainer.find('form');
		var $minContainer = $searchContainer.find('#kv-radio-container-priceMin');
		var $maxContainer = $searchContainer.find('#kv-radio-container-priceMax');
		var $minButton = $searchContainer.find('#kv-filters-priceMin');
		var $maxButton = $searchContainer.find('#kv-filters-priceMax');
		var $soldToggle = $searchContainer.find('#kv-filters-sold');

		// update additional filters count
		$searchContainer.find('.kv-properties-search-form').change(function() {
			$searchContainer.find('#kv-filters-search-more .kv-counter')
				.html(p.getAllowedFiltersCount(kv.Form.toArray(this)));
		});

		//if is agent website hide agents filter
		var $filterAgentsContainer = filterContainers.find('#kv-filters-agents');
		var $filterViewsContainer = filterContainers.find('#kv-filters-propertyViews');
		var $filterStylesContainer = filterContainers.find('#kv-filters-styles');
		var $filterBuildingStylesContainer = filterContainers.find('#kv-filters-buildingStyles');

		if (1 === $filterAgentsContainer.length && kv.Config.get('websiteOwnerType') === "user") {
			$filterAgentsContainer.hide();
		}

		if (1 === $filterViewsContainer.length) {
			if ("1" === isCanada) {
				$filterViewsContainer.hide();
			}
		}

		if (1 === $filterStylesContainer.length) {
			if ("1" === isCanada) {
				$filterStylesContainer.hide();
			}
		}

		if (1 === $filterBuildingStylesContainer.length) {
			if (authToken !== JOHNSTON_AND_DANIEL) {
				$filterBuildingStylesContainer.hide();
			}
		}

		// clear additional filters
		$searchContainer.find('#kv-filters-clear').click(function() {
			var form = $form;
			var additionalFilters = form.find('#kv-filters-container-more');
			additionalFilters.find('input[type="number"]').val('');
			additionalFilters.find('select').val('0');
			additionalFilters.find('input[type="checkbox"]:checked').click();
			form.submit();
		});

		// open values dropdown on button click and close other opened dropdowns
		$searchContainer.find('.kv-filter-control').click(function() {
			var containerId = $(this).data('for');

			filterContainers.each(function() {
				var $filterContainer = $(this);
				if ($filterContainer.attr('id') === containerId) {
					$filterContainer.toggleClass('kv-collapsed');
				} else if (!$filterContainer.hasClass('kv-collapsed')) {
					$filterContainer.addClass('kv-collapsed');
				}
			});
		});

		// close all dropdowns on area token dropddown opened
		$(document).click(function(e) {
			var $target = $(e.target);
			if ($target.hasClass('kv-filter-control') || $target.closest('.kv-filters-container').length !== 0) {
				return;
			}

			filterContainers.each(function() {
				var $filterContainer = $(this);
				if (!$filterContainer.hasClass('kv-collapsed')) {
					$filterContainer.addClass('kv-collapsed');
				}
			});
		});

		// if enter pressed in a dropdown redirect 1st result to detail page
        $searchContainer.keyup(function(e){
			//this action was firing twice i add the class name check to prevent that
            if (e.keyCode == 13) {
                if (!$searchContainer.hasClass("kv-enter-action-processed")) {
                    var firstItemDataAttr = $('#dataset-area .view-content').find('input[type="checkbox"]').attr("data-item");
                    var firstItemData = $.parseJSON('[' + firstItemDataAttr + ']');

                    if (firstItemData[0].mlsid) {
                        $searchContainer.addClass("kv-enter-action-processed");
                        kv.Url.redirect(
                            kv.Property.getUrl(firstItemData[0]), undefined, kv.Config.compare('openListingsInNewTab', 'true')
                        );
                    }
                }
            }
        });

		// update button border that shows if it has value selected
		var markFieldsWithValue = function() {
			filterContainers.each(function() {
				var $filterContainer = $(this);

				if ($filterContainer.attr('id') === 'kv-filters-container-more') {
					return;
				}

				var selected = $filterContainer.find('input[type="number"], select').filter(function() {
					return $(this).val() !== '';
				});

				var id = $filterContainer.attr('id');
				var $filterControl = $searchContainer.find('.kv-filter-control[data-for="' + id + '"]');

				if (selected.length !== 0) {
					if (!$filterControl.hasClass('kv-filter-has-value')) {
						$filterControl.addClass('kv-filter-has-value');
					}
				} else {
					$filterControl.removeClass('kv-filter-has-value');
				}
			});
		};
		$form.change(markFieldsWithValue);

		// on selecting max price close max price container and open min price container
		var showMinPrices = function() {
			if (!$maxContainer.hasClass('kv-hidden')) {
				$maxContainer.addClass('kv-hidden');
			}
			$minContainer.removeClass('kv-hidden');
		};

		// on selecting min price close min price container and open max price container
		var showMaxPrices = function() {
			if (!$minContainer.hasClass('kv-hidden')) {
				$minContainer.addClass('kv-hidden');
			}
			$maxContainer.removeClass('kv-hidden');
		};

		$minButton.focus(showMinPrices);
		$maxButton.focus(showMaxPrices);

		var bindDropdownClicks = function(labels) {
			// apply value, selected from dropdown, to it's form field
			var applyValue = function() {
				var $this = $(this);
				$this.parent().find('.kv-filters-radio-label').removeClass('checked');
				$this.addClass('checked');

				var name = $this.data('name');
				$('[name=' + name + ']').val($this.data('value'));

				$form.trigger('change');
			};

			// close dropdown on value select
			var closeDropdown = function() {
				var $this = $(this);

				if (typeof $this.data('name') !== 'undefined' && $this.data('name').indexOf('priceMin') !== -1) {
					return;
				}

				var $filterContainer = $this.closest('.kv-filters-container');

				if (!$filterContainer.hasClass('kv-collapsed')) {
					$filterContainer.addClass('kv-collapsed');
				}
			};

			// on selecting min price move some relevant min prices to max price container
			var prepareMaxPrices = function() {
				// var minPrice = parseInt($(this).data('value')) + 200000;
				//
				// var relevantPrices = $minContainer.find('.kv-filters-radio-label').filter(function() {
				// 	return parseInt($(this).data('value')) >= minPrice;
				// });
				//
				// $maxContainer.find('[data-is-min="true"]').remove();
				//
				// var priceMax = parseInt($('#kv-filters-priceMax').val());
				//
				// relevantPrices.clone()
				// 	.attr('data-is-min', true)
				// 	.attr('data-name', 'priceMax')
				// 	.each(function() {
				// 		var $this = $(this);
				// 		if ($this.data('value') === priceMax) {
				// 			$this.addClass('checked');
				// 		}
				// 	})
				// 	.insertAfter($maxContainer.find('[data-value=""]'));

				bindDropdownClicks($maxContainer.find('[data-is-min="true"]'));
				showMaxPrices();
			};

			if (typeof labels !== 'undefined') {
				labels.one('click', applyValue);
				labels.one('click', closeDropdown);
				labels.one('click', prepareMaxPrices);
				labels.one('click', showMinPrices);
			} else {
				$searchContainer.find('.kv-filters-radio-label').click(applyValue);
				filterContainers.find('.kv-filters-radio-label, .kv-properties-search-submit button[type="submit"]')
					.click(closeDropdown);
				$minContainer.find('.kv-filters-radio-label').click(prepareMaxPrices);
				$maxContainer.find('.kv-filters-radio-label').click(showMinPrices);
			}
		};
		//sold toggle pop registration on click
		if ($soldToggle.length > 0) {
			$soldToggle.change(function() {
				if (kv.Config.get('vowWebsiteConfiguration') !== '0') {
					var hasNoAccess = !kv.Cookie.get('has_vow_access') && !kv.Cookie.get('vow_pending');
					var hasPendingAccess = !kv.Cookie.get('has_vow_access') && kv.Cookie.get('vow_pending');
					if (hasNoAccess) {
						$soldToggle.prop('checked', false);
						kv.VowRegistration.showModal();
					}
					//pending have not activated thru email yet
					if (hasPendingAccess) {
						$soldToggle.prop('checked', false);
						kv.Pending.showModal();
					}
				}
			});
		}

		markFieldsWithValue();
		bindDropdownClicks();
		renderBlockTemplates();
	}

	function renderBlockTemplates() {
		Object.keys(blocks).map(function(key) {
			var target = $searchContainer.find('#kv-filters-' + key);
			if (typeof blocks[key] === 'string') {
				kv.View.renderAjax('multiple-select', blocks[key], {}, target, bindMultipleSelect);
			} else {
				kv.View.render('multiple-select', blocks[key], target, bindMultipleSelect);
			}
		});
	}

	function bindMultipleSelect(viewName, data) {
		blocksLoaded++;

		var callback = undefined;

		// run callback after last multiselect bind completed
		if (blocksLoaded === Object.keys(blocks).length) {
			callback = function() {
				$(document).trigger('kv-properties-search-loaded');
			};
			// reinit
			blocksLoaded = 0;
		}

		runMultipleSelect(function() {
			//when request is empty this should still pick up default values from shortcode
			var getShortcodeParamsFromListings = $('#kvcoreidx-properties-page').data('filters');
			var request = kv.Config.get('request', 'converted');
			if (data.id === 'area' && kv.isEmpty(request) && !kv.isEmpty(getShortcodeParamsFromListings)) {
				if (!kv.isEmpty(getShortcodeParamsFromListings.area)) {
					data.vals.push(getShortcodeParamsFromListings.area); 
				}
				
			}
			
			kv.MultipleSelect.initMultiSelect($('#container-' + data.id), data, callback);
		});
	}


	function runMultipleSelect(callback) {
		if (typeof callback === 'function') {
			callback();
		}
	}

	this.getFirstArea = function() {
		var form = kv.Form.toArray($searchContainer.find('form').get(0));

		return typeof form.area !== 'undefined' && Array.isArray(form.area) && form.area.length !== 0
			? form.area[0]
			: null;
	};

	if ($('#kvcoreidx-properties-page').length == 0) {
		$searchContainer.addClass('kv-quicksearch-bar');
	}

	if ($searchContainer.length) {
		$searchContainer.addClass(loadingWithMarginClass);
		loadPage();
	}
}(jQuery, kvCORE, kvCORE.Properties));
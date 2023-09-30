kvCORE.Profile = (new function($, kv) {
	var $userProfileContainer = $('#kv-user-profile');

	var loadingClass = 'loading';
	var showCallbackMessage = true;
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass;

	var areasEndpoint = 'public/listings/areas';
	var tabs = {
		tab: {
			selector: '.kv-tab-title',
			states: {
				active: 'kv-tab-active',
				inactive: 'kv-tab-inactive'
			},
			events: {
				loadContent: 'load-content'
			}
		},
		content: {
			selector: '.kv-tab-content',
			contentSelector: '.content'
		}
	};

	function bind() {
		var profileTabsContainerId = '#kv-user-profile';
		var profileFormId = '#kv-user-profile-form';

		var $profileTabsContainer = $(profileTabsContainerId);
		var $profileForm = $(profileFormId);

		$('.kv-form-profile-unsubscribe-link').click(function(e) {
			//unsubscribe
			e.stopPropagation();
			kv.Remote.put('public/leads', {'lead_id': kv.User.getLeadId(), 'email_optin': 0}, function(response, code) {
				if (code === 200){
					$('.kv-form-profile-unsubscribe-message').html("<strong>Successfully unsubscribed.</strong>");
					$('.kv-form-profile-unsubscribe-link').hide();
				} else {
					$('.kv-form-profile-unsubscribe-message').html("<span style='color:red'>There was an error.</span>");
				}
			});
		});

		$profileTabsContainer.on('click', tabs.tab.selector, function(e) {
			e.preventDefault();

			var $this = $(this);

			if ($this.hasClass(tabs.tab.states.active)) {
				return;
			}

			var thisTabName = $this.attr('id');

			changeTab(thisTabName, $profileTabsContainer);
		}).on(tabs.tab.events.loadContent, tabs.tab.selector, function() {
			var $this = $(this);

			var tabName = $this.attr('id');
			var $tabContent = $profileTabsContainer.find(tabs.content.selector + '.kv-' + tabName)
				.children(tabs.content.contentSelector);

			if ($tabContent.is(':empty')) {
				$tabContent.addClass(loadingClass);
			} else {
				$tabContent.addClass(loadingWithMarginClass);
			}

			var callback = function() {
				var newLocationHash = '#' + tabName;
				var currentLocationHash = '#' + document.location.hash.replace('#', '');

				var stateData = {};

				if (newLocationHash !== currentLocationHash) {
					history.pushState(stateData, tabName, kv.Config.get('pages', 'user_profile') + newLocationHash);
				}

				$tabContent.removeClass(loadingClass);
			};

			switch (tabName) {
				case 'tab-saved-properties':
					loadSavedPropertiesTab($tabContent, callback);
					break;

				case 'tab-saved-searches':
					loadAlertsTab($tabContent, callback);
					break;

				default:
					callback();
					break;
			}
		});

		function removeAlertAreaRow(obj) {
			obj.closest('.selected-area-row').remove();
		}

		function removeAlertAreaRowNew(obj) {
			obj.closest('.selected-area-row-new').remove();
		}

		$profileTabsContainer.on('click', '.alert-areas .add-area', function(e) {
			e.preventDefault();
			e.stopPropagation();

			addAlertAreaRow(this);
		});

		$profileTabsContainer.on('click', '.alert-areas .remove-area', function(e) {
			e.preventDefault();
			e.stopPropagation();

			if ($(this).prop('disabled') === false) {
				removeAlertAreaRow(this);
			}
		});

		$profileTabsContainer.on('click', '.alert-areas .add-area-new', function(e) {
			e.preventDefault();
			e.stopPropagation();

			addAlertAreaRow();
		});

		$profileTabsContainer.on('click', '.alert-areas .remove-area-new', function(e) {
			e.preventDefault();
			e.stopPropagation();

			if ($(this).prop('disabled') === false) {
				removeAlertAreaRowNew(this);
			}
		});


		function setActiveTabFromHash() {
			if (document.location.hash) {
				var activeTabId = document.location.hash.replace('#', '');

				changeTab(activeTabId, $profileTabsContainer);
			}
		}

		window.onpopstate = setActiveTabFromHash;

		function profileUpdate(e) {
			e.preventDefault();
			kv.Form.submit($profileForm, profileUpdateCallback);
		}

		function profileUpdateCallback(response, code) {
			if (code === 200) {
				kv.Message.success('Profile updated', 'Profile updated', $userProfileContainer);
			} else {
				kv.Message.error('Error', 'Profile update failed', $userProfileContainer);
			}
		}

		$profileForm.on('submit', profileUpdate);

		setActiveTabFromHash();

	}

	function bindMultipleSelect(viewName, data) {
		kv.MultipleSelect.initMultiSelect($('#container-' + data.id), data);
	}

	function addAlertAreaRow(obj) {
		if (obj) {
			var $obj = $(obj);
			var $alertForm = $obj.closest('.alert-update-form');
		} else {
			var $obj = $('#alert-update-form-new');
			var $alertForm = $obj.closest('.alert-update-form-new');
		}
		var $areasContainer = $alertForm.find('#kvcoreidx-alerts-area-search');
		kv.Remote.addDataFilter(areasEndpoint, function(origData) {
			var processAreas = function(origData) {
				if (!Array.isArray(origData.areas)) {
					return [];
				}
		
				return origData.areas.filter(function(area) {
					if (area.name) {
						area.id = area.type + '|' + area.name + "," + area.state;
						area.extra = kv.isMobile() ? area.description.replace('averaging', 'avg') : area.description;
						area.data = $.extend({}, area);
						return true;
					}
					return false;
				});
			};
		
			var placeholderText = '';
		
			if ( "1" === kv.Config.get('options', 'optimize_for_canada') ) {
				placeholderText = 'Search your area, city or postal code';
			} else {
				placeholderText = 'Search your area, city or zip';
			}
		
			var data = {
				area: processAreas(origData),
				id: 'profile-area',
				layout: 'token',
				placeholder: placeholderText,
				order: 'count|desc',
				selectedVals: null,
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(areasEndpoint, {query: query}, function(response) {
						callback(processAreas(response));
					});
				}
			};
		
			return $.extend(origData, data);
		});
		
		kv.Remote.addStoredEndpoint(areasEndpoint);
		kv.View.renderAjax('multiple-select', areasEndpoint, {}, $areasContainer, bindMultipleSelect);
	}

	function bindSavedPropertiesTab(target) {
		target.find('.add-favorite').click(kv.Property.addFavoriteCallback)
	}

	function bindAlertsTab(target) {
		var alertForm = $('.alert-update-form');

		alertForm.submit(function(e) {
			e.preventDefault();

			kv.Form.submit($(this), alertCallback, alertBeforeSend.bind(this), undefined, alertValidate);
		});

		var newAlertForm = $('.alert-update-form-new');

		newAlertForm.submit(function(e) {
			e.preventDefault();

			kv.Form.submit($(this), alertCallback, alertBeforeSend.bind(this), undefined, alertValidate);

		});

		target.find('.create-alert').click(createAlert);

		target.find('.kv-alert-button-stop-alert').click(stopAlert);
		target.find('.kv-alert-button-delete-alert').click(deleteAlert);

	}

	function collapseAllOpen() {
		var $collapsable = $( ".collapse-alert" );
		if ($collapsable.hasClass("show")) {
			$collapsable.toggleClass('show');
		}
	}

	function createAlert(e) {
		$newAlertsContainer = $('#kv-new-alerts-container')
		collapseAllOpen();
		addAlertAreaRow();

		var alertsLength = $('.alert-number').length;		
		var alertNumber = alertsLength + 1;

		if (alertNumber > 2) {
			kv.Message.info('Sorry, you cannot create anymore saved searches');
			return;
		}
		$newAlertsContainer.show();
		
		var leadId = kv.User.getLeadId();
		$('.lead_id').val(leadId);
		$('.alert_number').val(alertNumber);
		kv.DOM.scrollToElement($newAlertsContainer);
	}

	function stopAlert(e) {
		e.stopPropagation();

		var alertId = $(this).data('alert-id');
		var freqSelector = '#alert-' + alertId + '-freq-Off';
		if ($(freqSelector).prop('checked') === false) {
			showCallbackMessage = false;
			$(freqSelector).prop('checked', true);
			//STOPPING BY CHANGING THE ATTR TEMPORARY
			let current_method = $('#alert-update-form-' + alertId).attr('method');
			let current_action = $('#alert-update-form-' + alertId).attr('action');
			$('#alert-update-form-' + alertId).attr('action', 'public/alerts/stop');
			$('#alert-update-form-' + alertId).submit();
			$('#alert-update-form-' + alertId).attr('action', current_action);
			kv.Message.success('Saved search successfully stopped');
		} else {
			kv.Message.info('Saved search already stopped');
		}
	}

	function deleteAlert(e) {
		e.stopPropagation();

		showCallbackMessage = false;
		var alertId = $(this).data('alert-id');
		//STOPPING BY CHANGING THE ATTR TEMPORARY
		let current_method = $('#alert-update-form-' + alertId).attr('method');
		let current_action = $('#alert-update-form-' + alertId).attr('action');
		$('#alert-update-form-' + alertId).attr('method', 'delete');
		$('#alert-update-form-' + alertId).attr('action', 'public/alerts');
		$('#alert-update-form-' + alertId).submit();
		$('#alert-update-form-' + alertId).attr('method', current_method);
		$('#alert-update-form-' + alertId).attr('action', current_action);
		kv.Message.success('Saved search successfully deleted');
		window.location.reload();
	}

	function alertValidate(data) {
		$('.form-validation-message').hide();
		var validateArea = true;
		//drawn polygon alerts won't have an area
		if (!kv.isEmpty(data.polygons)) {
			var check = [
				{
					name: 'types',
					title: 'Property types cannot be empty',
					message: 'You should pick at least one property type',
					target: '#types-validation'
				}
			];
			validateArea = false;
			delete data.area;
		} else {
			var check = [
				{
					name: /area/,
					title: 'Area must be filled out',
					message: 'You should pick at least one area',
					target: '#areas-validation'
				},
				{
					name: 'types',
					title: 'Property types cannot be empty',
					message: 'You should pick at least one property type',
					target: '#types-validation'
				}
			];
		}

		var hasErrors = false;

		for (var obj in check) {
			var field = kv.getPropertyKeyRegex(data, check[obj].name);
			if (validateArea && !field || field && field.length < 1) {
				kv.Message.warning(check[obj].title, check[obj].message);
				var formMessage = check[obj].title + '<br>' + check[obj].message;
				$(check[obj].target + '-' + data.id).addClass('form-control-danger')
					.html('<small class="form-control-message">' + formMessage + '</small>')
					.show();
				hasErrors = true;
			}
		}

		if (kv.isEmpty(data.freq)) {
			$('#freqs-validation-' + data.id).addClass('form-control-danger')
				.html('<small class="form-control-message">You should pick at least one frequency</small>')
				.show();
			hasErrors = true;
		}

		if (kv.isEmpty(data.min)) {
			$('#' + data.id + '-price-min').addClass('kv-form-validation-required');
		}
		if (kv.isEmpty(data.max)) {
			$('#' + data.id + '-price-max').addClass('kv-form-validation-required');
		}
		if (kv.isEmpty(data.beds)) {
			$('#' + data.id + '-beds').addClass('kv-form-validation-required');
		}
		if (kv.isEmpty(data.baths)) {
			$('#' + data.id + '-baths').addClass('kv-form-validation-required');
		}
		if (kv.isEmpty(data.min) || kv.isEmpty(data.max) || kv.isEmpty(data.beds) || kv.isEmpty(data.baths)) {
			$('#above-validation-' + data.id).addClass('form-control-danger')
				.html('<small class="form-control-message">Prices, beds and baths cannot be empty</small>')
				.show();
			hasErrors = true;
		}

		return !hasErrors;
	}

	function alertBeforeSend(data) {
		if (typeof data.area !== 'undefined' && data.area.length !== 0) {
			data.areas = data.area.map(function(areaVal) {
				if (areaVal) {
					var areaArr = areaVal.split("|");
					var areaStateSplit = areaArr[1].split(",");
					areaArr[1] = areaArr[1].slice(0, -3);
					var capitalizedResult = areaArr[1].split(" ");
					for (var i = 0; i < capitalizedResult.length; i++) {
						capitalizedResult[i] = capitalizedResult[i][0].toUpperCase() + capitalizedResult[i].substr(1);
					}
					capitalizedResult.join(" ");
					if (areaStateSplit[1]) {
						return areaArr[0] + ':' + capitalizedResult + ':' + areaStateSplit[1].toUpperCase();
					} else {
						return areaArr[0] + ':' + capitalizedResult;
					}
					
				}
			});
		}
		if (typeof data.polygonKey !== 'undefined' && data.polygonKey.length !== 0) {
			//api expects string
			data.polygonKey = data.polygonKey[0];
			var areaVal = data["profile-area"][0];
			var areaArr = areaVal.split("|");
			areaArr[1] = areaArr[1].slice(0, -3);
			var capitalizedResult = areaArr[1].split(" ");
			for (var i = 0; i < capitalizedResult.length; i++) {
				capitalizedResult[i] = capitalizedResult[i][0].toUpperCase() + capitalizedResult[i].substr(1);
			}
			capitalizedResult.join(" ");
			data.display = capitalizedResult[0];	
		}
		return data;
	}


	function alertCallback(response, code, form) {
		if (code !== 200) {
			return;
		}
		// update title button on save
		var areaNames = [];
		for (var areaIdx in form['areas']) {
			if (form['areas'].hasOwnProperty(areaIdx)) {
				areaNames.push(form['areas'][areaIdx].split(':')[1]);
			}
		}

		var types = form['types'].length === 1 ? ' type' : ' types';
		var title = 'Less than a minute ago: ' + form['freq'] + ', $' + form['min'] + ' - $' + form['max'] + ', ' +
			form['beds'] + '+ beds, ' + form['baths'] + '+ baths, ' +
			areaNames.join(', ') + ', ' + form['types'].length + types;

		$('#button-' + form['id'] + ' .kv-alert-button-title').html(title);

		if(showCallbackMessage){
			kv.Message.success('Saved search successfully saved');
		}else{
			showCallbackMessage = true;
		}
		collapseAllOpen();
		if (form.id === 'new') {
			$('#tab-saved-searches').trigger('load-content');
		}
	}


	function loadSavedPropertiesTab($tabContent, callback) {
		kv.View.renderAjax('properties', 'public/views/' + kv.User.getLeadId(), 'onlySaved',
			$tabContent, function(viewName, data, target, output) {
				bindSavedPropertiesTab(target);

				if ('function' === typeof(callback)) {
					callback(viewName, data, target, output);
				}
			}, function(data, code) {
				switch (code) {
					case 404:
						data.message = 'Sorry, saved properties are currently unavailable.';
						break;

					default:
						data.message = 'Sorry, an error occurred while loading saved properties.';
						break;
				}

				return data;
		});
	}

	function loadAlertsTab($tabContent, callback) {

		var leadId = kv.User.getLeadId()

		//loads the saved alerts
		kv.Remote.addDataFilter('public/alerts', function(data) {
			var alertsData = data.data;
			var listingAreas = kv.Config.get('listingAreas');
			for (var alertIndex in alertsData) {
				if (!alertsData.hasOwnProperty(alertIndex)) {
					continue;
				}
	
				var alert = alertsData[alertIndex];
				
				var optionsMaybeString = alert['options'];
	
				if (typeof optionsMaybeString === 'string') {
					var options = JSON.parse(optionsMaybeString);
					if (Array.isArray(options)) {
						alert['options'] = options;
					}
				}
	
				if (typeof alert['updated_at'] !== 'undefined') {
					var date = kv.Date.createDateAsUTC(new Date(alert['updated_at']));
					alert['updated_at_local'] = kv.Date.toRelativeTime(date);
				}
				//would only render right w/ slight delay
				setTimeout(renderMultiselect, 400, alert);
			}

			data.data=alertsData;			
	
			return data;
		});
		kv.View.renderAjax('alerts', 'public/alerts', {lead_id: leadId},
			$tabContent, function(viewName, data, target, output) {
				
				bindAlertsTab(target);

				if ('function' === typeof(callback)) {
					callback(viewName, data, target, output);
				}
			}, function(data, code) {
				switch (code) {
					case 404:
						data.message = 'Sorry, saved searches are currently unavailable.';
						break;

					default:
						data.message = 'Sorry, an error occurred while loading saved searches.';
						break;
				}
				return data;
			}
		);
	}

	function renderMultiselect(alert) {
		//bind multiselect and try to set area here
		kv.Remote.addDataFilter(areasEndpoint, function(origData) {
			var processAreas = function(origData) {
				if (!Array.isArray(origData.areas)) {
					return [];
				}
		
				return origData.areas.filter(function(area) {
					if (area.name) {
						area.id = area.type + '|' + area.name + "," + area.state;
						area.extra = kv.isMobile() ? area.description.replace('averaging', 'avg') : area.description;
						area.data = $.extend({}, area);
						return true;
					}
					return false;
				});
			};
		
			var placeholderText = '';
		
			if ( "1" === kv.Config.get('options', 'optimize_for_canada') ) {
				placeholderText = 'Search your area, city or postal code';
			} else {
				placeholderText = 'Search your area, city or zip';
			}

			var alertAreas = [];
			for (var key in alert.areas) {
				var alertAreaString = alert.areas[key].type + "|" + alert.areas[key].name;
				alertAreas.push(alertAreaString);
			}
			//because more than one of these can be on a page needs dynamic naming on var
			var dynamicIdName = 'profile-area'+alert['id'];

			var data = {
				[dynamicIdName]: processAreas(origData),
				id: dynamicIdName, 
				layout: 'token',
				placeholder: placeholderText,
				order: 'count|desc',
				selectedVals: alertAreas,
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(areasEndpoint, {query: query}, function(response) {
						callback(processAreas(response));
					});
				}
			};
		
			return $.extend(origData, data);
		});
		
		kv.Remote.addStoredEndpoint(areasEndpoint);
		var $areasContainerForThisAlertId = $('#kvcoreidx-alerts-area-search-'+alert['id']);
		kv.View.renderAjax('multiple-select', areasEndpoint, {}, $areasContainerForThisAlertId, bindMultipleSelect);
	}

	function changeTab(tabName, tabParent) {
		var $tabContainer = tabParent;

		if ('object' !== typeof(tabParent)) {
			$tabContainer = $(tabParent);
		}

		var tabNameId = '#' + tabName;
		var $newActiveTab = $tabContainer.find(tabNameId);
		var tabContentToShow = tabs.content.selector + '.kv-' + tabName;

		$tabContainer.find(tabs.tab.selector)
			.not(tabNameId).removeClass(tabs.tab.states.active).addClass(tabs.tab.states.inactive);
		$newActiveTab.removeClass(tabs.tab.states.inactive).addClass(tabs.tab.states.active);

		$tabContainer.find(tabs.content.selector).not(tabContentToShow).hide();
		$tabContainer.find(tabContentToShow).show();

		$newActiveTab.trigger(tabs.tab.events.loadContent);
	}

	function setDataFilters() {
		if (!kv.User.getLeadId()) {
			return;
		}

		kv.Remote.addDataFilter('public/views/' + kv.User.getLeadId(), function(data) {
			data.data.map(function(listing) {
				listing = kv.Property.addCustomData(listing);

				listing.saved = true;

				return listing;
			});

			kv.Property.resave(data.data);

			return data;
		});
	}

	$userProfileContainer.addClass(loadingClass);

	this.renderProfile = function() {
		$userProfileContainer.addClass(loadingClass);
		kv.View.render('user-profile', kv.User.getLeadData(), $userProfileContainer, function() {
			$userProfileContainer.removeClass(loadingClass);
			bind();
		});
	};

	if (kv.User.getLeadId()) {
		this.renderProfile();
	} else {
		//Login with key
		kv.User.maybeAuthenticateViaURLToken(function(){
			if (kv.User.getLeadId()){
				$userProfileContainer.addClass(loadingClass);
				setTimeout(function() {
					kv.View.render('user-profile', kv.User.getLeadData(), $userProfileContainer, function() {
						$userProfileContainer.removeClass(loadingClass);
						bind();
					});
				}, 800);
				
			} else {
				//Login form
				kv.Login.showModal(true);
				kv.Login.loginQueue.add({obj: 'Profile', method: 'renderProfile'});
				$userProfileContainer.removeClass(loadingClass);
			}
		});
	}

	setDataFilters();
}(jQuery, kvCORE));

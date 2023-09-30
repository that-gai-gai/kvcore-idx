kvCORE.Team = (new function($, kv) {
	var $teamPage = $('#kvcoreidx-team-page');
	var $teamPageResults = $('#kvcoreidx-team-page--results');

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass + ' ' + loadingClass + '-mh';

	var wildcardQueryCharacter = '';
	var defaultQuery = '*';

	var membersListEndpoint = 'public/members/newlist';

	var shortcodeFiltersMap = {
		perrow: 'perRow',
		perpage: 'perPage'
	};

	var defaultSort = kvCORE.Config.get('options', 'team', 'agents_default_sort_ascending');

	var currentFilters = {};

	var initialFilters = {
		page: 1,
		perRow: '4',
		perPage: 24,
		query: {},
		order: defaultSort === '1' ? 'last_name|asc' : 'default'
	};

	function getShortcodeFilters() {
		var shortcodeAttrs = $teamPage.data('attributes');
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

		var requestArgs = kv.Config.get('request', 'args');

		if (requestArgs) {
			Object.keys(requestArgs).forEach(function(arg) {
				if ('undefined' === typeof(currentFilters[requestArgs])) {
					currentFilters.query[arg] = requestArgs[arg];
				}
			});
		}

		displayTeam();
	}

	function setDataFilters() {
		kv.Remote.addDataFilter(membersListEndpoint, formatTeamData);
	}

	function displayTeam() {
		var args = $.extend(true, {
			perpage: currentFilters.perPage,
			page: currentFilters.page,
			includes:['languages', 'designations', 'position_types'],
			includeInactive: 1
		}, currentFilters.query);

		if (defaultSort === '1') {
			args.order = 'last_name|asc';
		}

		kv.View.renderAjax('team', membersListEndpoint, args, $teamPageResults, function(viewName, data, target) {
			bindTeamPageResults(viewName, data.data, target);
			bindTeamPage();

			kv.Remote.get('public/entity/list', {}, function(data) {
				kv.Search.addDataset('public/entity/list', data.data, {
					name: 10,
					address: 10,
					city: 10,
					zip: 5,
					website_url: false
				});

				bindOffices();
                bindAdditionalFilters();
			});
		});
	}

	function updateTeamList() {
		var args = {
			perpage: currentFilters.perPage,
			page: currentFilters.page,
			includes:['languages', 'designations', 'position_types'],
			includeInactive: 1,  
			filter: {}
		};

		if ( 'undefined' !== typeof( currentFilters.query._fulltext ) && currentFilters.query._fulltext ) {
			args.search = currentFilters.query._fulltext;
		}
		if ( 'undefined' !== typeof( currentFilters.query.entities ) && currentFilters.query.entities ) {
			args.entities = [currentFilters.query.entities];
		}
		if ( 'undefined' !== typeof( currentFilters.query.type ) && currentFilters.query.type ) {
			args.filter.position_type = currentFilters.query.type + ':master';  
		} 
		if ( 'undefined' !== typeof( currentFilters.query.designation ) && currentFilters.query.designation ) {
			args.filter.designation = currentFilters.query.designation + ':master';
		}
		if ( 'undefined' !== typeof( currentFilters.query.language ) && currentFilters.query.language ) {
			args.filter.language = currentFilters.query.language + ':master';
		}
		if ( 'undefined' !== typeof( currentFilters.order ) && 'default' !== currentFilters.order ) {
			args.order = currentFilters.order;
		}
		if (!args.order && defaultSort === '1') {
			args.order = 'last_name|asc';
		}

		kv.Remote.get(membersListEndpoint, args, function(data){
			data = kv.Remote.filterData(membersListEndpoint, data);
			data = formatResultData(data);

			kv.View.render(
				'team',
				data,
				$teamPageResults,
				bindTeamPageResults
			);
		});
		var $filterArea = $teamPage.find('.kv-form-group-filter-area');
		if ($filterArea.hasClass("show")) {
			setTimeout(function () {
				$filterArea.toggleClass('show');
			}, 500);
		}
	}

	function formatResultData(data) {
		data.currentFilters = currentFilters;

		return data;
	}

	function bindTeamPage() {
		var $teamMemberFiltersForm = $teamPage.find('#kv-team-member-filters-form');
		var $searchBox = $teamMemberFiltersForm.find('[name="search"]');

		$searchBox.on('keyup', function() {
			var search = $(this).val();
			var currentFullTextSearch = getFilter('_fulltext');

			$('[name="filter[first-letter]"]').val('');
			deleteFilter('last_name');

			if (search) {
				// append wildcard if none already
				// in search string
				if (-1 === search.indexOf(wildcardQueryCharacter) && -1 === search.indexOf(':')) {
					search = wildcardQueryCharacter + search + wildcardQueryCharacter;
				}
			} else {
				search = '';
			}

			if (search !== currentFullTextSearch && ':' !== search[search.length - 1]) {
				if (search) {
					updateFilter('_fulltext', search);
				} else {
					deleteFilter('_fulltext');
				}

				updateFilter('page', 1);

				try {
					kv.throttle(updateTeamList);
				} catch (e) {
					// search query error
					// due to bad search string
				}
			}
		});

		$teamMemberFiltersForm.find('select, [type="checkbox"], [type="radio"], [type="hidden"]').change(function() {
			var $this = $(this);
			var name = $this.attr('name');
			var value = $this.val();
			var data = getFilterNameAndValueByFormField(name, value);

			$searchBox.val('');
			deleteFilter('_fulltext');

			if ('undefined' !== typeof(data.name) && 'undefined' !== typeof(data.value)) {
				if ('query' === data.name) {
					if (wildcardQueryCharacter === data.value) {
						$searchBox.val('');
					} else {
						$searchBox.val(data.value);
					}
				}

				updateFilter('page', 1);
				updateFilter(data.name, data.value);
			} else {
				updateFilter(name, value);
			}
		});
	}

	function bindOffices() {
		var officesList = kv.Search.search('public/entity/list', '*', 9999, 1, 'name|asc');

		if (officesList && Array.isArray(officesList.data) && officesList.data.length) {
			var selectedOffice = '';

			var entities = kv.Config.get('request', 'args', 'entities');

			if (entities) {
				selectedOffice = parseInt(entities, 10);

				if (isNaN(selectedOffice)) {
					selectedOffice = '';
				}
			}

			var officesListOptions = [
				'<option value="">- All Offices -</option>'
			];

			$.each(officesList.data, function(index, item) {
				var selected = '';

				if (selectedOffice === item.id) {
					selected = 'selected="selected"';
				}

				officesListOptions.push('<option value="' + item.id + '" ' + selected + '>' + item.name + '</option>');
			});

			var $officesListDropdown = $('#kv-filter-office');
			$officesListDropdown.html(officesListOptions.join('\n'));
			$('#kv-filter-office-container').removeClass('kv-hidden');
		}
	}

	function bindAdditionalFilters() {
        kvCORE.Remote.get('public/members/roster-facets', {}, function (data) {
	        if ('undefined' !== typeof (data.position_types) && 'undefined' !== typeof (data.position_types.data)) {
		        bindPositionTypes(data.position_types);
	        }
            if ('undefined' !== typeof (data.designations) && 'undefined' !== typeof (data.designations.data)) {
                bindDesignations(data.designations);
            }
            if ('undefined' !== typeof (data.languages) && 'undefined' !== typeof (data.languages.data)) {
                bindLanguages(data.languages);
            }
        });
    }

	function bindPositionTypes(positionTypes) {
		if (!positionTypes) {
			return;
		}

		if (kv.Chosen.render({placeHolder: 'Filter Position'}, 'type', positionTypes.data)) {
			$('#kv-filter-type-container').removeClass('kv-hidden');
		}
	}

    function bindDesignations(designations) {
	    if (!designations) {
		    return;
	    }

		if (kv.Chosen.render({placeHolder: 'Filter Designation'}, 'designation', designations.data)) {
		    $('#kv-filter-designation-container').removeClass('kv-hidden');
	    }
    }

    function bindLanguages(languages) {
	    if (!languages) {
		    return;
		}
		
		if (kv.Chosen.render({placeHolder: 'Filter Language'}, 'language', languages.data)) {
		    $('#kv-filter-language-container').removeClass('kv-hidden');
	    }
    }

	function getFilterNameAndValueByFormField(name, value) {
		var result = {};

		switch (true) {
			case -1 !== name.indexOf('filter[first-letter]'):
				result.name = 'last_name';
				result.value = value;

				result.value += wildcardQueryCharacter;

				break;

			default:
				var match = /filter\[([^\]]+)]\[?]?/gi.exec(name);
				if (Array.isArray(match) && 'undefined' !== typeof(match[1]) && match[1]) {
					var matchedName = match[1];

					result = {
						name: matchedName,
						value: value
					};
				}
				break;
		}

		return result;
	}

	function bindTeamPageResults(viewName, data, target) {
		var $changePageForm = target.find('.kv-team-members-filters');

		$changePageForm.find('select, [type="checkbox"], [type="radio"]').unbind().change(function() {
			var $this = $(this);
			var name = $this.attr('name');
			var value = $this.val();

			target.addClass(loadingWithMarginClass);

			kv.DOM.scrollToElement(target, function() {
				updateFilter(name, value);
			});
		});

		$teamPageResults.removeClass(loadingWithMarginClass);
	}

	function getFilter(name) {
		var result = null;

		if ('undefined' !== typeof(name)) {
			if ('undefined' !== typeof(initialFilters[name])) {
				if ('undefined' !== typeof(currentFilters[name])) {
					result = currentFilters[name];
				}
			} else {
				if ('undefined' !== typeof(currentFilters.query[name])) {
					result = currentFilters.query[name];
				}
			}
		}

		return result;
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
						currentFilters[name] = value;
						break;

					default:
						if ('undefined' !== typeof(initialFilters[name])) {
							currentFilters[name] = value;
						} else {
							var numericValue = parseInt(value, 10);

							if (isNaN(numericValue)) {
								if ('_fulltext' === name) {
									currentFilters.query[name] = value;
								} else {
									currentFilters.query[name] = value + '*';
								}
							} else {
								currentFilters.query[name] = numericValue;
							}
						}

						break;
				}
			}

			if ('undefined' !== typeof(runUpdate) || false !== runUpdate) {
				kv.throttle(updateTeamList);
			}
		}
	}

	function deleteFilter(name, runUpdate) {
		if ('undefined' !== typeof(defaultQuery[name])) {
			delete currentFilters[name];
		} else {
			delete currentFilters.query[name];
		}

		if ('undefined' !== typeof(runUpdate) || false !== runUpdate) {
			kv.throttle(updateTeamList);
		}
	}

	function formatTeamData(data) {
		var result = {};

		if ('undefined' !== typeof(data.data)) {
			data.data.map(addTeamCustomData);

			// get first page of unfiltered results
			result = data;
		}

		result.currentFilters = currentFilters;

		return result;
	}

	function socialUrl ( socialType, value ) {
		switch (socialType) {
			case 'facebook_url':
				return value.includes("facebook.com") ? value :  "https://www.facebook.com/" + value
				break;
		  	case 'linkedin_url':
				return value.includes("linkedin.com") ? value :  "https://www.linkedin.com/in/" + value
				break;
		  	case 'twitter_url':
				return value.includes("twitter.com") ? value :  "https://twitter.com/" + value
				break;
		  	case 'youtube_url':
				return value.includes("youtube.com") ? value :  "https://youtube.com/channel/" + value
				break;
			default:
				return null
		}
	}

	function addTeamCustomData(member) {
		if ('undefined' === typeof(member.profile_url) || '' === member.profile_url) {
			var agent_slug = member.id;

			if ('undefined' !== typeof(member.first_name)) {
				agent_slug += '-' + member.first_name;
			}
			if ('undefined' !== typeof(member.last_name)) {
				agent_slug += '-' + member.last_name;
			}

			member.profile_url = kv.Config.get('pages', 'agent_profile') + kv.String.sanitizeTitle(agent_slug) + '/';
		}

		if ('undefined' === typeof(member.website_url) || '' === member.website_url) {
			member.website_url = member.profile_url;
		} else if (-1 === member.website_url.indexOf('://')) {
			member.website_url = 'https://' + member.website_url;
		}

		if ('object' !== typeof(member.social)) {
			member.social = {};
		}

		if (kv.isUsableObject(member.social)) {
			var social = {};

			Object.keys(member.social).forEach(function(key) {
				if (member.social[key]) {
					social[key] = socialUrl(key, member.social[key]);
				}
			});

			member.social = social;
		}
		return member;
	}

	if ($teamPageResults.length) {
		$teamPageResults.addClass(loadingWithMarginClass);
		loadPage();
	}
}(jQuery, kvCORE));

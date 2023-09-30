kvCORE.MarketReportSearch = (new function ($, kv) {
	var $container = $('#kvcoreidx-market-report-search');
	var loadingClass = 'loading loading-center';
	var endpoint = 'public/listings/areas';

	function load() {
		kv.Remote.addDataFilter(endpoint, function(origData) {
			var processAreas = function(origData) {
				if (!Array.isArray(origData.areas)) {
					return [];
				}

				return origData.areas.filter(function(area) {
					if (area.name) {
						area.id = area.type + '|' + area.name;
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
				id: 'area',
				layout: 'token',
				placeholder: placeholderText,
				order: 'count|desc',
				autocompleteCallback: function(query, callback) {
					kv.Remote.get(endpoint, {query: query}, function(response) {
						callback(processAreas(response));
					});
				}
			};

			return $.extend(origData, data);
		});

		kv.Remote.addStoredEndpoint(endpoint);

		kv.View.renderAjax('multiple-select', endpoint, {}, $container, bindMultipleSelect);
	}

	function bindMultipleSelect(viewName, data) {
		kv.MultipleSelect.initMultiSelect($('#container-' + data.id), data);
	}

	this.submit = function(form) {
		var formArray = kv.Form.toArray(form);
		var marketReportPage = kv.Config.get('pages', 'market_report');

		if (!marketReportPage) {
			kv.Message.warning('Market Report page is not configured');
			return;
		}

		if (!Array.isArray(formArray.area) || formArray.area.length === 0) {
			kv.Message.info('Please choose an area');
			return;
		}

		var area = formArray.area[0];

		var $datasetArea = $('#dataset-area').find('[value="' + area + '"]');

		var state = null;

		if ($datasetArea.length !== 0) {
			var item = $datasetArea.data('item');
			if (typeof item !== 'undefined' && typeof item.state !== 'undefined' && item.state.length !== 0) {
				state = item.state;
			}
		}

		var args = {area: area};
		if (state) {
			args.state = state;
		} else {
			kv.Message.info('Market Report is not available for that area');
			return;
		}

		if (kv.Config.compare('activeIdxPage', 'market_report')) {
			kv.MarketReport.loadMarketReport(args);
		} else {
			kv.Url.redirect(marketReportPage, args);
		}
	};

	if ($container.length) {
		$container.addClass(loadingClass);
		load();
	}
}(jQuery, kvCORE));
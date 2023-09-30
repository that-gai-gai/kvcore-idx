kvCORE.ValuationSearch = (new function($, kv) {
	var $valuationPdfSearchContainer = $('#kvcoreidx-valuation-pdf-search');

	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	var selectedResult = {id: null};
	var requestAddress = kv.Config.get('request', 'args', 'fullAddress');
	var isPdfPage = kv.Config.compare('activeIdxPage', 'valuation_pdf');

	function load() {
		if ($valuationPdfSearchContainer.length === 0) {
			return;
		}

		kv.View.render('valuation-pdf-search', {}, $valuationPdfSearchContainer, bindValuationSearch);
	}
	
	function bindValuationSearch() {
		$valuationPdfSearchContainer.removeClass(loadingCenter);

		var controls = {
			geocoder: {
				config: {
					placeholder: 'Enter your address to find out what your home is worth',
					country: 'US,CA',
					types: 'address',
					flyTo: false
				},
				handleAddInCallback: true,
				callback: setGeocoder
			}
		};

		$valuationPdfSearchContainer.find('.kv-valuation-pdf-search-button').click(getAddress);
		kv.Map.generateMap('kv-valuation-pdf-search-map', {}, controls);
	}

	function setGeocoder(geocoder) {
		$valuationPdfSearchContainer.find('.kv-valuation-pdf-search-map .mapboxgl-ctrl-geocoder input')
			.keyup(maybeResetSelectedResult);

		geocoder.on('result', setSelectedResult);
		geocoder.on('clear', resetSelectedResult);

		if (requestAddress) {
			geocoder.query(requestAddress);
		}
	}
	
	function setSelectedResult(response) {
		if (typeof response.result === 'undefined') {
			kv.Message.info('Nothing found');
			return;
		}

		var result = response.result;

		if (selectedResult.id !== result.id) {
			selectedResult = result;
		}

		if (requestAddress) {
			$valuationPdfSearchContainer.find('.kv-valuation-pdf-search-button').click();
			requestAddress = null;
		}
	}

	function resetSelectedResult() {
		selectedResult = {id: null};
	}
	
	function maybeResetSelectedResult(e) {
		if (kv.isEmpty($(e.target).val())) {
			resetSelectedResult();
		}
	}
	
	function parseMapboxResult() {
		var getContextItem = function(filter) {
			for (var key in selectedResult.context) {
				if (!selectedResult.context.hasOwnProperty(key)) {
					continue;
				}

				var item = selectedResult.context[key];

				if (item.id.indexOf(filter) !== -1) {
					return item;
				}
			}

			return null;
		};

		var address = '';

		if (typeof selectedResult.address === 'string') {
			address += selectedResult.address + ' ';
		}

		address += selectedResult.text;

		var zipContextItem = getContextItem('postcode');
		var stateContextItem = getContextItem('region');

		if (!zipContextItem || !stateContextItem) {
			return false;
		}
		var unit = $('#kv-valuation-pdf-unit #unitnum').val();
		return {
			address: address,
			city: getContextItem('place').text,
			zip: zipContextItem.text,
			state: stateContextItem['short_code'].split('-')[1],
			fullAddress: selectedResult['place_name'],
			unit: unit
		};
	}

	function getAddress() {
		if (selectedResult.id === null) {
			return stopValuation('Please perform property search');
		}

		var args = parseMapboxResult();

		if (!args) {
			return stopValuation();
		}
		if (isPdfPage) {
			kv.ValuationPdf.getValuation(args);
		} else {
			kv.Url.redirect(kv.Config.get('pages', 'valuation_pdf'), {fullAddress: args.fullAddress});
		}
	}

	function stopValuation(message) {
		if (typeof message === 'undefined') {
			message = 'Valuation is not possible for selected address';
			kv.Message.warning(message);
		} else {
			kv.Message.info(message);
		}

		if (isPdfPage) {
			kv.ValuationPdf.removeLoadingClass();
			kv.ValuationPdf.empty();
		}
	}

	load();
}(jQuery, kvCORE));
kvCORE.Autocomplete = (new function ($, kv) {
	this.render = function(options, key, data) {
		if (typeof key !== 'string') {
			console.log('Autocomplete key is not a string');
			return;
		}

		if (!Array.isArray(data) || !data.length) {
			console.log('Autocomplete data is not an Array');
			return;
		}

		var selected = 0;
		var fromConfig = kv.Config.get('request', 'args', key);

		if (fromConfig) {
			selected = parseInt(fromConfig, 10);

			if (isNaN(selected)) {
				selected = 0;
			}
		}

		var inputId = 'kv-filter-' + key;
		var inputIdSelector = '#' + inputId;
		var inputResultsId = inputId + '-results';
		var inputValueId = inputId + '-value';
		var inputValueIdSelector = '#' + inputValueId;
		var idClear = inputId + '-clear';

		var viewData = {
			key: key,
			id: inputId,
			idValue: inputValueId,
			idClear: idClear
		};

		kv.View.render('autocomplete', viewData, '#' + inputId + '-container', init);

		function init() {
			var $inputId = $(inputIdSelector);
			var $inputValue = $(inputValueIdSelector);
			var $clear = $('#' + idClear);

			if (selected) {
				data.forEach(function(item) {
					if (item.id === selected) {
						$inputId.val(item[key]);
						$inputValue.val(item.id).trigger('change');
					}
				});
			}

			function clearInput() {
				$inputId.val('');
				$inputValue.val('').trigger('change');
				$clear.hide();
			}
			
			$inputId.keyup(function() {
				if (kv.isEmpty($inputId.val())) {
					clearInput();
				}
			});

			$clear.click(clearInput);

			new autoComplete($.extend(true, {
				data: {src: data, key: key},
				placeHolder: 'Filter ' + kv.String.capitalizeFirstLetters(key),
				selector: inputIdSelector,
				threshold: 0,
				searchEngine: 'strict',
				resultsList: {
					container: function() {
						return inputId + '-results';
					},
					destination: $inputId.get(0),
					position: 'afterend'
				},
				resultItem: function (data)  {
					// Close other ul's
					kv.throttle(function() {
						$('.kv-autocomplete + ul').each(function(i, ul) {
							if (ul.id !== inputResultsId) {
								$(ul).html('');
							}
						});
					});

					return highlightMatch(data.source[key], $inputId.val());
				},
				maxResults: 5,
				onSelection: function(feedback) {
					$inputId.val(feedback.selection[key]);
					$inputValue.val(feedback.selection.id).trigger('change');
					$clear.show();
				}
			}, options));
		}

		return true;
	};
	
	function highlightMatch(string, search) {
		if (kv.isEmpty(search)) {
			return string;
		}

		var searchRegExp = new RegExp(search, 'ig');

		var matchCount = 0;

		while (searchRegExp.exec(string) !== null) {
			++matchCount;
		}

		var searchInstringCase = [];
		var matchIndexes = [];
		var stringSub = string;
		var lastIndex = 0;

		for (var i = 0; i <= matchCount; i++) {
			stringSub = stringSub.substr(lastIndex);
			matchIndexes[i] = stringSub.search(searchRegExp);
			if (matchIndexes[i] !== -1) {
				searchInstringCase[i] = '';
				lastIndex = matchIndexes[i] + search.length;
				for (var j = matchIndexes[i]; j < lastIndex; j++) {
					if (typeof stringSub[j] === 'undefined') {
						continue;
					}
					searchInstringCase[i] += stringSub[j];
				}
			}
		}

		var stringSplitted = string.split(searchRegExp);
		string = '';

		stringSplitted.forEach(function(part, i) {
			string += part;
			if (stringSplitted.length - 1 !== i) {
				string += '<span class="kv-autocomplete-match">' + searchInstringCase[i] + '</span>';
			}

		});

		return string;
	}
}(jQuery, kvCORE));
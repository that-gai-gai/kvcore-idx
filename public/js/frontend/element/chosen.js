kvCORE.Chosen = (new function ($, kv) {
    this.render = function(options, key, data) {
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
        var inputValueId = inputId + '-value';
		var inputValueIdSelector = '#' + inputValueId;
        
        var viewData = {
			key: key,
            id: inputId
        };
        
        kv.View.render('chosen', viewData, '#' + inputId + '-container', init);

        function init() {            
            var $inputId = $(inputIdSelector);
            var $inputValue = $(inputValueIdSelector);

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

            for (var i = 0; i < data.length; i++) {
                $(inputIdSelector).append(' <option value="' + data[i].id + '">' + data[i][key] + '</option>');
            }
            $(inputIdSelector).chosen(
                {
                    placeholder_text_single: options.placeHolder,
                    single_backstroke_delete: true,
                    allow_single_deselect: true,
                    //disable_search_threshold: 10, //maybe want to turn on later
                    width: "100%"
                }
            );
            
            $(inputIdSelector).on('change', function(evt, params) {
                if (!params) {
                    clearInput();
                } else {
					$inputValue.val(params.selected).trigger('change');
                }
            });

        }
        return true;
	};
	
}(jQuery, kvCORE));
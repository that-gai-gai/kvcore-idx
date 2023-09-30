(function ($, kv) {
	var $hotsheetsForm = $('#kv-admin-hotsheets');
	var $inputs = $hotsheetsForm.find('input[type="text"]');
	var multipleValueFilters = ['options', 'propertyViews', 'propertyTypes', 'styles'];

	$inputs.each(function() {
		var $input = $(this);
		if (typeof $input.attr('class') === 'undefined') {
			return true;
		}
		var filterClass = $input.attr('class').replace('kv-hotsheet-filter-', '');
		var optionsData = kv.Config.get('apiConstants', filterClass);
		if (optionsData) {
			var options = {};
			if (multipleValueFilters.indexOf(filterClass) !== -1) {
				options.multiple = true;
			}
			options.data = optionsData;
			$input.select2(options);
		}
	});

	$hotsheetsForm.submit(function(e) {
		e.preventDefault();

		var form = kv.Form.toArray(this);

		if (Array.isArray(form['kv-admin-hotsheets'])) {
			form['kv-admin-hotsheets'].forEach(function(filters) {
				for (var key in filters) {
					if (!filters.hasOwnProperty(key)) {
						continue;
					}

					var value = filters[key];

					if (multipleValueFilters.indexOf(key) !== -1) {
						filters[key] = value.replace(/,/g, '|');
					} else if (key === 'polygon') {
						filters[key] = [];
						value.forEach(function(polygon) {
							filters[key].push(JSON.parse(polygon));
						});
					}
				}
			});
		}

		$.post({
			url: kv.Config.get('restNamespace') + 'save-hotsheets',
			data: form,
			beforeSend: function(xhr) {
				xhr.setRequestHeader('X-WP-Nonce', kv.Config.get('nonce'));
			},
			success: function(response) {
				kv.Message.success(response);
			},
			error: function(jqXHR) {
				if (typeof jqXHR['responseJSON'].message !== 'undefined') {
					kv.Message.error(jqXHR['responseJSON'].message);
				} else {
					kv.Message.error(jqXHR.responseText.replace(/"/g, ''));
				}
			}
		});
	});

	$('.kv-hotsheets-grid-remove-hotsheet').click(function() {
		$(this).closest('.kv-content-box-container').remove();
	});

	$('.kv-hotsheets-grid-remove-filter').click(function() {
		$(this).closest('.kv-hotsheets-grid-filter').remove();
	});

	$('.kv-hotsheets-grid-shortcode-copy').click(function(e) {
		var $input = $(e.target).closest('.kv-hotsheets-grid-filter').find('input');
		$input.focus().select();
		document.execCommand('copy');
		kv.Message.success('Shortcode copied to clipboard');
	});
}(jQuery, kvCORE));

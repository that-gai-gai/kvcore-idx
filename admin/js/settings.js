(function($, config) {
	if('undefined' === typeof($)){
		return;
	}

	var actions = {
		// various admin JS actions
		// if you need to prevent form submission,
		// you have to call e.preventDefault() !
		// also MAKE SURE you execute callback()
		// at some point, otherwise the loader
		// will never disappear!
		'create_required_pages': function(e, callback) {
			e.preventDefault();

			$.get({
				url: config['restNamespace'] + 'create-required-pages',
				beforeSend: function(xhr) {
					xhr.setRequestHeader('X-WP-Nonce', config.nonce);
				}
			}).then(function(response) {
				kvCORE.Message.info(response.title, response.message);
				callback();
			});
		}
	};

	// run appropriate action for the button if one
	// exists
	$('[type="submit"][name*="kvCORE_Admin_Page_Settings"]').on('click', function(e) {
		var $this = $(this);
		var name = $this.attr('name');
		var action = name.match(/kvCORE_Admin_Page_Settings\[(.*)]/);

		if ('undefined' !== typeof(action) && Array.isArray(action) && 'undefined' !== typeof(action[1])) {
			if ('function' === typeof(actions[action[1]])) {
				var $loader = $('<div class="spinner"></div>');
				$this.attr('disabled', 'disabled').addClass('disabled').after($loader);
				$loader.css('visibility', 'visible');

				actions[action[1]].apply($this, [e, function() {
					$loader.remove();
					$this.removeClass('disabled').removeAttr('disabled');
				}]);
			}
		}
	});

	function hideConditionalFields() {
		var $this = $(this);
		var hide = $this.data('hide');

		if (hide && hide.self === true) {
			var $fieldrow = $this.closest('.kvcore-fieldrow');
			$fieldrow.addClass('kvcore-fieldrow-hide').hide();
		}
	}

	function applyConditionalField(applyHide) {
		if (typeof applyHide === 'undefined') {
			applyHide = true;
		}

		if (applyHide) {
			conditionalFields.each(hideConditionalFields);
		}

		var $this = $(this);
		if ($this.attr('type') === 'radio') {
			$this = $this.filter(function() { return $(this).is(':checked'); });
		}
		var value = $this.val();
		var $section = $this.closest('.kvcore-section');
		var hide = $this.data('hide');

		$section.find('.kvcore-fieldrow:not(.kvcore-fieldrow-hide)').show();

		if (hide && hide.length !== 0) {
			Object.keys(hide).map(function(key) {
				if (key !== value) {
					return;
				}

				hide[key].map(function(field) {
					$section.find('#fieldrow-' + field).hide();
				})
			});
		}

		var show = $this.data('show');

		if (show && show.length !== 0) {
			Object.keys(show).map(function(key) {
				if (key !== value) {
					return;
				}

				show[key].map(function(field) {
					$section.find('#fieldrow-' + field).show();
				})
			});
		}
	}

	var conditionalFields = $('[data-conditional="conditional"]');

	function applyConditionalFields() {
		conditionalFields.each(hideConditionalFields);
		conditionalFields.each(function() { applyConditionalField.call(this, false); });
	}

	applyConditionalFields();
	conditionalFields.change(applyConditionalFields);

	function applyNonEmpty() {
		var $this = $(this);
		var ifEmpty = $this.data('if-empty');

		if (this.value === '') {
			this.value = ifEmpty;
		}
	}

	var nonEmptyFields = $('[data-if-empty]');
	nonEmptyFields.each(applyNonEmpty);
	nonEmptyFields.keyup(applyNonEmpty);
}(jQuery, 'undefined' !== typeof(kvcoreidxAdminConfig) ? kvcoreidxAdminConfig : {}));
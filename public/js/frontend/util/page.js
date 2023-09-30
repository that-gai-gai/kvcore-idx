kvCORE.Page = (new function($, kv) {
	this.Meta = new function() {
		var head = $('head');
		var defaultOptions = {
			tag: 'meta',
			nameAttribute: 'property',
			namePrefix: 'og',
			valueDelimeter: null,
			valueUpdateFirstPart: false,
			getValue: function(metaEl) {
				return metaEl.attr('content');
			},
			setValue: function(metaEl, value) {
				return metaEl.attr('content', value);
			}
		};
		var options = {};

		this.init = function() {
			this.setOptions(defaultOptions);

			return this;
		};

		this.setOptions = function(newOptions) {
			if (typeof newOptions.getValue !== 'function') {
				delete newOptions.getValue;
			}
			if (typeof newOptions.setValue !== 'function') {
				delete newOptions.setValue;
			}

			options = $.extend(options, newOptions);

			return this;
		};

		function getPrefix() {
			var prefix = options.namePrefix;
			return prefix !== '' ? prefix + ':' : '';
		}

		function getEl(name) {
			return options.nameAttribute !== null
				? head.find(options.tag + '[' + options.nameAttribute + '="' + getPrefix() + name + '"]')
				: head.find(options.tag);
		}

		function create(name) {
			return $(document.createElement(options.tag))
				.attr(options.nameAttribute, getPrefix() + name)
				.appendTo(head);
		}

		function setOne(name, value) {
			var metaEl = getEl(name);
			var currentValue = options.getValue(metaEl);

			if (metaEl.length !== 0 && value === null) {
				getEl(name).remove();
				return;
			} else if (metaEl.length === 0) {
				metaEl = create(name);
			}

			var delimeter = options.valueDelimeter;

			if (delimeter !== null && !kv.isEmpty(currentValue)) {
				if (options.valueUpdateFirstPart === true) {
					var currentValueSplitted = currentValue.split(delimeter);
					currentValueSplitted.shift();
					currentValue = currentValueSplitted.join(delimeter);
				}
				value = value + options.valueDelimeter + currentValue;
			}

			options.setValue(metaEl, value);
		}

		this.set = function(metaObject) {
			Object.keys(metaObject).map(function(key) {
				var value = metaObject[key];
				setOne(key, value);
			});

			return this;
		};

		this.updateTitle = function(title) {
			this.init()
				.setOptions({
					valueDelimeter: ' - ',
					valueUpdateFirstPart: true
				})
				.set({title: title})
				.setOptions({
					nameAttribute: 'name',
					namePrefix: 'twitter'
				})
				.set({title: title})
				.setOptions({
					tag: 'title',
					nameAttribute: null,
					getValue: function(metaEl) {
						return metaEl.text();
					},
					setValue: function(metaEl, value) {
						return metaEl.text(value);
					}
				})
				.set({title: title});

			return this;
		};

		this.setDescription = function(description) {
			this.init()
				.set({description: description})
				.setOptions({
					nameAttribute: 'name',
					namePrefix: ''
				})
				.set({description: description});

			return this;
		};
	};
	this.Meta.init();

	$(window).on('load', function () {
		// Bind some canada values for two modals
		if ( "1" === kv.Config.get('options', 'optimize_for_canada') ) {
			kv.Remote.get('public/entity', {}, function(data) {
				var fullCanadaAddress = data.data.address + ' ' + data.data.city + ', ' + data.data.state + ' ' + data.data.zip;
				$('.kv-modal-terms-canada-name').html(data.data.name);
				$('.kv-modal-terms-canada-address').html(fullCanadaAddress);
				$('.kv-modal-terms-canada-website').html(data.data.website.data.domain);
			});
		}
		// Close collapses
		$('body').click(function(e) {
			var $target = $(e.target);
			var $parent = $target.closest('.kv-collapse-parent');

			var isToggle = $target.data('toggle') === 'collapse';
			var isInCollapseParent = $parent.length > 0;

			var visible = [];

			if (isToggle && isInCollapseParent) {
				visible = $parent.find('.collapse:visible');
			} else if (!isInCollapseParent) {
				visible = $('.kv-collapse-parent:not(.kv-collapse-accordion) .collapse:visible');
			}

			if (visible.length > 0) {
				visible.collapse('hide');
			}
		});
	});
} (jQuery, kvCORE));
kvCORE.MultipleSelect = (new function ($, kv, kvSearch) {
	var multipleSelect = this;

	this.zIndexMax = 100;

	this.initMultiSelect = function($container, data, callback) {
		switch ($container.data('layout')) {
			case 'button': new this.multiSelectButton($container, data, callback); break;
			case 'token': new this.multiSelectToken($container, data, callback); break;
		}
	};

	this.clearMultiSelect = function ($container) {
		if ($('.kv-multiple-select-token').length !== 0) {
			$('.kv-multiple-select-token').each(function() {
				$token = $(this);
				var val = $token.data('value');
				$container.find('[value="' + val + '"]').click();
				$token.remove();
			});
		}
	};

	this.multiSelect = function($container, data, callback) {
		if (!kv.isEmpty(data.selectedVals)) {
			this.vals = data.selectedVals;
		} else {
			this.vals = data.vals;
		}

		this.data = data;
		this.id = this.data.id;
		this.callback = callback;
		this.$container = $container;
		this.$multipleSelect = this.$container.closest('.kv-multiple-select');
		this.$dataset = this.$container.find('.kv-multiple-select-dataset-container');
		this.autocompleteDataset = [];

		//this.data[this.id] this.id is 'areas' 
		//and has to match to actual data which creates problem when there is more than one on a page
		var multiselectDataId = this.id === 'profile-area' ? 'area' : this.id;
		if (this.$container.length === 0 || !Array.isArray(this.data[multiselectDataId]) || this.data[multiselectDataId].length === 0) {
			return;
		}
		if (typeof this.data.order !== 'undefined') {
			this.order = this.data.order;
		}

		kvSearch.addDataset(this.id, this.data[multiselectDataId], {name: 1, id: 0});

		this.getDataset();
		this.bindSelectValue();
		this.bindSearch();
		this.bindCloseSelect();
	};

	this.multiSelect.prototype = {
		data: {},
		id: '',
		vals: [],
		order: 'id',
		first: true,
		$container: {},
		$multipleSelect: {},
		$dataset: {},
		query: '',
		selectedItem: null,
		scrollPos: 0,

		getDataset: function(query) {
			if (typeof query === 'undefined') {
			} else if (this.query !== query) {
				this.query = query;
			} else {
				return;
			}

			this.$dataset.find('.view-content').addClass('loading');

			var dataset = typeof query === 'string' && query.length !== 0
				? typeof this.data.autocompleteCallback === 'function'
					? this.data.autocompleteCallback(query, this.updateDataset.bind(this))
					: kvSearch.search(this.id, query, 50, 1, this.order).data
				: kvSearch.search(this.id, '*', 50, 1, this.order).data;

			if (typeof dataset !== 'undefined') {
				this.renderDataset(dataset);
			}
		},

		updateDataset: function(dataset) {
			this.autocompleteDataset = dataset;
			this.renderDataset(dataset);
		},

		renderDataset: function(dataset) {
			var self = this;
			var renderData = $.extend({}, this.data);
			var datasetVals = dataset.map(function(datasetItem) {
				return datasetItem.id.toString();
			});

			if (!this.vals) {
				this.vals = [];
			}

			var checkedDataset = this.vals.filter(function(val) {
				return datasetVals.indexOf(val) === -1;
			}).map(function(val) {
				var query = $('#container-area .kv-multiple-select-search').val();
				if (query) {
					var dataItem = kvSearch.search(self.id, query, 1, 1, this.order, 'id', true).data[0];
				}

				if (typeof dataItem === 'undefined') {
					var idHash = kv.getHash(val, true);
					if (typeof kv.Storage.get('multiselectValues', idHash) !== 'undefined') {
						if (!kv.Storage.get('multiselectValues', idHash) || kv.Storage.get('multiselectValues', idHash) === null) {
							return '';
						}
						else {
							return kv.Storage.get('multiselectValues')[idHash];
						}
					}
				}
				if (typeof dataItem === 'undefined' && val.indexOf('|') !== -1) {
					var valSplit = val.split('|');
					dataItem = {
						id: val,
						type: valSplit[0],
						name: valSplit[1]
					};
				}
				return dataItem;
			}).filter(function(dataItem) { return typeof dataItem !== 'undefined'; });
			if (this.id === 'styles' && !this.query) {
				renderData[this.id] = {}
			} else {
				//cleanup blank ones
				for (var i = 0; i < checkedDataset.length; i++) {
					if (checkedDataset[i] === '') {
						delete checkedDataset[i];
					}
				}
				renderData[this.id] = checkedDataset.concat(dataset).map(function(item) {
					if (typeof item.name !== 'undefined') {
						item.name = kv.String.capitalizeFirstLettersOfLongWords(item.name);
					}
					if (typeof item.id === 'string') {
						item.itemId = item.id.replace(/\//g, '').replace(/\s/g, '-').replace(/\|/g, ':');
					}
					return item;
				}).filter(function(dataItem) { return typeof dataItem !== 'undefined'; });
			}

			//stored data needs appended to the dataset w/ polygonKey and areas
			if (this.id === 'area' || this.id === 'profile-area') {
				var idHash;
				var storedValues = [];
				if (!kv.isEmpty(renderData.request.polygonKey)) {
					idHash = kv.getHash(renderData.request.polygonKey, true);
					storedValues.push(kv.Storage.get('multiselectValues')[idHash]);
				} 
				if (!kv.isEmpty(renderData.request.area)) {
					for (var i = 0; i < renderData.request.area.length; i++) {
						idHash = kv.getHash(renderData.request.area[i], true);
						if (!kv.isEmpty(kv.Storage.get('multiselectValues'))) {
							storedValues.push(kv.Storage.get('multiselectValues')[idHash]);
						}
					}
				}

				//only push if does not already exist
				if (storedValues[0] !== undefined) {
					for (var i = 0; i < storedValues.length; i++) {
						var match = false;

						for (var j = 0; j < renderData.area.length; j++) {
							if (renderData.area[j] !== undefined) {
								if (renderData.area[j].name === storedValues[i].name) {
									match = true;
								}
							}
						} 
						if (match === false) {
							renderData.area.push(storedValues[i]);
						}
					}
				}
			}

			//for polygonKey vals
			if (!kv.isEmpty(renderData.request.polygonKey)) {
				renderData.vals.push(renderData.request.polygonKey);
			} else {
				//was not getting set sometimes fix
				renderData.vals = this.vals;
			}
			
			kv.View.render('multiple-select-dataset', renderData, this.$dataset, this.bindContainer.bind(this));
		},

		bindContainer: function() {
			this.updateCheckboxes();
			this.findLastFeaturedItem();

			if (this.first) {
				this.first = false;

				if (typeof this.callback === 'function') {
					this.callback();
				}

				return true;
			}

			return false;
		},

		updateCheckboxes: function() {
			var self = this;
			//reordering is not needed for polygon areas since only one choice is allowed in box
			this.$container.find('input').each(function(index, checkbox) {
				var $checkbox = $(checkbox);

				var order = $checkbox.data('original-order');

				if ($checkbox.is(':checked')) {
					order = -10000 + order;

					if (self.vals.indexOf($checkbox.val()) === -1) {
						self.vals.push($checkbox.val());
					}
				}

				$checkbox.data('order', order);

				var $label = self.$container.find('label[for="' + $checkbox.attr('id') + '"]');
				$label.css('order', order);
			});
		},

		findLastFeaturedItem: function() {
			var $featured = this.$container.find('.kv-featured');

			if ($featured.length === 0) {
				return false;
			}

			$featured.removeClass('kv-featured-last')
				.sort(this.sortLabelByOrder)
				.last()
				.addClass('kv-featured-last');
		},

		removeVal: function(val) {
			var valIndex = this.vals.indexOf(val);
			if (valIndex !== -1) {
				this.vals.splice(valIndex);
			}
		},

		sortLabelByOrder: function(a, b) {
			return $('#' + $(b).attr('for')).data('this.order') < $('#' + $(a).attr('for')).data('this.order');
		},

		selectValue: function(self) {
		},

		bindSelectValue: function() {

			var self = this;

			this.$container.on('click', 'input[type="checkbox"]', function() {
				self.selectValue.call(this, self);
			});
		},

		search: function(e, self) {
			var $this = $(this);
			var $thisValue = $this.val().toLowerCase();

			self.getDataset($thisValue);
		},

		unhighlightAllCheckboxes: function($cboxes) {
			$cboxes.nextAll().removeClass("selected");
		},	

		bindSearch: function() {
			var self = this;
			this.$container.find('.kv-multiple-select-search').on('click dblclick keyup', function(e) {
				if (self.tokenDropdownOpened) {
					//if we are using polygon areas different set of checkboxes than areas
					if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
						var $checkboxes = self.$container.find('input.kv-poly-multiselect-checkbox:checkbox:not(:checked)');
					} else {
						var $checkboxes = self.$container.find('input.kv-area-multiselect-checkbox:checkbox:not(:checked)');
					}

					if (e.which == 40) { //down key
						if (self.selectedItem === null) {
							self.selectedItem = 0;
						} else {
							if (self.selectedItem < $checkboxes.length - 1) {
								self.selectedItem++;
								if (self.selectedItem % 4 == 0) {
									self.scrollPos = self.scrollPos + 152;
									self.$dataset.find('.view-content').animate({
										scrollTop: self.scrollPos
									}, 500);
								}
							}
						}
						self.unhighlightAllCheckboxes($checkboxes);
						$checkboxes.eq(self.selectedItem).next().addClass('selected');
					}
					if (e.which == 38) { //up key
						if (self.selectedItem > 0) {
							self.selectedItem--;
							self.scrollPos = self.scrollPos - 38;
							self.$dataset.find('.view-content').animate({
								scrollTop: self.scrollPos
							}, 500);
						}
						self.unhighlightAllCheckboxes($checkboxes);
						$checkboxes.eq(self.selectedItem).next().addClass('selected');
					}
					if (e.which == 13) { //enter key
						//This happens when they click enter without haven't highlighted any option. Defaulting to the first.
						if(!self.selectedItem) {
							self.selectedItem = 0;
						}
						$checkboxes.eq(self.selectedItem).trigger('click');
					}
				}
				self.search.call(this, e, self);
			});
		},

		bindCloseSelect: function() {
			var self = this;
			
			$(document).click(function(e) {
				var maybeContainer = $(e.target).closest('#container-' + self.id);
				if (maybeContainer.length === 0 && !self.$container.hasClass('kv-collapsed')) {
					self.$container.addClass('kv-collapsed');
				}
			});
		}
	};

	this.multiSelectButton = function($container, data, callback) {
		multipleSelect.multiSelect.apply(this, arguments);
		this.bindOpenSelect();
	};

	this.multiSelectButton.prototype = $.extend({}, this.multiSelect.prototype, {
		parent: multipleSelect.multiSelect.prototype,

		bindContainer: function() {
			if (this.parent.bindContainer.apply(this, arguments)) {
				this.$multipleSelect.find('.kv-multiple-select-control').prop('disabled', false);
			}
		},

		bindOpenSelect: function() {
			var self = this;

			this.$multipleSelect.find('.kv-multiple-select-control').click(function(e) {
				e.stopPropagation();
				e.preventDefault();

				var $target = self.$container;

				if ($target.hasClass('kv-collapsed')) {
					$target = $target.add($target.find('.kv-collapsed'));
					kvCORE.MultipleSelect.incrementZIndex($target);
				}

				if ($target.length) {
					$target.toggleClass('kv-collapsed');
				}
			});
		},

		selectValue: function(self) {
			var $input = $(this);

			self.updateCheckboxes();
			self.findLastFeaturedItem();

			if (!$input.is(':checked')) {
				self.removeVal($input.val());
			}

			self.$multipleSelect.find('.kv-multiple-select-control .kv-counter')
				.html(self.$container.find('input:checked').length);
		}
	});

	this.multiSelectToken = function($container, data, callback) {
		multipleSelect.multiSelect.apply(this, arguments);
	};

	this.multiSelectToken.prototype = $.extend({}, this.multiSelect.prototype, {
		parent: multipleSelect.multiSelect.prototype,
		tokenDropdownOpened: false,

		bindContainer: function() {
			if (this.parent.bindContainer.apply(this, arguments)) {
				this.initTokens();
			}
		},

		storeSelectedValue: function($input) {
			var data = $input.data('item');
			var id = data
				? data.id
				: $input.attr('id').replace(this.id + '-', '').replace(/-/g, ' ').replace(/:/g, '|');
			var newSelectedValue = this.autocompleteDataset.filter(function(item) { return id === item.id; });
			//if still not set set it to what's in data, the case for those in dropdown but not in the autocompleteDataset
			if (newSelectedValue.length !== 1) {
				newSelectedValue.push(data);
			}
			if (newSelectedValue.length === 1) {
				var multiselectValues = kv.Storage.get('multiselectValues');
				if (multiselectValues === null) {
					multiselectValues = {};
				}

				multiselectValues[kv.getHash(id, true)] = newSelectedValue[0];
				kv.Storage.set('multiselectValues', multiselectValues, 30);
				//store polygonArea in a way we can retrieve it to later append to areas renderData and avoid duplicates
				if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1' && data) {
					multiselectValues[kv.getHash(data.polygonKey, true)] = newSelectedValue[0];
					kv.Storage.set('multiselectValues', multiselectValues, 30);
				}
			}
		},

		addPolygonKey: function(inputKey) {
			if (inputKey) {
				//jquery selector doesn't like certain special chars in a selector have to escape them w
				var inputSelector = "#" + inputKey.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");

				$(inputSelector).next().prop('checked', true);
				if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
					this.$multipleSelect.find('.kv-multiple-select-search').prop('disabled', true);
				}
				//if quicksearch bar then search form when area selected
				var shortcode = $('#kvcoreidx-properties-search').data('context');
				if (shortcode && shortcode['shortcode_attributes']['show_filters'] === 'no') {
					$('#kvcoreidx-properties-search').find('form').submit();
				}
			}
			
		},

		removePolygonKey: function(inputKey) {
			if (inputKey) {
				var areaToPoly = inputKey.replace("area-", "poly-");
				var polySelector = $(document.getElementById(areaToPoly));
				polySelector.prop('checked', false);
				if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
					this.$multipleSelect.find('.kv-multiple-select-search').prop('disabled', false);
				}
			}
		},

		initTokens: function() {
			var self = this;
			this.inputs = [];

			this.vals.map(function(val) {
				//polygon key error workaround
				if (val.indexOf(':') === -1) {
					var found = kvSearch.search(self.id, val, 1, 1, self.order, 'id');
					if (typeof found.data !== 'undefined' && found.data.length === 1) {
						self.addToken(found.data[0]);
					} else if (val.indexOf('|') !== -1) {
						self.addToken({
							id: val,
							name: val.split('|')[1]
						});
					}
				}
				
			});
			
			if (this.inputs.length !== 0) {
				this.inputs.each(function() {
					self.updateTokens($(this));
				});
			}
		},

		addToken: function(tokenData) {
			var $input = $('<input>').prop('type', 'checkbox')
				.val(tokenData.id)
				.data('name', kv.String.capitalizeFirstLettersOfLongWords(tokenData.name))
				.data('extra', tokenData.extra)
				.prop('checked', true);

			this.inputs = this.inputs.length === 0
				? $input
				: this.inputs.add($input);
		},

		updateTokens: function($input) {
			var self = this;
			var $tokenContainer = this.$container.find('.kv-multiple-select-token-container');
			var $dataArea = $('#dataset-' + self.id).find('.view-content');
			var $item = $input.data('item');
			
			if (typeof $item === 'undefined') {
				$('.kv-filters-market-report-link').css('display', 'none');
				var str = $input.val().split("|");
				kv.Remote.get("public/listings/areas", {query:str[1].toLowerCase()}, function(response) {
					response.areas.forEach(function (area) {
						if(area.name.toLowerCase() === str[1].toLowerCase() && area.type.toLowerCase() === str[0].toLowerCase()){
							$('#dataset-' + self.id).find('[value="' + $input.val() + '"]').data('item', area);
							$('.kv-filters-market-report-link').css('display', 'block');
						}
					});
				});
			}

			if ($input.is(':checked')) {
				var $close = $('<i>').addClass('kv-multiple-select-token-close')
					.html('&times;')
					.click(function(e) {
						e.stopPropagation();
						self.removeToken($(this).parent());
					});
				$('<span>').addClass('kv-multiple-select-token')
					.attr('data-value', $input.val())
					.attr('title', $input.data('extra'))
					.html($input.data('name'))
					.append($close)
					.appendTo($tokenContainer);

				$('<label>').addClass('kv-form-label-button kv-justify  kv-form-label-button-padding kv-form-hide')
					.attr('for', 'area-' + $input.val())
					.attr('tabindex', '0')
					.attr('role', 'button')
					.appendTo($dataArea);

				$('<input>').addClass('kv-form-hide')
					.attr('id', 'area-' + $input.val())
					.attr('name', 'area[]')
					.attr('value', $input.val())
					.attr('item', $item)
					.appendTo($dataArea);

				// if address clicked in a dropdown redirect to detail page
				if (typeof $item !== 'undefined' && typeof $item['mlsid'] !== 'undefined' && $item['mlsid'].length !== 0) {
					kv.Url.redirect(
						kv.Property.getUrl($item), undefined, kv.Config.compare('openListingsInNewTab', 'true')
					);
				} else {
					if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
						self.addPolygonKey($input.attr('id'));
					}
				}

			} else {
				$tokenContainer.find('[data-value="' + $input.val() + '"]').remove();
				if (kv.Config.get('options', 'listings', 'neighborhood_school_boundary_search') === '1') {
					self.removePolygonKey($input.attr('id'));
				}
			}
		},

		openTokenDropdown: function() {
			var $target = this.$container;
			$target = $target.add($target.find('.kv-collapsed'));
			kvCORE.MultipleSelect.incrementZIndex($target);

			var $searchInput = this.$container.find('.kv-multiple-select-search');
			this.$container.find('.kv-collapsed').removeClass('kv-collapsed');
			this.$container.on('mouseleave', this.closeDropdownDataset.bind(this, this, $searchInput));
			$searchInput.one('focusout', this.closeDropdownDataset.bind(this, this, $searchInput));

			this.tokenDropdownOpened = true;

			$(document).trigger('kv-multiple-select-token-dropdown-opened');
		},

		closeDropdownDataset: function(self, $searchInput) {
			var isMobile = kv.isMobile();
			setTimeout(function() {
				var isHover = self.$dataset.is(':hover');
				if (isMobile) {
					isHover = false;
				}
				if (!isHover && !$searchInput.is(':focus')) {
					var $checkboxes = self.$container.find('input[type="checkbox"]');
					self.selectedItem = null;
					self.scrollPos = 0;
					self.unhighlightAllCheckboxes($checkboxes);
					self.$dataset.addClass('kv-collapsed');
				}
			}, isMobile ? 100 : 300);
		},

		removeLastToken: function() {
			this.removeToken(this.$container.find('.kv-multiple-select-token').last());
		},

		removeToken: function($token) {
			var val = $token.data('value');
			//remove extra dom elements too, created on page jump from home
			//only these extra ones have a | in the id
			if (val) {
				var fixedSelector = "#area-" + val.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
				$(fixedSelector).remove();
				//remove extra labels too
				var label = "label[for='area-"+val+"']";
				$(label).remove();
				this.$container.find('[value="' + val + '"]').click();
				this.removeVal(val);
				$token.remove();
			}
			
		},

		selectValue: function(self) {
			var $input = $(this);

			self.storeSelectedValue($input);
			self.updateTokens($input);
			self.updateCheckboxes();
			self.findLastFeaturedItem();

			if (!$input.is(':checked')) {
				self.removeVal($input.val());
			} else {
				if ($input[0].name !== "searchString") {
					self.$container.find('.kv-multiple-select-search').val('');
				}
			}
		},

		search: function(e, self) {
			var $this = $(this);
			var $thisValue = $this.val().toLowerCase();

			if (e.type !== 'dblclick') {
				if ($thisValue.length === 0 && e.keyCode === 8) {
					self.removeLastToken();
					return;
				}

				if ($thisValue.length < 3) {
					if (self.tokenDropdownOpened) {
						self.$dataset.addClass('kv-collapsed');
						self.tokenDropdownOpened = false;
					}
					return;
				}
			}

			self.openTokenDropdown();

			kv.throttle(self.getDataset.bind(self, $thisValue));
		},

		bindCloseSelect: function() {
			var self = this;

			$(document).click(function(e) {
				var maybeContainer = $(e.target).closest('#container-' + self.id);
				if (maybeContainer.length === 0 && !self.$dataset.hasClass('kv-collapsed')) {
					self.$dataset.addClass('kv-collapsed');
				}
			});
		}
	});

	this.incrementZIndex = function($target) {
		this.zIndexMax++;
		$target.css('z-index', this.zIndexMax);
		$target.parent().css('z-index', this.zIndexMax);
	};
} ('undefined' !== typeof(jQuery) ? jQuery : null, kvCORE, kvCORE.Search));
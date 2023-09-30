kvCORE.Property = (new function($, kv) {
	var favorite = null;

	function self() {
		return kvCORE.Property;
	}

	this.save = function(mls, mlsid) {
		if (!Array.isArray(favorite)) {
			favorite = [];
		}

		favorite.push(mls + '/' + mlsid);

		kv.Cookie.set('saved_properties', favorite);
	};

	this.remove = function(mls, mlsid) {
		var savedIndex = favorite.indexOf(mls + '/' + mlsid);

		if (-1 !== savedIndex) {
			favorite.splice(savedIndex, 1);

			kv.Cookie.set('saved_properties', favorite);
		}
	};

	this.resave = function(properties) {
		favorite = [];

		if (Array.isArray(properties)) {
			Object.keys(properties).forEach(function(key) {
				var property = properties[key];

				favorite.push(property.mls + '/' + property.mlsid);
			});
		}

		kv.Cookie.set('saved_properties', favorite);
	};

	this.addCustomData = function(property) {
		property.detail_url = self().getUrl(property);
		property.saved = isSaved(property);
		property.type = getTypeById(property.type);
		if (property.manualType === 'Sold') {
			property.price = property.sold_price;
		}
		property.bathsCalculated = property.baths + property.halfbaths * 0.5;
		if (Array.isArray(property.features)) {
			property.features.some(function(feature) {
				if (feature.id === 15395) {
					property.bathsCalculated += parseInt(feature.value, 10) * 0.75;
					return true;
				}
			});
		} else if (typeof property.features !== 'undefined' && Array.isArray(property.features.data['interior'])) {
			property.features.data['interior'].some(function(feature) {
				if (feature.id === 15395) {
					property.bathsCalculated += parseInt(feature.value, 10) * 0.75;
					return true;
				}
			});
		}

		var acreageTypes = ['Acreage', 'Com Land', 'Cross Property', 'Farm', 'Land', 'Land Lease', 'Lot', 'Lot-Land'];
		property.footageType = 'footage';
		if (!kv.isEmpty(property.acreage) && (acreageTypes.indexOf(property.type) !== -1 || kv.isEmpty(property.footage))) {
			property.footageType = 'acreage';
		}

		return property;
	};

	this.addManualListingCustomData = function(property){
		property = self().addCustomData(property);

		property.detail_url = self().getManualListingUrl(property);

		return property;
	};

	function setPropertyAsSaved() {
		//on page load needs to be set to saved after this completes
		$('#kvcoreidx-listing-details-page .kv-detail-actions').find('.kv-detail-save').addClass('saved-listing');
		$('#kvcoreidx-listing-details-page .kv-detail-actions').find('.kv-detail-save').html('<i class="fa fa-save"></i><span>REMOVE</span>');
	}

	function isSaved(property) {
		if (!Array.isArray(favorite)) {
			favorite = kv.Cookie.get('saved_properties');

			if (!favorite) {
				favorite = [];
			}
		}

		if (-1 !== favorite.indexOf(property.mls + '/' + property.mlsid)) {
			//this property is favored
			setPropertyAsSaved();
			return true;
		} else {
			return false;
		}
	}

	function getTypeById(id) {
		// if id is string, assume that typeName was already set
		if (typeof id === 'string') {
			return id;
		}

		var typeName = null;

		var listingTypes = kv.Config.get('listingTypes');

		if (Array.isArray(listingTypes)) {
			for (var i = 0; i < listingTypes.length; i++) {
				var listingType = listingTypes[i];

				if (listingType.id === id) {
					typeName = listingType.name;
					break;
				}
			}
		}

		return typeName;
	}

	this.getUrl = function(property) {
		return kv.Config.get('pages', 'listing_detail') +
			property.mls + '-'+ property.mlsid + '-' + getSlug(property.address) + '-' +
			getSlug(property.city) + '-' + property.state + '-' + property.zip + '/';
	};

	this.getManualListingUrl = function(property){
		return kv.Config.get('pages', 'exclusive_detail') +
			property.id + '-' + getSlug(property.address) + '-' +
			getSlug(property.city) + '-' + property.state + '-' + property.zip + '/';
	};

	function getSlug(string) {
		var result = '';
		if (string) {
			result = string.toLowerCase();
			result = result.replace(/[^a-z0-9\s-]/g, "");
			result = result.replace(/[\s-]+/g, " ");
			result = result.trim();
			result = result.toLowerCase().replace(/\b[a-z]/g, function(letter) {
				return letter.toUpperCase();
			});
			result = result.replace(/\s/g, '-');
		}

		return result;
	}

	function loadSaved() {
		if (!kv.Cookie.get('saved_properties') && kv.User.getLeadId()) {
			kv.Remote.get('public/views/' + kv.User.getLeadId(), 'onlySaved', function(data) {
				var favorite = [];

				Object.keys(data.data).forEach(function(key) {
					var property = data.data[key];

					favorite.push(property.mls + '/' + property.mlsid);
				});

				kv.Cookie.set('saved_properties', favorite);

				setPropertyAsSaved();
			});
		}
	}

	this.addFavoriteCallback = function(e) {
		if (kv.isEvent(e)) {
			e.preventDefault();
		}

		var $self = $(this);

		var mls = $self.data('mls');
		var mlsid = $self.data('mls_id');

		if ($self.hasClass('saved-listing')) {
			kv.Remote.delete(
				'public/views',
				{
					mls: mls,
					mls_id: mlsid,
					lead_id: kv.User.getLeadId()
				},
				function(response) {
					if (true === response.success) {
						$self.children('i').addClass('fa-heart-o').removeClass('fa-heart fa-heart-red');
						if ($self.hasClass('add-favorite')) {
							$self.children('span').text('Add to favorites');
						} else {
							$self.children('span').text('Save');
						}

						$self.removeClass('saved-listing');
						kv.Property.remove(mls, mlsid);
					} else {
						kv.Message.error('Error deleting from favorites');
					}
				}
			);
		} else {
			// listing not saved, so save it
			kv.Remote.post(
				'public/views/save',
				{
					mls: mls,
					mls_id: mlsid,
					lead_id: kv.User.getLeadId()
				},
				function(response) {
					if (true === response.success) {
						$self.children('i').removeClass('fa-heart-o').addClass('fa-heart fa-heart-red');
						if ($self.hasClass('add-favorite')) {
							$self.children('span').text('Remove from favorites');
						} else {
							$self.children('span').text('Remove');
						}

						$self.addClass('saved-listing');

						kv.Property.save(mls, mlsid);
					} else {
						kv.Message.error('Error adding to favorites');
					}
				}
			);
		}
	};

	$(document).on('kvcoreidx-loaded', function() {
		loadSaved();
	});
} (jQuery, kvCORE));
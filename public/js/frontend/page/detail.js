// detail-v2.js should be detail.js after March 1st and current detail.js will be deleted
kvCORE.Detail = (new function($, kv) {
	// the different page sections
	var $detailPageHeader = $('#kvcoreidx-shortcode--listing-detail--header');
	var $detailPageHeaderSlider = $('#kvcoreidx-shortcode--listing-detail--header-slider');
	var $detailPageHeaderDetail = $('#kvcoreidx-shortcode--listing-detail--header-detail');
	var $detailPageHomeDetails = $('#kvcoreidx-shortcode--listing-detail--home-details');
	var $detailPagePropertyLocation = $('#kvcoreidx-shortcode--listing-detail--property-location');
	var $detailPageListingAgent = $('#kvcoreidx-shortcode--listing-detail--listing-agent');
	var $detailPageSimilarProperties = $('#kvcoreidx-shortcode--listing-detail--similar-properties');
	var $detailPageDetails = $('#kvcoreidx-shortcode--listing-detail--details');

	var loadingClass = 'loading';

	var currentListingEndpoint = null;
	var navSlidesToShow = 11;

	function getCurrentListingEndpoint() {
		if (null === currentListingEndpoint) {
			var mls = kv.Config.get('query', 'by-mls');
			var mlsid = kv.Config.get('query', 'by-mlsid');

			if(!mls || !mlsid){
				mls = kv.Config.get('query', 'mls');
				mlsid = kv.Config.get('query', 'mlsid');
			}

			currentListingEndpoint = 'public/listings/' + mls + '/' + mlsid;
		}

		return currentListingEndpoint;
	}

	function loadPage() {
		markPropertyView();
		incrementPropertyView();

		var args = {includeListingAgent: 1};
		var defaultAgentId = kv.Config.get('options', 'listing_detail', 'default_agent_id');
		if (!kv.isEmpty(defaultAgentId)) {
			kv.Remote.onBeforeRequest(getCurrentListingEndpoint(), 'get', function(endpoint, method, args) {
				args.headers['X-Agent-ID'] = defaultAgentId;

				return args;
			});
		}

		kv.Remote.get(getCurrentListingEndpoint(), args, function(data, code) {
			// listing not found
			if (code !== 200) {
				var redirectParams = {};

                var mls = kv.Config.get('query', 'by-mls');
                var mlsid = kv.Config.get('query', 'by-mlsid');

                // if mls and mlsid are provided, add them as url params
				// for redirect
				if( mls && mlsid ) {
					redirectParams = {
                        similarMls: mls,
                        similarMlsId: mlsid
                    };
				}

				// do redirect
                kv.Url.redirect(kvCORE.Config.get('pages', 'properties'), redirectParams);
				return;
			}

			data.data = kv.Property.addCustomData(data.data);
			data = formatListingDetailData(data, code);

			// if ('undefined' !== typeof(data.data)) {
			// 	setMeta(data.data);
			// }

			kv.View.render('listing-header-slider', data, $detailPageHeaderSlider, function() {
				bindHeaderSlider(data, $detailPageHeaderSlider);
			});

			kv.View.render('listing-header-detail', data, $detailPageHeaderDetail, function() {
				bindHeaderDetail(data, $detailPageHeaderDetail);
			});

			kv.View.render('listing-detail-home-details', data, $detailPageHomeDetails, function() {
				bindHomeDetails(data, $detailPageHomeDetails);
			});

			bindPropertyLocation(data, $detailPagePropertyLocation);

			if (kv.Config.compare('options', 'design', 'v1')) {
				kv.View.render('listing-detail-listing-agent-small', data, $detailPageListingAgent, function() {
					bindListingAgent(data, $detailPageListingAgent);
				});
			} else {
				kv.View.render('listing-detail-listing-agent', data, $detailPageListingAgent, function() {
					bindListingAgent(data, $detailPageListingAgent);
				});
			}

			kv.Remote.get(getCurrentListingEndpoint() + '/similar', {}, function(data) {
				data = kv.Remote.filterData('public/listings', data);
				data.doNotLoadAlerts = true;
				delete data.currentFilters;

				kv.View.render('properties-listings', data, $detailPageSimilarProperties, function() {
					bindSimilarProperties(data, $detailPageSimilarProperties);
				});
			});

			// mark property viewed
			if (kv.User.getLeadId()) {
				var requestData = {
					lead_id: kv.User.getLeadId(),
					mls: data.data.mls,
					mls_id: data.data['mlsid'],
					mobile: kv.isMobileUserAgent() ? 1 : 0
				};

				kv.Remote.post('public/views', requestData, function() {
				});
			}

			$detailPageDetails.removeClass(loadingClass);
			$detailPageListingAgent.removeClass(loadingClass);
			$detailPageHeader.removeClass(loadingClass);
		});

		var facebookClientId = kv.Config.get('options', 'facebook_client_id');

		if (!kv.isEmpty(facebookClientId)) {
			(function(d, s, id) {
				var js, fjs = d.getElementsByTagName(s)[0];
				if (d.getElementById(id)) {
					return;
				}
				js = d.createElement(s);
				js.id = id;
				js.src = '//connect.facebook.net/en_US/sdk.js';
				fjs.parentNode.insertBefore(js, fjs);
			}(document, 'script', 'facebook-jssdk'));

			window.fbAsyncInit = function() {
				FB.init({
					appId: facebookClientId,
					xfbml: true,
					version: 'v2.9'
				});
			};
		}

		bindLinks();
	}

	function setMeta(data) {
		var meta = {
			url: kv.Url.getCurrentUrl()
		};

		if ('undefined' !== typeof(data.photos) &&
			'undefined' !== typeof(data.photos.data) &&
			'undefined' !== typeof(data.photos.data[0]) &&
			'string' === typeof(data.photos.data[0].url)) {
			meta.image = data.photos.data[0].url;
		}

		kv.Page.Meta.set(meta);

		var documentTitleParts = [];

		if ('undefined' !== typeof(data)) {
			if ('undefined' !== typeof(data.address) && data.address) {
				documentTitleParts.push(kv.String.capitalizeFirstLetters(data.address));
			}
			if ('undefined' !== typeof(data.city) && data.city) {
				documentTitleParts.push(kv.String.capitalizeFirstLetters(data.city));
			}
			if ('undefined' !== typeof(data.state) && data.state) {
				if ('undefined' !== typeof(data.zip) && data.zip) {
					documentTitleParts.push(data.state + ' ' + data.zip);
				} else {
					documentTitleParts.push(data.state);
				}
			}
		}

		if (documentTitleParts.length) {
			kv.Page.Meta.updateTitle(documentTitleParts.join(', '));
		}

		if (!kv.isEmpty(data.remarks)) {
			kv.Page.Meta.setDescription(kv.String.excerpt(data.remarks));
		}
	}

	function formatListingDetailData(data) {
		if ('undefined' !== typeof(data.data)) {
			var openInNewTab = false;
			var numberFormatOptions = {};
			var currencyFormatOptions = {
				style: 'currency', currencyDisplay: 'symbol', currency: 'USD'
			};
			var browserLanguage = 'en-US';

			if ('undefined' !== typeof(navigator) && 'string' === typeof(navigator.language)) {
				browserLanguage = navigator.language;
			}

			openInNewTab = kv.Config.compare('openListingsInNewTab', '1');

			if ('undefined' !== typeof(data.data.photos) && 'undefined' !== typeof(data.data.photos.data)) {
				var photoCountMin = navSlidesToShow;
				var photoCount = data.data.photos.data.length;

				if (photoCount > 0 && photoCount < 10) {
					var numberOfTimesToDuplicate = Math.ceil((photoCountMin - photoCount) / photoCount);

					if (numberOfTimesToDuplicate >= 1) {
						var newPhotosArray = data.data.photos.data;

						for (var i = 0; i < numberOfTimesToDuplicate; i++) {
							newPhotosArray = newPhotosArray.concat(data.data.photos.data);
						}

						data.data.photos.data = newPhotosArray;
					}
				}
			}

			if ('number' === typeof(data.data.price) && data.data.price) {
				data.data.price = Number(data.data.price).toLocaleString(
					browserLanguage, {
						style: 'currency', currencyDisplay: 'symbol', currency: 'USD'
					}).replace(/\D\d\d$/, '').replace(/[a-zA-Z]+/g, '').trim();
			}
			if ('undefined' !== typeof(data.data.history) && Array.isArray(data.data.history.data)) {
				data.data.history.data.map(function(item) {
					item.pricechange = Number(item.pricechange).toLocaleString(
						browserLanguage, {
							style: 'currency', currencyDisplay: 'symbol', currency: 'USD'
						}).replace(/\D\d\d$/, '').replace(/[a-zA-Z]+/g, '').trim();

					return item;
				});
			}
			if ('number' === typeof(data.data.taxes) && data.data.taxes) {
				data.data.taxes = Number(data.data.taxes)
					.toLocaleString(browserLanguage, currencyFormatOptions)
					.replace(/\D\d\d$/, '')
					.replace(/[a-zA-Z]+/g, '')
					.trim();
			}

			if ('number' === typeof(data.data.footage) && data.data.footage) {
				data.data.footage = Number(data.data.footage).toLocaleString(browserLanguage, numberFormatOptions);
			}
			if ('number' === typeof(data.data.beds) && data.data.beds) {
				data.data.beds = Number(data.data.beds).toLocaleString(browserLanguage, numberFormatOptions);
			}
			if ('number' === typeof(data.data.baths) && data.data.baths) {
				data.data.baths = Number(data.data.baths).toLocaleString(browserLanguage, numberFormatOptions);
			}

			if ('undefined' === typeof(data.data.agentphoto) || "" === data.data.agentphoto) {
				if ('string' === typeof(data.data.agentemail) && "" !== data.data.agentemail) {
					data.data.agentphoto = kv.Url.getGravatarUrl(data.data.agentemail);
				} else {
					data.data.agentphoto = kv.Config.get('publicUrl') + 'images/user-icon.png';
				}
			}

			if (data.data.openHouses.data.length > 0) {
				for (var i = 0; i < data.data.openHouses.data.length; i++) { 
					data.data.openHouses.data[i].fulldate = new Date(data.data.openHouses.data[i].year,data.data.openHouses.data[i].month,data.data.openHouses.data[i].day);
					data.data.openHouses.data[i].time = kv.String.fixOpenHouseTime(data.data.openHouses.data[i].time);
				}
				data.data.openHouses.data.sort(function(a, b) {
					return a.fulldate - b.fulldate;
				});
			}

			if ('undefined' !== typeof(data.data.listingAgent) && 'object' === typeof(data.data.listingAgent.data)) {
				if (kv.isUsableObject(data.data.listingAgent.data)) {
					if (-1 === ['string', 'number'].indexOf(typeof(data.data.listingAgent.data.phone_formatted))) {
						data.data.listingAgent.data.phone_formatted = '';
					}

					if (!data.data.listingAgent.data.phone_formatted) {
						if ('undefined' !== data.data.listingAgent.data.cell_phone) {
							data.data.listingAgent.data.phone_formatted = data.data.listingAgent.data.cell_phone;
						} else if ('undefined' !== data.data.listingAgent.data.direct_phone) {
							data.data.listingAgent.data.phone_formatted = data.data.listingAgent.data.direct_phone;
						} else if ('undefined' !== data.data.listingAgent.data.work_phone) {
							data.data.listingAgent.data.phone_formatted = data.data.listingAgent.data.work_phone;
						}

						if (data.data.listingAgent.data.cell_phone) {
							data.data.listingAgent.data.phone_formatted = kv.String.formatPhoneNumber(
								data.data.listingAgent.data.phone_formatted
							);
						}
					}
				}
			}

			$.each(data.data.features.data, function(key, arr) {
				$.each(arr, function(index, obj) {
					obj.value = obj.value.replace(/,/g, ', ');
					obj.value = kv.Url.maybeAddATag(obj.value, 'View ' + obj.realname, openInNewTab);

					if ('undefined' !== typeof(obj.realname)) {
						obj.realname = obj.realname.replace(/(Y\/N|YN)$/g, '').trim()
					}
				});
			});
		}

		return data;
	}

	function bindHeaderSlider(data, $target) {
		$target.find('.kv-slider').on('init', function() {
			if( 'function' === typeof(objectFitImages)){
				objectFitImages($('img.kv-image-object-fit'));
			}
		});
		$target.find('.kv-slider').on('init afterChange', function() {
			incrementImageView();
		});
		$target.find('.kv-slider').slick({
			slidesToShow: 1,
			slidesToScroll: 1,
			arrows: false,
			fade: true,
			asNavFor: '.kv-slider-nav'
		});
		$target.find('.kv-slider-nav').slick({
			slidesToShow: navSlidesToShow,
			variableWidth: true,
			asNavFor: '.kv-slider',
			dots: false,
			centerMode: true,
			focusOnSelect: true,
			draggable: false,
			infinite: true,
			responsive: [
				{
					breakpoint: 1140,
					settings: {
						slidesToShow: 9
					}
				},
				{
					breakpoint: 992,
					settings: {
						slidesToShow: 7
					}
				},
				{
					breakpoint: 720,
					settings: {
						slidesToShow: 5
					}
				},
				{
					breakpoint: 540,
					settings: {
						slidesToShow: 3
					}
				}
			]
		});
	}

	function bindHeaderDetail(data, $target) {
		$target.find('.kv-request-info').click(requestInfo);
	}

	function bindHomeDetails(data, $target) {
		// nothing to bind
	}

	this.requestInfo = requestInfo;

	function requestInfo(e) {
		if (kv.isEvent()) {
			e.preventDefault();
		}

		var $this = $(this);
		var data = $this.data();
		var mlsid = ('undefined' !== typeof(data.mlsid)) ? data.mlsid : null;
		var address = ('undefined' !== typeof(data.address)) ? data.address : null;
		var type = ('undefined' !== typeof(data.target)) ? data.target.replace('#modal-', '') : null;

		if (kv.User.getLeadId()) {
			kv.Question.show(mlsid, address, type);
		} else {
			kv.Login.showModal();
			kv.Login.loginQueue.add({obj: 'Detail', method: 'requestInfo'});
		}
	}

	function bindPropertyLocation(data, $target) {
		if (shouldShowPropertyLocationMap(data)) {
			if ('undefined' === typeof($target)) {
				$target = $detailPagePropertyLocation;
			}
			var id = $target.attr('id');

			if (!id) {
				id = 'kvcoreidx-map-' + Math.random().toString(36).replace(/[^a-z]+/g, '');

				$target.attr('id', id);
			}

			if (!$target.hasClass('kv-map')) {
				$target.addClass('kv-map');
			}

			var $targetParent = $target.closest('.kv-content-box');

			if ($targetParent && $targetParent.hasClass('kv-hidden')) {
				$targetParent.removeClass('kv-hidden');
			}

			kv.Map.generateMapWithMarker(data.data.lat, data.data.long, id, {});
		}
	}

	function shouldShowPropertyLocationMap(data) {
		var isGoogleBot = false;

		if (kv.isUsableObject(navigator) && 'string' === typeof(navigator.userAgent)) {
			isGoogleBot = -1 !== navigator.userAgent.indexOf('Googlebot');
		}

		return !isGoogleBot &&
			'undefined' !== typeof(data) &&
			'undefined' !== typeof(data.data) &&
			'undefined' !== typeof(data.data.lat) &&
			'undefined' !== typeof(data.data.long);
	}

	function bindListingAgent(data, $target) {
		$target.find(".kv-contact-agent").click(requestInfo)
	}

	function bindSimilarProperties(data, $target) {
		if (typeof(data.data) === 'undefined' || !data.data.length) {
			return;
		}

		if (kvEXEC('Properties', 'bind', [$target])) {
			var $container = $target.closest('.kv-content-box');


			if ($container.length && $container.hasClass("kv-hidden")) {
				$container.removeClass('kv-hidden');
			}

			$container.find('.kv-property-listings').addClass('kv-slider').on('breakpoint', function() {
				kvEXEC('Properties', 'bind', [$target]);
			}).slick({
				slidesToScroll: 1,
				dots: false,
				centerMode: true,
				focusOnSelect: true,
				draggable: false,
				infinite: true,
				slidesToShow: 1,
				variableWidth: true,
				responsive: [
					{
						breakpoint: 1140,
						settings: {
							slidesToShow: 1
						}
					},
					{
						breakpoint: 991,
						settings: {
							centerMode: false,
							slidesToShow: 1
						}
					},
					{
						breakpoint: 720,
						settings: {
							slidesToShow: 1
						}
					},
					{
						breakpoint: 540,
						settings: {
							slidesToShow: 1
						}
					}
				]
			});
			// bind similar properties carousel
		}
	}

	this.addListingToFavoriteAfterLogin = function() {
		this.markPropertyView();
		$('#kvcoreidx-link--save').click();
	};

	function bindLinks() {
		$('#kvcoreidx-link--save').click(function(e) {
			e.preventDefault();

			if (!kv.User.getLeadId()) {
				kv.Login.loginQueue.add({obj: 'Detail', method: 'addListingToFavoriteAfterLogin'});
				kv.Login.showModal();
				return;
			}

			kv.Property.addFavoriteCallback.apply(this);
		});

		$('[data-target^="#modal-"]').click(requestInfo);

		$('#kvcoreidx-link--email').click(function(e) {
			e.preventDefault();

			document.location = '/profile/#tab-saved-searches';
		});

		$('#kvcoreidx-link--print').click(function(e) {
			e.preventDefault();

			try {
				window.print();
			} catch (e) {

			}
		});

		$('#kvcoreidx-link--facebook').click(function(e) {
			if (typeof FB === 'undefined') {
				kv.Message.warning('Facebook app is not initialized');
				return;
			}

			e.preventDefault();

			var url = encodeURI(window.location);
			var title = $('.kv-detail-header-detail .kv-detail-text').text();
			var description = $('.kv-detail-content-remarks').text();
			var image = $('.kv-detail-header-slider .kv-slider:first-of-type .slick-slide:first-of-type .kv-slide')
				.css('background-image');

			image = /^url\((['"]?)(.*)\1\)$/.exec(image);
			image = image ? image[2] : '';

			// Open FB share popup
			FB.ui({
				method: 'share_open_graph',
				action_type: 'og.shares',
				action_properties: JSON.stringify({
					object: {
						'og:url': url,
						'og:title': title,
						'og:description': description,
						'og:image': image
					}
				})
			});
		});

		$('#kvcoreidx-link--twitter').click(function(e) {
			e.preventDefault();
			var $address = $('.kv-detail-header-detail .kv-button').data('address');
			window.open('https://twitter.com/share?text=' + encodeURI($address) + '&url=' + encodeURI(window.location));
		});

		$('#kvcoreidx-link--pinterest').click(function(e) {
			e.preventDefault();
			$('#kv-pinterest-modal').kvModal('show');
		});
	}

	function markPropertyView() {
		var lead_id = kv.User.getLeadId();

		if (!lead_id) {
			return;
		}

		var mls = kv.Config.get('query', 'by-mls');
		var mlsid = kv.Config.get('query', 'by-mlsid');

		if (mls && mlsid) {
			// mark listing as viewed
			try {
				kv.Remote.post('public/views', {
					mls: mls,
					mls_id: mlsid,
					mobile: kv.isMobileWidth() ? 1 : 0,
					lead_id: lead_id
				}, function() {
				});
			} catch (e) {
				// fail silently
			}
		}
	}

	this.markPropertyView = markPropertyView;

	function incrementView(type) {
		var disable_reg = kv.Cookie.get('disable_reg');
		var noreg = kv.Cookie.get('noreg');
		var view_timing = kv.Cookie.get('view_timing');
		if (disable_reg == 1) {
			return false;
		}
		var isExpired = false;
		var registration = kv.Config.get('options', 'registration');

		var optionKey = 'registration_' + type + '_views';
		var maxViews = parseInt(0 + kv.Config.get('options', optionKey));
		if (noreg == 1) {
			maxViews = 2;
		}
		if (view_timing) {
			maxViews = view_timing;
		}

		if (kv.User.getLeadId() ||
			registration === 'off' ||
			maxViews === 0 ||
			kv.Config.compare('isAdmin', 'true') ||
			kv.Config.get('request', 'userAgent').toLowerCase().indexOf('googlebot') !== -1
		) {
			return;
		}

		var views = kv.Cookie.get('registrationViews');
		if (views === null || typeof views.property === 'undefined' || typeof views.image === 'undefined') {
			views = {property: 0, image: 0};
		}
		//view_timing set should bypass image views others proceed as normal
		if ((view_timing || noreg) && type === 'image') {
			views['image'] = 0;
		} else {
			views[type]++;
		}

		if (views[type] >= maxViews) {
			var $modal = kv.Login.showModal();

			var onModalClose = function() {
				if ($modal.hasClass('show')) {
					return;
				}

				switch (registration) {
					case 'optional':
						kv.Cookie.set('registrationViews', {property: 0, image: 0}, 1);
						break;
					case 'required':
						var referrer = document.referrer;
						var propertiesPage = kv.Config.get('pages', 'properties');
						if (!kv.isEmpty(referrer) && referrer.indexOf(propertiesPage) !== -1) {
							kv.Url.redirect(referrer);
						} else {
							kv.Url.redirect(propertiesPage);
						}
						break;
				}
			};

			$modal.one('click.dismiss.bs.kvmodal', onModalClose);
		}

		kv.Cookie.set('registrationViews', views, 1);
	}

	function incrementPropertyView() {
		incrementView('property');
	}

	function incrementImageView() {
		incrementView('image');
	}

	kv.User.maybeAuthenticateViaURLToken(loadPage);
}(jQuery, kvCORE));
kvCORE.Detail = (new function($, kv) {
    var $listingPage = $('#kvcoreidx-listing-details-page');
    var loadingClass = 'loading';
    var listing = null;
    var currentListingEndpoint = null;
    var currentPhoto = 0;
    var lastPhoto = null;
    var mls = kv.Config.get('query', 'by-mls');
    var mlsid = kv.Config.get('query', 'by-mlsid');
    var disable_reg = kv.Config.get('query', 'disable_reg');
    var noreg = kv.Config.get('query', 'noreg');
    var view_timing = kv.Config.get('query', 'view_timing');

    document.querySelectorAll('.kv-detail-v2-photos-container').forEach(function(v) {
        v.addEventListener('mouseover', lazyload);
    });

    // document.addEventListener("scroll", lazyload);
    window.addEventListener("resize", lazyload);
    window.addEventListener("orientationChange", lazyload);
    document.addEventListener("DOMContentLoaded", lazyload);

    if (disable_reg) {
        kv.Cookie.delete('disable_reg');
        kv.Cookie.delete('noreg');
        kv.Cookie.delete('view_timing');
        kv.Cookie.set('disable_reg', disable_reg);
    }
    if (noreg) {
        kv.Cookie.delete('disable_reg');
        kv.Cookie.delete('noreg');
        kv.Cookie.delete('view_timing');
        kv.Cookie.set('noreg', noreg);
    }
    if (view_timing) {
        kv.Cookie.delete('disable_reg');
        kv.Cookie.delete('noreg');
        kv.Cookie.delete('view_timing');
        kv.Cookie.set('view_timing', view_timing);
    }

    if (!mls || !mlsid) {
        mls = kv.Config.get('query', 'mls');
        mlsid = kv.Config.get('query', 'mlsid');
    }

    function self() {
        return kv.Detail;
    }

    function getCurrentListingEndpoint() {
        if (null === currentListingEndpoint) {
            var exclusiveListingId = kv.Config.get('query', 'exclusive-listing-id');

            if (exclusiveListingId) {
                currentListingEndpoint = 'public/listings/manualListings?id=' + exclusiveListingId
            } else {
                currentListingEndpoint = 'public/listings/' + mls + '/' + mlsid;
            }
        }

        return currentListingEndpoint;
    }


    function loadPage() {
        var getListingData = {};

        // $listingPage.addClass(loadingClass);

        // var defaultAgentId = kv.Config.get('options', 'listing_detail', 'default_agent_id');
        // if (!kv.isEmpty(defaultAgentId)) {
        // 	kv.Remote.onBeforeRequest(getCurrentListingEndpoint(), 'get', function (endpoint, method, args) {
        // 		args.headers['X-Agent-ID'] = defaultAgentId;
        //
        // 		return args;
        // 	});
        // }
        //
        // if (!kv.Config.get('query', 'exclusive-listing-id')) {
        // 	getListingData.includeListingAgent = 1;
        // }
        //
        // kv.Remote.get(getCurrentListingEndpoint(), getListingData, getListingCallback);
        // getListingCallback();
        getListingCallback($('#kvcoreidx-listing-details-page').data('listing'));

    }

    function getListingCallback(listingData, code) {
        kv.User.maybeAuthenticateViaURLToken(function() {
            incrementPropertyView();
        });
        var data = [];
        data.data = listingData;
        if (data.data.is_exclusive_listing) {
            var imgSrc = data.data.user.data.photo;
            var fullName = data.data.user.data.full_name;
            var agentTitle = data.data.user.data.title;
            var agentPhone = data.data.user.data.phone;
        } else {
            var imgSrc = data.data.listingAgent.data.photo;
            var fullName = data.data.listingAgent.data.full_name;
            var agentTitle = data.data.listingAgent.data.title;
            var use_cell = data.data.listingAgent.data.show_cell_phone === 1 ? data.data.listingAgent.data.cell_phone : null;
            var use_work = data.data.listingAgent.data.show_work_phone === 1 ? data.data.listingAgent.data.work_phone : null;
            var use_direct = data.data.listingAgent.data.show_direct_phone === 1 ? data.data.listingAgent.data.direct_phone : null;
            var agentPhone = use_cell || use_work || use_direct || '';
            agentPhone = kv.Config.compare('options', 'team', 'phone_format', 'bracket') ?
                agentPhone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '($1) $2-$3') :
                agentPhone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '$1.$2.$3');
        }



        var agentPhoneSrc = "<a href=\"tel:" + agentPhone + "\" class=\"kv-list-v2-item-value\" style='width: 100%'>" + agentPhone + "</a>"

        $('.kv-detail-v2-agent-full-name').text(fullName)
        $('.kv-detail-v2-agent-title').text(agentTitle)
        $('.kv-list-v2-item-name-phone').html(agentPhoneSrc)
        $('.kv-detail-v2-agent-photo').html("<img src=" + imgSrc + ">")

        if (data.data.coListingAgent) {
            var imgSrc = data.data.coListingAgent.data.photo;
            var fullName = data.data.coListingAgent.data.full_name;
            var agentTitle = data.data.coListingAgent.data.title;
            var agentPhone = data.data.coListingAgent.data.cell_phone || data.data.coListingAgent.data.direct_phone || data.data.coListingAgent.data.work_phone || '';
            agentPhone = kv.Config.compare('options', 'team', 'phone_format', 'bracket') ?
                agentPhone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '($1) $2-$3') :
                agentPhone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '$1.$2.$3');
            var agentPhoneSrc = "<a href=\"tel:" + agentPhone + "\" class=\"kv-list-v2-item-value\" style='width: 100%'>" + agentPhone + "</a>"

            $('.kv-detail-v2-coagent-full-name').text(fullName)
            $('.kv-detail-v2-coagent-title').text(agentTitle)
            $('.kv-list-v2-item-name-coagentphone').html(agentPhoneSrc)
            $('.kv-detail-v2-coagent-photo').html("<img src=" + imgSrc + ">")
        }


        $listingPage.find('.kv-detail-v2-back-to-search-button').click(function(e) {
            var referrer = document.referrer;
            if (data.data.is_exclusive_listing) {
                var propertiesPage = kv.Config.get('pages', 'exclusives');
            } else {
                var propertiesPage = kv.Config.get('pages', 'properties');
            }

            if (!kv.isEmpty(referrer) && referrer.indexOf(propertiesPage) !== -1) {
                kv.Url.redirect(referrer);
            } else {
                kv.Url.redirect(propertiesPage);
            }
        });

        listing = kv.Property.addCustomData(data.data);

        if (!kv.isEmpty(listing.photos) && !kv.isEmpty(listing.photos.data)) {
            lastPhoto = listing.photos.data.length - 1;
        }

        parseFeatures(listing);
        renderDetailCallback();
    }

    function redirectToProperties() {
        var redirectParams = {};

        var mls = kv.Config.get('query', 'by-mls');
        var mlsid = kv.Config.get('query', 'by-mlsid');

        // if mls and mlsid are provided,
        // add them as url params for redirect
        if (mls && mlsid) {
            redirectParams = {
                similarMls: mls,
                similarMlsId: mlsid
            };
        }

        kv.Url.redirect(kvCORE.Config.get('pages', 'properties'), redirectParams);
    }

    function parseFeatures(listing) {
        if (listing.openHouses) {
            if (listing.openHouses.data.length > 0) {
                for (var i = 0; i < listing.openHouses.data.length; i++) {
                    listing.openHouses.data[i].fulldate = new Date(listing.openHouses.data[i].year, parseInt(listing.openHouses.data[i].month) - 1, listing.openHouses.data[i].day);
                    listing.openHouses.data[i].time = kv.String.fixOpenHouseTime(listing.openHouses.data[i].time);
                }
                listing.openHouses.data.sort(function(a, b) {
                    return a.fulldate - b.fulldate;
                });
            }
        }

        ['general', 'interior', 'exterior'].map(function(name) {
            listing[name] = null;

            if (!kv.isEmpty(listing.features) &&
                !kv.isEmpty(listing.features.data) &&
                !kv.isEmpty(listing.features.data[name])) {
                var features = $.extend(true, [], listing.features.data[name]);
                var splitAt = Math.floor(features.length / 2);
                listing[name] = [features.slice(0, splitAt), features.slice(splitAt + 1)];
            }
        });

    }

    function setMeta(data) {
        var meta = {
            url: kv.Url.getCurrentUrl()
        };

        if (lastPhoto) {
            meta.image = data.photos.data[0].url;
        }

        kv.Page.Meta.set(meta);

        var documentTitleParts = [];

        if (!kv.isEmpty(data.address)) {
            documentTitleParts.push(kv.String.capitalizeFirstLetters(data.address));
        }
        if (!kv.isEmpty(data.city)) {
            documentTitleParts.push(kv.String.capitalizeFirstLetters(data.city));
        }
        if (!kv.isEmpty(data.state)) {
            if (!kv.isEmpty(data.zip)) {
                documentTitleParts.push(data.state + ' ' + data.zip);
            } else {
                documentTitleParts.push(data.state);
            }
        }

        if (documentTitleParts.length) {
            kv.Page.Meta.updateTitle(documentTitleParts.join(', '));
        }
        if (!kv.isEmpty(data.remarks)) {
            kv.Page.Meta.setDescription(kv.String.excerpt(data.remarks));
        }
    }

    function renderDetailCallback() {

        // $listingPage.removeClass(loadingClass);


        if (!kv.Config.get('query', 'exclusive-listing-id')) {
            kv.Remote.get(getCurrentListingEndpoint() + '/similar?max=15', {}, function(data) {
                data.doNotLoadAlerts = true;
                delete data.currentFilters;

                if (Array.isArray(data.data)) {
                    for (var i = 0; i < data.data.length; i++) {
                        data.data[i].detail_url = kv.Property.getUrl(data.data[i]);
                    }
                }
                data.notShowSold = false;
                kv.View.render('properties-listings', data, '#kv-detail-v2-similar', bindSimilarProperties.bind(this, data));
            });
            bindListingItems(listing);
        } else {
            var exclusiveData = [];
            exclusiveData = listing;
            bindListingItems(exclusiveData);
        }
    }

    function bindListingItems(listing) {
        if (listing.isOnMarket) {
            var isOnMarket = listing.isOnMarket.data.isOnMarket;
        }
        if (listing.is_exclusive_listing) {
            var isExclusive = listing.is_exclusive_listing;
        }

        if (isOnMarket || isExclusive) {
            if (lastPhoto) {
                bindPhotos();
            }
            maybeAddFacebook();
            bindLinks();
            bindPriceHistory(listing);
            bindMap();
            if (kv.Config.get('options', 'listing_detail', 'hide_mortgage_calculator') !== "1") {
                bindCalculator(listing);
            }
        }
    }

    function renderExclusiveCallback(viewName, data) {
        bindListingItems(data);
    }

    function maybeAddFacebook() {
        var facebookClientId = kv.Config.get('options', 'facebook_client_id');

        if (kv.isEmpty(facebookClientId)) {
            return;
        }

        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {
                return;
            }
            js = d.createElement(s);
            js.id = id;
            js.src = 'https://connect.facebook.net/en_US/sdk.js';
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));

        window.fbAsyncInit = function() {
            FB.init({
                appId: facebookClientId,
                xfbml: true,
                version: 'v10.0'
            });
        };
    }

    function bindPhotos() {
        var $photosContainer = $listingPage.find('.kv-detail-v2-photos-container');
        var $photos = $photosContainer.find('.kv-detail-v2-photos');
        var $mainPhotoContainer = $photos.find('.kv-detail-v2-photos-main');
        var $mainPhoto = $mainPhotoContainer.find('img');
        var $controls = $photosContainer.find('.kv-detail-v2-photos-controls');
        var $left = $controls.find('.fa-chevron-left');
        var $right = $controls.find('.fa-chevron-right');
        var $slider = $('.kv-detail-v2-slider');
        var $sliderPhoto = $slider.find('.kv-detail-v2-slider-photo');
        var $sliderControls = $slider.find('.kv-detail-v2-slider-controls');
        var $sliderLeft = $sliderControls.find('.fa-chevron-left');
        var $sliderRight = $sliderControls.find('.fa-chevron-right');

        var openSlider = function() {
            if (kv.isMobile() || incrementImageView()) {
                return;
            }
            document.querySelectorAll('img.lazy').forEach(function(v) {
                load(v);
            });

            var img = $(this).clone();

            // If the first image is too tall, reformat the size
            if (img.prop('naturalHeight') > img.prop('naturalWidth')) {
                img[0].style.minWidth = 0;
                img[0].style.height = '500px';
                img[0].style.display = 'block';
                img[0].style.marginLeft = 'auto';
                img[0].style.marginRight = 'auto';
            }

            $sliderPhoto.html(img);
            $slider.kvModal('show');
        };

        var setSliderPhoto = function(left) {

            var maybeOrder = $(this).data('order');
            if (typeof maybeOrder !== 'undefined') {
                var newPhoto = maybeOrder;
            } else {
                var currentSliderPhoto = $sliderPhoto.find('img').data('order');

                //clean the last slide for presentation
                var cleanImg = $photos.find('img[data-order=' + currentSliderPhoto + ']')[0].style;
                cleanImg.minWidth = '';
                cleanImg.height = '';
                cleanImg.display = '';
                cleanImg.marginLeft = '';
                cleanImg.marginRight = '';


                if (left) {
                    newPhoto = currentSliderPhoto !== 0 ? currentSliderPhoto - 1 : lastPhoto;
                } else {
                    newPhoto = currentSliderPhoto !== lastPhoto ? currentSliderPhoto + 1 : 0;
                }
            }

            var $newPhoto = $photos.find('img[data-order=' + newPhoto + ']').clone();

            // set the size if the next image is too tall that it gets cropped
            var width = $newPhoto[0].naturalWidth;
            var height = $newPhoto[0].naturalHeight;

            if (height > width) {
                var imgStyle = $newPhoto[0].style;
                imgStyle.minWidth = 0;
                imgStyle.height = '540px';
                imgStyle.display = 'block';
                imgStyle.marginLeft = 'auto';
                imgStyle.marginRight = 'auto';
            }


            if ($newPhoto.length === 1) {
                $sliderPhoto.html($newPhoto);
            }

            if (incrementImageView()) {
                $slider.kvModal('hide');
            }
        };

        var setMainPhoto = function(left) {
            if (!kv.isMobile()) {
                return;
            }

            var maybeOrder = $(this).data('order');
            if (typeof maybeOrder !== 'undefined') {
                var newPhoto = maybeOrder;
            } else {
                if (left) {
                    newPhoto = currentPhoto !== 0 ? currentPhoto - 1 : lastPhoto;
                } else {
                    newPhoto = currentPhoto !== lastPhoto ? currentPhoto + 1 : 0;
                }
            }

            var $newPhoto = $photos.find('img[data-order=' + newPhoto + ']');

            if ($newPhoto.length === 1) {
                currentPhoto = newPhoto;

                if ($mainPhoto.data('order') === 0) {
                    $mainPhoto.css('order', lastPhoto + 1).appendTo($photos);
                }

                $mainPhotoContainer.html($newPhoto.clone().click(openSlider));
            }

            $photos.animate({ scrollLeft: 0 }, 200);
            incrementImageView();
        };

        // When the modal is closed, refit the image back to what it was
        $slider.on('hide.bs.kvmodal', function() {
            var cleanImg = $photos.find('img[data-order=' + $sliderPhoto.find('img').data('order') + ']')
            cleanImg[0].style.minWidth = '';
            cleanImg[0].style.height = '';
            cleanImg[0].style.display = '';
            cleanImg[0].style.marginLeft = '';
            cleanImg[0].style.marginRight = '';
        });

        $photos.find('img').click(openSlider);
        $left.click(setMainPhoto.bind(this, true));
        $right.click(setMainPhoto.bind(this, false));
        $sliderLeft.click(setSliderPhoto.bind(this, true));
        $sliderRight.click(setSliderPhoto.bind(this, false));
    }

    function bindLinks() {
        $('#kv-detail-save').click(function(e) {

            e.preventDefault();

            if (!kv.User.getLeadId()) {
                kv.Login.loginQueue.add({ obj: 'Detail', method: 'addListingToFavoriteAfterLogin' });
                kv.Login.showModal();
                return;
            }

            kv.Property.addFavoriteCallback.apply(this);
        });

        $('.kv-detail-vow-login-trigger').click(function (e) {
			e.preventDefault();
			if (!kv.User.getLeadId()) {
				kv.Login.loginQueue.add({obj: 'Detail', method: 'sendToPropertiesPage'});
				kv.Login.showModal(true);
				return;
			}
		});

        $('#kv-detail-share').click(function(e) {

            e.preventDefault(); // ZF - Prevent redirects on click

            if (typeof FB === 'undefined') {
                kv.Message.warning('Facebook app is not initialized');
                return;
            }

            FB.ui({
                method: 'share',
                href: listing.detail_url,
            }, function(response) {});

        });

        $('#kv-detail-print-flyer').click(function(e) {
            e.preventDefault();

            try {
                window.print();
            } catch (e) {

            }
        });

        $('.kv-detail-prequalify').click(kv.Prequalify.show);
        $('.kv-detail-schedule').click(modals.bind(this, 'visit'));
        $('.kv-detail-request').click(modals.bind(this, 'ask'));
        $('.kv-detail-requesttour').click(modals.bind(this, 'tour'));
    }

    this.sendToPropertiesPage = function () {
		//get the value of cookie if not fallback
		if (kv.Cookie.get('vow_backto')) {
			document.location = kv.Cookie.get('vow_backto');
		} else {
			kv.Url.redirect(propertiesPage);
		}
	}

    this.addListingToFavoriteAfterLogin = function() {
        this.markPropertyView();
        $('#kv-detail-save').click();
    };

    this.showModal = function(type) {
        if (kv.isEmpty(type)) {
            return;
        }

        // if (!kv.User.getLeadId()) {
        // 	kv.Login.showModal();
        // 	kv.Login.loginQueue.add({obj: 'Detail', method: 'showModal'}, type);
        // 	return;
        // }

        var mlsid = !kv.isEmpty(listing.mlsid) ? listing.mlsid : null;
        var mls = !kv.isEmpty(listing.mls) ? listing.mls : null;
        var address = !kv.isEmpty(listing.address) ? listing.address : null;

        kv.Question.show(mlsid, address, type, mls);
    };

    function bindPriceHistory(listing) {
        if (!listing.history || kv.isEmpty(listing.history.data) || typeof Chartist === 'undefined') {
            return;
        }

        var monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        var createLabels = function(data) {
            return data.filter(function(item, i) {
                return i <= 6;
            }).map(function(item) {
                var date = new Date();
                date.setTime(item['dateofchange'] * 1000);
                return monthNames[date.getMonth()] + ' ' + date.getDate();
            });
        };

        var createSeries = function(data) {
            return data.filter(function(item, i) {
                return i <= 6;
            }).map(function(item) {
                return item.pricechange;
            });
        };

        var optionsPrice = {
            reverseData: true,
            axisY: {
                offset: 60,
                labelInterpolationFnc: function(value) {
                    return value.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    });
                }
            }
        };

        new Chartist.Line('.kv-detail-v2-additional-agent-price-history', {
            labels: createLabels(listing.history.data),
            series: [{ data: createSeries(listing.history.data) }]
        }, optionsPrice);
    }

    function bindMap() {
        var isGoogleBot = false;

        if (kv.isUsableObject(navigator) && typeof navigator.userAgent === 'string') {
            isGoogleBot = navigator.userAgent.indexOf('Googlebot') !== -1;
        }

        if (isGoogleBot || kv.isEmpty(listing.lat) || kv.isEmpty(listing.long)) {
            return;
        }
        var priceConverted = kv.String.abbreviateNumber(listing.price);

        var mapElement = $('#kv-detail-v2-map');
        var args = { zoomLevel: 14 }

        if (mapElement.length > 0) {
            kv.Map.generateMapWithMarker(listing.lat, listing.long, priceConverted, 'kv-detail-v2-map', args);
        }
    }

    function bindCalculator(listing) {
        var calculatorElement = $('#kv-detail-mortgage-calculator');
        if (calculatorElement.length > 0) {
            kvCORE.Mortgage_Calculator.init(listing, $("#kv-detail-mortgage-calculator"));
        }
    }

    function bindSimilarProperties() {
        // if (kv.isEmpty(data.data)) {
        // 	return;
        // }
        var $target = $('#kv-detail-v2-similar');
        var $container = $target.closest('.kv-detail-v2-similar');
        if ($container.length && $container.hasClass('kv-hidden')) {
            $container.removeClass('kv-hidden');
        }

        if (kvEXEC('Properties', 'bind', [$target])) {
            $target.find('.kv-property-listings').addClass('kv-slider').on('breakpoint', function() {
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
                responsive: [{
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
        }
        $container.find('.add-favorite').click(function(e) {
            e.preventDefault();

            if (kv.User.getLeadId()) {
                kv.Property.addFavoriteCallback.apply(this);
            } else {
                var mls = $(this).data('mls');
                var mlsid = $(this).data('mls_id');
                var propertySelector = '.add-favorite[data-mls_id="' + mlsid + '"]';

                kv.Login.loginQueue.add({
                    obj: 'Properties',
                    method: 'addListingToFavoriteAfterLogin'
                }, propertySelector);

                //TODO: Fix this config potentially?
                // config.query['by-mls'] = mls;
                // config.query['by-mlsid'] = mlsid;

                kv.Login.showModal();
            }
        });

    }

    this.markPropertyView = function() {
        var leadId = kv.User.getLeadId();

        if (!leadId) {
            return;
        }

        var mls = kv.Config.get('query', 'by-mls');
        var mlsid = kv.Config.get('query', 'by-mlsid');

        if (mls && mlsid) {
            // mark listing as viewed
            try {
                var args = {
                    mls: mls,
                    mls_id: mlsid,
                    mobile: kv.isMobileWidth() ? 1 : 0,
                    lead_id: leadId
                };

                kv.Remote.post('public/views', args);
            } catch (e) {}
        }
    };

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
            views = { property: 0, image: 0 };
        }
        //view_timing set should bypass image views others proceed as normal
        if ((view_timing || noreg) && type === 'image') {
            views['image'] = 0;
        } else {
            views[type]++;
        }

        if (views[type] >= maxViews) {
            isExpired = true;
            var $modal = kv.Login.showModal();

            var onModalClose = function() {
                if ($modal.hasClass('show')) {
                    return;
                }

                switch (registration) {
                    case 'optional':
                        kv.Cookie.set('registrationViews', { property: 0, image: 0 }, 1);
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

        return isExpired;
    }

    function incrementPropertyView() {
        incrementView('property');
    }

    function incrementImageView() {
        return incrementView('image');
    }

    if ($listingPage.length) {
        loadPage();
        this.markPropertyView();
    }

    function load(target) {
        let imgSrc = target.dataset.src;
        target.src = target.dataset.src;
        target.classList.remove('lazy');
    }

    function lazyload() {
        let images = document.querySelectorAll('img.lazy');
        for (var i = 0; i < images.length; i++) {
            if (isInViewport(images[i])) {
                load(images[i]);
            }
        }
        if (images.length == 0) {
            document.querySelectorAll('.kv-detail-v2-photos-container').forEach(function(v) {
                v.removeEventListener('mouseover', lazyload);
            });
            window.removeEventListener("resize", lazyload);
            window.removeEventListener("orientationChange", lazyload);
        }
    }

    function isInViewport(el) {
        const rect = el.getBoundingClientRect();
        const windowHeight = (window.innerHeight || document.documentElement.clientHeight);
        const windowWidth = (window.innerWidth || document.documentElement.clientWidth);
        const vertInView = (rect.top <= windowHeight) && ((rect.top + rect.height) >= 0);
        const horInView = (rect.left <= windowWidth) && ((rect.left + rect.width) >= 0);
        return (vertInView && horInView);
    }

    function modals(type) {
        if (kv.isEmpty(type)) {
            return;
        }

        var mlsid = !kv.isEmpty(listing.mlsid) ? listing.mlsid : null;
        var mls = !kv.isEmpty(listing.mls) ? listing.mls : null;
        var address = !kv.isEmpty(listing.address) ? listing.address : null;

        kv.Question.show(mlsid, address, type, mls);
    }
}(jQuery, kvCORE));
kvCORE.Agent_Profile = (new function($, kv, config) {
	//Most of this file isn't being used anymore, I'm keeping most of it in order to refer back to it in case we have any regressions.

	var $agentProfilePage = $('#kvcoreidx-agent-profile-page');
	var $agentActiveListings = $('.kv-agent-profile-v2-active-listings');

	var loadingClass = 'loading';
	var loadingWithMarginClass = loadingClass + '-mt-25 ' + loadingClass + ' ' + loadingClass + '-mh';

	var agentId = kv.Config.get('query', 'team-member');
	var agentProfileEndpoint = 'public/members/' + agentId;

	function loadPage() {
		setDataFilters();
	}

	function setDataFilters() {
		kv.Remote.addDataFilter(agentProfileEndpoint, formatMemberProfileData);
	}

	function displayAgentProfile() {
		if (agentId) {
			kv.View.renderAjax(
				'agent-profile',
				'public/members/' + agentId,
				{},
				$agentProfilePage,
				renderCallback
			);
		} else {
			kv.View.render('agent-profile', {}, $agentProfilePage, renderCallback);
		}
	}

	function renderCallback(viewName, data) {
		var listingsPerRow = kvCORE.Config.get('options', 'listings', 'per_row');

		if (isNaN(parseInt(listingsPerRow))) {
			listingsPerRow = 4;
		}

		$agentProfilePage.removeClass(loadingWithMarginClass);

		if (typeof(data.data) !== 'undefined') {
			setMeta(data.data);
		}

		kv.View.renderAjax(
			'properties-listings',
			'public/listings',
			{
				agents: data.data.id,
				limit: listingsPerRow,
				currentFilters: {
					perRow: listingsPerRow
				}
			},
			$('#kvcoreidx-active-listings').find('.kv-property-listings-container'),
			function(view, listingdata) {
				if (listingdata.data.length == 0) {
					$('.kv-agent-profile-v2-active-listings').hide();
				}
				$('#kvcoreidx-active-listings').find('.kv-property')
					.removeClass('kv-per-row-6')
					.addClass('kv-per-row-' + listingsPerRow);
				$('.kv-property-listings').addClass('kv-grid-columns-' + listingsPerRow);
			}
		);
	}

	function setMeta(agent) {
		var meta = {
			url: kv.Url.getCurrentUrl()
		};

		if (!kv.isEmpty(agent.photo)) {
			meta.image = agent.photo;
		}

		kv.Page.Meta.set(meta);

		if (!kv.isEmpty(agent.full_name)) {
			kv.Page.Meta.updateTitle(agent.full_name);
		}

		if (!kv.isEmpty(agent.bio)) {
			kv.Page.Meta.setDescription(kv.String.excerpt(agent.bio));
		}
	}

	function formatMemberProfileData(data) {
		if ('undefined' !== typeof(data.data)) {
			data.data.social = getMemberProfileSocialData(data.data);
		}

		return data;
	}

	function getMemberProfileSocialData(data) {
		var result = {};

		if (!kv.isEmpty(data.facebook_url)) {
			result.facebook_url = data.facebook_url;
		} 
		if (!kv.isEmpty(data.twitter_url)) {
			result.twitter_url = data.twitter_url;
		}
		if (!kv.isEmpty(data.linkedin_url)) {
			result.linkedin_url = data.linkedin_url;
		}
		if (!kv.isEmpty(data.youtube_url)) {
			result.youtube_url = data.youtube_url;
		}

		Object.keys(result).map(function(itemKey) {
			if (result[itemKey].indexOf('http') === -1) {
				result[itemKey] = getAbsoluteSocialDomains()[itemKey] + result[itemKey];
			}
		});

		return result;
	}

	function getAbsoluteSocialDomains() {
		return {
			facebook_url: 'https://www.facebook.com/',
			twitter_url: 'https://twitter.com/',
			linkedin_url: 'https://www.linkedin.com/',
			youtube_url: 'https://www.youtube.com/'
		};
	}

	//need to add click actions for the favorites and coming soon in here even though most of this file not being hit anymore
	if ($agentActiveListings.length) {
		setTimeout(function() {
			$agentActiveListings.find('.add-favorite').click(function(e) {   
				e.preventDefault();
		
				if (kv.User.getLeadId()) {
					kv.Property.addFavoriteCallback.apply(this);
				} else {
					var mls = $(this).data('mls');
					var mlsid = $(this).data('mls_id');
					var propertySelector = '.add-favorite[data-mls_id="'+ mlsid +'"]';
		
					kv.Login.loginQueue.add({obj: 'Properties', method: 'addListingToFavoriteAfterLogin'}, propertySelector);
		
					config.query['by-mls'] = mls;
					config.query['by-mlsid'] = mlsid;
		
					kv.Login.showModal();
				}
			});
		}, 1000);
	}

	if ($agentProfilePage.length) {
		$agentProfilePage.addClass(loadingWithMarginClass);
		loadPage();
	}
} (jQuery, kvCORE, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : {}) );

kvCORE.AgentSearch = (new function ($, kv) {
	var $container = $('#kvcoreidx-agent-search');
	var loadingClass = 'loading loading-center';
	var endpoint = 'public/members/list';

	function load() {
		kv.Remote.addDataFilter(endpoint, function(origData) {
			var data = {
				agents: origData.data && origData.data.map(function(agent) {
					agent.name = agent.first_name + ' ' + agent.last_name;
					agent.type = !kv.isEmpty(agent.title) ? agent.title : '';
					agent.extra = !kv.isEmpty(agent.offices) ? agent.offices[0].name : '';

					var slug = agent.id + '-' + agent.first_name + '-' + agent.last_name;
					agent.profile_url = kv.Config.get('pages', 'agent_profile') + kv.String.sanitizeTitle(slug) + '/';

					agent.data = $.extend({}, agent);

					return agent;
				}),
				id: 'agents',
				layout: 'token',
				order: 'name',
				placeholder: 'Search Agent'
			};

			return $.extend(origData, data);
		});

		kv.Remote.addStoredEndpoint(endpoint);

		kv.View.renderAjax('multiple-select', endpoint, {}, $container, bindMultipleSelect);
		bindAgentSearch();
	}

	function bindMultipleSelect(viewName, data) {
		kv.MultipleSelect.initMultiSelect($('#container-' + data.id), data);
	}

	function bindAgentSearch() {
		$container.click(function(e) {
			var $target = $(e.target);
			var agent = $target.data('item');
			if (typeof agent !== 'undefined' && !kv.isEmpty(agent.profile_url)) {
				kv.Url.redirect(
					agent.profile_url, undefined, kv.Config.compare('openTeamMembersInNewTab', 'true')
				);
			}
		});
	}

	this.submit = function(form) {
		var formArray = kv.Form.toArray(form);
		if (typeof formArray.agents !== 'undefined' && !kv.isEmpty(formArray.agents[0])) {
			var searchResult = kv.Search.search('agents', formArray.agents[0], 1, 1, 'name');
			if (kv.isEmpty(searchResult)) {
				return;
			}

			var agent = searchResult.data[0];

			if (kv.isEmpty(agent.profile_url)) {
				return;
			}

			kv.Url.redirect(agent.profile_url);
		} else {
			kv.Url.redirect(kv.Config.get('pages', 'team'));
		}
	};

	if ($container.length) {
		$container.addClass(loadingClass);
		load();
	}
}(jQuery, kvCORE));
kvCORE.View = (new function($, twig, kv, config) {
	var views = {};
	var customViewsLoaded = [];

	this.add = function(name, template, meta) {
		if ('object' !== typeof(meta) || !meta) {
			meta = {};
		}

		meta = processMeta(meta);

		views[name] = {
			template: twig({
				data: template
			}),
			meta: meta
		}
	};

	function processMeta(data) {
		Object.keys(data).map(function(key) {
			var matches = data[key].match(/{[^}]+}/g);

			if (matches && 'function' === typeof(matches.map)) {
				matches.map(function(param) {
					var variableName = param.replace(/[{}]+/g, '');
					var value = kv.Cookie.get(variableName) ||
						kv.Config.get(variableName) ||
						kv.Config.get('user', variableName);

					data[key] = data[key].replace(param, value);
				});
			}
		});

		return data;
	}

	this.load = function(name, data, callback) {
		var customViews = {};
		if ('object' === typeof(kv.Config) && 'function' === typeof(kv.Config.get)) {
			customViews = kv.Config.get('options', 'customViews');
		}

		data.kvcoreidx = config;

		if( 'undefined' !== typeof(kv.User) && 'function' === typeof(kv.User.getLeadData)){
			data.user = kv.getUsableObject(kv.User.getLeadData());
			data.user.lead_id = kv.User.getLeadId();
		}

		var hasCustomView = customViews && 'undefined' !== typeof(customViews[name]) && -1 === customViewsLoaded.indexOf(name);

		if ('undefined' === typeof(views[name]) || hasCustomView) {
            var insertBefore = document.getElementsByTagName('script')[0];
            var src = kv.Config.get('jsUrl') + 'views/' + name + '.js';

            if( hasCustomView ) {
            	src = customViews[name];
	            customViewsLoaded.push(name);
            }

            var onloadCallback = function () {
                data._meta = views[name].meta;

                var viewLoadCallbackRunCount = 0;
                var viewLoadCallback = function () {
                    viewLoadCallbackRunCount++;

                    if ('undefined' === views[name]) {
                        if (viewLoadCallbackRunCount < 10) {
                            window.setTimeout(viewLoadCallback, 125);
                        } else {
                            callback('failed to load view `' + name + '`');
                        }
                    } else {
                        callback(views[name].template.render(data));
                    }
                };

                viewLoadCallback();
            };

            kv.enqueueScript(insertBefore, src, onloadCallback);
        } else {
			data._meta = views[name].meta;
			callback(views[name].template.render(data));
		}
	};

	this.render = function(viewName, data, target, callback) {
		var renderCallback = function(output) {
			output = $(output).html();

			if ('object' === typeof(target)) {
				if ('function' === typeof(target.html)) {
					target.html(output);
				} else {
					target.innerHTML = output;
				}
			} else {
				var outputTarget = document.querySelector(target);

				if (outputTarget) {
					outputTarget.innerHTML = output;
				}
			}

			if ('function' === typeof(callback)) {
				callback(viewName, data, target, output);
			}
		};

		this.load(viewName, data, renderCallback)
	};

	this.renderAjax = function(viewName, endpoint, args, target, callback, failedDataFilter) {
		var self = this;

		var remoteGetCallback = function(data) {
			if (Array.isArray(data)) {
				data = {
					data: data
				};
			}

			data._self = endpoint;

			data = kv.Remote.filterData(endpoint, data);

			self.render(viewName, data, target, callback);
		};

		kv.Remote.get(endpoint, args, remoteGetCallback, failedDataFilter);
	};

	this.renderLocal = function(viewName, data, target, callback) {
		this.add(viewName, '<div>' + document.getElementById(viewName).innerHTML + '</div>');
		this.render(viewName, data, target, callback);
	};
}(
	jQuery, typeof Twig !== 'undefined' ? Twig.twig : null,
	kvCORE, typeof kvcoreidxConfig !== 'undefined' ? kvcoreidxConfig : {}
));
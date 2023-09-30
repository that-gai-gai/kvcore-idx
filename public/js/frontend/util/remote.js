kvCORE.Remote = (new function($, kv) {
	var cache = {};
	var defaultcacheExpirationTime = 10;
	var storedEndpoints = [];
	var dataFilters = {};
	var requestFilters = {};
	var requestActions = {
		success: {},
		error: {},
		earliest: {},
		before: {},
		after: {}
	};

	this.skipCacheOnNextRequest = false;

	function self() {
		return kvCORE.Remote;
	}

	this.request = function(requestType, endpoint, args, callback, failedDataFilter, useProxyFallback) {
		var initialArgs = [];

		for (var i = 0; i < 6; i++) {
			initialArgs[i] = arguments[i];
		}

		requestType = requestType.toUpperCase();

		// default empty callback - saves checking
		// if callback is undefined twice further
		// down in the request
		if ('function' !== typeof(callback)) {
			callback = function() {};
		}

		if (typeof useProxyFallback === 'undefined') {
			useProxyFallback = false;
		}

		var headers = {
			'Authorization': kv.Config.get('apiKey')
		};
		var leadId = kv.User.getLeadId();

		if (leadId) {
			headers['X-Lead-ID'] = leadId;
		}

		var url = useProxyFallback ? kv.Config.get('restNamespace') + 'api/' : kv.Config.get('apiUrl');

		var requestData = {
			url: url + endpoint,
			type: requestType,
			dataType: 'json',
			data: typeof args === 'object' ? $.extend({}, args) : args,
			headers: headers
		};

		runRequestActions(endpoint, 'earliest', requestType, [endpoint, requestType, requestData]);

		var cacheKey = null;

		if ('GET' === requestType) {
			var query = this.createQueryString(requestData);

			cacheKey = requestData.url + query;
		}

		var couldBeStored = function() {
			return requestType === 'GET' && query === '' && storedEndpoints.indexOf(endpoint) !== -1;
		};

		runRequestActions(endpoint, 'before', requestType, [endpoint, requestType, requestData]);

		requestData.success = function(response, status, xhr) {
			var code = 200;

			if ('undefined' !== typeof(xhr.status)) {
				code = xhr.status;
			} else if ('success' !== status) {
				code = 500;
			}

			runRequestActions(endpoint, status, requestType, [response, status, xhr]);

			var result = response;

			try {
				if ('string' === typeof(result.responseText)) {
					result = JSON.parse(result.responseText);
				}
			} catch (e) {
				kv.debugOutput([e, result]);

				result = response;
			}

			try {
				if (cacheKey) {
					cache[cacheKey] = result;

					scheduleCacheDelete(cacheKey);

					if (code === 200 && couldBeStored()) {
						kv.Storage.set(endpoint, result);
					}
				}
			} catch (e) {
				kv.debugOutput([e, result]);

				result = {};
			} finally {
				if (200 !== code && cacheKey) {
					if ('function' === typeof(failedDataFilter)) {
						result = failedDataFilter(result, code);
					}

					cache[cacheKey] = result;
				}
			}

			runRequestActions(endpoint, 'after', requestType, [result, code]);
			callback(result, code);
		};

		requestData.error = function(response, status, xhr) {
			if (response.status === 0 && !useProxyFallback) {
				initialArgs[5] = true;
				self().request.apply(self(), initialArgs);
			} else {
				if ('undefined' !== typeof(response.responseJSON) &&
					response.responseJSON &&
					'undefined' !== typeof(response.responseJSON.errors) &&
					'function' === typeof(response.responseJSON.errors.join)) {
					kv.debugOutput('kvCORE API: Unable to load `' + endpoint + '`, failed with error `' + response.responseJSON.errors.join(',') + '`', 'error');
				}

				requestData.success(response, status, xhr);
			}
		};

		var stored = kv.Storage.get(endpoint);
		if (!this.skipCacheOnNextRequest && cacheKey && 'undefined' !== typeof(cache[cacheKey])) {
			callback(cache[cacheKey]);
		} else if (!this.skipCacheOnNextRequest && couldBeStored() && stored) {
			callback(stored);
		} else {
			self().filterRequest(endpoint, requestData);

			$.ajax(requestData);
		}

		this.skipCacheOnNextRequest = false;
	};

	this.createQueryString = function(requestData) {
		var query = requestData.data;

		var isObjectArgs = typeof requestData.data === 'object' && Object.keys(requestData.data).length > 0;
		var isStingArgs = typeof requestData.data === 'string' && requestData.data.length > 0 &&
			'?' !== requestData.data[0];

		if (isObjectArgs) {
			query = '?' + $.param(requestData.data);
		} else if (isStingArgs) {
			query = '?' + query;
		}

		if (typeof query !== 'string') {
			query = '';
		}

		return query;
	};

	this.get = function(endpoint, args, callback, failedDataFilter) {
		this.request('GET', endpoint, args, callback, failedDataFilter);
	};

	this.post = function(endpoint, args, callback, failedDataFilter) {
		this.request('POST', endpoint, args, callback, failedDataFilter);
	};

	this.put = function(endpoint, args, callback, failedDataFilter) {
		this.request('PUT', endpoint, args, callback, failedDataFilter);
	};

	this.delete = function(endpoint, args, callback, failedDataFilter) {
		this.request('DELETE', endpoint, args, callback, failedDataFilter);
	};

	this.addDataFilter = function(endpoint, callback) {
		if (!Array.isArray(dataFilters[endpoint])) {
			dataFilters[endpoint] = [];
		}

		dataFilters[endpoint].push(callback);
	};

	this.filterData = function(endpoint, data) {
		if (Array.isArray(dataFilters[endpoint])) {
			dataFilters[endpoint].forEach(function(fn, i) {
				if ('function' === typeof(fn)) {
					data = fn(data);
				}
			});
		}

		return data;
	};

	this.addRequestAction = function(endpoint, actionType, method, callback) {
		endpoint = endpoint.toLowerCase();
		actionType = actionType.toLowerCase();
		method = method.toLowerCase();

		if ('undefined' === typeof(requestActions[actionType])) {
			if ('function' !== typeof(console.error)) {
				return;
			}

			console.error(
				'Remote request action type `' + actionType + '` is invalid. Must be one of: `' +
				Object.keys(requestActions).join(', ') + '`.'
			);
		}

		if ('object' !== typeof(requestActions[actionType][endpoint])) {
			requestActions[actionType][endpoint] = {
				get: [],
				post: [],
				put: [],
				delete: []
			};
		}

		requestActions[actionType][endpoint][method].push(callback);
	};

	this.onSuccessRequest = function(endpoint, method, callback) {
		this.addRequestAction(endpoint, 'success', method, callback);
	};

	this.onErrorRequest = function(endpoint, method, callback) {
		this.addRequestAction(endpoint, 'error', method, callback);
	};

	this.onEarliestRequest = function(endpoint, method, callback) {
		this.addRequestAction(endpoint, 'earliest', method, callback);
	};

	this.onBeforeRequest = function(endpoint, method, callback) {
		this.addRequestAction(endpoint, 'before', method, callback);
	};

	this.onAfterRequest = function(endpoint, method, callback) {
		this.addRequestAction(endpoint, 'after', method, callback);
	};

	function runRequestActions(endpoint, actionType, method, args) {
		if (!Array.isArray(args)) {
			args = [];
		}

		endpoint = endpoint.toLowerCase();
		actionType = actionType.toLowerCase();
		method = method.toLowerCase();

		if (hasRequestActions(endpoint, actionType, method)) {
			requestActions[actionType][endpoint][method].forEach(function(callback) {
				if ('function' === typeof(callback)) {
					callback.apply(self(), args);
				}
			});
		}
	}

	function hasRequestActions(endpoint, actionType, method) {
		return (
			'object' === typeof(requestActions[actionType]) &&
			'object' === typeof(requestActions[actionType][endpoint]) &&
			Array.isArray(requestActions[actionType][endpoint][method]) &&
			requestActions[actionType][endpoint][method].length
		);
	}

	this.addRequestFilter = function(endpoint, callback) {
		if (!Array.isArray(requestFilters[endpoint])) {
			requestFilters[endpoint] = [];
		}

		requestFilters[endpoint].push(callback);
	};

	this.filterRequest = function(endpoint, data) {
		if (Array.isArray(requestFilters[endpoint])) {
			requestFilters[endpoint].forEach(function(fn) {
				if ('function' === typeof(fn)) {
					data = fn(data);
				}
			});
		}

		return data;
	};

	this.addStoredEndpoints = function(endpoints) {
		if (!Array.isArray(endpoints)) {
			return;
		}

		endpoints.forEach(function(endpoint) {
			self().addStoredEndpoint(endpoint);
		});
	};

	this.addStoredEndpoint = function(endpoint) {
		if (storedEndpoints.indexOf(endpoint) === -1) {
			storedEndpoints.push(endpoint);
		}
	};


	function scheduleCacheDelete(cacheKey, cacheExpirationTime) {
		if ('undefined' === typeof(cacheExpirationTime)) {
			cacheExpirationTime = defaultcacheExpirationTime;
		}

		window.setTimeout(function() {
			delete cache[cacheKey];
		}, cacheExpirationTime * 1000);
	}
}(jQuery, kvCORE));
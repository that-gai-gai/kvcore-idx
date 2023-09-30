kvCORE.Search = (new function($, d, w, kv) {
	var datasets = {};
	var resultCache = {};
	var cacheTimeout = 1;

	function createNewDataset(data, weight, name) {
		var clonedData = cloneArrayOrObject(data);

		weight = kv.getUsableObject(weight);

		var index = {};

		var storedIndex = kv.Storage.get('index_' + name, kv.getHash(clonedData));
		if (storedIndex) {
			index = $.Index.load(storedIndex);
		} else {
			// Save hash before data is processed by lunr
			var hash = kv.getHash(clonedData);
			index = $(createDatasetIndex(clonedData, weight));
			kv.Storage.set('index_' + name, index, 2, hash);
		}

		return {
			index: index,
			data: clonedData,
			keys: Object.keys(clonedData[0])
		};
	}

	function createDatasetIndex(data, weight) {
		return function() {
			this.ref('_index');

			Object.keys(weight).forEach(function(index) {
				var args = null;

				switch (typeof(weight[index])) {
					case 'number':
						this.field(index, args);
						break;

					default:
						this.field(index);
						break;
				}
			}, this);

			data.forEach(function(item, index) {
				// add index
				item._index = index;

				this.add(item);
			}, this);
		}
	}

	function sortResults(results, order) {
		var orderBy = '';
		var orderDirection = '';

		if (-1 !== order.indexOf('|')) {
			order = order.split('|');

			orderBy = order[0];
			orderDirection = order[1].toLowerCase();

			results = sortResultsByKey(results, orderBy, orderDirection);
		} else {
			var orderLowerCase = order.toLowerCase();

			switch (orderLowerCase) {
				// sort by weighted score ASC (low to high)
				// simply reverse the results as assumption
				// is results are sorted by score high to low
				case 'asc':
					orderDirection = orderLowerCase;
					results.reverse();
					break;

				// sort by weighted score DESC (high to low)
				// in this case do nothing, as results are
				// assumed to already be sorted!
				case 'desc':
					break;

				default:
					// sort by key by name `order`
					results = sortResultsByKey(results, order);
					break;
			}
		}

		return results;
	}

	function sortResultsByKey(results, key, direction) {
		if ('undefined' === typeof(direction)) {
			direction = 'asc';
		}

		if (Array.isArray(results) && results.length && 'undefined' !== typeof(results[0][key])) {
			switch (direction) {
				case 'asc':
					results.sort(function(a, b) {
						return valueCompare(a[key], b[key]);
					});
					break;

				case 'desc':
					results.sort(function(a, b) {
						return -1 * (valueCompare(a[key], b[key]));
					});
					break;
			}
		}

		return results;
	}

	function valueCompare(a, b) {
		if ('function' === typeof(a.toLowerCase)) {
			a = a.toLowerCase();
		}

		if ('function' === typeof(b.toLowerCase)) {
			b = b.toLowerCase();
		}

		if ('function' === typeof(a.localeCompare)) {
			return a.localeCompare(b)
		} else {
			if (a < b) return -1;
			if (a > b) return 1;

			return 0;
		}
	}

	function formatSearchResult(data, result) {
		data.relevance = Math.round(result.score * 100);
		data.relevance_raw = result.score;

		return data;
	}

	function cloneArrayOrObject(data) {
		if (Array.isArray(data) || kv.isUsableObject(data)) {
			return JSON.parse(JSON.stringify(data));
		} else {
			throw('Provided data is not an array or extensible object');
		}
	}

	function cloneDataset(name) {
		return cloneArrayOrObject(datasets[name].data);
	}

	function getCachedResult(name, query, perPage, page, order) {
		if ('undefined' === typeof(name) || 'undefined' === typeof(query)) {
			return null;
		}

		var cacheKey = getCacheKey(name, query, perPage, page, order);

		if ('undefined' !== typeof(resultCache[cacheKey])) {
			return resultCache[cacheKey]
		} else {
			return null;
		}
	}

	function getCacheKey(name, query, perPage, page, order) {
		if ('undefined' === typeof(name) || 'undefined' === typeof(query)) {
			throw('name or query not provided');
		}
		if ('undefined' === typeof(perPage)) {
			perPage = '';
		}
		if ('undefined' === typeof(page)) {
			page = '';
		} else if ('number' === typeof(page)) {
			page--;

			if (page < 0) {
				page = 0;
			}
		}
		if ('undefined' === typeof(order)) {
			order = '';
		}

		return name + '?query=' + query + '&perPage=' + perPage + '&page=' + page + '&order=' + order;
	}

	function cacheResult(data, name, query, perPage, page, order) {
		var cacheKey = getCacheKey(name, query, perPage, page, order);

		resultCache[cacheKey] = cloneArrayOrObject(data);
		// delete cached results after 10 seconds
		// ie: be memory friendly!
		w.setTimeout(function() {
			delete resultCache[cacheKey];
		}, cacheTimeout);
	}

	function prepareQuery(query) {
		var queryStr = '';
		var filtersArr = [];

		if (kv.isUsableObject(query)) {
			if (typeof query.fulltext !== 'string') {
				throw('Full text query is not a string');
			} else {
				queryStr = query.fulltext;
			}

			if (Array.isArray(query.filters)) {
				filtersArr = query.filters;
			}
		} else if (typeof query === 'string') {
			queryStr = query;
		}

		var appendFilters = function() {
			return filtersArr.length ? ' +' + filtersArr.join(' +') : '';
		};

		if (kv.isEmpty(queryStr) || queryStr.match(/[~:*+]/g)) {
			return queryStr + appendFilters();
		}

		// trim extra spaces and apply + to all words except last one
		queryStr = queryStr.split(' ')
			.filter(function(word) {
				return word !== '';
			}).map(function(word) {
				return '+' + word;
			});

		if (!filtersArr.length) {
			var lastIndex = queryStr.length - 1;
			queryStr[lastIndex] = queryStr[lastIndex].substr(1);
		}

		queryStr = queryStr.join(' ');

		queryStr = filtersArr.length ? queryStr + '*' : [queryStr, queryStr + '*'].join(' ');

		return queryStr + appendFilters();
	}

	this.datasetExists = function(name) {
		// make sure name is provided and is a string
		if ('string' !== typeof(name)) {
			throw('Dataset name not provided');
		}

		return 'undefined' !== typeof(datasets[name]);
	};

	this.addDataset = function(name, data, weight) {
		// make sure name is provided and is a string
		if ('string' !== typeof(name)) {
			throw('Dataset name not provided');
		}

		// data index with that name already exists
		if ('undefined' !== typeof(datasets[name])) {
			return datasets[name];
		}

		// invalid data provided
		// data must be an array, and
		// cannot be empty
		if ('undefined' === typeof(data) || !Array.isArray(data) || !data.length) {
			throw('Provided `data` is not an array, or is empty');
		}

		// make sure the first data item has an id
		// (we'll validate the rest later)
		if ('undefined' === typeof(data[0].id)) {
			throw('Each data entry must have an id attribute');
		}

		// create new search index using data
		// provided
		datasets[name] = createNewDataset(data, weight, name);
	};

	this.removeDataset = function(name) {
		if (this.datasetExists(name)) {
			delete datasets[name];

			return true;
		}

		return false;
	}

	this.replaceDataset = function(name, data, weight) {
		this.removeDataset(name);

		return this.addDataset(name, data, weight);
	}

	this.search = function(name, query, perPage, page, order, exactField, useRawQuery) {
		if ('undefined' === typeof(name) || !name || 'undefined' === typeof(datasets[name])) {
			return [];
		}

		if (typeof query !== 'string' && !kv.isUsableObject(query)) {
			throw('Query is not an object or string');
		}

		if (typeof useRawQuery !== 'boolean') {
			useRawQuery = false
		}

		if (!useRawQuery) {
			query = prepareQuery(query);
		}

		var cachedResult = getCachedResult(name, query, perPage, page, order);

		if (kv.isUsableObject(cachedResult)) {
			return cachedResult;
		}

		// clone the original dataset to avoid
		// JS witchcraft of adding data to the
		// original array... even when you
		// .slice or concat :/
		var dataset = cloneDataset(name);
		var results = {
			data: []
		};

		if (!query || '*' === query) {
			results.data = dataset;
		} else {
			// do an actual search since we
			// have a non-wildcard query string
			var searchResult = datasets[name].index.search(query);

			var refs = [];

			for (var i = 0; i < searchResult.length; i++) {
				var resultSearch = searchResult[i];

				// remove duplicates
				if (refs.indexOf(resultSearch.ref) === -1) {
					refs.push(resultSearch.ref);
				} else {
					continue;
				}

				var resultData = dataset[resultSearch.ref];

				results.data.push(formatSearchResult(resultData, resultSearch));
			}
		}

		if (typeof exactField === 'string') {
			results.data = results.data.filter(function(item) {
				return item[exactField] === query;
			});
		}

		if ('undefined' !== typeof(order)) {
			results.data = sortResults(results.data, order);
		}

		results.total = results.data.length;
		results.query = query;

		if (results.total) {
			if ('number' === typeof(perPage) && perPage > 0) {
				var start = 0;
				var end = perPage;

				if ('number' === typeof(page) && page > 0) {
					page--;

					// no page number provided,
					// so return first result set
					start = page * perPage;
					end = start + perPage;
				}

				results.from = start + 1;
				results.to = end;

				if (results.to > results.total) {
					results.to = results.total;
				}

				results.data = results.data.slice(start, end);
				results.last_page = Math.ceil(results.total / perPage);
			} else {
				results.from = 1;
				results.to = results.total;
				results.last_page = Math.ceil(results.total / perPage);
			}

			if (results.last_page < 1) {
				results.last_page = 1;
			}
		}

		cacheResult(results, name, query, perPage, page, order);

		return results;
	};
}('undefined' !== typeof(lunr) ? lunr : null, document, window, kvCORE));
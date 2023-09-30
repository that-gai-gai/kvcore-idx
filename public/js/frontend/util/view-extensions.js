kvCORE.ViewExtentions = (new function(kv) {
	var filters = {
		phone_format: function(phone) {
			if (typeof phone !== 'number') {
				return phone;
			}

			return kv.Config.compare('options', 'team', 'phone_format', 'bracket')
				? phone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '($1) $2-$3')
				: phone.toString().replace(/(\d{3})(\d{3})(\d{0,})/, '$1.$2.$3');
		},
		join: function(arrayLike, separator) {
			if (Array.isArray(arrayLike)) {
				return arrayLike.join(separator);
			}

			delete arrayLike._keys;
			return kv.removeEmptyFromArray(Object.values(arrayLike)).join(separator);
		}
	};

	var functions = {
		empty: function(arg) {
			return kv.isEmpty(arg) || arg === 0;
		},
		first_non_empty: function(items) {
			if (!Array.isArray(items)) {
				delete items._keys;
				items = Object.values(items);
			}

			var nonEmpty = kv.removeEmptyFromArray(items);
			return nonEmpty.length !== 0 ? nonEmpty[0] : null;
		}
	};

	function setFilters() {
		for (var name in filters) {
			if (!filters.hasOwnProperty(name)) {
				continue;
			}

			var callback = filters[name];

			if (typeof callback !== 'function') {
				continue;
			}

			Twig.extendFilter('kv_' + name, callback);
		}
	}

	function setFunctions() {
		for (var name in functions) {
			if (!functions.hasOwnProperty(name)) {
				continue;
			}

			var callback = functions[name];

			if (typeof callback !== 'function') {
				continue;
			}

			Twig.extendFunction('kv_' + name, callback);
		}
	}

	if (typeof Twig === 'undefined') {
		console.error('Twig not defined');
	} else {
		setFilters();
		setFunctions();
	}
}(kvCORE));
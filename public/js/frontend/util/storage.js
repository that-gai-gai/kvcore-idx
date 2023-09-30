kvCORE.Storage = (new function() {
	var ls = window.localStorage;
	var expireDays = 2;
	var storageKey = 'kvCORE';
	var storedData = loadStoredData();

	function self() {
		return kvCORE.Storage;
	}

	function loadStoredData() {
		var result = ls.getItem(storageKey);

		if (typeof result === 'undefined' || !result) {
			result = {};
		} else if (typeof result === 'string') {
			try {
				result = JSON.parse(result);
			} catch (e) {
				result = {};
			}
		}

		return result;
	}

	function updateLocalStorage(success, error) {
		try {
			ls.setItem(storageKey, JSON.stringify(storedData));

			if (typeof success === 'function') {
				return success();
			}
		} catch (e) {
			if (typeof error === 'function') {
				return error(e);
			} else {
				console.warn(e);
				return null;
			}
		}
	}

	function maybePurgeExpired(key) {
		if (typeof storedData[key] === 'undefined') {
			return;
		}

		var storedItem = storedData[key];

		if (new Date(storedItem.expires) <= new Date()) {
			self().remove(key);
		}
	}

	this.set = function(key, val, expires, hash) {
		if (typeof key !== 'string') {
			throw('Storage key must be a string');
		}

		if (typeof expires !== 'undefined') {
			if (typeof expires !== 'number') {
				throw('Storage expires must be a number');
			}
		} else {
			expires = expireDays;
		}

		if (typeof hash !== 'undefined' && typeof hash !== 'string') {
			throw('Storage hash must be a string');
		}

		var valClone = JSON.parse(JSON.stringify(val));

		var expireDate = new Date();
		expireDate.setMilliseconds(expireDate.getMilliseconds() + expires * 864e+5);

		storedData[key] = {
			value: valClone,
			expires: expireDate.toUTCString(),
			hash: typeof hash === 'string' ? hash : ''
		};

		return updateLocalStorage(function() {
			return valClone;
		}, function(e) {
			console.log('Value of ' + key + ' cannot be stored');
			console.warn(e);
			return null;
		});
	};

	this.get = function(key, hash) {
		if (typeof key !== 'string') {
			throw('Storage key must be a string');
		}

		maybePurgeExpired(key);

		if (typeof storedData[key] === 'undefined') {
			return null;
		}

		var storedItem = storedData[key];

		if (typeof hash === 'string' && hash !== storedItem.hash) {
			return null;
		}

		return JSON.parse(JSON.stringify(storedItem.value));
	};

	this.getAll = function() {
		return storedData;
	};

	this.remove = function(key) {
		if (typeof key !== 'string') {
			throw('Storage key must be a string');
		}

		delete storedData[key];
		updateLocalStorage();
	};

	this.removeAll = function() {
		storedData = {};
		updateLocalStorage();
	};
});
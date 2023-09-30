kvCORE.Cookie = (new function(kv) {
	this.get = function(name) {
		var ca = document.cookie.split(';');
		name = getCookieName(name) + '=';

		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];

			while (c.charAt(0) === ' ') {
				c = c.substring(1);
			}

			if (c.indexOf(name) === 0) {
				var result = null;
				var rawValue = c.substring(name.length, c.length);

				try {
					result = JSON.parse(rawValue);
				} catch (err) {
					result = rawValue;
				}

				return result;
			}
		}

		return null;
	};

	this.set = function(name, value, expires, path) {
		if (!path) {
			path = '/';
		}

		if (!expires) {
			expires = 1;
		}

		var d = new Date();

		d.setTime(d.getTime() + (expires * 24 * 60 * 60 * 1000));

		expires = 'expires=' + d.toUTCString();

		if (-1 === ['number', 'string'].indexOf(typeof(value))) {
			if (value) {
				value = JSON.stringify(value);
			} else {
				value = '';
			}
		}

		document.cookie = getCookieName(name) + '=' + value + ';' + expires + ';path=' + path;
	};

	this.delete = function(name, path) {
		if (typeof path === 'undefined') {
			path = '/'
		}
		this.set(name, '', -1, path);
	};

	this.compare = function(name, value) {
		return this.get(name) === value;
	};

	function getCookieName(name) {
		var pluginName = kv.Config.get('plugin', 'Name');
		if (pluginName) {
			return pluginName + '_' + name;
		}

		return name;
	}
} (kvCORE));
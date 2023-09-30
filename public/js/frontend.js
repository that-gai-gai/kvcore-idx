var kvCORE = (new function ($, config, d, s) {
    var enableDebug = false;

    var throttles = {};

	function init() {
		if (!$.view || !config) {
			console.error('Twig or config not defined');
			return;
		}

		if (self().Config.compare('enableDebug', 'true')) {
			enableDebug = true;
		}
	}

	function self() {
		return kvCORE;
	}

	function enqueueScript(insertBefore, src, onload, integrity, crossorigin) {
		var js = d.createElement(s);

		if ('function' === typeof(onload)) {
			js.onload = onload;
		}

		js.async = true;

		if ('undefined' !== typeof(integrity)) {
			js.setAttribute('integrity', integrity);

			if ('undefined' === typeof(crossorigin)) {
				crossorigin = 'anonymous';
			}

			js.setAttribute('crossorigin', crossorigin);
		}

		var version = self().Config.get('plugin', 'Version');

		if (version) {
			if (-1 === src.indexOf('?')) {
				src += '?';
			} else {
				src += '&';
			}

			src += 'ver=' + version;
		}

		js.src = src;

		insertBefore.parentNode.insertBefore(js, insertBefore);
	}

	this.enqueueScript = enqueueScript;

	function loadAdditionalScripts() {
		var additionalScripts = self().Config.get('additional_scripts');

		if (self().isEmpty(additionalScripts)) {
			return;
		}

		additionalScripts.forEach(function(fileUrl) {
			enqueueScript(
				d.getElementsByTagName(s)[0],
				fileUrl
			);
		});
	}

	function executeCustomScripts() {
		var scriptSettings = self().Config.get('options', 'custom_scripts');

		if (self().isEmpty(scriptSettings)) {
			return;
		}

		var activeIdxPage = self().Config.get('activeIdxPage');

		scriptSettings.map(function(setting) {
			if (setting.script_page === 'all' || setting.script_page === activeIdxPage) {
				var F = new Function(setting.script_js);
				F();
			}
		});
	}

	this.debugOutput = function(output, level) {
		if (enableDebug && 'object' === typeof(console) && 'function' === typeof(console.log)) {
			if (!self().String.isString(level) || 'function' !== typeof(console[level])) {
				level = 'log';
			}

			return console[level](output);
		}

		return null;
	};

	this.shuffleArray = function(array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
	};

	this.orderArrayByKey = function(data, key) {
		// only run sort if both key and data are
		// provided - no point in running if we
		// have no data to sort, and no key to
		// sort it by
		if ('undefined' !== typeof(key) && 'undefined' !== typeof(data)) {

			// make sure Array.sort is supported by the browser
			if (Array.isArray(data) && 'function' === typeof(data.sort)) {
				data.sort(function(a, b) {
					if ('undefined' !== typeof(a[key]) && 'undefined' !== typeof(b[key])) {
						var keyA = a[key],
							keyB = b[key];

						// item "a" should be before item "b"
						if (keyA < keyB) return -1;

						// item "b" should be before item "a"
						if (keyA > keyB) return 1;
					}
					// unable to determine what to do, or requested
					// key does not exist on "a" and/or "b" so order
					// "a" and "b" sequentially
					return 0;
				});
			}
		}
	};

	this.getPropertyKeyRegex = function(obj, filter) {
		if (filter instanceof RegExp) {
			for (var key in obj) {
				if (obj.hasOwnProperty(key) && filter.test(key)) {
					return key;
				}
			}
		} else if (typeof filter === 'string') {
			if (obj.hasOwnProperty(filter)) {
				return filter;
			}
		}

		return false;
	};

	/**
	 * get a usable object
	 *
	 * if obj is a valid extensible object,
	 * return it. if not, return a empty
	 * object {}
	 *
	 * @param obj
	 * @returns {*}
	 */
	this.getUsableObject = function(obj) {
		if (this.isUsableObject(obj)) {
			return obj;
		}

		return {};
	};

	this.isUsableObject = function(obj) {
		return 'object' === typeof(obj) && obj !== null && Object.isExtensible(obj) && Object.keys(obj).length
	};

	this.getHash = function(data, full) {
		var json = JSON.stringify(data);

		if (typeof full !== 'undefined' && full === true) {
			return $.crypto.MD5(json).toString();
		}

		var length = json.length;
		// only partial hash of stringified data, because hashing is expensive
		return $.crypto.MD5(json.substring(0, 100) + json.substring(length - 100, length)).toString();
	};

	this.isEmptyObject = function(object) {
		for (var key in object) {
			if (object.hasOwnProperty(key)) {
				return false;
			}
		}
		return true;
	};

	this.isEmpty = function(variable) {
		return variable === undefined ||
			variable === null ||
			variable === '' ||
			(Array.isArray(variable) && variable.length === 0);
	};

	this.removeEmptyFromArray = function(array) {
		return array.filter(function(item) {
			return !self().isEmpty(item) && item !== 0;
		});
	};

	this.isEvent = function(e) {
		return typeof e !== 'undefined' && typeof e.originalEvent !== 'undefined' && e.originalEvent instanceof Event;
	};

	this.isMobile = function() {
		return this.isMobileUserAgent() || this.isMobileWidth();
	};

	this.isMobileUserAgent = function() {
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent);
	};

	this.isMobileWidth = function() {
		return $.dom(window).width() < 768;
	};

	this.throttle = function(func, ms) {
		if (typeof ms !== 'number') {
			ms = 250;
		}

		var funcName = func.name;

		(function() {
			var onComplete = function() {
				func.apply(this, arguments);
				throttles[funcName] = null;
			};

			if (throttles[funcName]) {
				clearTimeout(throttles[funcName]);
			}

			throttles[funcName] = setTimeout(onComplete, ms);
		})();
	};

	$.dom(document).on('kvcoreidx-loaded', function() {
		init();
		loadAdditionalScripts();
		executeCustomScripts();
	});
}({
    view: 'undefined' !== typeof(Twig) ? Twig.twig : null,
    request: 'undefined' !== typeof(nanoajax) ? nanoajax.ajax : null,
    dom: 'undefined' !== typeof(jQuery) ? jQuery : null,
	crypto: 'undefined' !== typeof(CryptoJS) ? CryptoJS : null,
    search: 'undefined' !== typeof(lunr) ? lunr : null
}, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : null, document, 'script'));

function kvEXEC(prop, func, args) {
    var result = false;

	if('object' === typeof(kvCORE[prop]) && 'function' === typeof(kvCORE[prop][func])){
	    if('undefined' === typeof(args)){
	        args = [];
        } else if( !Array.isArray(args) ) {
	        args = [ args ];
        }

		result = kvCORE[prop][func].apply(kvCORE[prop], args);

	    if('undefined' === typeof(result)){
	        result = true;
        }
	}

	return result;
}

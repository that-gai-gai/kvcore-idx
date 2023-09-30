kvCORE.Url = (new function($, kv, crypto) {
	this.getCurrentUrl = function() {
		return typeof window.location.href !== 'undefined' ? window.location.href : window.location.toString();
	};

	this.createUrl = function(url, params) {
		var paramsString = '';
		if (typeof params === 'object' && Object.keys(params).length > 0) {
			paramsString = '?' + $.param(params);
		} else if (typeof params === 'string' && params.length !== 0) {
			paramsString = params[0] !== '?' ? '?' : '';
			paramsString += params;
		}

		url += paramsString;

		return url;
	};

	this.redirect = function(url, params, newTab) {
		if (kv.isEmpty(url)) {
			url = '/';
		}

		url = this.createUrl(url, params);

		if (typeof newTab === 'undefined') {
			newTab = false;
		}

		if (!newTab) {
			if (typeof document.location.href !== 'undefined') {
				document.location.href = url;
			} else {
				document.location = url;
			}
		} else {
			window.open(url, '_blank');
		}
	};

	this.maybeAddATag = function (maybeUrl, linkText, openInNewTab, linkClass) {
		var result = maybeUrl;

		if (this.isUrl(maybeUrl)) {
			var linkTarget = '';

			if ('string' !== typeof(linkText)) {
				linkText = maybeUrl;
			}
			if ('string' !== typeof(linkClass)) {
				linkClass = '';
			}
			if ('undefined' !== typeof(openInNewTab) && openInNewTab) {
				linkTarget = 'target="_blank"';
			}

			result = '<a href="' + maybeUrl + '" class="' + linkClass + '" ' + linkTarget + '>' + linkText + '</a>';
		}

		return result;
	};

	this.isUrl = function(url) {
		if ('string' !== typeof(url)) {
			return false;
		}

		var result = false;

		try {
			if ('function' === typeof(URL)) {
				new URL(url);

				result = true;
			} else {
				result = (0 === url.indexOf('https://') || 0 === url.indexOf('http://'));
			}
		} catch (e) {
			result = false;
		}

		return result;
	};

	this.getGravatarUrl = function(email, fallbackImage) {
		if ('string' !== typeof(email) || !email || ! crypto ) {
			return null;
		}

		var emailHash = crypto.MD5(email.toLowerCase());

		if (!emailHash) {
			return null;
		}

		var result = 'https://www.gravatar.com/avatar/' + emailHash;

		if ('string' !== typeof(fallbackImage) || !fallbackImage) {
			fallbackImage = kv.Config.get('publicUrl') + 'images/user-icon.png';
		}

		result += '?s=256&default=' + encodeURIComponent(fallbackImage);

		return result;
	};

} (jQuery, kvCORE, 'undefined' !== typeof(CryptoJS) ? CryptoJS : null ));
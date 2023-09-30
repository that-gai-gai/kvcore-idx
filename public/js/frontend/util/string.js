kvCORE.String = (new function($) {
	this.isString = function(maybeString) {
		return typeof maybeString === 'string' || maybeString instanceof String;
	};

	this.formatPhoneNumber = function(phoneNumber){
		var result = null;

		if (-1 !== ['string', 'number'].indexOf(typeof(phoneNumber))) {
			phoneNumber = phoneNumber.toString().replace(/[^0-9]+/, '');

			// remove preceding "1" as that's a
			// country code
			if ('1' === phoneNumber[0]) {
				phoneNumber = phoneNumber.slice(1);
			}

			if (10 === phoneNumber.length) {
				result = '(' + phoneNumber.slice(0, 3) + ') ' + phoneNumber.slice(3, 6) + '-' + phoneNumber.slice(6);
			} else {
				result = phoneNumber;
			}
		}

		return result;
	};

	this.sanitizeTitle = function(string) {
		if ('string' === typeof(string)) {
			string = string.toLowerCase().replace(/[^a-z0-9]+/g, '-');
		}

		return string;
	};

	this.fixOpenHouseTime = function(time) {
		var regex = /([0-9]{1,2}\:[0-9][0-9])\:[0-9][0-9]/gm;
		return time.replace(regex, '$1');
	}

	this.excerpt = function(text, limit) {
		if (typeof limit === 'undefined') {
			limit = 150;
		}
		if (text.length >= limit) {
			text = $('<div>').html(text).text().substring(0, 145) + '...';
		}

		return text;
	};

	this.abbreviateNumber = function(value) {
		var newValue = value;
		if (value >= 1000) {
			var suffixes = ["", "K", "M", "B","T"];
			if (value >= 1000000) {
				var suffixNum = Math.floor( (""+value).length/3 );
			} else {
				var suffixNum = Math.floor( (""+value).length/4 );
			}
			var shortValue = '';
			for (var precision = 2; precision >= 1; precision--) {
				shortValue = parseFloat( (suffixNum != 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
				var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
				if (dotLessShortValue.length <= 3) { break; }
			}
			if (shortValue % 1 != 0)  shortValue = shortValue.toFixed(1);
			newValue = shortValue+suffixes[suffixNum];
		}
		return "$"+newValue;
	};

	this.capitalizeFirstLetters = function(string) {
		return string.split(' ').map(function(word) {
			return word.charAt(0).toUpperCase() + word.toLowerCase().slice(1);
		}).join(' ');
	};

	this.capitalizeFirstLettersOfLongWords = function(string, howLong) {
		if (typeof howLong === 'undefined') {
			howLong = 2;
		}

		return string.split(' ').map(function(word) {
			return word.length > howLong ? word.charAt(0).toUpperCase() + word.toLowerCase().slice(1) : word;
		}).join(' ');
	};
} (jQuery));
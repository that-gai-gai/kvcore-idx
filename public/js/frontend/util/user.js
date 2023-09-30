kvCORE.User = (new function($, kv) {
	var loggedInBodyClass = 'kvcoreidx--user-logged-in';
	var notLoggedInBodyClass = 'kvcoreidx--user-not-logged-in';

	this.getLeadId = function() {
		return kv.Cookie.get('lead_id');
	};

	this.getLeadData = function() {
		return kv.Cookie.get('lead_data');
	};

	this.setLeadId = function(leadId, callback) {
		if (-1 === ['number', 'string'].indexOf(typeof(value)) && leadId) {
			kv.Remote.get('public/leads/new/' + btoa(leadId), {}, function(data) {
				setLeadData(data);

				if (typeof callback === 'function') {
					callback();
				}
			});

			kv.DOM.addBodyClass(loggedInBodyClass);
			kv.DOM.removeBodyClass(notLoggedInBodyClass);

			return kv.Cookie.set('lead_id', leadId);
		} else {
			return kv.Cookie.delete('lead_id');
		}
	};

	function setLeadData(data) {
		if (kv.isUsableObject(data)) {
			return kv.Cookie.set('lead_data', data);
		} else {
			return kv.Cookie.delete('lead_data');
		}
	}

	this.logout = function(location) {
		this.setLeadId(false);
		kv.DOM.removeBodyClass(loggedInBodyClass);
		kv.DOM.addBodyClass(notLoggedInBodyClass);
		setTimeout('', 2000);

		if (typeof location === 'string') {
			window.location = location;
		} else if (location === true) {
			window.location.reload();
		}
	};

	this.maybeAuthenticateViaURLToken = function (callback) {
		var callbackHandler = function () {
			if ('function' === typeof(callback)) {
				callback();
			}
		};

		if ('object' === typeof(kvCORE.Config)) {
			var authenticationKey = kvCORE.Config.get('request', 'args', 'key');

			if (authenticationKey) {
				this.authenticateViaToken(authenticationKey, callback);
			} else {
				callbackHandler();
			}
		} else {
			callbackHandler();
		}
	};

	this.maybeAuthenticateVowToken = function (callback) {
		var callbackHandler = function () {
			if ('function' === typeof(callback)) {
				callback();
			}
		};
		
		if ('object' === typeof(kvCORE.Config)) {
			var authenticationKey = kvCORE.Config.get('request', 'args', 'vowKey');
			if (authenticationKey) {
				this.authenticateViaToken(authenticationKey, callback);
			} else {
				callbackHandler();
			}
		} else {
			callbackHandler();
		}
	};

	this.authenticateViaToken = function (token, callback) {
		var callbackHandler = function () {
			if ('function' === typeof(callback)) {
				callback();
			}
		};

		if ('undefined' !== typeof(token) && token) {
			try {
				token = encodeURIComponent(token);

				kvCORE.Remote.post('public/token-auth' , {
					key: token
				}, function (data) {
					if ('undefined' !== typeof(data.lead_id)) {
						kvCORE.User.setLeadId(data.lead_id);
						/*now they are authenticated set other cookies */
						var expiration = kv.Config.get('vowWebsiteConfiguration') === '1' ? 90 : 30;
						kv.Cookie.set('has_vow_access', expiration, expiration);
						kv.Cookie.delete('vow_pending');
					}

					callbackHandler();
				});
			} catch( err) {
				callbackHandler();
			}
		} else {
			callbackHandler();
		}
	};
} (jQuery, kvCORE));
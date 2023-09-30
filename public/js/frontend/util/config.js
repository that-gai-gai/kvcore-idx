kvCORE.Config = (new function ($, kv, config, adminConfig) {
	function getConfig(localConfig) {
		if (kv.isUsableObject(localConfig)) {
			return localConfig;
		}

		if (adminConfig) {
			return adminConfig;
		}

		return config;
	}

	function get() {
		var result = null;

		var args = Array.from(arguments);

		// set args to last argument if there
		// is only one
		// this allows function to support passing
		// an option index array as the first
		// argument, rather than passing multiple params
		// for example, all of these work:
		//    get( 'foo', 'bar', 'baz' );
		//    get( [ 'foo', 'bar', 'baz' ] );
		if( 1 === args.length) {
			args = args.shift();
		}

		switch (true) {
			case isString(args):
				result = getByString(args);
				break;

			case isArray(args):
				result = getByArray(args);
				break;

			default:
				// invalid arguments, null return
				break;
		}

		return result;
	}

	function getByString(name, localConfig) {
		var result = null;

		localConfig = getConfig(localConfig);

		if ('undefined' !== typeof(localConfig[name]) && localConfig[name]) {
			result = localConfig[name];
		}

		return result;
	}

	function getByArray(name, localConfig) {
		var result = null;
		var key = name.shift();

		localConfig = getConfig(localConfig);

		if (isDefined(localConfig[key])) {
			switch (name.length) {
				// we're on the key, so get the value
				case 1:
					result = getByString(name.shift(), localConfig[key]);
					break;

				// execution should never get here
				// because if there's only one key
				// remaining, we just get it by string above
				// this check is only to explicitly avoid
				// an infinite loop situation
				case 0:
					result = localConfig[key];
					break;

				// more child keys to check
				default:
					result = getByArray(name, localConfig[key]);
					break;
			}
		}

		return result;
	}

	function compare() {
		// default comparision result
		var result = false;

		// create a new array from function arguments
		var args = Array.from(arguments);

		// if there are not at least 2 arguments
		// do nothing and return false
		if (args.length > 1) {
			// default compareToValue is null
			var compareToValue = args.slice(-1).pop();
			// drop last element in arguments array
			args.pop();

			// call get() with args, and compare result to
			// compareToValue
			result = get.apply(this, args) === compareToValue;
		}

		return result;
	}

	function isDefined(maybeDefined) {
		return 'undefined' !== typeof(maybeDefined);
	}

	function isString(maybeString) {
		return typeof maybeString === 'string' || maybeString instanceof String;
	}

	function isArray(maybeArray) {
		return Array.isArray(maybeArray);
	}

	// public functions
	this.get = get;
	this.compare = compare;
}(jQuery, kvCORE, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : {},
	'undefined' !== typeof(kvcoreidxAdminConfig) ? kvcoreidxAdminConfig : null));
/**
 * Array.from
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/from#Polyfill
 */
if ('function' !== typeof(Array.from)) {
	Array.from = (function () {
		var toStr = Object.prototype.toString;
		var isCallable = function (fn) {
			return typeof fn === 'function' || toStr.call(fn) === '[object Function]';
		};
		var toInteger = function (value) {
			var number = Number(value);
			if (isNaN(number)) { return 0; }
			if (number === 0 || !isFinite(number)) { return number; }
			return (number > 0 ? 1 : -1) * Math.floor(Math.abs(number));
		};
		var maxSafeInteger = Math.pow(2, 53) - 1;
		var toLength = function (value) {
			var len = toInteger(value);
			return Math.min(Math.max(len, 0), maxSafeInteger);
		};

		// The length property of the from method is 1.
		return function from(arrayLike/*, mapFn, thisArg */) {
			// 1. Let C be the this value.
			var C = this;

			// 2. Let items be ToObject(arrayLike).
			var items = Object(arrayLike);

			// 3. ReturnIfAbrupt(items).
			if (arrayLike == null) {
				throw new TypeError('Array.from requires an array-like object - not null or undefined');
			}

			// 4. If mapfn is undefined, then let mapping be false.
			var mapFn = arguments.length > 1 ? arguments[1] : void undefined;
			var T;
			if (typeof mapFn !== 'undefined') {
				// 5. else
				// 5. a If IsCallable(mapfn) is false, throw a TypeError exception.
				if (!isCallable(mapFn)) {
					throw new TypeError('Array.from: when provided, the second argument must be a function');
				}

				// 5. b. If thisArg was supplied, let T be thisArg; else let T be undefined.
				if (arguments.length > 2) {
					T = arguments[2];
				}
			}

			// 10. Let lenValue be Get(items, "length").
			// 11. Let len be ToLength(lenValue).
			var len = toLength(items.length);

			// 13. If IsConstructor(C) is true, then
			// 13. a. Let A be the result of calling the [[Construct]] internal method
			// of C with an argument list containing the single item len.
			// 14. a. Else, Let A be ArrayCreate(len).
			var A = isCallable(C) ? Object(new C(len)) : new Array(len);

			// 16. Let k be 0.
			var k = 0;
			// 17. Repeat, while k < len… (also steps a - h)
			var kValue;
			while (k < len) {
				kValue = items[k];
				if (mapFn) {
					A[k] = typeof T === 'undefined' ? mapFn(kValue, k) : mapFn.call(T, kValue, k);
				} else {
					A[k] = kValue;
				}
				k += 1;
			}
			// 18. Let putStatus be Put(A, "length", len, true).
			A.length = len;
			// 20. Return A.
			return A;
		};
	}());
}

/** Function.name
 * https://github.com/JamesMGreene/Function.name
 */
(function() {

	var fnNameMatchRegex = /^\s*function(?:\s|\s*\/\*.*\*\/\s*)+([^\(\s\/]*)\s*/;

	function _name() {
		var match, name;
		if (this === Function || this === Function.prototype.constructor) {
			name = "Function";
		}
		else if (this !== Function.prototype) {
			match = ("" + this).match(fnNameMatchRegex);
			name = match && match[1];
		}
		return name || "";
	}

	// Inspect the polyfill-ability of this browser
	var needsPolyfill = !("name" in Function.prototype && "name" in (function x() {}));
	var canDefineProp = typeof Object.defineProperty === "function" &&
		(function() {
			var result;
			try {
				Object.defineProperty(Function.prototype, "_xyz", {
					get: function() {
						return "blah";
					},
					configurable: true
				});
				result = Function.prototype._xyz === "blah";
				delete Function.prototype._xyz;
			}
			catch (e) {
				result = false;
			}
			return result;
		})();
	var canDefineGetter = typeof Object.prototype.__defineGetter__ === "function" &&
		(function() {
			var result;
			try {
				Function.prototype.__defineGetter__("_abc", function() {
					return "foo";
				});
				result = Function.prototype._abc === "foo";
				delete Function.prototype._abc;
			}
			catch (e) {
				result = false;
			}
			return result;
		})();



	// Add the "private" property for testing, even if the real property can be polyfilled
	Function.prototype._name = _name;


	// Polyfill it!
	// For:
	//  * IE >=9 <12
	//  * Chrome <33
	if (needsPolyfill) {
		// For:
		//  * IE >=9 <12
		//  * Chrome >=5 <33
		if (canDefineProp) {
			Object.defineProperty(Function.prototype, "name", {
				get: function() {
					var name = _name.call(this);

					// Since named function definitions have immutable names, also memoize the
					// output by defining the `name` property directly on this Function
					// instance so that this polyfill will not need to be invoked again
					if (this !== Function.prototype) {
						Object.defineProperty(this, "name", {
							value: name,
							configurable: true
						});
					}

					return name;
				},
				configurable: true
			});
		}
		// For:
		//  * Chrome <5
		else if (canDefineGetter) {
			// NOTE:
			// The snippet:
			//
			//     x.__defineGetter__('y', z);
			//
			// ...is essentially equivalent to:
			//
			//     Object.defineProperty(x, 'y', {
			//       get: z,
			//       configurable: true,  // <-- key difference #1
			//       enumerable: true     // <-- key difference #2
			//     });
			//
			Function.prototype.__defineGetter__("name", function() {
				var name = _name.call(this);

				// Since named function definitions have immutable names, also memoize the
				// output by defining the `name` property directly on this Function
				// instance so that this polyfill will not need to be invoked again
				if (this !== Function.prototype) {
					this.__defineGetter__("name", function() { return name; });
				}

				return name;
			});
		}
	}

})();

if (typeof Object.values === 'undefined') {
	Object.prototype.values = function(obj) {
		var res = [];
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				res.push(obj[i]);
			}
		}
		return res;
	};
}

var _createClass = function() {
	function defineProperties(target, props) {
		for (var i = 0; i < props.length; i++) {
			var descriptor = props[i];
			descriptor.enumerable = descriptor.enumerable || false;
			descriptor.configurable = true;
			if ("value" in descriptor) descriptor.writable = true;
			Object.defineProperty(target, descriptor.key, descriptor);
		}
	}
	return function(Constructor, protoProps, staticProps) {
		if (protoProps) defineProperties(Constructor.prototype, protoProps);
		if (staticProps) defineProperties(Constructor, staticProps);
		return Constructor;
	};
}();

function _classCallCheck(instance, Constructor) {
	if (!(instance instanceof Constructor)) {
		throw new TypeError("Cannot call a class as a function");
	}
}
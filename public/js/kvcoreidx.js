(function($, config, d, s, l) {
	if (!validateConfig(config)) {
		console.error('Unable to load IDX');

		return;
	}

	var assetsToLoad = 0;
	var assetsLoaded = 0;

	if (!$.view || !$.crypto || !$.mapbox) {
		var insertBefore = d.getElementsByTagName(s)[0];

		if (!$.crypto) {
			assetsToLoad++;

			enqueueScript(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.min.js',
				function() {
					assetsLoaded++;

					init(this, 'CryptoJS', config)
				}
			);
		}
		if (!$.slick) {
			assetsToLoad++;

			enqueueScript(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.8.0/slick.js',
				function() {
					assetsLoaded++;

					init(this, function() {
						return 'undefined' !== typeof(jQuery.fn.slick);
					}, config)
				}
			);
		}
		if (!$.search) {
			assetsToLoad++;

			enqueueScript(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/lunr.js/2.3.3/lunr.min.js',
				function() {
					assetsLoaded++;

					init(this, 'lunr', config)
				}
			);
		}
		if ('undefined' !== typeof(config.mapsApi) && config.mapsApi) {
			if (!$.mapbox) {
				assetsToLoad += 2;

				enqueueScript(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/v1.6.1/mapbox-gl.js',
					function() {
						assetsLoaded++;

						init(this, 'mapboxgl', config, function($) {
							mapboxgl.accessToken = config.mapsApi;
						});
					},
					undefined,
					undefined,
					true
				);

				enqueueStyle(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/v1.6.1/mapbox-gl.css',
					function() {
						assetsLoaded++;

						init(insertBefore, null, config);
					},
					undefined,
					true
				)
			}
			if (!$.draw) {
				assetsToLoad += 2;

				enqueueScript(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.0.9/mapbox-gl-draw.js',
					function() {
						assetsLoaded++;

						init(this, 'MapboxDraw', config);
					},
					undefined,
					undefined,
					true
				);

				enqueueStyle(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-draw/v1.0.9/mapbox-gl-draw.css',
					function() {
						assetsLoaded++;

						init(insertBefore, null, config);
					},
					undefined,
					true
				)
			}
			if (!$.geocoder) {
				assetsToLoad += 2;

				enqueueScript(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.min.js',
					function() {
						assetsLoaded++;

						init(this, 'MapboxGeocoder', config);
					},
					undefined,
					undefined,
					true
				);

				enqueueStyle(
					insertBefore,
					'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-geocoder/v4.5.1/mapbox-gl-geocoder.css',
					function() {
						assetsLoaded++;

						init(insertBefore, null, config);
					},
					undefined,
					true
				)
			}
		}
		if (!$.chartist) {
			assetsToLoad += 2;

			enqueueScript(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/chartist/0.11.0/chartist.min.js',
				function() {
					assetsLoaded++;

					init(this, 'Chartist', config)
				}
			);

			enqueueStyle(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/chartist/0.11.0/chartist.min.css',
				function() {
					assetsLoaded++;

					init(insertBefore, null, config);
				}
			)
		}
		if (!$.autocomplete) {
			assetsToLoad += 1;

			enqueueScript(
				insertBefore,
				'https://cdn.jsdelivr.net/gh/TarekRaafat/autoComplete.js@3.2.2/dist/js/autoComplete.min.js',
				function() {
					assetsLoaded++;

					init(this, 'autoComplete', config)
				}
			);
		}
		if (!$.chosen) {
			assetsToLoad += 2;

			enqueueScript(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.jquery.min.js',
				function() {
					assetsLoaded++;

					init(this, 'Chosen', config)
				}
			);
			enqueueStyle(
				insertBefore,
				'https://cdnjs.cloudflare.com/ajax/libs/chosen/1.8.7/chosen.min.css',
				function() {
					assetsLoaded++;

					init(insertBefore, null, config);
				}
			)
		}
	} else {
		init(d.getElementsByTagName(s)[0], Twig, config)
	}

	function validateConfig(config) {
		return config && 'undefined' !== typeof(config.jsUrl);
	}

	function init(parentScript, $, config, callback) {
		if (!assetLoadedSuccessfully(config)) {
			console.error("Failed to load asset `" + $ + "`");
		} else {
			if ('function' === typeof(callback)) {
				callback($);
			}
		}

		if (assetsLoaded === assetsToLoad) {
			enqueueScript(
				parentScript,
				config.jsUrl + 'dist/frontend.min.js'
			);
		}
	}

	function assetLoadedSuccessfully(config, parentObject) {
		var result = true;

		if ('object' !== typeof(parentObject) || !Object.isExtensible())

			switch (typeof(config)) {
				case 'string':
					result = 'undefined' !== window[$];
					break;

				case 'function':
					result = config();
					break;
			}

		return result;
	}

	function enqueueScript(insertBefore, src, onload, integrity, crossorigin, defer = false) {
		var js = d.createElement(s);

		if ('function' === typeof(onload)) {
			js.onload = onload;
		}

		js.async = true;

		if(defer) {
			js.async = false;
			js.defer = defer;
		}

		if ('undefined' !== typeof(integrity)) {
			js.setAttribute('integrity', integrity);

			if ('undefined' === typeof(crossorigin)) {
				crossorigin = 'anonymous';
			}

			js.setAttribute('crossorigin', crossorigin);
		}

		if ('undefined' !== typeof(config.plugin.Version)) {
			if (-1 === src.indexOf('?')) {
				src += '?';
			} else {
				src += '&';
			}

			src += 'ver=' + config.plugin.Version;
		}

		js.src = src;

		insertBefore.parentNode.insertBefore(js, insertBefore);
	}

	function enqueueStyle(insertBefore, href, onload, integrity, crossorigin) {
		var css = d.createElement(l);

		if ('function' === typeof(onload)) {
			css.onload = onload;
		}

		if ('undefined' !== typeof(integrity)) {
			css.setAttribute('integrity', integrity);

			if ('undefined' === typeof(crossorigin)) {
				crossorigin = 'anonymous';
			}

			css.setAttribute('crossorigin', crossorigin);
		}

		css.setAttribute('rel', 'stylesheet');
		css.setAttribute('type', 'text/css');

		if ('undefined' !== typeof(config.plugin.Version)) {
			if (-1 === href.indexOf('?')) {
				href += '?';
			} else {
				href += '&';
			}

			href += config.plugin.Version;
		}

		css.href = href;

		insertBefore.parentNode.insertBefore(css, insertBefore);
	}
}({
	view: 'undefined' !== typeof(Twig) ? Twig.twig : null,
	request: 'undefined' !== typeof(nanoajax) ? nanoajax.ajax : null,
	crypto: 'undefined' !== typeof(CryptoJS) ? CryptoJS : null,
	mapbox: 'undefined' !== typeof(mapboxgl) ? mapboxgl : null,
	draw: 'undefined' !== typeof(MapboxDraw) ? MapboxDraw : null,
	geocoder: 'undefined' !== typeof(MapboxGeocoder) ? MapboxGeocoder : null,
	search: 'undefined' !== typeof(lunr) ? lunr : null,
	slick: 'undefined' !== typeof(jQuery) && 'undefined' !== typeof(jQuery.fn.slick) ? jQuery.fn.slick : null,
	chartist: 'undefined' !== typeof(Chartist) ? Chartist : null,
	autocomplete: 'undefined' !== typeof(autoComplete) ? autoComplete : null,
	chosen: 'undefined' !== typeof(Chosen) ? Chosen : null
}, 'undefined' !== typeof(kvcoreidxConfig) ? kvcoreidxConfig : null, document, 'script', 'link'));

!(function ($) {
	if($){
		// create a div (could also reuse a known element)
		var el = document.createElement('div');
		// detect support
		var supports_grid = typeof el.style.grid === 'string';

		if ( supports_grid ) {
			$('body').addClass('kv-supports--css-grid' );
		} else {
			$('body').addClass('kv-supports--flexbox-grid' );
		}
	}
}( 'undefined' !== typeof(jQuery) ? jQuery : null ));
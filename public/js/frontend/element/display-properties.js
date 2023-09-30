kvCORE.Display_Properties = (new function($, kv) {

	var $displayPropertiesPage = $('#kvcoreidx-display-properties');
    var context = $displayPropertiesPage.data('context');

    function getSupportedTypes() {
        var supportedTypes = [];
        context['supportedTypes'].forEach(function (key) {
            supportedTypes.push(key.id);
        });
        supportedTypes.sort(function(a,b){return a - b});
        return supportedTypes.join("|");
	}

	function loadPage() {
        var defaultFilters = {
            limit: 10,
            order: 'visits|desc',
            limited: true,
            actualtypes: getSupportedTypes()
        }
        //shortode filters if defined replace default ones above
        var filtersSet = context.shortcode_attributes;
        var filters = Object.assign(defaultFilters, filtersSet, { filters: {} });

        kvCORE.Remote.get('public/listings', filters, function (data) {
            if ('undefined' !== typeof (data.data) && 'function' === typeof (data.data.map)) {
                data.data.map(kvCORE.Property.addCustomData);
            }
            kvCORE.View.render('properties-listings', data, $displayPropertiesPage.find(".kv-show-listings"), null); 
        });
    }

	if ($displayPropertiesPage.length) {
		loadPage();
	}

}(jQuery, kvCORE));

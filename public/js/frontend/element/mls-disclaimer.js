kvCORE.MlsDisclaimer = (new function($, kv) {
	var $disclaimerContainer = $('#kvcoreidx-mls-disclaimer');
    var loadingClass = 'loading';
	kv.Remote.addStoredEndpoint('public/mls-services');

	kv.Remote.get('public/mls-services', {}, function (data) {
		for (var i = 0; i < data.data.length; i++) {
			data.data[i].parentDomain = kv.Config.get('parentDomain');
			data.data[i].parentState = kv.Config.get('parentState');
			//new york mls only does this

			if (data.data[i].mlsid === 1 || data.data[i].mlsid === 129 || data.data[i].mlsid === 251 || data.data[i].mlsid === 578) {
				var disclaimer = data.data[i].disclaimer.replace("#broker", kv.Config.get('parentName'));
				data.data[i].disclaimer = disclaimer;
			}
		}
		kv.View.render('mls-disclaimer', data, $disclaimerContainer, bindDisclaimer);
	});

	function bindDisclaimer() {
        $disclaimerContainer.removeClass(loadingClass);
    }

}(jQuery, kvCORE));
kvCORE.Social = (new function($, kv) {
	var $loginModal = $('#modal--login');
	var $loginModalContent = $loginModal.find('.kv-modal-content');
	function bindSocial() {
		$('body').on('click', '.fb-login-start', function() {
			loginFacebookOrGoogle("facebook");
		});
		$('body').on('click', '.google-login-start', function() {
			loginFacebookOrGoogle("google");
		});
	}
	function loginFacebookOrGoogle(type) {
		var $valuationDataElement = $('#kvcoreidx-valuation-pdf .kv-valuation-pdf');
		if (isNaN($valuationDataElement.data('value'))) {
			var estimateValue = 0;
		} else {
			var estimateValue = $valuationDataElement.data('value');
		}
		var deal_type = $loginModalContent.find('#dealType').val() ? $loginModalContent.find('#dealType').val() : 'buyer';
		var address = $valuationDataElement.data('address');
		var city = $valuationDataElement.data('city');
		var state = $valuationDataElement.data('state');
		var zip = $valuationDataElement.data('zip');
		var beds = $valuationDataElement.data('beds') ? $valuationDataElement.data('beds') : 0;
		var baths = $valuationDataElement.data('baths') ? $valuationDataElement.data('baths') : 0;
		var footage = $valuationDataElement.data('footage') ? $valuationDataElement.data('footage') : 0;

		//we need mls for the end result
		var mls = kv.Config.get('query', 'by-mls');
		if (!mls) {
			mls = kv.Config.get('query', 'mls');
		}

		var mlsId = kv.Config.get('query', 'by-mlsid');
		if (!mlsId) {
			mlsid = kv.Config.get('query', 'mlsid');
		}


		var host = window.location.host;
		var currentUrl = window.location.href;

		var x = screen.width / 2 - 800 / 2;
		var y = screen.height / 2 - 500 / 2;

		var url = "https://sociallogin.kvcore.com/oauth.php?agencyid="+host+"&agentid=0&domain="+host+"&ppc=&town=&price="+estimateValue+"&address="+address+"&city="+city+"&state="+state+"&zip="+zip+"&beds="+beds+"&baths="+baths+"&is_wp=1&footage="+footage+"&deal_type="+deal_type+"&backto="+currentUrl+"&origin=login.php&service="+type+"&is_wp=true&mls="+mls+"&mls_id="+mlsId;

		self.popupWindow = window.open(
			url,
			'social_sign_in',
			'location=0,status=0,scrollbars=1,width=800,height=500,left=' + x + ',top=' + y
		);
	}

	bindSocial();
}(jQuery, kvCORE));
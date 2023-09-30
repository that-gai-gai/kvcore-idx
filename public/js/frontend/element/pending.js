kvCORE.Pending = (new function ($, kv) {
    var $pendingModal = $('#modal--pending');
	var loggedInBodyClass = 'kvcoreidx--user-logged-in';
    var notLoggedInBodyClass = 'kvcoreidx--user-not-logged-in';
	var $pendingModalContent = $pendingModal.find('.kv-modal-content');
	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	function self() {
		return kvCORE.Pending;
	}
    
    this.showModal = function() {
		if (!this.isShown()) {

			// Lock scrolling until modal closes or redirected
			$("body").css({
				'overflow': 'hidden',
				'height': '100vh'
			});

			$pendingModal.kvModal('show');

		}

		return $pendingModal;
	};

    this.isShown = function() {
		return $pendingModal.hasClass('show');
	};

	this.hideModal = function() {
		$pendingModal.kvModal('hide');
	};

    function bindPendingData() {
		//click action on button here
        $pendingModal.find('#kv-pending-button').bind( "click", function(event) {
            event.stopPropagation();
            event.preventDefault();
            alert("submit form here");
			// POST TO: https://api-rnielson.kvcore.io/public/leads
			// capture_location: https://newwordpress.test/properties/?perRow=4&limit=800&order=visits%7Cdesc&page=1&limited=true&actualtypes=1%7C2%7C3%7C4%7C5%7C8%7C12%7C31&layout=map
			// email: rstsd@ddd.com
			// phone: 3923929394
			// vow_access_method: email
			// vow_request: 1
			// name: test test
			// email_optin: 1
			// duplicate_check: 1

			var lead_data = kv.User.getLeadData();

			var userData = {
				capture_location: kv.Url.getCurrentUrl(),
				email: lead_data.email,
				phone: lead_data.phone,
				vow_access_method: kv.Cookie.get('vow_access_method'),
				vow_request: 1,
				name: lead_data.first_name + ' ' + lead_data.last_name,
				email_optin: 1
			};

			if (kv.Config.get('options', 'registration', 'registration_lead_duplication_agent_selection') === '1') {
				userData.duplicate_check = 1;
			}

			var isSuccess = function(response, code) {
				return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
			};

			kv.Remote.post('public/leads', userData, function(response, code) {
				if (isSuccess(response, code)) {
					if (typeof response.lead_id !== 'undefined' && response.lead_id) {
						
						self().hideModal();
	
						if (typeof callbacks !== 'undefined' && typeof callbacks.success === 'function') {
							callbacks.success();
						}
						return;
					}

				} else {
					kv.Message.error('There is an error logging you in', 'Please try again later');
					$pendingModalContent.removeClass(loadingCenter);
					if (typeof callbacks !== 'undefined' && typeof callbacks.error === 'function') {
						callbacks.error();
					}
				}
			});
        });
	}

	kv.DOM.addBodyClass(loggedInBodyClass, notLoggedInBodyClass, kv.User.getLeadId);
    bindPendingData();
}(jQuery, kvCORE));
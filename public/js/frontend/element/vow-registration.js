kvCORE.VowRegistration = (new function ($, kv) {
    var $registrationModal = $('#modal--vowregistration');
	var $registrationModalContent = $registrationModal.find('.kv-modal-content');
	var loggedInBodyClass = 'kvcoreidx--user-logged-in';
    var notLoggedInBodyClass = 'kvcoreidx--user-not-logged-in';
	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	function self() {
		return kvCORE.VowRegistration;
	}
    
    this.showModal = function() {
		if (!this.isShown()) {

			// Lock scrolling until modal closes or redirected
			$("body").css({
				'overflow': 'hidden',
				'height': '100vh'
			});

			$registrationModal.kvModal('show');

			setTermsAndConditions();
		}

		return $registrationModal;
	};

    this.isShown = function() {
		return $registrationModal.hasClass('show');
	};

	this.hideModal = function() {
		$registrationModal.kvModal('hide');
	};

	function setTermsAndConditions() {
		var terms = '';
		if (kv.Config.get("vowWebsiteConfiguration") === '1') {
			var loadingCenter = loadingClass + '-center ' + loadingClass;
			terms = '<p> By registering on this web site, you are agreeing to comply with the following terms of service and use. Please review the following terms in their entirety and ensure their comprehension before proceeding. </p> <p> Acknowledge and understand that under this Terms of Use by registering for access to this site, does not create an agency relationship and does not impose a financial obligation on the Registrant or create any representation agreement between the Registrant and the Participant. </p> <p style="margin: 0 0 5px 0;"> <strong>As a Registrant and user of this web site, it is understood that:</strong> </p> <ul> <li> All data obtained from the site is intended only for your personal, non-commercial use. </li> <li> Accessing the site is done so with the understanding that the Registrant does have a bona fide interest in the purchase, sale, or lease of real estate of the type being offered. </li> <li> The Registrant agrees not to copy, redistribute or retransmit any of the data or information provided (and not for the provision of similar services to others). </li> <li> Acknowledges the Board/Association ownership of and the validity of the copyright in the MLS® database. </li> </ul> <p style="margin: 0 0 5px 0;"> <strong>Registration and access to the site</strong> </p> <ul> <li> Access to the site is completed by providing an email address, and by clicking “accept” in the auto-generated email or sms message confirming your request to access the site. </li> <li> All information that is provided by you to us is kept in the strictest of confidence as per the terms of our Privacy Policy, and is only collected for the purposes of providing you with the information and/or services requested. </li> <li> Registration to the site will remain active for a period of 90 days from the date of the initial registration. Registrants will be able to unsubscribe from access to the site at any point during the course of this 90-day period. </li> <li style="list-style: none"> <ul> <li> To reactivate your registration after each 90 days, you are required to request a new access link via email or sms message. </li> <li> ' + kv.Config.get("siteName") + ' reserves the right to terminate access by a registrant to the site if the registrant makes an authorized transfer or an unauthorized use of the content at any time during the registration period. </li> </ul> </ul> <p style="margin: 0 0 5px 0;"> <strong>Copyright</strong> </p> <p> The content on this website is protected by copyright and other laws, and is intended solely for the private, non-commercial use by individuals. Any other reproduction, distribution or use of the content, in whole or in part, is specifically prohibited. Prohibited uses include commercial use, “screen scraping, “database scraping”, and any other activity intended to collect, store, reorganize or manipulate the content of this website. </p> <p style="margin: 0 0 5px 0;"> <strong>Liability and Warranty Disclaimer</strong> </p> <p> The information contained on this website is based in whole or in part on information that is provided by members of Toronto Real Estate Board, who are responsible for its accuracy. Toronto Real Estate Board reproduces and distributes this information as a service for its members, and assumes no responsibility for its completeness or accuracy. ' + kv.Config.get("siteName") + ' is not responsible for the accuracy of the information displayed on this website. </p> <p> You are responsible for the use of and results obtained from the VOW site and supporting database. Unless otherwise required by applicable law, neither ' + kv.Config.get("siteName") + ', Brokerage nor its related companies, subsidiaries, directors, officers, employees and agents shall be liable for any indirect, special, exemplary, incidental or consequential damages or any damages resulting from the use of the site and supporting database however and including, without limitation, damages for personal loss or damage, loss of business profits, business interruption, loss of business information or other pecuniary loss, lost data, failure to realize expected savings, and any other commercial or economic loss of any kind and arising in consequence of the performance, failure to perform, or other breach under this agreement, irrespective of whether' + kv.Config.get("vowWebsiteConfiguration") + ', Brokerage has advance notice of the possibility of such damages. ' + kv.Config.get("siteName") + ', Brokerage’s total liability including, but not limited to, any possible liability for indemnity, defence and hold harmless obligations shall not exceed the total amount paid by you to them under this agreement. </p> <p style="margin: 0 0 5px 0;"> <strong>Common Intent</strong> </p> <p> You specifically acknowledge and agree that the common intent of all parties and participants is to facilitate data access and exchange as set out herein, and that ' + kv.Config.get("siteName") + ', Brokerage is providing all such information and data without any representations or warranties as to its accuracy (notwithstanding that it makes every effort to ensure the same). You further acknowledge that mistakes can and will happen and the risk of loss from any errors, mistakes, however arising, is solely yours. </p> <p style="margin: 0 0 5px 0;"> <strong>Informed Consent</strong> </p> <p> If you are not prepared to accept the risks described above, then you should not enter into this contract. As noted above, your use of the site and supporting database, signifies your acceptance of all of the terms and conditions set out including, without limitation, the Liability and Warranty clauses. Your acceptance of these terms and conditions as evidenced by your use of the site and database, will be relied upon as evidence of your agreement that no claims will be brought, and that you are binding yourself, your agents, servants, successors and assigns, to indemnify and hold harmless ' + kv.Config.get("siteName") + ', Brokerage, their agents, servants and employees from any or all such claims, loss and damage, whether specifically excluded herein or otherwise. These include but are not limited to: legal fees and disbursements incurred by ' + kv.Config.get("siteName") + ', Brokerage, or their lawyers, advisors, agents, servants and employees. </p> <p style="margin: 0 0 5px 0;"> <strong>Amendments</strong> </p> <p> ' + kv.Config.get("siteName") + ', Brokerage may at any time amend these Terms of Use by updating this posting. All users of this site are bound by these amendments should they wish to continue accessing the web site, and should therefore periodically visit this page to review any and all such amendments. </p>';
		} else if (kv.Config.get("vowWebsiteConfiguration") === '2') {
			terms = '<p> By registering on this web site, you are agreeing to comply with the following terms of service and use. Please review the following terms in their entirety and ensure their comprehension before proceeding. </p> <p> Acknowledge and understand that under this Terms of Use by registering for access to this site, does not create an agency relationship and does not impose a financial obligation on the Registrant or create any representation agreement between the Registrant and the Participant. </p> <p style="margin: 0 0 5px 0;"> <strong>As a Registrant and user of this web site, it is understood that:</strong> </p> <ul> <li> All data obtained from the site is intended only for your personal, non-commercial use. </li> <li> Accessing the site is done so with the understanding that the Registrant does have a bona fide interest in the purchase, sale, or lease of real estate of the type being offered. </li> <li> The Registrant agrees not to copy, redistribute or retransmit any of the data or information provided (and not for the provision of similar services to others). </li> <li> Acknowledges the Board/Association ownership of and the validity of the copyright in the MLS® database. </li> </ul> <p style="margin: 0 0 5px 0;"> <strong>Registration and access to the site</strong> </p> <ul> <li> Access to the site is completed by providing an email address, and by clicking “accept” in the auto-generated email or sms message confirming your request to access the site. </li> <li> All information that is provided by you to us is kept in the strictest of confidence as per the terms of our Privacy Policy, and is only collected for the purposes of providing you with the information and/or services requested. </li> <li> Registration to the site will remain active for a period of 30 days from the date of the initial registration. Registrants will be able to unsubscribe from access to the site at any point during the course of this 30-day period. </li> <li style="list-style: none"> <ul> <li> To reactivate your registration after each 30 days, you are required to request a new access link via email or sms message. </li> <li> ' + kv.Config.get("siteName") + ' reserves the right to terminate access by a registrant to the site if the registrant makes an authorized transfer or an unauthorized use of the content at any time during the registration period. </li> </ul> </ul> <p style="margin: 0 0 5px 0;"> <strong>Copyright</strong> </p> <p> The content on this website is protected by copyright and other laws, and is intended solely for the private, non-commercial use by individuals. Any other reproduction, distribution or use of the content, in whole or in part, is specifically prohibited. Prohibited uses include commercial use, “screen scraping, “database scraping”, and any other activity intended to collect, store, reorganize or manipulate the content of this website. </p> <p style="margin: 0 0 5px 0;"> <strong>Liability and Warranty Disclaimer</strong> </p> <p> The information contained on this website is based in whole or in part on information that is provided by members of Toronto Real Estate Board, who are responsible for its accuracy. Toronto Real Estate Board reproduces and distributes this information as a service for its members, and assumes no responsibility for its completeness or accuracy. ' + kv.Config.get("siteName") + ' is not responsible for the accuracy of the information displayed on this website. </p> <p> You are responsible for the use of and results obtained from the VOW site and supporting database. Unless otherwise required by applicable law, neither ' + kv.Config.get("siteName") + ', Brokerage nor its related companies, subsidiaries, directors, officers, employees and agents shall be liable for any indirect, special, exemplary, incidental or consequential damages or any damages resulting from the use of the site and supporting database however and including, without limitation, damages for personal loss or damage, loss of business profits, business interruption, loss of business information or other pecuniary loss, lost data, failure to realize expected savings, and any other commercial or economic loss of any kind and arising in consequence of the performance, failure to perform, or other breach under this agreement, irrespective of whether' + kv.Config.get("siteName") + ', Brokerage has advance notice of the possibility of such damages. ' + kv.Config.get("siteName") + ', Brokerage’s total liability including, but not limited to, any possible liability for indemnity, defence and hold harmless obligations shall not exceed the total amount paid by you to them under this agreement. </p> <p style="margin: 0 0 5px 0;"> <strong>Common Intent</strong> </p> <p> You specifically acknowledge and agree that the common intent of all parties and participants is to facilitate data access and exchange as set out herein, and that ' + kv.Config.get("siteName") + ', Brokerage is providing all such information and data without any representations or warranties as to its accuracy (notwithstanding that it makes every effort to ensure the same). You further acknowledge that mistakes can and will happen and the risk of loss from any errors, mistakes, however arising, is solely yours. </p> <p style="margin: 0 0 5px 0;"> <strong>Informed Consent</strong> </p> <p> If you are not prepared to accept the risks described above, then you should not enter into this contract. As noted above, your use of the site and supporting database, signifies your acceptance of all of the terms and conditions set out including, without limitation, the Liability and Warranty clauses. Your acceptance of these terms and conditions as evidenced by your use of the site and database, will be relied upon as evidence of your agreement that no claims will be brought, and that you are binding yourself, your agents, servants, successors and assigns, to indemnify and hold harmless ' + kv.Config.get("siteName") + ', Brokerage, their agents, servants and employees from any or all such claims, loss and damage, whether specifically excluded herein or otherwise. These include but are not limited to: legal fees and disbursements incurred by ' + kv.Config.get("siteName") + ', Brokerage, or their lawyers, advisors, agents, servants and employees. </p> <p style="margin: 0 0 5px 0;"> <strong>Amendments</strong> </p> <p> ' + kv.Config.get("siteName") + ', Brokerage may at any time amend these Terms of Use by updating this posting. All users of this site are bound by these amendments should they wish to continue accessing the web site, and should therefore periodically visit this page to review any and all such amendments. </p>';
		}
		$registrationModal.find(".kv-modal-vow-registration-disclaimer").append(terms);
	}

    function bindSoldDataRegistration() {
		$('form#vow-registration').submit(userRegister);

		$registrationModal.find("#vow-phone").mask("(999) 999-9999", { autoclear: false });
		$.validator.addMethod('email_rule', function (value, element) {
			if (/^([a-zA-Z0-9_\-\.]+)\+?([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/.test(value)) {
				return true;
			} else {
				return false;
			};
		});
		
		$registrationModal.find("#vow-registration").validate({
			rules: {
				'email': {
					required: true,
					email_rule: true
				},
				'phone': {
					required: function(element) { 	
						return $registrationModal.find('input[name=vow_access_method]:checked').val() === 'text'
					}
				}
			},
			messages: {
				'email': "Enter a valid email address",
				'phone': "Enter a valid phone number"
			}
		});
	}

	function userRegister(e, data, callbacks) {
		var isvalid = $registrationModal.find("form#vow-registration").valid();
		if (isvalid) {
			var formArray = {};

			if (kv.isEvent(e)) {
				e.preventDefault();
				formArray = kv.Form.toArray($(e.target)[0]);
			} else if (kv.isUsableObject(data)) {
				formArray = data;
			}

			$registrationModalContent.addClass(loadingCenter);

			var isSuccess = function(response, code) {
				return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
			};

			var loginCallback = function(response) {
					kv.Cookie.set('vow_pending', response.lead_id, 90);
					kv.Cookie.set('vow_access_method', userData.vow_access_method, 90);
					kv.Cookie.set('vow_backto', window.location.href, 90);
				kv.User.setLeadId(response.lead_id, function() {
					self().hideModal();
					$(document).trigger('kvcoreidx-login-modal-hide');
					$registrationModalContent.removeClass(loadingCenter);
				});
			};

			var userData = {
				capture_location: kv.Url.getCurrentUrl()
			};

			if ('undefined' !== typeof(formArray.deal_type)) {
				userData.deal_type = formArray.deal_type;
			}

			if ('undefined' !== typeof(formArray.email)) {
				userData.email = formArray.email.trim();
			}
			if ('string' === typeof(formArray.phone)) {
				userData.phone = formArray.phone.replace(/[^0-9]+/g, '');
			}

			if ('undefined' !== typeof(formArray.vow_access_method)) {
				userData.vow_access_method = formArray.vow_access_method;
			}

			if ('undefined' !== typeof(formArray.vow_request)) {
				userData.vow_request = formArray.vow_request;
			}

			if ('undefined' !== typeof(formArray.first_name) || 'undefined' !== typeof(formArray.last_name)) {
				var fullname = formArray.first_name.trim() + ' ' + formArray.last_name.trim();
				userData.name = fullname;
			}
			
			var mls = kv.Config.get('query', 'by-mls');
			if(!mls) {
				mls = kv.Config.get('query', 'mls');
			}
			if (mls) {
				userData.signup_mls = mls;
			}

			var mlsId = kv.Config.get('query', 'by-mlsid');
			if(!mlsId) {
				mlsid = kv.Config.get('query', 'mlsid');
			}
			if (mlsId) {
				userData.signup_mlsid = mlsId;
			}
			userData.email_optin = 1;

			if (kv.Config.get('options', 'registration', 'registration_lead_duplication_agent_selection') === '1') {
				userData.duplicate_check = 1;
			}

			delete userData.deal_type;
						
			kv.Remote.post('public/leads', userData, function(response, code) {
				if (isSuccess(response, code)) {
					if(typeof response.lead_id !== 'undefined' && response.lead_id) {
						loginCallback(response);
	
						if (typeof callbacks !== 'undefined' && typeof callbacks.success === 'function') {
							callbacks.success();
						}
						return;
					}
					self().showAgentPickerModal(response, userData, callbacks, loginCallback, isSuccess);

				} else {
					kv.Message.error('There is an error logging you in', 'Please try again later');
					$loginModalContent.removeClass(loadingCenter);
					if (typeof callbacks !== 'undefined' && typeof callbacks.error === 'function') {
						callbacks.error();
					}
				}
			});
			return true;
		} else {
			return false;
		}
	}
	kv.DOM.addBodyClass(loggedInBodyClass, notLoggedInBodyClass, kv.User.getLeadId);
    bindSoldDataRegistration();
}(jQuery, kvCORE));
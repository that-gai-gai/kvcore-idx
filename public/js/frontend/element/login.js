kvCORE.Login = (new function($, kv) {
	var $loginModal = $('#modal--login');
	var $selectAgentModal = $('#modal--lead-manager');
	var $loginModalContent = $loginModal.find('.kv-modal-content');

    var loggedInBodyClass = 'kvcoreidx--user-logged-in';
    var notLoggedInBodyClass = 'kvcoreidx--user-not-logged-in';

	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	function self() {
		return kvCORE.Login;
	}

	this.showModal = function(redirectHomeOnClose, isSeller) {
		if (!this.isShown()) {

			// Lock scrolling until modal closes or redirected
			$("body").css({
				'overflow': 'hidden',
				'height': '100vh'
			});

			$loginModal.kvModal('show');

			if (isSeller) {
				var $loginForm = $loginModalContent.find('.login-form');
				$('<input>').attr({
					type: 'hidden',
					id: 'dealType',
					name: 'deal_type',
					value: 'seller'
				}).appendTo($loginForm);
			}

			if (typeof redirectHomeOnClose !== 'undefined' && redirectHomeOnClose === true) {
				$loginModal.on('click.dismiss.bs.kvmodal', function() {
					if ($loginModal.hasClass('show')) {
						return;
					}
					$("body").css({
						'overflow': '',
						'height': ''
					});
					kv.Url.redirect();
				});
			}
		}

		return $loginModal;
	};

	this.showAgentPickerModal = function(res, userData, callbacks, loginCallback, isSuccess) {

		// Lock scrolling until modal closes or redirected
		$("body").css('overflow', 'hidden');

		var code = "";

		for(var data in res.data) {
			code +=
				"<div style=\"border: 1px solid lightgrey; border-radius: 3px; display: flex; flex-direction: row; height: 80px; margin-top: 10px;\">" +
					"<div class=\"agent-image\" style=\"margin: 10px; flex-basis: 14%\">" +
						"<img src=\"" + res.data[data].agent.photo + "\" alt=\"agent\" style=\"height: 60px; width: 60px;\">" +
					"</div>" +
					"<div class=\"agent-info\" style=\"padding: 10px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid lightgray; color: #4d4d4d; flex-basis: 71%;\">" +
						"<p style=\"margin-bottom: 0; font-size: 18px;\">" + res.data[data].agent.full_name + "</p>" +
						"<p style=\"margin-bottom: 5px; font-size: 14px; \">" + res.data[data].agent.office_name + "</p>" +
					"</div>" +
					"<div class=\"select-agent\" style=\"padding: 10px; flex-basis: 15%\">" +
						"<input type=\"radio\" name='agent' style=\"margin-top: 20px; margin-left: 16px;\" data-id='" + res.data[data].contact.id + "'>" +
					"</div>" +
				"</div>";
		}

		// var code = '<div style="border: 1px solid lightgrey; border-radius: 3px; display: flex; flex-direction: row; height: 80px; margin-top: 10px;"><div class="agent-image" style="margin: 10px; flex-basis: 14%"><img src="https://b386363e680359b5cc19-97ec1140354919029c7985d2568f0e82.ssl.cf1.rackcdn.com/assets/uploads/agent/photo/63684/optimized_429192e8aa71a380d71427f8b9e83442.jpg" alt="agent" style="height: 60px; width: 60px;"></div><div class="agent-info" style="padding: 10px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid lightgray; color: #4d4d4d; flex-basis: 71%;"><p style="margin-bottom: 0; font-size: 18px;">Jimmy Dingus</p><p style="margin-bottom: 5px; font-size: 14px; ">The Sad Boy Realty Group  |  801-568-4258</p></div><div class="select-agent" style="padding: 10px; flex-basis: 15%"><input type="radio" style="margin-top: 20px; margin-left: 16px;"></div></div><div style="border: 1px solid lightgrey; border-radius: 3px; display: flex; flex-direction: row; height: 80px; margin-top: 10px;"><div class="agent-info" style="padding: 10px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid lightgray; color: #4d4d4d; flex-basis: 89%"><p style="margin-bottom: 0; font-size: 18px;">None of the above.</p></div><div class="select-agent" style="padding: 10px; flex-basis: 15%"><input type="radio" style="margin-top: 20px; margin-left: 16px;"></div></div>';
		code += "" +
			"<div style=\"border: 1px solid lightgrey; border-radius: 3px; display: flex; flex-direction: row; height: 80px; margin-top: 10px;\">" +
				"<div class=\"agent-info\" style=\"padding: 10px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid lightgray; color: #4d4d4d; flex-basis: 89%\">" +
					"<p style=\"margin-bottom: 0; font-size: 18px;\">None of the above.</p>" +
				"</div>" +
				"<div class=\"select-agent\" style=\"padding: 10px; flex-basis: 15%\">" +
					"<input type=\"radio\" name='agent' style=\"margin-top: 20px; margin-left: 16px;\" data-id='-1'>" +
				"</div>" +
			"</div>" +
			"<button type=\"button\" id='agent-select-submit-button' class=\"kv-button\" style=\"width: 100%; margin-top: 10px\">Done</button>";

		$selectAgentModal.find('.login-form-agent-select').html(code);

		$selectAgentModal.kvModal('show');

		$selectAgentModal.find('#agent-select-submit-button').on('click', function () {

			var contactId = $('input[name="agent"]:checked').data('id');
			//if contactId != -1. Just set cookie
			if(contactId !== -1) {
				loginCallback({lead_id: contactId});

				if (typeof callbacks !== 'undefined' && typeof callbacks.success === 'function') {
					callbacks.success();
				}
				$selectAgentModal.kvModal('hide');

			}
			//else force send create lead request
			else {

				$selectAgentModal.kvModal('hide');
				// userData.force_create = 1;
				// delete userData.duplicate_check;
				//
				// if(!kv.User.getLeadId()) {
				// 	kv.Remote.post('public/leads', userData, function (response, code) {
				// 		if (isSuccess(response, code)) {
				// 			loginCallback(response);
				//
				// 			if (typeof callbacks !== 'undefined' && typeof callbacks.success === 'function') {
				// 				callbacks.success();
				// 			}
				// 			$selectAgentModal.kvModal('hide');
				//
				// 		} else {
				// 			kv.Message.error('There is an error logging you in', 'Please try again later');
				// 			$loginModalContent.removeClass(loadingCenter);
				// 			if (typeof callbacks !== 'undefined' && typeof callbacks.error === 'function') {
				// 				callbacks.error();
				// 			}
				// 			$selectAgentModal.kvModal('hide');
				// 		}
				// 	});
				// }
			}
		});

		$selectAgentModal.on('hidden.bs.kvmodal', function() {
			if(!kv.User.getLeadId()) {

				userData.force_create = 1;
				delete userData.duplicate_check;

				kv.Remote.post('public/leads', userData, function (response, code) {
					if (isSuccess(response, code)) {
						loginCallback(response);

						if (typeof callbacks !== 'undefined' && typeof callbacks.success === 'function') {
							callbacks.success();
						}
						$selectAgentModal.kvModal('hide');

					} else {
						kv.Message.error('There is an error logging you in', 'Please try again later');
						$loginModalContent.removeClass(loadingCenter);
						if (typeof callbacks !== 'undefined' && typeof callbacks.error === 'function') {
							callbacks.error();
						}
						$selectAgentModal.kvModal('hide');
					}
				});
			}
		});
	};

	// When the model closes, make sure to unlock the body to allow scrolling
	$loginModal.on('hide.bs.kvmodal', function () {
		$("body").css({
			'overflow': '',
			'height': ''
		});
	});

	this.isShown = function() {
		return $loginModal.hasClass('show');
	};

	this.hideModal = function() {
		$loginModal.kvModal('hide');
	};

	this.loginQueue = {
        cookieName: 'processAfterLogin',

        getLoginProcesses: function() {
            var loginProcesses = kv.Cookie.get(this.cookieName);
            return Array.isArray(loginProcesses) ? loginProcesses : [];
        },

        add: function(func, params) {
            var loginProcesses = this.getLoginProcesses();

            loginProcesses.push({
                func: func,
                params: params
            });

            kv.Cookie.set(this.cookieName, loginProcesses);
        },

        process: function() {
            var loginProcesses = this.getLoginProcesses();

            loginProcesses.map(function(proc) {
                kvEXEC(proc.func.obj, proc.func.method, proc.params);
            });
            
            kv.Cookie.delete(this.cookieName);
        }
    };

	function userLoginFacebookGoogle(data) {
		$loginModalContent.addClass(loadingCenter);

		var isSuccess = function(response, code) {
			return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
		};

		var loginCallback = function(response) {
			kv.User.setLeadId(response.lead_id, function() {
				self().loginQueue.process();
				self().hideModal();
				$(document).trigger('kvcoreidx-login-modal-hide');
				$loginModalContent.removeClass(loadingCenter);
			});
		};

		var userData = {
			capture_location: kv.Url.getCurrentUrl()
		};

		//set name, email here
		if ('undefined' !== typeof(data.deal_type)) {
			userData.deal_type = data.deal_type;
		}

		if ('undefined' !== typeof(data.email)) {
			userData.email = data.email.trim();
		}
		if ('string' === typeof(data.phone)) {
			userData.phone = data.phone.replace(/[^0-9]+/g, '');
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
		//They came from valuation page
		if (userData.deal_type === 'seller' && kv.Cookie.get('seller_lead_id')) {
			kv.Remote.get('website/leads', {email: userData.email}, function(response) {
				//does lead exist
				if (response.lead_id) {
					var leadId = response.lead_id;
				} else {
					var leadId = kv.Cookie.get('seller_lead_id');
				}
					var sellerParams = {
						lead_id: leadId,
						email: userData.email,
						name: userData.email.substring(0, userData.email.indexOf("@")),
						deal_type: "seller"
					}

					kv.Remote.put('website/leads', sellerParams, function(response) {
						if (response.lead_id) {
							loginCallback(response);
							kv.Cookie.delete('seller_lead_id');
							return;
						} else {
							kv.Message.error('There is an error logging you in', 'Please try again later');
							$loginModalContent.removeClass(loadingCenter);
						}
					});
				
			});			
		} else {
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
		}
	}

	function userLogin(e, data, callbacks, closePrequalify) {
		var isvalid = $loginModal.find(".login-form").valid();
		if (isvalid) {
			closePrequalify = closePrequalify || false;

			if(closePrequalify) {
				$("#kvcoreidx-shortcode--prequalify-modal").kvModal('hide');
			}
			var formArray = {};

			if (kv.isEvent(e)) {
				e.preventDefault();
				formArray = kv.Form.toArray($(e.target)[0]);
			} else if (kv.isUsableObject(data)) {
				formArray = data;
			}

			$loginModalContent.addClass(loadingCenter);

			var isSuccess = function(response, code) {
				return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
			};

			var loginCallback = function(response) {
				kv.User.setLeadId(response.lead_id, function() {
					self().loginQueue.process();
					self().hideModal();
					$(document).trigger('kvcoreidx-login-modal-hide');
					$loginModalContent.removeClass(loadingCenter);
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
			//They came from valuation page
			if (userData.deal_type === 'seller' && kv.Cookie.get('seller_lead_id')) {
				kv.Remote.get('website/leads', {email: userData.email}, function(response) {
					//does lead exist
					if (response.lead_id) {
						var leadId = response.lead_id;
					} else {
						var leadId = kv.Cookie.get('seller_lead_id');
					}
						var sellerParams = {
							lead_id: leadId,
							email: userData.email,
							phone: userData.phone,
							name: userData.email.substring(0, userData.email.indexOf("@")),
							deal_type: "seller"
						}
						
						kv.Remote.put('website/leads', sellerParams, function(response) {
							if (response.lead_id) {
								loginCallback(response);
								kv.Cookie.delete('seller_lead_id');
								return;
							} else {
								kv.Message.error('There is an error logging you in', 'Please try again later');
								$loginModalContent.removeClass(loadingCenter);
							}
						});
					
				});

				
			} else {
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
			}	
		}
		
		
	}

	this.userLogin = userLogin;

	this.userLoginFacebookGoogle = userLoginFacebookGoogle;

	function bindLogin() {
		$('form.login-form').submit(userLogin);

		$('#tab-register').click(function() {
			self().showModal();
		});
		//show phone as email is there
		$loginModal.find('#modal--login-email').bind("keyup change onblur", function () {
			var x = $(this).val();
			if (x.indexOf("@") >= 0) {
				$loginModal.find('#kv-modal--phone-section').removeClass("kv-modal-login-hide");
			}
		});
		$loginModal.find("#modal--login-phone").mask("(999) 999-9999", { autoclear: false });
		$.validator.addMethod('email_rule', function (value, element) {
			if (/^([a-zA-Z0-9_\-\.]+)\+?([a-zA-Z0-9_\-\.]+)@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/.test(value)) {
				return true;
			} else {
				return false;
			};
		});
		$loginModal.find(".login-form").validate({
			rules: {
				'email': {
					required: true,
					email_rule: true
				},
				'phone': {
					required: true,
				},
			},
			messages: {
				'email': "Enter a valid email address",
				'phone': "Enter a valid phone number"
			}
		});
	}

	kv.DOM.addBodyClass(loggedInBodyClass, notLoggedInBodyClass, kv.User.getLeadId);
	bindLogin();
}(jQuery, kvCORE));
kvCORE.Contact = (new function($, kv) {
    var $contactForm = $('#kvcoreidx-contact-form');

    if (typeof mls === 'undefined') b = null;

    var $form = $contactForm.find('form.kv-contact-form');
    var mlsid = 'NOT-PROVIDED';
    var formWasSubmittedSuccessfully = false;

    $form.attr('action', 'public/leads/question');

    //Attempt login with key
    kv.User.maybeAuthenticateViaURLToken(function(){
        setTimeout(function() {
            if (kv.User.getLeadId()) {
                $contactForm.find('#contact--question-lead_id').val(kv.User.getLeadId());
                var lead_data = kv.User.getLeadData();
                if (kv.isUsableObject(lead_data)) {
                    if ('undefined' !== typeof(lead_data.email)) {
                        $contactForm.find('[name*="email"]').val(lead_data.email);
                    }
                    if ('undefined' !== typeof(lead_data.phone)) {
                        $contactForm.find('[name="phone"]').val(lead_data.phone);
                    }
                }
            }
        }, 800);
    });

    $contactForm.find('#contact--question-mlsid').val(mlsid);
	

	function submitForm(obj) {
		if (!kv.User.getLeadId()) {

			var email = $(obj).find('input[name="email"]').val();
			var name = $(obj).find('input[name="name"]').val();
			var phone = $(obj).find('input[name="phone"]').val().replace(/[^0-9]+/g, '');
			var mls = kv.Config.get('query', 'by-mls');
			var mlsid = kv.Config.get('query', 'by-mlsid');


			var userData = {
				capture_location: kv.Url.getCurrentUrl(),
				name: name,
				email: email,
				phone: phone,
			};

			if (mls) {
				userData.signup_mls = mls;
			}
			if (mlsid) {
				userData.signup_mlsid = mlsid;
			}
			userData.email_optin = 1;

			if(kv.Config.get('options', 'registration_lead_duplication_agent_selection') == 1) {
				userData.duplicate_check = 1;
			}

			kv.Remote.post('public/leads', userData, function (response, code) {
				if (isSuccess(response, code)) {
					if(typeof response.lead_id !== 'undefined' && response.lead_id) {
						kv.User.setLeadId(response.lead_id, function() {
							kv.Login.loginQueue.process();
							$(obj).find('input[name="lead_id"]').val(response.lead_id);
							actualSubmission(obj);
						});
					}
					else {
						self().showAgentPickerModal(response, userData, isSuccess, obj);
					}
				} else {
					kv.Message.error('There is an error logging you in', 'Please try again later');
				}
			});
		}
		else {
			actualSubmission(obj);
		}
	}

	function actualSubmission(obj) {
        if (formWasSubmittedSuccessfully === false) {
            formWasSubmittedSuccessfully = true;
            kv.Form.submit($(obj), function (data, code) {
                if (200 === code && data.status === 'SUCCESS') {
                    $contactForm.html("<p>Thank you! We'll be in touch soon!</p>");
                } else {
                    $contactForm.html("<p style='color:red'>There was an error submitting your question.</p>");
                }
            }, function (data) {
                data.question = $(obj).find('textarea[name="question"]').val();
                return data;
            });
        }
	}

	function self() {
		return kvCORE.Question;
	}

	function bindQuestion() {
		$(document).on('submit', 'form.kv-contact-form', function(e) {
			e.preventDefault();
			submitForm(this);
		});
	}

	var isSuccess = function(response, code) {
		return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
	};

	bindQuestion();
}(jQuery, kvCORE));
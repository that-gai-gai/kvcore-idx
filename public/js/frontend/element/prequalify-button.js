kvCORE.Prequalify = (new function ($, kv, p) {
    var $prequalifyButton = $("#kvcoreidx-shortcode--prequalify-button");
    var $prequalifyModal = $("#kvcoreidx-shortcode--prequalify-modal");
    var $selectAgentModal = $('#modal--lead-manager');
    var $prequalifyForm = $prequalifyModal.find('#kv-prequalify-form');

    var loadingClass = 'loading';
    var loadingCenter = loadingClass + '-center ' + loadingClass;

	$prequalifyButton.click(function (e) {
		e.preventDefault();

		self().show();
	});

    $prequalifyForm.submit(function (e) {
        e.preventDefault();

        var fields = kv.Form.toArray(this);
        var leadId = kv.User.getLeadId();

        $prequalifyForm.addClass(loadingCenter);

        if (leadId) {
            // already logged in
            updateExistingLead(leadId, fields);
        } else {
            // try to log in
            var callbacks = {
                success: updateExistingLead.bind(null, function() { return kv.User.getLeadId(); }, fields),
	            // create new lead
	            error: createNewLead.bind(null, fields)
            };

	        kv.Login.userLogin(undefined, $.extend(true, {}, fields), callbacks, true);
        }
    });

	function self() {
		return kvCORE.Prequalify;
	}

	this.show = function() {
		$prequalifyModal.kvModal('show');
	};

    this.showAgentPickerModalPre = function(res, userData, loginCallback, isSuccess) {

        $prequalifyModal.kvModal('hide');
        $prequalifyForm.removeClass(loadingCenter);

        // Lock scrolling until modal closes or redirected
        $("body").css('overflow', 'hidden');

        var code = "";

        for(var data in res.data) {
            code +=
                "<div style=\"border: 1px solid lightgrey; border-radius: 3px; display: flex; flex-direction: row; height: 80px; margin-top: 10px;\">" +
                "<div class=\"agent-image\" style=\"margin: 10px; flex-basis: 14%\">" +
                "<img src=\"" + res.data[data].agent[0].photo + "\" alt=\"agent\" style=\"height: 60px; width: 60px;\">" +
                "</div>" +
                "<div class=\"agent-info\" style=\"padding: 10px; display: flex; flex-direction: column; justify-content: center; border-right: 1px solid lightgray; color: #4d4d4d; flex-basis: 71%;\">" +
                "<p style=\"margin-bottom: 0; font-size: 18px;\">" + res.data[data].agent[0].full_name + "</p>" +
                "<p style=\"margin-bottom: 5px; font-size: 14px; \">" + res.data[data].agent[0].office_name + "</p>" +
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
            "<button type=\"submit\" id='agent-select-submit-button' class=\"kv-button\" style=\"width: 100%; margin-top: 10px\">Done</button>";

        $selectAgentModal.find('.login-form-agent-select').html(code);

        $selectAgentModal.kvModal('show');

        $selectAgentModal.find('#agent-select-submit-button').on('click', function () {

            var contactId = $('input[name="agent"]:checked').data('id');
            //if contactId != -1. Just set cookie
            if(contactId !== -1) {
                loginCallback({lead_id: contactId});
                $selectAgentModal.kvModal('hide');

            }
            //else force send create lead request
            else {

                userData.force_create = 1;
                delete userData.duplicate_check;

                kv.Remote.post('public/leads', userData, function(response, code) {
                    if (isSuccess(response, code)) {
                        loginCallback(response);

                        $prequalifyForm.removeClass(loadingCenter);
                        $selectAgentModal.kvModal('hide');

                    } else {
                        kv.Message.error('There is an error logging you in', 'Please try again later');

                        $prequalifyForm.removeClass(loadingCenter);
                        $selectAgentModal.kvModal('hide');
                    }
                });
            }
        });

        $selectAgentModal.on('hidden.bs.kvmodal', function() {
            if(!kv.User.getLeadId()) {

                userData.force_create = 1;
                delete userData.duplicate_check;

                kv.Remote.post('public/leads', userData, function (response, code) {
                    if (isSuccess(response, code)) {
                        loginCallback(response);

                        $prequalifyForm.removeClass(loadingCenter);
                        $selectAgentModal.kvModal('hide');

                    } else {
                        kv.Message.error('There is an error logging you in', 'Please try again later');
                        $prequalifyForm.removeClass(loadingCenter);
                        $selectAgentModal.kvModal('hide');
                    }
                });
            }
        });
    };

    function createNewLead(fields) {
        var isSuccess = function(response, code) {
            return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
        };

        var loginCallback = function(response) {
            kv.User.setLeadId(response.lead_id, function() {
                updateExistingLead(response.lead_id, fields);
            });
        };

        var userData = {
            capture_location: kv.Url.getCurrentUrl()
        };

        var mls = kv.Config.get('query', 'by-mls');
        if (mls) {
            userData.signup_mls = mls;
        }
        var mlsId = kv.Config.get('query', 'by-mlsid');
        if (mlsId) {
            userData.signup_mlsid = mlsId;
        }

        if ('undefined' !== typeof(fields.email)) {
            userData.email = fields.email;
        }
        if ('string' === typeof(fields.phone)) {
            userData.phone = fields.phone.replace(/[^0-9]+/g, '');
        }
        userData.email_optin = 1;
        if(kv.Config.get('options', 'registration_lead_duplication_agent_selection') == 1) {
            userData.duplicate_check = 1;
        }

        kv.Remote.post('public/leads', userData, function(response, code) {
            if (isSuccess(response, code)) {
                if(typeof response.lead_id !== 'undefined' && response.lead_id) {
                    loginCallback(response);
                    return;
                }
                self().showAgentPickerModalPre(response, userData, loginCallback, isSuccess);
            } else {
                kv.Message.error('There is an error logging you in', 'Please try again later');
                $prequalifyForm.removeClass(loadingCenter);
            }
        });
    }

    function updateExistingLead(leadId, fields) {
        var message = ['New lender pre-qualification request for: ']
        if ( 'undefined' !== fields['first-name'] ) {
            message.push("First Name: " + fields['first-name'] );
        }

        if ( 'undefined' !== fields['last-name'] ) {
            message.push("Last Name: " + fields['last-name'] );
        }

        if ( 'undefined' !== fields['preferred-contact-method'] ) {
            message.push("Prefer Contact By: " + fields['preferred-contact-method'] );
        }

        if ( 'undefined' !== fields['how-can-we-assist'] ) {
            message.push("How can we assist you: " + fields['how-can-we-assist'] );
        }

        if ( 'undefined' !== fields['message'] ) {
            message.push("Message: " + fields['message'] );
        }
        
        var mlsId = kv.Config.get('query', 'by-mlsid');
        if (mlsId === null) {
            mlsId = 0;
        } 

        kv.Remote.put('public/leads/question', {
            lead_id: leadId,
            mls_id: mlsId,
            website: kv.Config.get('siteUrl'),
            question: message.join(' ')
        }, function(response, code){
            // success!
            $prequalifyModal.kvModal('hide');
            kv.Message.success("Thank you!", "Your submission has been received.");
            $prequalifyForm.removeClass(loadingCenter);
        });
    }
}(jQuery, kvCORE));
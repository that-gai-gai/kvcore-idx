kvCORE.Question = (new function($, kv) {
	var $questionModal = $('#modal--ask-a-question');
	var $selectAgentModal = $('#modal--lead-manager');
	var $noListingFound = $('.kv-no-listing-found');
	var formWasSubmittedSuccessfully = false;
	var $dateTime = $('form.ask-a-question-form .modal-date-field');


	this.show = function(mlsid, address, type, mls) {
		formWasSubmittedSuccessfully = false;
		if (typeof mls === 'undefined') b = null;
		var defaultQuestion = '';
		var $form = $questionModal.find('form.ask-a-question-form');
		var $title = $questionModal.find('.kv-modal-title');
		

		if ('undefined' === typeof(address)) {
			address = '';
		}

		if ('undefined' === typeof(mlsid) || !mlsid) {
			mlsid = kv.Config.get('query', 'by-mlsid');
		}

		if ('undefined' === typeof(mls) || !mls) {
			mlsid = kv.Config.get('query', 'by-mlsid');
		}

		switch (true) {
			case !!(mlsid && address):
				defaultQuestion = 'MLS ID #' + mlsid + ', ADDRESS ' + address;
				break;

			case !!mlsid:
				defaultQuestion = 'MLS ID #' + mlsid;
				break;

			case !!address:
				defaultQuestion = 'ADDRESS: ' + address;
				break;

			default:
				break;
		}

		if (defaultQuestion) {
			if (type === 'visit') {
				defaultQuestion = "I'd like to go see " + defaultQuestion;
			} else if (type === 'tour') {
				defaultQuestion = "I'd like a tour of " + defaultQuestion;
			} else {
				defaultQuestion = 'I have a question about ' + defaultQuestion;
			}
		}

		if (!mlsid) {
			mlsid = 'NOT-PROVIDED';
		}

		if (type === 'visit') {
			$form.attr('action', 'public/leads/appointment');
			$title.html('Request A Showing');
			$('#kv-modal-intro-txt').html('');
			showDate(true);
		} else if (type === 'tour') {
			$form.attr('action', 'public/leads/appointment');
			$title.html('Request A Tour');
			$('#kv-modal-intro-txt').html('Either see it in-person, or work with your agent to see it via video.');
			showDate(true);
		} else {
			$form.attr('action', 'public/leads/question');
			$title.html('Ask A Question');
			$('#kv-modal-intro-txt').html('All questions are texted in real time to our agents to ensure the fastest response possible.');
			showDate(false);
		}

		$questionModal.find('#modal--question-mlsid').val(mlsid);
		$questionModal.find('#modal--question-mls').val(mls);
		$questionModal.find('#modal--question-lead_id').val(kv.User.getLeadId());
		$questionModal.find('#modal--question-question').val(defaultQuestion);

		var lead_data = kv.User.getLeadData();

		if (kv.isUsableObject(lead_data)) {
			if ('undefined' !== typeof(lead_data.email)) {
				$questionModal.find('[name="email"]').val(lead_data.email);
			}
			if ('undefined' !== typeof(lead_data.phone)) {
				$questionModal.find('[name="phone"]').val(lead_data.phone);
			}
		}

		$questionModal.kvModal('show');
	};

	this.showAgentPickerModal = function(res, userData, isSuccess, obj) {

		$questionModal.kvModal('hide');


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
				kv.User.setLeadId(contactId, function() {
					kv.Login.loginQueue.process();
					$(obj).find('input[name="lead_id"]').val(contactId);
					actualSubmission(obj);
				});
				$selectAgentModal.kvModal('hide');

			}
			//else force send create lead request
			else {

				userData.force_create = 1;
				delete userData.duplicate_check;

				kv.Remote.post('public/leads', userData, function(response, code) {
					if (isSuccess(response, code)) {
						kv.User.setLeadId(response.lead_id, function() {
							kv.Login.loginQueue.process();
							$(obj).find('input[name="lead_id"]').val(response.lead_id);
							actualSubmission(obj);
						});
					} else {
						actualSubmission(obj);
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
						kv.User.setLeadId(response.lead_id, function () {
							kv.Login.loginQueue.process();
							$(obj).find('input[name="lead_id"]').val(response.lead_id);
							actualSubmission(obj);
						});
					} else {
						actualSubmission(obj);
					}
				});
			}
		});
	};

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

	function showDate(value) {
		if (value) {
			$dateTime.find('#modal--question-date').show();
			$dateTime.find('#modal--question-time').show();
			$dateTime.show();
		} else {
			$dateTime.find('#modal--question-date').val('').hide();
			$dateTime.find('#modal--question-time').val('').hide();
			$dateTime.hide();
		}
	}

	function actualSubmission(obj) {
		if (formWasSubmittedSuccessfully === false) {
			formWasSubmittedSuccessfully = true;
			var question = $(obj).find('textarea[name="question"]').val();
			kv.Form.submit($(obj), function (data, code) {
				if (200 === code && data.status === 'SUCCESS') {
					$questionModal.kvModal('hide');
					kv.Message.success("Thank You", "We'll be in touch soon!");
					kvEXEC('Detail', 'markPropertyView', []);
				} else {
					kv.Message.error('Oops!', 'There was an error submitting your question.');
					kvEXEC('Detail', 'markPropertyView', []);
				}
			}, function (data) {
				data.question = question;
				if ('undefined' !== typeof (data.phone)) {
					if (data.phone) {
						data.question += ' PHONE # ' + data.phone;
					}

					delete data.phone;
				}

				if ('undefined' !== typeof (data.email)) {
					if (data.email) {
						data.question += ' EMAIL # ' + data.email;
					}

					delete data.email;
				}

				if (!kv.isEmpty(data.date)) {
					data.date = data.date.replace('T', ' ') + ' ' + data.time;
					data.question += ' DATE: ' + data.date;
				}

				return data;
			});
		}
	}

	function self() {
		return kvCORE.Question;
	}

	function bindQuestion() {
		$(document).on('submit', 'form.ask-a-question-form', function(e) {
			e.preventDefault();
			submitForm(this);
		});

		$noListingFound.find('#modal--question-lead_id').val(kv.User.getLeadId());
	}

	var isSuccess = function(response, code) {
		return [200, 201].indexOf(code) !== -1 && (typeof response.lead_id !== 'undefined' && response.lead_id || response.data);
	};

	bindQuestion();
}(jQuery, kvCORE));
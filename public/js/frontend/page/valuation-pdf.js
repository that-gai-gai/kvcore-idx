kvCORE.ValuationPdf = (new function($, kv) {
	var $valuationPdfContainer = $('#kvcoreidx-valuation-pdf');

	kv.User.maybeAuthenticateViaURLToken(function(){});

	var loadingClass = 'loading';
	var loadingCenter = loadingClass + '-center ' + loadingClass;

	var city = '';
	var fullAddress = '';
	var templateData = {address: null};

	function self() {
		return kvCORE.ValuationPdf;
	}

	this.setLoadingClass = function() {
		$valuationPdfContainer.addClass(loadingCenter);
	};

	this.removeLoadingClass = function() {
		$valuationPdfContainer.removeClass(loadingCenter);
	};

	function bindEmailTxtPdfButtons(url, address) {
		$valuationPdfContainer.off('click', '#kv-valuation-pdf-email')
		    .on('click', '#kv-valuation-pdf-email', function(e) {
				e.preventDefault();
				e.stopPropagation();
				var leadData = kv.User.getLeadData();
				kv.Remote.post('public/cma/email', 
				{
					url: url,
					address: address,
					email: leadData.email
				},
				function(response) {
					if (response.success === true) {
						kv.Message.success("Thank you!", "Your email has been sent.");
					} else {
						kv.Message.error('Error sending email', 'Please try again later');
					}
				});			
		});
		$valuationPdfContainer.off('click', '#kv-valuation-pdf-sms')
			.on('click', '#kv-valuation-pdf-sms', function(e) {
				var leadId = kv.User.getLeadId();
				var leadData = kv.User.getLeadData();
				e.preventDefault();
				e.stopPropagation();
				kv.Remote.post('public/cma/text', 
				{
					url: url,
					address: address,
					phone: leadData.phone,
					leadId: leadId,
					leadData: leadData
				}, 
				function(response) {
					if (response.success === true) {
						kv.Message.success("Thank you!", "Your text has been sent.");
					} else {
						kv.Message.error('Error sending text', 'Please try again later');
					}
				});
		});

	}

	this.getValuation = function(args) {
		this.setLoadingClass();

		city = args.city;
		fullAddress = args.fullAddress;
		delete args.fullAddress;

		kv.Message.info('Generating CMA Report');
		

		kv.Remote.post('public/valuation', args, function(response) {

			var data = $.extend(args, response, {fullAddress: fullAddress});

			if (kv.isEmpty(args.url)) {
				valuationFallback(args);
			} else {
				self().display(data);
			}
			//this is first pass where everything is not yet set will be updated again after login
			var argsSeller = {
				address: args.address,
				city: args.city,
				state: args.state,
				zip: args.zip,
				estimate: response.value ? response.value : 0,
				beds: response.beds ? response.beds : 0,
				baths: response.baths ? response.baths : 0,
				footage: response.sqft ? response.sqft :0 
			}

			if (kv.Cookie.get('lead_id')) {
				argsSeller['lead_id'] = kv.Cookie.get('lead_id');
			}

			kv.Remote.put('website/leads/seller', argsSeller, function(response) {
				if (response.success === true) {
					kv.Cookie.set('seller_lead_id', response.lead_id);
				}
				
			});
		});
	};

	function stopValuation(message) {
		if (typeof message === 'undefined') {
			message = 'Valuation is not possible for selected address';
			kv.Message.warning(message);
		} else {
			kv.Message.info(message);
		}

		self().removeLoadingClass();
		self().empty();
	}

	function valuationFallback(args) {
		args.isFallback = true;

		//the new way here
		var address = args.address;
		address = address.replace("Street", "St");
		address = address.replace("Lane", "Ln");
		address = address.replace("Court", "Ct");
		address = address.replace("Road", "Rd");
		address = address.replace("Boulevard", "Blvd");
		address = address.replace("Drive", "Dr");
		address = address.replace("Circle", "Cir");
		var body = '{"query": {"bool": {"must": [{"match": {"address.keyword": "'+address+'"}}]}}}';
		var query = '{listings(filter: { size: 1 from: $from body: $body }) {listings { agentphone agentemail } } }';
		var stringifyBody = body.replace(/"/g, '\\\"');
		stringifyBody = '"' + stringifyBody + '"';

		var finalQuery = query.replace('$from', 0).replace('$size', 1).replace('$body', stringifyBody);
		$.ajax({
			url: 'https://listing-api.kvcore.com/graphql',
			type: 'POST',
			dataType: 'json',
			contentType: 'application/json',
			data: JSON.stringify({ query: finalQuery }),
			beforeSend: function(jqXHR) {
				jqXHR.setRequestHeader('Authorization', kv.Config.get('listingApi'));
			},
			success: function(response) {
				if (!kv.isEmpty(response.data.listings.listings[0])) {
					if (!kv.isEmpty(response.data.listings.listings[0].agentphone)) {
						args.agentphone = response.data.listings.listings[0].agentphone;
					}
					if (!kv.isEmpty(response.data.listings.listings[0].agentemail)) {
						args.agentemail = response.data.listings.listings[0].agentemail;
					}
				}
	
				$.ajax({
					url: kv.Config.get('restNamespace') + 'zillow-valuation',
					type: 'GET',
					dataType: 'json',
					data: {
						address: args.address,
						citystatezip: [city, args.state, args.zip].join(', ')
					},
					success: function(response) {
						args.value = response;
						self().display(args);
					},
					error: function() {
						if (!kv.isEmpty(args.value)) {
							self().display(args);
						} else {
							stopValuation();
						}
					}
				});
			},
			error: function(jqXHR) {
				console.log("error getting agent", jqXHR);
			}
		});
	}

	this.display = function(data) {
		this.setLoadingClass();

		if (!kv.isEmpty(data) && templateData.address !== data.address) {
			data.propertiesPage = kv.Config.get('pages', 'properties');

			templateData = data;
		}
		if (!kv.isEmpty(data)) {
			bindEmailTxtPdfButtons(data.url, data.address);
		}
		kv.View.render('valuation-pdf', templateData, $valuationPdfContainer, this.removeLoadingClass);
	};

	this.empty = function() {
		$valuationPdfContainer.empty();
	};

	this.login = function() {
		//passing as seller in 2nd param
		kv.Login.showModal(false, true);
		kv.Login.loginQueue.add({obj: 'ValuationPdf', method: 'display'});
	};
}(jQuery, kvCORE));
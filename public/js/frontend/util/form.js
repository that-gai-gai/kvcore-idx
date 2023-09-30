kvCORE.Form = (new function($, kv) {
	this.submit = function(obj, callback, beforeSendDataFilter, failedDataFilter, validate) {
		obj.addClass('loading');
		obj.find('.form-control-message').remove();
		obj.find('.form-control').removeClass('form-control-danger');

		var formData = this.toArray(obj[0]);

		if ('function' === typeof(validate)) {
			if (!validate(formData)) {
				obj.removeClass('loading');
				return;
			}
		}

		if ('function' === typeof(beforeSendDataFilter)) {
			formData = beforeSendDataFilter(formData);
		}

		kv.Remote.request(
			obj.attr('method'),
			obj.attr('action'),
			formData,
			function(data, code) {
				if (code !== 200) {
					setFieldMessages(data, obj);
				}

				obj.removeClass('loading');

				if ('function' === typeof(callback)) {
					callback(data, code, formData);
				}
			},
			failedDataFilter
		);
	};

	this.toArray = function(form) {
		var result = {};

		if (typeof form !== 'object' || form.nodeName !== 'FORM') {
			return result;
		}
		//newer version of jquery will error out on this fallback
		try {
			form = $(form).clone().context.elements;
		}
		catch(err) {
			var list = [];
			$(form).find("input").each(function(){
				list.push($(this)[0]);
			});
			$(form).find("select").each(function(){
				list.push($(this)[0]);
			});
			$(form).find("textarea").each(function(){
				list.push($(this)[0]);
			});
			form = list;
		}
		

		// Replace hyphens (names with hyphens don't get serialized for some reason)
		Array.prototype.slice.call(form).forEach(function(control) {
			var isDataType = ['file', 'reset', 'submit', 'button'].indexOf(control.type) !== -1;

			if (control.name && control.name !== 'action' && !control.disabled && !isDataType) {
				var replaceHyphen = function() {
					control['name'] = control.name.replace(/-/g, '_hyphen_');
				};

				if (control.checked) {
					replaceHyphen();
				} else if (['checkbox', 'radio'].indexOf(control.type) === -1) {
					replaceHyphen();
				}
			}
		});

		// Now serialize
		result = $(form).serializeObject();

		// Bring hyphens back
		for (var key in result) {
			if (key === 'area') {
				result[key] = result[key].filter(function (value, index, self) {
					return self.indexOf(value) === index;
				});
			}
			if (!result.hasOwnProperty(key)) {
				continue;
			}

			var newKey = key.replace(/(_hyphen_)/g, '-');

			if (key !== newKey) {
				Object.defineProperty(result, newKey, Object.getOwnPropertyDescriptor(result, key));
				delete result[key];
			}
		}

		return result;
	};

	function setFieldMessages(data, formObject) {
		if (!kv.isUsableObject(data)) {
			return;
		}

		Object.keys(data).forEach(function(key) {
			var value = data[key];

			if (Array.isArray(value)) {
				value = value[0];
			}

			if (!value) {
				return;
			}

			var $targetField = formObject.find('[name="' + key + '"]');

			$targetField.addClass('form-control-danger')
				.after('<small class="form-control-message">' + value + '</small>')
		});
	}
}(jQuery, kvCORE));
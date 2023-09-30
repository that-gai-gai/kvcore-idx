kvCORE.Message = (new function($, kv) {
	this.info = function(title, message, target, duration) {
		renderMessage(title, message, target, duration, 'info', 'info-circle');
	};

	this.success = function(title, message, target, duration) {
		renderMessage(title, message, target, duration, 'success', 'check-circle');
	};

	this.warning = function(title, message, target, duration) {
		renderMessage(title, message, target, duration, 'warning', 'exclamation-circle');
	};

	this.error = function(title, message, target, duration) {
		renderMessage(title, message, target, duration, 'error', 'warning');
	};

	function renderMessage(title, message, target, duration, type, icon) {
		var messageArgs = {
			title: title ? title : type,
			message: message ? message : '',
			type: type ? type : 'info',
			icon: icon ? icon : 'info-circle'
		};

		duration = duration ? duration : 2500;

		kv.View.load('message', messageArgs, function(html) {
			var messageEl = $(html);

			if ('undefined' === typeof(target)) {
				target = $('.kvcore:first');
			}

			if (!target.hasClass('message-container')) {
				var $body = $('body');
				var $bodyTarget = $body.find('> .message-container');
				if ($bodyTarget.length !== 0) {
					target = $bodyTarget;
				} else {
					target = $('<div class="message-container"></div>');
					$body.append(target);
				}
			}

			target.prepend(messageEl);
			messageEl.find('.message-close').click(removeMessage);
			messageEl.fadeIn(100).css('display', 'flex').delay(duration).queue(removeMessage);
		});
	}

	function removeMessage(e) {
		var message = $(this);

		if (typeof e.target !== 'undefined') {
			var closeButton = $(e.target);
			if (!closeButton.hasClass('message-close')) {
				return;
			}
			message = closeButton.parent();
		}

		if (!message.hasClass('message')) {
			return;
		}

		message.animate(
			{height: 0, opacity: 0, margin: 0},
			{duration: 200, queue: false, complete: function() { message.remove() }}
		);
	}
} (jQuery, kvCORE));
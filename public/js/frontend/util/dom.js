kvCORE.DOM = (new function($) {
	this.scrollToElement = function(element, callback, scrollDirectTo) {
		if ('undefined' === typeof(element)) {
			return;
		}

		var $parent = $('html, body');
		var $element = $(element);
		if (scrollDirectTo) {
			var scrollToPosition = $element.offset().top;
		} else {
			var scrollToPosition = $element.offset().top - 140;
		}
		
		var scrollDuration = Math.abs(scrollToPosition - $parent.scrollTop()) / 4;

		if (scrollDuration > 0 && scrollDuration < 125) {
			scrollDuration = 125;
		}

		$parent.animate({
			scrollTop: scrollToPosition
		}, scrollDuration, callback);
	};

	this.addBodyClass = function(className, notClassName, conditionCheck) {
		if ('undefined' === typeof(className)) {
			return;
		}

		var classToAdd = className;

		if ('undefined' !== conditionCheck) {
			if ('function' === typeof(conditionCheck)) {
				conditionCheck = conditionCheck();
			}
		} else {
			conditionCheck = true;
		}

		if (!conditionCheck && 'undefined' !== typeof(notClassName)) {
			classToAdd = notClassName;
		}

		if ('undefined' !== typeof(document.body.classList)) {
			document.body.classList.add(classToAdd);
		} else {
			document.body.className += ' ' + classToAdd;
		}
	};

	this.removeBodyClass = function(className) {
		if ('undefined' !== typeof(document.body.classList)) {
			document.body.classList.remove(className);
		} else {
			document.body.className = document.body.className.replace(className, '');
		}
	};
} (jQuery));
kvCORE.Date = (new function() {
	this.createDateAsUTC = function(date) {
		return new Date(Date.UTC(
			date.getFullYear(), date.getMonth(), date.getDate(),
			date.getHours(), date.getMinutes(), date.getSeconds()
		));
	};

	this.getNextWednesday = function() {
		var ret = new Date();
		ret.setDate(ret.getDate() + (3 - 1 - ret.getDay() + 7) % 7 + 1);
	    ret.setHours(2, 0, 0);
		function pad(n) {return n<10 ? '0'+n : n}
		return ret.getUTCFullYear()+'-'
			 + pad(ret.getUTCMonth()+1)+'-'
			 + pad(ret.getUTCDate())+'T'
			 + pad(ret.getUTCHours())+':'
			 + pad(ret.getUTCMinutes())+':'
			 + pad(ret.getUTCSeconds())+'Z'
	};

	this.toRelativeTime = function(date) {
		var delta = Math.round((+new Date - date) / 1000);

		var minute = 60;
		var hour = minute * 60;
		var day = hour * 24;
		var relative = null;

		if (delta < minute) {
			relative = 'Less than one minute ago';
		} else if (delta < 2 * minute) {
			relative = 'A minute ago';
		} else if (delta < hour) {
			relative = Math.floor(delta / minute) + ' minutes ago';
		} else if (Math.floor(delta / hour) === 1) {
			relative = '1 hour ago';
		} else if (delta < day) {
			relative = Math.floor(delta / hour) + ' hours ago';
		} else if (delta < day * 2) {
			relative = 'Yesterday';
		}

		return relative ? relative : date.toLocaleString();
	};
} ());
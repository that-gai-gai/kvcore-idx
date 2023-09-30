(function ($, kv, config, $body) {
	$('.kvadmin-default-template-link').on('click', function (e) {
		e.preventDefault();

		var $this = $(this);
		var templateUrl = $this.attr('href');
		var viewName = $this.attr('id').replace('link-to-', '');
		var modalId = viewName + '-modal';
		var $modal = $('#' + modalId);

		if ($modal.length) {
			$modal.kvModal('show');
		} else {
			$.ajax({
				url: templateUrl,
				complete: function (response) {
					if ('string' === typeof(response.responseText)) {
						var $modalContainer = $('#kvadmin-modal-container');

						if (!$modalContainer.length) {
							$body.append("<div id='kvadmin-modal-container'></div>");
							$modalContainer = $('#kvadmin-modal-container');
						}

						var modalTitle = templateUrl.substring(templateUrl.lastIndexOf('/') + 1);

						kvCORE.View.render('admin-modal', {
							title: "Viewing Template: `" + modalTitle + "`",
							content: '<p>This HTML template is read-only. To use it, you must copy & paste it into the Template Editor.</p><textarea rows="20" class="kv-w-100" onclick="this.focus();this.select()" readonly="readonly"></textarea>',
							id: modalId,
							class_name: 'kvadmin-modal'
						}, $modalContainer, function (viewName, data, target, output) {
							var $modal = $('#' + data.id);
							$modal.find('.kv-modal-body textarea').text(response.responseText);
							$modal.kvModal('show');
						});
					} else {
						kv.Url.redirect(templateUrl);
					}
				}
			});
		}
	});
}(jQuery, kvCORE, 'undefined' !== typeof(kvcoreidxAdminConfig) ? kvcoreidxAdminConfig : {}, jQuery('body')));

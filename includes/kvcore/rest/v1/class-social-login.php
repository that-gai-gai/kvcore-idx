<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Api;
use kvCORE\Rest\v1;
use kvCORE\Settings;

class Social_Login extends v1 {
	protected static $instance = null;
	protected $methods = [ 'GET', 'POST', 'PUT', 'OPTION' ];


	public function callback( \WP_REST_Request $request ) {
		$params = $request->get_params();
		echo '<script type="text/javascript">';
		//had to add timeout
		echo 'setTimeout(function(){ parent.window.opener.kvCORE.Login.userLoginFacebookGoogle('.json_encode($params).'); self.close(); }, 2000);';
		echo '</script>';
		wp_die();
		exit;
	}
}
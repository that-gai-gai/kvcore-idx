<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Rest\v1;
use kvCORE\Settings;
use WP_REST_Request;

class kvCORE_API_Proxy extends v1 {
	protected static $instance = null;
	protected $methods = [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTION' ];
	protected $endpoint = '/api/(?P<api_call>.+)';

	public function callback( WP_REST_Request $request ) {
		$options   = Settings::get_settings();
		$method    = $request->get_method();
		$post_data = $_REQUEST;

		$api_call = ( $request->get_param( 'api_call' ) );
		$curl_url = "{$options['api_url']}{$api_call}";
		$auth_key = Settings::get_api_key();

		$ch = curl_init();

		if ( 'GET' === $method ) {
			if ( count( $post_data ) ) {
				$curl_url .= '?' . http_build_query( $post_data );
			}

			$post_data = [];
		}

		curl_setopt( $ch, CURLOPT_URL, $curl_url );
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
		curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, $method );

		if ( count( $post_data ) ) {
			curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query( $post_data ) );
		}

		curl_setopt( $ch, CURLOPT_HTTPHEADER, [
			"Authorization: {$auth_key}",
		] );

		$output = curl_exec( $ch );
		curl_close( $ch );

		echo $output;
		exit;
	}
}

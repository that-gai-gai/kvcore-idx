<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use Exception;
use kvCORE\Rest\v1;
use WP_REST_Request;
use WP_REST_Response;

class Zillow_Valuation extends v1 {
	protected static $instance = null;
	protected $methods = [ 'GET' ];

	/**
	 * @param WP_REST_Request $request
	 * @return WP_REST_Response
	 * @throws Exception
	 */
	public function callback( WP_REST_Request $request ) {
		$params = $request->get_params();

		$query = http_build_query( [
			'zws-id' => 'X1-ZWz1d128yhn8qz_3if65',
			'address' => $params['address'],
			'citystatezip' => $params['citystatezip'],
		] );

		$url = "https://www.zillow.com/webservice/GetDeepSearchResults.htm?{$query}";
		$response = json_decode( json_encode(
			(array) simplexml_load_string( wp_remote_retrieve_body( wp_remote_get( $url ) ) )
		), true );

		if ( !isset( $response['message'] ) || $response['message']['code'] !== '0' ) {
			return new WP_REST_Response( $response['message'], 404 );
		}

		$range = $response['response']['results']['result']['zestimate']['valuationRange'];

		if ( empty( $range ) ) {
			return new WP_REST_Response( 'Estimate is empty', 404 );
		}

		return new WP_REST_Response( $range );
	}
}

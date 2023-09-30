<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Rest\v1;
use kvCORE\Settings;
use WP_REST_Request;
use Exception;

class Get_Lat_Lng_From_Address extends v1 {
	protected static $instance = null;
	protected $methods = [ 'POST', 'OPTION' ];

	/**
	 * @param WP_REST_Request $request
	 * @throws Exception
	 */
	public function callback( WP_REST_Request $request ) {
		$mapbox_key = Settings::get_setting( 'mapbox_access_token' );

		if ( !$mapbox_key ) {
			throw new Exception( 'Mapbox token not set', 401 );
		}

		$result = [];

		$namespace = $request->get_param('namespace') ?? 'default';
		$addresses = $request->get_param('addresses') ?? [];
		$per_page = $request->get_param('perPage') ?? 24;
		$page = $request->get_param('page') ?? 1;
		$hash = $request->get_param('hash') ?? null;
		$do_not_cache = $request->get_param('doNotCache') ?? false;

		if ( !is_array( $addresses ) || ( !isset( $addresses[0] ) && count( $addresses ) ) ) {
			$addresses = [ $addresses ];
		}

		$transient_name = $hash
			? "kvcoreidx/{$namespace}-address-cache/{$hash}"
			: "kvcoreidx/{$namespace}-address-cache/{$per_page}/{$page}";
		$cached = false;

		if ( $cached_result = get_transient( $transient_name && !$do_not_cache ) ) {
			$cached = true;

			$result = $cached_result;
		} else {
			foreach ( $addresses as $i => $address ) {
				$result[] = array_merge( $addresses[ $i ], $this->get_lat_lng_from_address( $address ) );
			}
			set_transient( $transient_name, $result, 24 * HOUR_IN_SECONDS );
		}

		echo json_encode( [ 'data' => $result, 'cached_response' => $cached ] );
		exit;
	}

	protected function get_lat_lng_from_address( $address ) {
		$options = Settings::get_settings();

		$result = [];

		$parts = [];

		if ( $part = ( $address['address'] ?? '' ) ) {
			$parts[] = urlencode( $part );
		};
		if ( $part = ( $address['county'] ?? '' ) ) {
			$parts[] = urlencode( $part );
		};
		if ( $part = ( $address['city'] ?? '' ) ) {
			$parts[] = urlencode( $part );
		};
		if ( $part = ( $address['state'] ?? '' ) ) {
			$parts[] = urlencode( $part );
		};
		if ( $part = ( $address['zip'] ?? '' ) ) {
			$parts[] = urlencode( $part );
		};

		if ( count( $parts ) ) {
			$request_address = implode( ',', $parts );

			if ( $request_address && isset( $options['mapbox_access_token'] ) ) {
				require_once( KVCORE_IDX_PLUGIN_PATH . 'includes/lib/mapbox/Mapbox.php' );

				$token = $options['mapbox_access_token'];
				$mapbox = new \Mapbox( $token );

				//geocode
				$address = $request_address;
				$res = $mapbox->geocode( $address );
				//view results for debugging
				$response = $res->getData();

				if ( is_array( $response ) && isset( $response[0] ) ) {
					$response = $response[0]['center'];

					$result = [
						'lat' => $response[1],
						'lng' => $response[0],
					];
				}
			}
		}

		return $result;
	}
}

<?php

declare( strict_types=1 );

namespace kvCORE;

use WP_REST_Request;
use WP_Error;

class Rest extends Instantiator {
	protected static $instance = null;
	protected $methods = [ 'GET' ];
	protected $endpoint = null;
	protected $isAdmin = false;
	protected $error_code = 'kvcoreidx_api_error';

	public function __construct() {
		$called_class = get_called_class();
		$version_and_endpoint = explode( "\\", str_replace( "kvCORE\\Rest\\", '', $called_class ) );

		if ( count( $version_and_endpoint ) >= 2 ) {
			array_walk( $version_and_endpoint, function ( &$item1 ) {
				$item1 = preg_replace( '/[^a-z0-9]+/', '-', sanitize_title( $item1 ) );
			} );

			$version = array_shift( $version_and_endpoint );

			$namespace = "kvcoreidx/{$version}";

			if ( $this->endpoint ) {
				$endpoint = $this->endpoint;
			} else {
				$endpoint = '/' . implode( '/', $version_and_endpoint );
			}

			$self = $this;
			$error_code = $this->error_code;

			$args = [
				'methods' => $this->methods,
				'callback' => function ( WP_REST_Request $request ) use ( $self, $error_code ) {
					try {
						return $self->callback( $request );
					} catch ( \Exception $e ) {
						$http_status = $e->getCode();

						if ( !is_numeric( $http_status ) ) {
							$http_status = 500;
						}

						return new WP_Error( $error_code, __( $e->getMessage() ), [
							'status' => $http_status
						] );
					}
				}
			];

			if ($this->isAdmin) {
				$endpoint = Admin::REST_NAMESPACE . trim($endpoint, '/');
				$args['permission_callback'] = function() {
					return current_user_can('manage_options');
				};
			}

			register_rest_route( $namespace, $endpoint, $args );
		}
	}
}

<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Rest\v1;
use kvCORE\Admin\Page\Settings\Hotsheets;
use WP_REST_Request;
use WP_REST_Response;

class Add_Hotsheet extends v1 {
	protected static $instance = null;
	protected $methods = [ 'POST' ];
	protected $isAdmin = true;

	public function callback( WP_REST_Request $request ) {
		$name = $request->get_param( 'name' );
		$filters = $request->get_param( 'filters' );

		if ( empty( $name ) ) {
			return new WP_REST_Response( 'Hotsheet name is empty', 400 );
		}

		if ( empty( $filters ) ) {
			return new WP_REST_Response( 'Hotsheet filters not present', 400 );
		}

		if ( !empty( Hotsheets::get_by_name( $name ) ) ) {
			return new WP_REST_Response( 'Hotsheet already exists', 409 );
		}

		if ( !Hotsheets::add( $name, $filters ) ) {
			return new WP_REST_Response( 'Hotsheet not saved for unknown reason', 500 );
		}

		return new WP_REST_Response( 'Hotsheet saved' );
	}
}

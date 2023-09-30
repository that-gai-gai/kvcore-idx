<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Rest\v1;
use kvCORE\Admin\Page\Settings\Hotsheets;
use WP_REST_Request;
use WP_REST_Response;

class Save_Hotsheets extends v1 {
	protected static $instance = null;
	protected $methods = [ 'POST' ];
	protected $isAdmin = true;

	public function callback( WP_REST_Request $request ) {
		$hotsheet_filters = $request->get_param( 'kv-admin-hotsheets' ) ?? [];

		if ( !Hotsheets::save( $hotsheet_filters ) ) {
			return new WP_REST_Response( 'Hotsheets not saved for unknown reason', 500 );
		}

		return new WP_REST_Response( 'Hotsheets were saved' );
	}
}

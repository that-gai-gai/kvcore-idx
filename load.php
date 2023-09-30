<?php

if ( ! defined( 'KVCORE_IDX_PLUGIN_PATH' ) ) {
	define( 'KVCORE_IDX_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
}

if ( ! defined( 'KVCORE_IDX_PUBLIC_URL' ) ) {
	define( 'KVCORE_IDX_PUBLIC_URL', plugin_dir_url( __FILE__ ) . 'public/' );
}

if ( ! defined( 'KVCORE_IDX_ADMIN_URL' ) ) {
	define( 'KVCORE_IDX_ADMIN_URL', plugin_dir_url( __FILE__ ) . 'admin/' );
}

if ( ! defined( 'KVCORE_IDX_PUBLIC_PATH' ) ) {
	define( 'KVCORE_IDX_PUBLIC_PATH', KVCORE_IDX_PLUGIN_PATH . 'public/' );
}

if ( ! defined( 'KVCORE_IDX_PARTIAL_PATH_NAME' ) ) {
	define('KVCORE_IDX_PARTIAL_PATH_NAME', 'partials' );
}
if ( ! defined( 'KVCORE_IDX_PARTIALS_PATH' ) ) {
	define( 'KVCORE_IDX_PARTIALS_PATH', KVCORE_IDX_PUBLIC_PATH . KVCORE_IDX_PARTIAL_PATH_NAME . '/' );
}

if ( ! defined( 'KVCORE_IDX_ADMIN_PARTIALS_PATH' ) ) {
	define( 'KVCORE_IDX_ADMIN_PARTIALS_PATH', KVCORE_IDX_PLUGIN_PATH . 'admin/' .  KVCORE_IDX_PARTIAL_PATH_NAME . '/' );
}

if ( ! defined( 'KVCORE_IDX_LEAD_ID_COOKIE_NAME' ) ) {
	define( 'KVCORE_IDX_LEAD_ID_COOKIE_NAME', 'kvcoreidx_lead_id' );
}

if ( ! defined( 'KVCORE_IDX_LEAD_DATA_COOKIE_NAME' ) ) {
	define( 'KVCORE_IDX_LEAD_DATA_COOKIE_NAME', 'kvcoreidx_lead_data' );
}

require_once __DIR__ . '/includes/autoload.php';
require_once __DIR__ . '/includes/functions.php';

register_activation_hook( __FILE__, [ 'kvCORE\Activation', 'activate' ] );
register_deactivation_hook( __FILE__, [ 'kvCORE\Activation', 'deactivate' ] );

try {
	kvCORE::init();
} catch ( Exception $e ) {
	add_action( 'init', function () use ( $e ) {
		if( current_user_can( 'edit_pages' ) && ! is_admin() ) {
			wp_die( sprintf( 'Error initializing kvCORE IDX: `%s`', $e->getMessage() ) );
		};
	} );
}

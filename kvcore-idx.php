<?php

/**
 * The plugin bootstrap file
 *
 * This file is read by WordPress to generate the plugin information in the plugin
 * admin area. This file also includes all of the dependencies used by the plugin,
 * registers the activation and deactivation functions, and defines a function
 * that starts the plugin.
 *
 * @link              https://insiderealestate.com/kvcore/
 * @since             1.0.0
 * @package           kvcore-idx
 *
 * @wordpress-plugin
 * Plugin Name:       kvCORE IDX
 * Plugin URI:        kvcore-idx
 * Description:       Integrates seamlessly with kvCORE to bring the power of IDX search, high conversion lead capture, and much more to your WordPress site.
 * Version:           2.3.23
 * Author:            Inside Real Estate
 * Author URI:        https://insiderealestate.com/kvcore/
 * License:           GPL-2.0+
 * License URI:       http://www.gnu.org/licenses/gpl-2.0.txt
 * Requires PHP:      7.0
 * Text Domain:       kvcore-idx
 * Domain Path:       /languages
 */

// If this file is called directly, abort.
if ( ! defined( 'WPINC' ) ) {
	die;
}

if( ! defined( 'KVCORE_IDX_PLUGIN_VERSION' ) ) {
	define( 'KVCORE_IDX_PLUGIN_VERSION', '2.3.23' );
}

if( ! defined( 'KVCORE_IDX_PLUGIN_NAME' ) ) {
	define( 'KVCORE_IDX_PLUGIN_NAME', 'kvcore-idx' );
}

if (! defined('KVCORE_IDX_ENABLE_AREA_PAGES' ) ) {
    define('KVCORE_IDX_ENABLE_AREA_PAGES', false);
}

if ( defined( 'PHP_MAJOR_VERSION' ) && PHP_MAJOR_VERSION >= 7 ){
	require_once( __DIR__ . '/load.php' );
} else {
	add_action( 'admin_init', function () {
		deactivate_plugins( plugin_basename( __FILE__ ) );
	} );

	add_action( 'admin_notices', function () {
		$class_name = 'notice notice-error';
		$message    = sprintf( __( "Sorry, kvCORE IDX requires <strong>PHP 7.0 or higher</strong>. You are currently running <strong>PHP %d.%d.%d</strong>", 'kvcore-idx' ), PHP_MAJOR_VERSION, PHP_MINOR_VERSION, PHP_RELEASE_VERSION );
		printf( '<div class="%1$s"><p>%2$s</p></div>', $class_name, $message );
	} );
}

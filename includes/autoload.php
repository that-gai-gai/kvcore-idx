<?php

require_once( __DIR__ . '/lib/admin-page-framework/admin-page-framework.php' );

spl_autoload_register( function ( $class_name ) {
	$prefix = "kvCORE";
	$prefix_len = strlen($prefix);

	if (strncmp($prefix, $class_name, $prefix_len) !== 0) {
		// not a kvCORE prefixed class, so return early
		return;
	}

	$autoload_directory = dirname( __FILE__ );
	$ds                 = DIRECTORY_SEPARATOR;

	$class_file = preg_replace( "/[^a-z0-9\\_]+/", $ds, strtolower( $class_name ) );
	$class_file = preg_replace( "/[\\_]/", "-", $class_file );

	$class_path_info = pathinfo( $class_file );

	$directory_parts = [
		$autoload_directory,
	];

	if ( isset( $class_path_info['dirname'] ) && $class_path_info['dirname'] && '.' !== $class_path_info['dirname'] ) {
		$directory_parts[] = $class_path_info['dirname'];
	}

	foreach (['class', 'interface', 'trait'] as $filename_option) {
		$directory_parts['name'] = "{$filename_option}-{$class_path_info['basename']}.php";

		$filename = implode( $ds, $directory_parts );

		if ( file_exists( $filename ) ) {
			require_once $filename;

			return;
		}
	}

	return;
}, true, true );

/**
 * load Composer autoloader
 */
if ( __DIR__ . '/vendor/autoload.php' ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

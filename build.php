<?php
/**
 * temporary file used to test and compile frontend templates
 */

include __DIR__ . '/includes/autoload.php';

if ( !defined( 'KVCORE_IDX_PUBLIC_PATH' ) ) {
	define( 'KVCORE_IDX_PUBLIC_PATH', __DIR__ . '/public/' );
}

if ( !defined( 'KVCORE_IDX_PARTIAL_PATH_NAME' ) ) {
	define( 'KVCORE_IDX_PARTIAL_PATH_NAME', 'partials' );
}

$compiler = new \kvCORE\View\Compiler();

$locations = [ 'public', 'admin' ];

foreach ( $locations as $location) {
    $views = glob( "$location/js/views/*.js" );
    foreach ( $views as $view ) {
        if ( is_file( $view ) ) {
            unlink( $view );
        }
    }

    $source_directory = __DIR__ . "/$location/partials";
    $destination = __DIR__ . "/$location/js/views/%s";

    $templates = glob( $source_directory . '/[a-z0-9]*.twig' );

    foreach ( $templates as $i => $template ) {
        $filename_info = ( pathinfo( $template ) );

        $destination_file = sprintf(
            $destination,
            "{$filename_info['filename']}.js"
        );

        $template_data = file_get_contents( $template );

        file_put_contents( $destination_file, $compiler->get_compiled_view( $filename_info['filename'], $template_data ) );
    }
}

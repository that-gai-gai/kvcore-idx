<?php

declare( strict_types=1 );

namespace kvCORE\Settings;

use kvCORE\Admin;
use kvCORE\Cache;
use kvCORE\Settings;
use kvCORE\View\Compiler;

class Custom_Templates extends Settings {
	public static function get_custom_template_uri_array() : array {
		$result = [];

		$all_templates = static::get_settings();

		foreach( $all_templates as $option_name => $content ) {
			$view_name = preg_replace( "/_/", "-", str_replace( "_content", "", $option_name ) );

			if ( $view_name && $content ) {
				$uri = Cache\Filesystem::get_cache_file_uri(KVCORE_IDX_PARTIAL_PATH_NAME . "/{$view_name}.js");

				if ( $uri ) {
					$result[ $view_name ] = $uri;
				}
			}
		}

		return apply_filters( 'kvcoreidx/js/custom_templates/uri_array', $result );
	}

	public static function delete_cached_custom_templates() {
		Cache\Filesystem::delete_all_from_cache(KVCORE_IDX_PARTIAL_PATH_NAME . "/*.twig");
		Cache\Filesystem::delete_all_from_cache(KVCORE_IDX_PARTIAL_PATH_NAME . "/*.js");

		$settings_class = static::get_settings_class_name();
		static::save_templates_to_cache_partials_directory();

		$settings_class::delete_transient( 'custom_templates' );
	}

	public static function save_templates_to_cache_partials_directory() {
		$all_templates = static::get_settings();

		foreach ( $all_templates as $option_name => $content ) {
			if ( $content ) {
				$view_name = preg_replace( "/_/", "-", str_replace( "_content", "", $option_name ) );

				Cache\Filesystem::save_to_cache( KVCORE_IDX_PARTIAL_PATH_NAME . "/{$view_name}.twig", $content );
			}
		}
	}

	public static function output_custom_templates_js() {
		if ( Admin::allow_custom_templates() && apply_filters( 'kvcoreidx/js/output_custom_templates', true ) ) {
			$self = new static();
			$self->maybe_update_custom_templates_js_file();
		}
	}

	protected function maybe_update_custom_templates_js_file() {
		$file_was_saved = false;

		$cache_enabled = apply_filters( 'kvcoreidx/js/custom_templates/cache_enabled', true );

		if ( true === $cache_enabled ) {
			try {
				$file_was_saved = !! $this->get_compiled_custom_templates_js();
			} catch ( \Exception $e ) {
				$file_was_saved = false;
			}
		}

		return $file_was_saved;
	}

	protected function get_compiled_custom_templates_js() {
		$compiler = new Compiler();

		$all_templates = apply_filters( 'kvcoreidx/js/custom_templates', static::get_settings() );

		foreach ( $all_templates as $option_name => $content ) {
			if ( $content ) {
				$view_name = preg_replace( "/_/", "-", str_replace( "_content", "", $option_name ) );

				$cached_js_name = (string) apply_filters(
					'kvcoreidx/js/custom_templates/cache_js_name',
					KVCORE_IDX_PARTIAL_PATH_NAME . "/{$view_name}.js"
				);

				Cache\Filesystem::save_to_cache(
					$cached_js_name,
					$compiler->get_compiled_view( $view_name, $content, [] )
				);
			}
		}

		return true;
	}
}

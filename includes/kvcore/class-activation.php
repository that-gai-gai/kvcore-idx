<?php

declare( strict_types=1 );

namespace kvCORE;

class Activation {
	public static function activate() {
		static::run( 'activate', [ KVCORE_IDX_PLUGIN_VERSION ] );
	}

	public static function deactivate() {
		static::run( 'deactivate', [ KVCORE_IDX_PLUGIN_VERSION ] );
	}

	public static function maybe_update() {
		$current_version = Settings::get_plugin_version();

		if ( KVCORE_IDX_PLUGIN_VERSION !== $current_version ) {
			static::update( KVCORE_IDX_PLUGIN_VERSION, $current_version );
		}
	}

	protected static function update( $new_version, $old_version = null ) {
		Settings::update_plugin_version( $new_version );
		Settings::delete_cached_brand_css();

		static::run( 'update', [
			$new_version,
			$old_version,
		] );
	}

	protected static function run( string $action = '', array $args = [] ) {
		if ( $action ) {
			array_unshift( $args, "kvcoreidx/{$action}" );
			call_user_func_array( 'do_action', $args );
		}

		flush_rewrite_rules();
	}
}

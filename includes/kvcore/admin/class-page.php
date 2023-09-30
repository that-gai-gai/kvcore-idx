<?php

declare( strict_types=1 );

namespace kvCORE\Admin;

use kvCORE_AdminPageFramework;

class Page extends kvCORE_AdminPageFramework {
	const PATH_SEPARATOR = '/';

	protected static function get_option_key() {
		return preg_replace( "/[^a-z0-9_]+/i", "_", get_called_class() );
	}

	protected static function get_transient_filter_name( $name, $action = 'enable' ) {
		$transient_filter = preg_replace(
			"/^kvcore\//", "",
			preg_replace( "/[^a-z0-9_]+/", "/",
				strtolower(get_called_class()
				)
			)
		);

		return "kvcoreidx/transient/{$transient_filter}/{$name}/{$action}";
	}

	public static function get_settings() {
		return get_option( static::get_option_key(), [] );
	}

	public static function get_setting( $name ) {
		$data = static::get_settings();

		if (strpos( $name, static::PATH_SEPARATOR ) !== false) {
			return static::get_setting_deep( $name, $data );
		} else {
			return isset( $data[ $name ] ) && $data[ $name ] ? $data[ $name ] : null;
		}
	}

	protected static function get_setting_deep( $name, array $data = [] ) {
		$nameArray = explode( static::PATH_SEPARATOR, $name );

		$newArray = null;

		$first = reset( $nameArray );

		if (isset( $data[ $first ]) ) {
			$newArray = $data[ $first ];

			$next = next( $nameArray );

			if ( is_array( $newArray ) && $next !== false ) {
				array_shift( $nameArray );
				$newName = implode( static::PATH_SEPARATOR, $nameArray );
				$value = static::get_setting_deep( $newName, $newArray );
			} else {
				$value = $newArray;
			}

			return $value;
		}

		return null;
	}

	public static function update_settings( $values ) {
		return update_option( static::get_option_key(), array_merge( static::get_settings(), $values ) );
	}

	public static function update_setting( $name, $value ): bool {
		$settings = static::get_settings();

		$settings[ $name ] = $value;

		return static::update_settings( $settings );
	}

	public function __construct( $isOptionKey = null, $sCallerPath = null, string $sCapability = 'manage_options', string $sTextDomain = 'admin-page-framework' ) {
		if ( is_null( $isOptionKey ) ) {
			$isOptionKey = static::get_option_key();
		}

		add_action( "update_option_{$isOptionKey}", [ $this, 'on_save_settings' ], 20, 2 );

		parent::__construct( $isOptionKey, $sCallerPath, $sCapability, $sTextDomain );
	}

	public function on_save_settings( $old_value, $new_value ) {
	}

	public static function get_transient( $name ) {
		$transient_name   = static::get_option_key() . "_{$name}";

		if ( apply_filters( 'kvcoreidx/transient/enable_all', true ) && apply_filters( static::get_transient_filter_name( $name ), true ) ) {
			return apply_filters( static::get_transient_filter_name( $name, 'value/get' ), get_transient( $transient_name ) );
		}

		return null;
	}

	public static function set_transient( $name, $value, $expires = WEEK_IN_SECONDS ) {
		$transient_name = static::get_option_key() . "_{$name}";

		if ( apply_filters( 'kvcoreidx/transient/enable_all', true ) && apply_filters( static::get_transient_filter_name( $name ), true ) ) {
			$value = apply_filters( static::get_transient_filter_name( $name, 'value/set' ), $value );

			return set_transient( $transient_name, $value, $expires );
		}

		return false;
	}

	public static function delete_transient( $name ) {
		$transient_name = static::get_option_key() . "_{$name}";

		// added commented-out filter check for readability
		// we do NOT want to do this. always delete transient
		// even if the transient is not used (prevents garbage)
		//
//		if ( apply_filters( 'kvcoreidx/transient/enable_all', true ) && apply_filters( static::get_transient_filter_name( $name ), true ) ) {
//			return delete_transient( $transient_name );
//		}

		return delete_transient( $transient_name );
	}
}
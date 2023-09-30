<?php

declare( strict_types=1 );

namespace kvCORE;

use kvCORE\Admin\Page\Settings\Hotsheets;
use ScssPhp\ScssPhp\Compiler;

class Settings {
	protected static $api_urls = [
		'live'    => 'https://api.kvcore.com',
		'staging' => 'https://api.beta.kvcore.com',
		'wp-json' => '/wp-json/kvcoreidx/v1/api'
	];
	protected static $admin_settings_class = "kvCORE\\Admin\\Page\\";
	protected static $plugin_version_option_name = "kvcore_idx_version";

	protected static function get_settings_class_name() {
		$called_class          = str_replace( "kvCORE\\", '', get_called_class() );
		$target_settings_class = static::$admin_settings_class . $called_class;

		return $target_settings_class;
	}

	public static function get_settings() {
		$settings_class = static::get_settings_class_name();

		return $settings_class::get_settings();
	}

	public static function get_setting( $name ) {
		$settings_class = static::get_settings_class_name();

		return $settings_class::get_setting( $name );
	}

	public static function get_plugin_version() {
		return get_option( static::$plugin_version_option_name );
	}

	public static function update_plugin_version( $version ) {
		$result = update_option( static::$plugin_version_option_name, $version );

		if ( function_exists( 'wp_cache_delete' ) ) {
			wp_cache_delete( static::$plugin_version_option_name, 'options' );
		}

		return $result;
	}

	public static function get_api_key(): string {
		return static::get_setting( 'authorization_token' ) ?? '';
	}

	public static function get_api_url(): string {
		$api_setting_prefix = '';

		if ( apply_filters( 'kvcoreidx/user/is_admin', false ) ) {
			$api_setting_prefix = 'logged_in_admin_';
		}

		$selected_api_version = static::get_setting( "{$api_setting_prefix}api_version" );

		if( $selected_api_version === 'custom' ) {
			$result = static::get_setting( "{$api_setting_prefix}api_url" ) ?? static::$api_urls['live'];
		} else {
			$result = static::$api_urls[$selected_api_version] ?? static::$api_urls['live'];
		}

		return $result;
	}

	public static function get_plugin_page_urls( $full = true ) {
		$settings_class = static::get_settings_class_name();
		$settings = static::get_settings();
		$plugin_pages = $settings_class::get_plugin_pages();

		$result = [];

		foreach ( $plugin_pages as $i => $page ) {
			$permalink = null;

			if (isset($settings["{$page['id']}_page"])) {
				$page_id = $settings["{$page['id']}_page"];
			}

			if ( $page_id ) {
				$permalink = get_permalink( $page_id );

				if ( !$full ) {
					$parsed_url = parse_url( get_permalink( $page_id ) );

					if ( $parsed_url['path'] ?? null ) {
						$permalink = $parsed_url['path'];
					}
					if ( $parsed_url['query'] ?? null ) {
						$permalink .= '?' . $parsed_url['query'];
					}
					if ( $parsed_url['fragment'] ?? null ) {
						$permalink .= '#' . $parsed_url['fragment'];
					}
				}
			}

			$result[$page['id']] = $permalink;
		}

		return $result;
	}

	public static function get_hotsheets() {
		return Hotsheets::get_setting('hotsheets') ?? [];

	}

	public static function get_hotsheets_list() {
		$result = [];

		$hotsheets = static::get_hotsheets();

		foreach ( $hotsheets as $i => $hotsheet ) {
			$result[$hotsheet['name']] = $hotsheet['name'];
		}

		return $result;
	}

	public static function get_brand_colors() {
		$result = [];

		$settings = static::get_settings();

		foreach ( $settings as $name => $value ) {
			if ( static::is_color_value( $name, $value ) ) {
				$result[ $name ] = $value;
			}
		}

		return apply_filters( 'kvcoreidx/css/brand_colors', $result );
	}

	protected static function is_color_value( $name, $value ) {
		$is_color_string        = "_color";
		$is_color_string_length = strlen( $is_color_string );

		return ( $is_color_string === substr( $name, - $is_color_string_length ) && ! empty( $value ) );
	}

	public static function delete_cached_brand_css() {
		$self = new static();

		$settings_class = static::get_settings_class_name();

		$settings_class::delete_transient( 'brand_styles' );

		$brand_css_file = $self->get_brand_css_file();

		if( file_exists( $brand_css_file ) ) {
			try {
				unlink( $brand_css_file );
			} catch( \Exception $e ) {
				if( current_user_can( 'edit_pages' ) ) {
					wp_die( "Unable to delete cached Brand CSS file `{$brand_css_file}`. Please verify permissions are correct.");
				}
			}
		}
	}

	public static function output_brand_css() {
		if ( apply_filters( 'kvcoreidx/css/output_brand_css', true ) ) {
			$self = new static();
			$self->maybe_enqueue_brand_css();
		}
	}

	protected function maybe_enqueue_brand_css() {
		if( $this->maybe_update_brand_css_file() ) {
			$brand_css_file_uri = $this->get_brand_css_file_uri();

			wp_enqueue_style( 'kvcore_idx-brand-css', $brand_css_file_uri, [], $this->get_brand_css_file_version() );
		}
	}

	protected function maybe_update_brand_css_file() {
		$result = false;

		$brand_css_file = $this->get_brand_css_file();
		$cache_enabled = apply_filters( 'kvcoreidx/css/brand_css/cache_brand_css', true );
		$cache_file_exists = file_exists( $brand_css_file );

		if ( false === $cache_enabled || ! $cache_file_exists ) {
			$compiled_css = $this->get_compiled_brand_css();

			if( ! empty ( $compiled_css ) ) {
				try {
					file_put_contents( $brand_css_file, $compiled_css );

					$result = true;
				} catch ( \Exception $e ) {
					$result = false;
				}
			}
		}

		return $cache_file_exists || $result;
	}

	protected function get_brand_css_cache_directory() {
		$result = ABSPATH . 'wp-content/cache/kvcoreidx';

		// allow override to work from wp-config if present
		if (defined('KVCORE_IDX_CACHE_DIRECTORY')) {
			$result = KVCORE_IDX_CACHE_DIRECTORY;
		}

		if ( is_multisite() ) {
			$blog_id = get_current_blog_id();

			if( $blog_id ) {
				$result .= "/sites/" . get_current_blog_id() . '/';
			}
		}

		$result = apply_filters( 'kvcoreidx/css/brand_css/cache_file_directory', $result );

		if ( ! is_dir( $result ) ) {
			try {
				mkdir( $result, 0755, true );
			} catch ( \Exception $e ) {
				// unable to create directory
				$result = null;
			}
		}

		return $result;
	}

	protected function get_brand_css_file() {
		$css_filename = "brand-css.min.css";
		$directory = $this->get_brand_css_cache_directory();

		$brand_css_file = "{$directory}{$css_filename}";

		return $brand_css_file;
	}

	protected function get_brand_css_file_uri() {
		$brand_css_file = $this->get_brand_css_file();

		return '/' . str_replace( ABSPATH, '', $brand_css_file );
	}

	protected function get_brand_css_file_version() {
		return filemtime($this->get_brand_css_file());
	}

	protected function get_compiled_brand_css() {
		$is_admin_user = current_user_can( 'edit_pages' );

		$settings_class = static::get_settings_class_name();
		$transient_name = "brand_styles";

		$styles = $settings_class::get_transient( $transient_name );

		if ( empty( $styles ) ) {
			$sass_variables        = static::get_brand_colors();
			$sass_source_variables = [];

			$sass_source = apply_filters( 'kvcoreidx/css/brand_css/pre_compile', file_get_contents( KVCORE_IDX_PLUGIN_PATH . 'public/sass/dynamic/_brand-color-styles.scss' ) );;

			foreach ( $sass_variables as $name => $value ) {
				$sass_source_variables[] = "\${$name}:{$value}";
			}

			$sass_source_variables = implode( ";\n", $sass_source_variables ) . ";\n";

			$sass_source = "{$sass_source_variables}\n{$sass_source}";

			try {

				$scss = new Compiler();

				$scss_compressor_class = 'ScssPhp\ScssPhp\Formatter\Compressed';

				if ( class_exists( $scss_compressor_class ) ) {
					$scss->setFormatter( $scss_compressor_class );
				}

				$start  = microtime();
				$styles = $scss->compile( $sass_source );
				$end    = microtime();

				if ( $is_admin_user ) {
					$duration = ( $end - $start );

					echo "<script>console.log('kvCORE: Brand CSS compiled in `{$duration}` microseconds.')</script>";
				}
			} catch ( \Exception $e ) {
				if ( $is_admin_user ) {
					echo "<script>console.log('kvCORE: Error compiling Brand CSS: `{$e->getMessage()}`')</script>";
				} else {
					$styles = "";
				}
			}

			$styles = apply_filters( 'kvcoreidx/css/brand_css/post_compile', $styles, $sass_variables );

			if ( ! empty( $styles ) ) {
				$settings_class::set_transient( $transient_name, $styles );
			}
		}

		return $styles;
	}

	/**
	 * @return array
	 */
	public static function get_listing_types(): array {
		$listing_types_transient_name = 'kvcoreidx_listing_types';
		$listing_types = get_transient( $listing_types_transient_name );

		if ( !is_array( $listing_types ) || empty( $listing_types ) ) {
			$response = Api::request( 'GET', 'public/listings/types' );
			
			if (!empty($response->types)) {
                set_transient( $listing_types_transient_name, $response->types, 24 * HOUR_IN_SECONDS );
                $listing_types = $response->types;
            }
		}

		if ( !is_array( $listing_types ) ) {
			$listing_types = [];
		}

		return $listing_types;
	}

	/**
	 * @return array
	 */
	public static function get_all_supported_types(): array {
		$supported_types_transient_name = 'kvcoreidx_all_supported_types';
		$supported_types = get_transient( $supported_types_transient_name );

		if ( !is_array( $supported_types ) || empty( $supported_types ) ) {
			$response = Api::request( 'POST', 'public/domain' );

			$settings_supported_types = isset( $response->settings->types_served ) ? $response->settings->types_served : null;
			if ( is_array( $settings_supported_types ) && !empty( $settings_supported_types ) ) {
                $listing_types_filtered = array_filter( static::get_listing_types(), function ( $type ) use ( $response ) {
                    $types_served = isset($response->settings->types_served) ? $response->settings->types_served : [];
                    return in_array( $type->id, $types_served );
                } );

                set_transient( $supported_types_transient_name, $listing_types_filtered, 24 * HOUR_IN_SECONDS );
                $supported_types = $listing_types_filtered;
            }
		}

		if ( !is_array( $supported_types ) ) {
			$supported_types = [];
		}

		return $supported_types;
	}

	/**
	 * @return array
	 */
	public static function get_featured_types(): array {
		$saved_type_ids = static::get_setting( 'listings/types' ) ?? [];
		$typesList = array_values( array_filter( static::get_all_supported_types(), function ( $type ) use ( $saved_type_ids ) {
			return in_array( $type->id, $saved_type_ids );
		} ) );
		$featuredTypes = [];

		for ($i = 0; $i < count($typesList); $i++) {
			if ($typesList[$i]->id === 1 || $typesList[$i]->id === 2 || $typesList[$i]->id === 3 || $typesList[$i]->id === 5 || $typesList[$i]->id === 31) {
				array_push($featuredTypes, $typesList[$i]);
			}
		}

		$keys = array_column($featuredTypes, 'id');
		array_multisort($keys, SORT_ASC, $featuredTypes);

		return $featuredTypes;
	}

	/**
	 * @return array
	 */
	public static function get_supported_types(): array {
		$saved_type_ids = static::get_setting( 'listings/types' ) ?? [];
		return array_values( array_filter( static::get_all_supported_types(), function ( $type ) use ( $saved_type_ids ) {
			return in_array( $type->id, $saved_type_ids );
		} ) );
	}

	/**
	 * @return array
	 */
	public static function get_other_types(): array {
		$saved_type_ids = static::get_setting( 'listings/types' ) ?? [];
		$typesList = array_values( array_filter( static::get_all_supported_types(), function ( $type ) use ( $saved_type_ids ) {
			return in_array( $type->id, $saved_type_ids );
		} ) );
		$otherTypes = [];

		for ($i = 0; $i < count($typesList); $i++) {
			if ($typesList[$i]->id !== 1 && $typesList[$i]->id !== 2 && $typesList[$i]->id !== 3 && $typesList[$i]->id !== 5 && $typesList[$i]->id !== 31) {
				array_push($otherTypes, $typesList[$i]);
			}
		}

		return $otherTypes;
	}

	/**
	 * Lightens/darkens a given colour (hex format), returning the altered colour in hex format.7
 	 * @param string $hex Colour as hexadecimal (with or without hash);
	 * @param float $percent Decimal ( 0.2 = lighten by 20%(), -0.4 = darken by 40%() )
	 * @return string Lightened/Darkend colour as hexadecimal (with hash);
	 */
	public static function color_luminance( $hex, $percent ): string {
		// validate hex string
		$hex = preg_replace( '/[^0-9a-f]/i', '', $hex );
		$new_hex = '#';

		if ( strlen( $hex ) < 6 ) {
			$hex = $hex[0] + $hex[0] + $hex[1] + $hex[1] + $hex[2] + $hex[2];
		}

		// convert to decimal and change luminosity
		for ( $i = 0; $i < 3; $i++ ) {
			$dec = hexdec( substr( $hex, $i * 2, 2 ) );
            $dec = (int)floor( min( max( 0, $dec + $dec * $percent ), 255 ) );
			$new_hex .= str_pad( dechex( $dec ), 2, '', STR_PAD_LEFT );
		}

		return $new_hex;
	}
}

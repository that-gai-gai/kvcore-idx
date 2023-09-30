<?php

declare( strict_types=1 );

namespace kvCORE;

use kvCORE;

class Admin {
	const HANDLE = 'kvcoreidx-admin-settings';
	const REST_NAMESPACE = '/admin/';

	protected static $custom_templates_enabled = null;

	public static function allow_custom_templates() {
		if ( is_null( static::$custom_templates_enabled ) ) {
			static::$custom_templates_enabled = apply_filters(
				'kvcoreidx/admin/allow_custom_templates',
				false
			);
		}

		return static::$custom_templates_enabled;
	}

	public static function enqueue_scripts() {
		// only load if explicitly allowed for this page
		if ( ! apply_filters( 'kvcoreidx/admin/enqueue_script', false ) ) {
			return;
		}

		if ( function_exists( 'wp_enqueue_script' ) && defined( 'KVCORE_IDX_ADMIN_URL' ) ) {
            wp_enqueue_script( self::HANDLE . '-crypto', 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.min.js', [], null, true );
			wp_enqueue_script( self::HANDLE . '-lunr', 'https://cdnjs.cloudflare.com/ajax/libs/lunr.js/2.3.3/lunr.min.js', [], null, true );

			wp_enqueue_script( self::HANDLE, KVCORE_IDX_ADMIN_URL . 'js/dist/admin.min.js', [
                self::HANDLE . '-crypto',
                self::HANDLE . '-lunr',
            ], null, true );
		}

		if ( function_exists( 'wp_localize_script' ) ) {
			$listing_types = array_map( function ( $type ) {
				return (array) $type;
			}, Settings::get_listing_types() );
			kvCORE::rename_collection_keys( $listing_types, [ 'name' => 'text' ] );

			wp_localize_script(
				self::HANDLE,
				'kvcoreidxAdminConfig',
				[
					'jsUrl' => KVCORE_IDX_PUBLIC_URL . 'js/',
					'ajaxUrl' => admin_url( 'admin-ajax.php' ),
					'restNamespace' => rest_url( 'kvcoreidx/v1' . self::REST_NAMESPACE ),
					'nonce' => wp_create_nonce( 'wp_rest' ),
					'apiConstants' => [
						'beds' => kvCORE::array_to_collection( Api::BEDS, 'text' ),
						'baths' => kvCORE::array_to_collection( Api::BATHS, 'text' ),
                        'styles' => kvCORE::array_to_collection( Api::request('GET', '/public/listings/styles'), 'text' ),
						'options' => kvCORE::array_to_collection( Api::FEATURES, 'text' ),
						'propertyViews' => kvCORE::array_to_collection( Api::VIEWS, 'text' ),
						'propertyTypes' => $listing_types,
						'stories' => kvCORE::array_to_collection( Api::STORIES, 'text' ),
						'garageCapacity' => kvCORE::array_to_collection( Api::GARAGE_CAPACITY, 'text' ),
					],
				]
			);
		}
	}

	public static function enqueue_styles() {
		// only load if explicitly allowed for this page
		if ( ! apply_filters( 'kvcoreidx/admin/enqueue_style', false ) ) {
			return;
		}

		if ( function_exists( 'wp_enqueue_style' ) && defined( 'KVCORE_IDX_ADMIN_URL' ) ) {
			wp_enqueue_style( self::HANDLE, KVCORE_IDX_ADMIN_URL . 'css/kvcore_idx-admin.css', [], null );
			wp_enqueue_style( self::HANDLE . '-fa', 'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css', [], null );
			wp_enqueue_style( self::HANDLE . '-select2', 'https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.5/css/select2.min.css', [], null );
		}
	}
}
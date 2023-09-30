<?php

declare( strict_types=1 );

namespace kvCORE\Admin\Page\Settings;

use Exception;
use kvCORE;
use kvCORE\Admin\Page\Settings;
use kvCORE\Api;
use kvCORE\View;

/**
 * Class Settings
 * @package kvCORE\Admin\Page
 */
class Hotsheets extends Settings {
	const PAGE_SLUG = 'kvcoreidx_hotsheets';

	protected $authorization_token = null;

	public function setUp() {
		$this->authorization_token = kvCORE\Settings::get_api_key();

		// return if no authorization_token
		if ( !$this->authorization_token ) {
			return;
		}

		$this->setRootMenuPageBySlug( parent::PAGE_SLUG );
		$this->addSubMenuItem(
			[
				'title' => 'Hotsheets',
				'page_slug' => static::PAGE_SLUG,
			]
		);
	}

	public function content( $sContent ) {
		$context = [
			'hotsheets' => static::get_setting( 'hotsheets' ),
			'propertiesLink' => get_permalink( Settings::get_setting( 'properties_page' ) ),
			'multipleValueFilters' => Api::MULTIPLE_VALUE_FILTERS
		];
		return View::render( 'hotsheets', $context );
	}

	public static function get_by_name( $name ): array {
		$hotsheets = static::get_setting( 'hotsheets' ) ?? [];
		foreach ($hotsheets as $hotsheet) {
			if ($hotsheet['name'] === $name) {
				return $hotsheet['filters'];
			}
		}
		return [];
	}


	public static function add( $name, $filters ): bool {
		try {
			$hotsheets = static::get_setting( 'hotsheets' ) ?? [];
			array_push( $hotsheets, [ 'name' => $name, 'filters' => $filters ] );
			return static::update_setting( 'hotsheets', $hotsheets );
		} catch ( Exception $e ) {
			return false;
		}
	}

	public static function save( $hotsheet_filters ): bool {
		try {
			$hotsheets = static::get_setting( 'hotsheets' ) ?? [];
			foreach ( $hotsheets as $index => &$hotsheet ) {
				if (empty($hotsheet_filters[$index])) {
					unset($hotsheets[$index]);
					continue;
				}
				$hotsheet['filters'] = $hotsheet_filters[$index];
			}
			if ( $hotsheets === static::get_setting( 'hotsheets' ) ) {
				return true;
			}
			return static::update_setting( 'hotsheets', $hotsheets );
		} catch ( Exception $e ) {
			return false;
		}
	}
}
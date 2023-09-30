<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode;

use kvCORE;
use kvCORE\Settings;
use kvCORE\Api;
use kvCORE\Shortcode;

class Search extends Shortcode {
	private $context = [];

	/**
	 * @return array
	 */
	public function get_context(): array {
		$this->context = [
			'price' => Api::PRICES,
			'beds' => Api::BEDS,
			'baths' => Api::BATHS,
            'styles' => kvCORE::array_to_collection( Api::request('GET', '/public/listings/styles') ),
			'features' => kvCORE::array_to_collection( Api::FEATURES ),
			'views' => kvCORE::array_to_collection( Api::VIEWS ),
			'buildingStyle' => kvCORE::array_to_collection( Api::BUILDING_STYLE ),
			'featuredTypes' => Settings::get_featured_types(),
			'otherTypes' => Settings::get_other_types(),
			'supportedTypes' => Settings::get_supported_types()
		];

		return $this->context;
	}
}
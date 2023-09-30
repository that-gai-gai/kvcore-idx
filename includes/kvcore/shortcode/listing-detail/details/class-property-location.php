<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode\Listing_Detail\Details;

use kvCORE\Shortcode\Listing_Detail\Details;

class Property_Location extends Details {
	private $name = 'listing_detail_property_location';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}
}
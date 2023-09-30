<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode\Listing_Detail\Details;

use kvCORE\Shortcode\Listing_Detail\Details;

class Listing_Agent extends Details {
	private $name = 'listing_detail_listing_agent';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}
}
<?php

declare( strict_types=1 );

namespace kvCORE\Shortcode\Listing_Detail\Details;

use kvCORE\Shortcode\Listing_Detail\Details;

class Similar_Properties extends Details {
	private $name = 'listing_detail_similar_properties';

	/**
	 * @return string
	 */
	public function get_name(): string {
		return $this->name;
	}
}
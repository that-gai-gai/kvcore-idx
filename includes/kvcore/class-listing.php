<?php

declare( strict_types=1 );

namespace kvCORE;

/**
 * Class Listing
 * @package kvCORE
 */
class Listing implements Interfaces\Meta_Tag {
	use Traits\Meta_Tag;

	/**
	 * @var null|\stdClass
	 */
	protected $data = null;

	/**
	 * @param $name
	 *
	 * @return string
	 */
	public function __get( $name ) {
		return $this->get_property( $name );
	}

	/**
	 * @param $name
	 * @param $value
	 *
	 * @return mixed|null
	 */
	public function __set( $name, $value ) {
		return $this->set_property( $name, $value );
	}

	/**
	 * @return \stdClass
	 */
	public function get_data() {
		return $this->data;
	}

	/**
	 * @param string $name
	 *
	 * @return string
	 */
	protected function get_property( string $name ) {
		return $this->data->{$name} ?? '';
	}

	/**
	 * @param string $name
	 * @param null $value
	 *
	 * @return mixed|null
	 */
	protected function set_property( string $name, $value = null ) {
		if ( ! is_null( $value ?? null ) ) {
			return ( $this->data->{$name} = $value );
		} else {
			return null;
		}
	}

	/**
	 * Listing constructor.
	 *
	 * @param null $data
	 * @param string $mls_id
	 *
	 * @throws \Exception
	 */
	public function __construct( $data = null, string $mls_id = '', $includeFeaturedAgent = null ) {
		if ( is_string( $data ) && is_string( $mls_id ?? null ) ) {
			$mls = $data;

			if (!empty(Settings::get_setting('listing_detail/default_agent_id'))) {
				$includeFeaturedAgent = true;
			}
			//if certain cookies set then sold data should be available to them
			//or if they have full access to sold data
			$domain_settings = Api::request( 'POST', 'public/domain' );
			$hasFullSoldAccess = $domain_settings->account_settings->enable_sold_data && $domain_settings->account_settings->allow_sold_on_websites && $domain_settings->account_settings->sold_data_active && $domain_settings->account_settings->vow_website_configuration === 0 ? true : false;
			if ($_COOKIE['kvcoreidx_has_vow_access'] || $hasFullSoldAccess) {
				$includeSoldData = true;
			}
			$data = $this->get_listing_from_api( $mls, $mls_id, $includeFeaturedAgent, $includeSoldData );
			
			if ($data->listtracaccountid === 'ire_100417') {
				$src = '//code.listtrac.com/monitor.ashx?acct='.$data->listtracaccountid.'&nonjq=1';
				$inlineScript = "if ( typeof(_LT) != 'undefined' && _LT != null ) { _LT._trackEvent(_eventType.view, '".$data->mlsid."', '".$data->zip."', null, null, null, null);}";
				wp_enqueue_script( 'listtrac', $src );
				wp_add_inline_script( 'listtrac', $inlineScript );
			}
		}

		if ( $data instanceof \stdClass ) {
			$this->data = $data;

			$this->set_listing_data();
		} else {
//			throw new \Exception( "invalid \$data, \$mls or \$mls_id provided" );
		}
	}

	/**
	 * @param string $mls
	 * @param string $mls_id
	 *
	 * @return \stdClass|null
	 */
	protected function get_listing_from_api( string $mls, string $mls_id, $includeFeaturedAgent = null, $includeSoldData = null ) {
		$url = "public/listings/{$mls}/{$mls_id}?includeListingAgent=1&includeCoListingAgent=1&forDisplay=1";
		if ($includeSoldData) {
			$url .= "&isSold=1";
		}
		$response = Api::request( 'GET', $url, [], $includeFeaturedAgent, false, true );
		
		return !empty($response->data) ? $response->data : null;
	}

	/**
	 *
	 */
	protected function set_listing_data() {
		$this->detail_url = $this->get_listing_url( $this->data );
		$this->photos     = $this->get_listing_photos( $this->data );
		if (isset($this->data->enhancements->data->description) ) {
			$this->data->enhancements->data->description = preg_replace( '/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/', '', $this->data->enhancements->data->description );
		}
 	}
 
 	/**

	}

	/**
	 * @param \stdClass $listing
	 *
	 * @return string
	 */
	protected function get_listing_url( \stdClass $listing ) {
		$listing_detail_page = Settings::get_setting( 'listing_detail_page' );
		$detail_page_url     = trailingslashit( get_permalink( $listing_detail_page ) );

		return $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug( $listing->address ) . '-' . $this->get_slug( $listing->city ) . '-' . $listing->state . '-' . $listing->zip;
	}

	/**
	 * @param \stdClass $listing
	 *
	 * @return \stdClass
	 */
	protected function get_listing_photos( \stdClass $listing ) {
		$photos = $listing->photos->data ?? [];

		if ( count( $photos ) ) {
			foreach ( $photos as $i => $photo ) {
				$url                     = $photo->url;
				$photos[ $i ]->url       = apply_filters( 'kvcoreidx/listing/photo_url', $url );
				$photos[ $i ]->thumbnail = apply_filters( 'kvcoreidx/listing/photo_thumbnail_url', $url );
			}
		}

		$result       = new \stdClass();
		$result->data = $photos;

		return $result;
	}

	/**
	 * @param $string
	 *
	 * @return string
	 */
	protected function get_slug( $string ) {
		$result = strtolower( $string );

		$result = preg_replace( '/[^a-z0-9\s-]/', '', $result );
		$result = trim( preg_replace( '/[\s-]+/', ' ', $result ) );
		$result = ucwords( $result );
		$result = preg_replace( '/\s/', '-', $result );

		return $result;
	}

	public function print_meta_title() {
		$title = get_bloginfo( 'name' );

		$data = $this->data;

		$area = function () use ( $data ): string {
			foreach ( [ $data->city, $data->neighborhood, $data->area ] as $area ) {
				if ( !empty( $area ) ) {
					return $area;
				}
			}

			return '';
		};

		$titleParts = array_filter( [ $data->address, $area(), $data->state, $data->zip ], function ( $part ) {
			return !empty( $part );
		} );

		if ( !empty( $titleParts ) ) {
			$title = implode( ', ', $titleParts ) . " - {$title}";
		}

		$this->echo_title( $title );
	}

	public function print_meta_image() {
		$photos = $this->data->photos;
		
		if ( is_object( $photos ) &&
			is_array( $photos->data ) &&
			is_object( $photos->data[0] ) &&
			!empty( $photos->data[0]->url ) ) {
			$this->echo_image( $photos->data[0]->url );
		}
	}

	public function print_meta_description() {
		if ( !empty( $this->data->remarks ) ) {
			$this->echo_description( $this->process_description( $this->data->remarks ) );
		}
	}

    public static function get_mls_and_mlsid() {
        global $wp_query;
        $mls = $wp_query->query_vars['by-mls'];
        $mlsid = $wp_query->query_vars['by-mlsid'];
        if(empty($mls)) {
            $mls = $wp_query->query_vars['mls'];
        }
        if(empty($mlsid)) {
            $mlsid = $wp_query->query_vars['mlsid'];
        }

        return [$mls,$mlsid];
    }
    public static function has_mls_and_mlsid() {
	    global $wp_query;
        return  (!empty($wp_query->query_vars['by-mls']) && !empty($wp_query->query_vars['by-mlsid'])) || (!empty($wp_query->query_vars['mls']) && !empty($wp_query->query_vars['mlsid']));
    }

}

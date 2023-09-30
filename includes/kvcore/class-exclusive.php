<?php

declare( strict_types=1 );

namespace kvCORE;

/**
 * Class Exclusive
 * @package kvCORE
 */
class Exclusive implements Interfaces\Meta_Tag {
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
	 * Exclusive constructor.
	 *
	 * @param null $data
	 * @param string $mls_id
	 *
	 * @throws \Exception
	 */
	public function __construct( $data = null, $includeFeaturedAgent = null ) {
		switch (gettype($data)) {
			case "string":
				$exclusiveId = $data;
				if (!empty(Settings::get_setting('Exclusive_detail/default_agent_id'))) {
					$includeFeaturedAgent = true;
				}
				$this->data = $this->get_exclusive_from_api( $exclusiveId, $includeFeaturedAgent );
				$this->set_exclusive_data();
				break;
			case "object":
				$this->data = $data;
				$this->set_exclusive_data();
				break;
			default:
				$this->data = null;
				//throw new \Exception( "invalid \$data" );
		}
	}

	/**
	 * @param string $exclusiveId
	 *
	 * @return \stdClass|null
	 */
	protected function get_exclusive_from_api( string $exclusiveId, $includeFeaturedAgent = null ) {
		$url = "public/listings/manualListings?id={$exclusiveId}";

        $response = Api::request( 'GET', $url, [], $includeFeaturedAgent );

		return !empty($response->data) ? $response->data : null;
	}

	/**
	 *
	 */
	protected function set_exclusive_data() {
		$this->is_exclusive_listing = true;
		$this->listingAgent = $this->data->user;
 	}
    
    public static function get_exclusive_id() {
        global $wp_query;
		$id = isset($wp_query->query_vars['exclusive-listing-id']) ? $wp_query->query_vars['exclusive-listing-id'] : null;
        return $id;
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

}

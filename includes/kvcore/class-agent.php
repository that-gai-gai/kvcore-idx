<?php

declare( strict_types=1 );

namespace kvCORE;

class Agent implements Interfaces\Meta_Tag {
	use Traits\Meta_Tag;

	protected $data = null;

	public function __construct( $data = null ) {
		if ( is_string( $data ) ) {
			$agent_id = $data;

			$data = $this->get_agent_from_api( $agent_id );
		}

		if ( $data instanceof \stdClass ) {
			$this->data = $data;
		} else {
			return null;
		}
	}

	public function __get( $name ) {
		return $this->get_property( $name );
	}

	public function __set( $name, $value ) {
		return $this->set_property( $name, $value );
	}

	public function get_data() {
		return $this->data;
	}

	protected function get_property( string $name ) {
		return $this->data->{$name} ?? '';
	}

	protected function set_property( string $name, $value = null ) {
		if ( !is_null( $value ?? null ) ) {
			return ( $this->data->{$name} = $value );
		} else {
			return null;
		}
	}

	protected function get_agent_from_api( string $agent_id ) {
		$url = "public/members/{$agent_id}";

		$response = Api::request( 'GET', $url );

		return $response->data && count( $response->data ) === 1 ? $response->data : null;
	}

	public function print_meta_title() {
		if ( !empty( $this->data->full_name ) ) {
			$this->echo_title( $this->data->full_name . ' - ' . get_bloginfo( 'name' ) );
		}
	}

	public function print_meta_image() {
		$photo = $this->data->photo;

		if ( !empty( $photo ) ) {
			$this->echo_image( $photo );
		}
	}

	public function print_meta_description() {
		if ( !empty( $this->data->bio ) ) {
			$this->echo_description( $this->process_description( $this->data->bio ) );
		}
	}
}

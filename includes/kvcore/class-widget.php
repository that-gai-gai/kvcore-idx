<?php

declare( strict_types=1 );

namespace kvCORE;

use kvCORE\Interfaces\Renderable;

/**
 * @property string description
 * @property string directory_name
 * @property string template_name
 * @property array context
 */
class Widget extends \WP_Widget implements Renderable {

	const DIRECTORY = 'widgets';
	const ALLOWED_GETTERS = [ 'description', 'directory_name', 'template_name', 'context' ];

	public function __construct() {
		$className = $this->get_class_name();

		$description = property_exists( get_class( $this ), 'description' )
			? $this->description
			: '';

		parent::__construct(
			'kvcoreidx_' . strtolower( $className ),
			"kvCORE IDX {$className}",
			[ 'description' => $description ]
		);

		add_action( 'widgets_init', function() {
			register_widget( $this );
		});
	}

	public function __get( $property_name) {
		return in_array( $property_name, self::ALLOWED_GETTERS )
			? call_user_func( [ $this, "get_{$property_name}" ] )
			: null;
	}

	private function get_class_name(): string {
		return str_replace( [ get_class(), '\\' ], '', get_class( $this ) );
	}

	private function get_class_path(): string {
		return strtolower( str_replace( [ get_class() . '\\', '\\' ], [ '', '/' ], get_class( $this ) ) );
	}

	/**
	 * @param array $args
	 * @param array $instance
	 */
	public function widget( $args, $instance ) {
		echo $this->render( $args, $instance );
	}

	/**
	 * @param array $args
	 * @param array $instance
	 * @return string
	 */
	public function render( $args = [], $instance = null ): string {
		$directory_name = property_exists( get_class( $this ), 'directory_name' )
			? $this->directory_name
			: self::DIRECTORY;

		$template_name = property_exists( get_class( $this ), 'template_name' )
			? $this->template_name
			: str_replace( '_', '-', $this->get_class_path() );

		$context = property_exists( get_class( $this ), 'context' )
			? $this->context
			: [];

		try {
			$result = View::render( "{$directory_name}/{$template_name}", $context );
		} catch ( \Exception $e ) {
			$result = View::render( self::DIRECTORY . '/_error', [ '_message' => $e->getMessage() ] );
		}

		return $result;
	}

	/**
	 * Save widget options
	 *
	 * @param array $new_instance
	 * @param array $old_instance
	 */
	public function update( $new_instance, $old_instance ) {
	}

	/**
	 * Output admin widget options form
	 *
	 * @param array $instance
	 */
	public function form( $instance ) {
	}
}
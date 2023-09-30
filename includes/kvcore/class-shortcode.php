<?php

declare( strict_types=1 );

namespace kvCORE;

use kvCORE\Interfaces\Renderable;

/**
 * @property string name
 * @property string directory_name
 * @property string template_name
 * @property array context
 */
class Shortcode implements Renderable {

	const DIRECTORY = 'shortcodes';
	const ALLOWED_GETTERS = [ 'name', 'directory_name', 'template_name', 'context' ];

	public function __construct() {
		$name = property_exists( get_class( $this ), 'name' )
			? $this->name
			: $this->get_class_name();

		add_shortcode( "kvcoreidx_{$name}", [ $this, 'render' ] );
	}

	public function __get( $property_name ) {
		return in_array( $property_name, self::ALLOWED_GETTERS )
			? call_user_func( [ $this, "get_{$property_name}" ] )
			: null;
	}

	private function get_class_name(): string {
		return strtolower( str_replace( [ get_class() . '\\', '\\' ], [ '', '_' ], get_class( $this ) ) );
	}

	private function get_class_path(): string {
		return strtolower( str_replace( [ get_class() . '\\', '\\' ], [ '', '/' ], get_class( $this ) ) );
	}

	/**
	 * @param array $atts
	 * @param string $content
	 * @param string $name
	 * @return string
	 */
	public function render( $atts = [], $content = '', $name = '' ): string {

		$directory_name = property_exists( get_class( $this ), 'directory_name' )
			? $this->directory_name
			: self::DIRECTORY;

		$template_name = property_exists( get_class( $this ), 'template_name' )
			? $this->template_name
			: str_replace( '_', '-', $this->get_class_path() );

		$this->process_atts( $atts );

		$context = [
			'shortcode_attributes' => $atts,
			'shortcode_content' => $content,
			'shortcode_name' => $name,
			'shortcode_template' => $template_name,
		];

		// if ( $context['shortcode_attributes'] && $context['shortcode_attributes']['area'] ) {
		// 	$context['shortcode_attributes']['area'] = str_replace(',', ';', $context['shortcode_attributes']['area'] );
		// }

		if ( property_exists( get_class( $this ), 'context' ) ) {
			$context = array_merge( $context, $this->context );
		}

		$mlsAndMlsIdInRequest = Listing::has_mls_and_mlsid();
		if (method_exists( get_class( $this ), 'get_listing') && $mlsAndMlsIdInRequest) {
			$this->get_listing();
		}
		elseif (method_exists( get_class( $this ), 'get_exclusive') && !empty($context['shortcode_attributes']['exclusive'])) {
			$this->get_exclusive();
		}

        if (method_exists( get_class( $this ), 'listing_detail_view') && $mlsAndMlsIdInRequest) {
			try {
				// Prerender of listing detail page.
                $result = $this->listing_detail_view();
            } catch (\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
		}
		//for Exclusive detail
		elseif (method_exists( get_class( $this ), 'listing_detail_view') && !$mlsAndMlsIdInRequest) {
			try {
				// Prerender of listing detail page.
				$result = $this->listing_detail_view();

            } catch (\Exception $e) {
				echo "<h1>Catch Error wth</h1>";
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
		}
        elseif ( method_exists( get_class( $this ), 'custom_render' ) ) {
            try {
                $result = $this->custom_render($context);
            } catch(\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
        }
		elseif (method_exists( get_class( $this ), 'agent_profile_view') ) {
            try {
                //Prerender of agent profile page
                $result = $this->agent_profile_view();
            } catch(\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
        }
        elseif (method_exists( get_class( $this ), 'get_name') && $this->get_name() === "listings_sitemap_page" ) {
			try {
                $result = $this->render_listings_sitemap();
            } catch(\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
        }
        elseif (method_exists( get_class( $this ), 'get_name') && $this->get_name() === "listings_crawlable_page" ) {
			try {
                //Prerender of agent profile page
                $result = $this->crawlable_listings_view($context);
            } catch(\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);

            }
        }
        else {
            try {
                $result = View::render("{$directory_name}/{$template_name}", $context);
            } catch (\Exception $e) {
                $result = View::render(self::DIRECTORY . '/_error', ['_message' => $e->getMessage()]);
            }
        }
		return $result;
	}

	protected function process_atts( &$atts ) {
	}
}
<?php

declare( strict_types=1 );

namespace kvCORE;

use kvCORE;
use kvCORE\Cache\Filesystem;

class Filters extends Instantiator {
	protected static $instance = null;

	public function __construct() {
		add_filter( 'kvcoreidx/view/loader/filesystem/path', [ $this, 'view_loader_filesystem_path' ], 10 );
		add_filter( 'kvcoreidx/view/context', [ $this, 'view_context_filter' ] );
		add_filter( 'kvcoreidx/pages', [ $this, 'kvcoreidx_pages' ] );
		add_filter( 'kvcoreidx/user/is_admin', [ $this, 'user_is_admin' ] );
		add_filter( 'wpseo_title', [ $this, 'wpseo_title' ] );
		add_filter( 'wpseo_canonical', [ $this, 'wpseo_canonical_remove' ] );
		add_filter( 'body_class', [ $this, 'body_class' ] );
		add_filter( 'kvcoreidx/view/functions', [ $this, 'add_twig_functions' ] );
		add_filter( 'kvcoreidx/view/filters', [ $this, 'add_twig_filters' ] );
		add_filter( 'clean_url', [ $this, 'handle_038_url_enqueuing' ], 99, 3);
	}

	/**
	 * Undo WP's encoding of '&' to '&#038;'
	 */
	public function handle_038_url_enqueuing( $url, $original_url, $_context ) {
		if (strstr($url, "googleapis.com") !== false) {
			$url = str_replace("&#038;", "&", $url); // or $url = $original_url
		}

		return $url;
	}

	public function view_loader_filesystem_path( array $path = [] ) : array {
		$path[] = KVCORE_IDX_PARTIALS_PATH;
		$path[] = KVCORE_IDX_ADMIN_PARTIALS_PATH;

		$cached_partials_directory = Filesystem::get_cache_file(KVCORE_IDX_PARTIAL_PATH_NAME);

		if ( is_dir( $cached_partials_directory ) ) {
			$path[] = $cached_partials_directory;
		}

		return $path;
	}

	public function view_context_filter( array $data = [] ): array {
		if ( ! is_null( $_SESSION['kvcoreidx_lead_id'] ?? null ) ) {
			$data['user'] = [
				'lead_id'      => $_SESSION['kvcoreidx_lead_id'],
				'display_name' => $_SESSION['kvcoreidx_lead_email'],
				'user_profile' => $_SESSION['user-profile'] ?? [],
			];
		}

		if ( is_null( $GLOBALS['kvcoreidx/wrapper_class'] ?? null ) ) {
			$GLOBALS['kvcoreidx/wrapper_class'] = implode( ' ', apply_filters( 'kvcoreidx/wrapper_class', [ 'kvcore' ] ) );
		}

		$options = Settings::get_settings();
        $mapbox_access_token = isset($options['mapbox_access_token']) ? $options['mapbox_access_token'] : '';
		$pages = [];

		if ( isset($options['privacy_policy_page']) && $options['privacy_policy_page'] ) {
		    $pages['privacy_policy'] = get_permalink($options['privacy_policy_page']);
        }
		if ( isset($options['terms_of_use_page']) && $options['terms_of_use_page'] ) {
		    $pages['terms_of_use'] = get_permalink($options['terms_of_use_page']);
        }

		$data['kvcoreidx'] = [
			'wrapper_class' => $GLOBALS['kvcoreidx/wrapper_class'],
			'mapsApi'       => $mapbox_access_token,
			'options'       => $options,
			'request'       => count( $_REQUEST ) ? $_REQUEST : [],
			'publicUrl'     => KVCORE_IDX_PUBLIC_URL,
			'siteUrl'       => get_site_url(),
            'pages' => $pages
		];

		if ( ! current_user_can( 'edit_posts' ) ) {
			$data['kvcoreidx']['block_listings'] = true;
		}

		$go_back_link = $_SERVER['HTTP_REFERER'] ?? null;

		if ( ! $go_back_link || false === strpos( $go_back_link, '/properties/' ) ) {
			$go_back_link = '/properties/';
		}

		$data['go_back_link'] = $go_back_link;

		return $data;
	}

	public function kvcoreidx_pages( $pages ) {
		return array_merge($pages, [
			'detail' => '/detail/',
			'properties' => '/properties/',
			'profile' => '/profile/',
			'terms_of_use' => get_site_url(null, 'terms-of-use', null),
			'team' => '/team/',
			'agent' => '/' . apply_filters('kvcoreidx/team-members/agent-page-slug', 'agent') . '/'
		]);
	}

	public function user_is_admin( $is_admin ) {
		return $is_admin || current_user_can('edit_pages' );
	}

	public function wpseo_title( $title ) {
		$pages = apply_filters( 'kvcoreidx/pages', [] );

		if ( empty( $pages['detail'] ) ) {
			return $title;
		}

		$detailPagePath = $pages['detail'];
		$path = $_SERVER['REQUEST_URI'];

		if ( strpos( $path, $detailPagePath ) === false ) {
			return $title;
		}

		$path = str_replace( $detailPagePath, '', $path );

		$pathArray = array_map( function ( $item ) {
			return ucwords( str_replace( '-', ' ', $item ) );
		}, explode( '/', $path ) );

		$pathArray = array_filter( $pathArray, function ( $item ) {
			return $item !== '';
		} );

		$pathCount = count( $pathArray );

		if ( $pathCount < 2 ) {
			return $title;
		}

		switch ( $pathCount ) {
			case 5:
				$address = $pathArray[2];
				break;

			default:
				$address = $pathArray[1];
		}

		$city = $pathArray[0];

		return "{$address}, {$city} - $title";
	}

	/**
	 * @param $canonical
	 * @return string|boolean
	 */
	public function wpseo_canonical_remove( $canonical ) {
		if ( !in_array( kvCORE::$active_idx_page, [ 'listing_detail', 'agent_profile' ] ) ) {
			return $canonical;
		}

		return false;
	}

	/**
	 * @param $classes
	 * @return array
	 */
	public function body_class($classes): array {
		if (is_array($classes) && Settings::get_setting('design') === 'v1') {
			$classes[] = 'kv-design-v1';
		}

		return $classes;
	}

	public function add_twig_functions($functions) {
		array_push($functions, [
			'name' => 'kv_empty',
			'callback' => function($var) {
				return empty($var);
			}
		]);

        array_push($functions, [
            'name' => 'kv_first_non_empty',
            'callback' => function($var) {
                foreach ($var as $item) {
                    if(!empty($item))
                        return $item;
                }
                return '';
            }
        ]);

		return $functions;
	}

	public function add_twig_filters($filters) {
		array_push($filters, [
			'name' => 'kv_phone_format',
			'callback' => function($number) {
				$pattern = '/(\d{3})(\d{3})(\d{0,})/';
				return Settings::get_setting('team/phone_format') === 'bracket'
                    ? preg_replace($pattern, '($1) $2-$3', (string)$number)
                    : preg_replace($pattern, '$1.$2.$3', (string)$number);
			}
		]);

		return $filters;
	}
}
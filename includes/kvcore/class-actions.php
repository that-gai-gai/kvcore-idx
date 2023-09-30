<?php
declare( strict_types=1 );

namespace kvCORE;

use kvCORE;

class Actions extends kvCORE\Instantiator {
	protected static $instance       = null;
	protected $mls                   = '';
	protected $mlsid                 = null;
	protected $listing               = null; // ZF: Don't define as string if it's always going to be used as an object.
	protected $agent                 = null;
	protected $isAgentProfileRequest = null;
	protected $detailsPageId;
	protected $contactFormPageId;
	protected $marketReportPageId;
	protected $propertiesPageId;

	public function __construct() {
		add_action( 'template_redirect', array( $this, 'pre_process_sitemap_shortcode' ), 100 );
		add_action(
			'kvcoreidx/activate',
			function ( $new_version, $old_version = null ) {
				// plugin was activated
				// update or create areas table if not already done
				kvCORE\Areas_Table::maybe_create_or_update_database();
			},
			10,
			2
		);

		add_action(
			'kvcoreidx/deactivate',
			function ( $new_version, $old_version = null ) {
				// plugin was deactivated
			},
			10,
			2
		);

		add_action(
			'kvcoreidx/update',
			function ( $new_version, $old_version = null ) {
				// plugin was updated
				// update or create areas table if not already done
				kvCORE\Areas_Table::maybe_create_or_update_database();
			},
			10,
			2
		);

		add_action( 'init', array( 'kvCORE\Activation', 'maybe_update' ), 5, 0 );
		add_action( 'init', array( $this, 'initialize_admin' ) );
		add_action( 'init', array( $this, 'register_rewrites' ), 10, 0 );
		add_action( 'init', array( $this, 'update_permalinks' ) );

		add_action( 'rest_api_init', array( $this, 'register_rest_api_endpoints' ) );
		add_action( 'rest_api_init', array( $this, 'settings_info' ) );

		add_action( 'wp_enqueue_scripts', array( 'kvCORE\Settings', 'output_brand_css' ), 50 );
		add_action( 'wp_enqueue_scripts', array( 'kvCORE\Settings\Custom_Templates', 'output_custom_templates_js' ), 50 );
		add_action( 'wp_head', array( $this, 'maybe_output_share_meta' ) );
		add_action( 'wp_head', array( $this, 'set_listing_data_meta' ), -5 );
		add_action( 'widgets_init', array( $this, 'listing_detail_sidebar' ) );
		add_action( 'wp_head', array( $this, 'set_homepage_json' ), -5 );

		add_action( 'wp_head', array( $this, 'set_agent_meta_data' ), -5 );
		add_action( 'wp_head', array( $this, 'set_sitemap_canonical' ), -5 );

		// This *should* over-ride yoast seo meta stuff - ZF: It does.
		add_filter( 'wpseo_title', array( $this, 'set_meta_title_yoast' ) );
		add_filter( 'wpseo_opengraph_image', array( $this, 'set_agent_meta_image' ) );
		add_filter( 'wpseo_opengraph_image', array( $this, 'set_listing_image' ) );
		add_filter( 'wpseo_metakey', array( $this, 'set_agent_keywords' ) );
		add_filter( 'wpseo_canonical', array( $this, 'yoast_remove_canonical_items' ) );
		add_filter( 'wpseo_opengraph_url', array( $this, 'set_listing_url' ) );
		add_filter( 'wpseo_opengraph_desc', array( $this, 'set_listing_description' ) );
		add_action( 'wpseo_add_opengraph_additional_images', array( $this, 'default_og_image' ) ); // ZF: workaround, see function.

		add_filter( 'document_title_parts', array( $this, 'set_page_titles' ) );
		add_action( 'wp_head', array( $this, 'remove_header_links' ), 2 );

		add_action( 'init', array( $this, 'maybe_flush_rewrite_rules' ) );
		add_action( 'save_post', array( $this, 'save_post' ) );
		add_action( 'template_redirect', array( $this, 'handle_contact_and_marketreport_urls' ) );

		add_filter( 'jetpack_photon_skip_image', array( $this, 'disable_photon_cdn' ), 10, 3 );
		add_action( 'wp_head', array( $this, 'prefetch_img_kvcore_com' ), 0 );



		new Shortcode\Search();
		new Shortcode\Prequalify();
		new Shortcode\Properties();
		new Shortcode\Display_Properties();
		new Shortcode\Offices();
		new Shortcode\Team();
		new Shortcode\Agent_Profile();
		new Shortcode\Agent_Search();
		new Shortcode\User_Profile();
		new Shortcode\Mls_Disclaimer();
		new Shortcode\Mortgage_Calculator();
		new Shortcode\Market_Report();
		new Shortcode\Site_Map_Index();
		new Shortcode\Market_Report_Search();
		new Shortcode\Valuation_Report();
		new Shortcode\Valuation_Pdf_Search();
		new Shortcode\Valuation_Pdf();
		new Shortcode\Contact_Form();
		new Shortcode\Properties_Crawlable();
		new Shortcode\Listings_Sitemap();
		new Shortcode\Agent_Profile_Sitemap();
		new Shortcode\Listing_Sitemap_Base();

		new Shortcode\Listing_Detail();
		new Shortcode\Listing_Detail\Header();
		new Shortcode\Listing_Detail\Header\Slider();
		new Shortcode\Listing_Detail\Header\Detail();
		new Shortcode\Listing_Detail\Details();
		new Shortcode\Listing_Detail\Details\Home_Details();
		new Shortcode\Listing_Detail\Details\Property_Location();
		new Shortcode\Listing_Detail\Details\Similar_Properties();
		new Shortcode\Listing_Detail\Details\Listing_Agent();

		new Shortcode\Partial();

		new Shortcode\Area();
		new Widget\Login();
	}

	public function prefetch_img_kvcore_com() {
		echo '<meta http-equiv="x-dns-prefetch-control" content="on">';
		echo "\r\n";
		echo '<link rel="dns-prefetch" href="//img.kvcore.com" />';
		echo "\r\n";
	}

	/**
	 * Disable Photon CDN (img.kvcore.com is already a CDN)
	 *
	 * @see https://developer.jetpack.com/hooks/jetpack_photon_skip_image/
	 *
	 * @param bool $val   Should Photon ignore this image. Default to false.
	 * @param string $src Image URL.
	 * @param string $tag Image Tag (Image HTML output).
	 *
	 * @return bool       True if source is img-kvcore.com
	 */
	public function disable_photon_cdn ( $val, $src, $tag ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundInExtendedClassAfterLastUsed
        $parse = parse_url( $src );
        $img_domain = $parse[ 'host' ];

        if ( $img_domain == 'img.kvcore.com' ) {
                return true;
        }

        return $val;
	}

	/**
	 * Purpose: This will send urls like contact.php and market-report.php to the WordPress pages for those
	 */
	public function handle_contact_and_marketreport_urls() {
		if ( is_404() ) {
			$urlCheck    = $_SERVER['REQUEST_URI'];
			$queryString = $_SERVER['QUERY_STRING'] ? '?' . $_SERVER['QUERY_STRING'] : '';
			if ( strpos( $urlCheck, 'contact.php' ) !== false ) {
				$contact_page_url = trailingslashit( get_permalink( $this->contactFormPageId ) );
				wp_redirect( $contact_page_url . $queryString, 301 );
			}
			if ( strpos( $urlCheck, 'market-report.php' ) !== false ) {
				$market_report_page_url = trailingslashit( get_permalink( $this->marketReportPageId ) );
				wp_redirect( $market_report_page_url . $queryString, 301 );
			}
		}
	}

	/**
	 * Purpose: This will pre process the sitemap shortcode to redirect to the S3 bucket where the sitemap is located.
	 */
    function pre_process_sitemap_shortcode() {
        if ( ! is_singular() ) {
            return;
        }
        if ( $this->check_for_shortcodes( array( 'kvcoreidx_site_map_index' ) ) ) {

            // We need website domain from this endpoint.
            $response = Api::request( 'POST', 'public/domain' );

            // Permanent redirect to S3 bucket.
            header( 'Location: ' . "https://s3.amazonaws.com/kunversion-frontend-sitemaps/{$response->domain}/sitemap-index.xml", true, 301 );
            die();
        }
    }

	public function maybe_update() {
		if ( KVCORE_IDX_PLUGIN_VERSION !== Settings::get_plugin_version() ) {
			Settings::update_plugin_version( KVCORE_IDX_PLUGIN_VERSION );
		}
	}

	public function initialize_admin() {
		if ( is_admin() ) {
			new Admin\Page\Settings();

			if ( Admin::allow_custom_templates() ) {
				new Admin\Page\Settings\Custom_Templates();
			}

			new Admin\Page\Settings\Hotsheets();

			add_action( 'admin_enqueue_scripts', array( 'kvCORE\Admin', 'enqueue_scripts' ) );
			add_action( 'admin_enqueue_scripts', array( 'kvCORE\Admin', 'enqueue_styles' ) );
		}
	}

	public function register_rewrites() {
		$details_page_id              = Settings::get_setting( 'listing_detail_page' );
		$this->detailsPageId          = $details_page_id;
		$properties_page_id           = Settings::get_setting( 'properties_page' );
		$contact_form_page_id         = Settings::get_setting( 'contact_form_page' );
		$this->contactFormPageId      = $contact_form_page_id;
		$market_report_page_id        = Settings::get_setting( 'market_report_page' );
		$this->marketReportPageId     = $market_report_page_id;
		$this->propertiesPageId       = $properties_page_id;
		$agent_page_id                = Settings::get_setting( 'agent_profile_page' );
		$this->agentPageId            = $agent_page_id;
		$exclusives_page_id           = Settings::get_setting( 'exclusives_page' );
		$exclusive_detail_page_id     = Settings::get_setting( 'exclusive_detail_page' );
		$sell_page_id                 = Settings::get_setting( 'valuation_pdf_page' );
		$profile_page_id              = Settings::get_setting( 'user_profile_page' );
		$listing_sitemap_base_page_id = Settings::get_setting( 'listings_sitemap_ranges_page' );
		$listing_sitemap_page_id      = Settings::get_setting( 'listings_sitemap_page' );
		$agent_sitemap_page           = Settings::get_setting( 'agents_sitemap_page' );
		$area_page                    = Settings::get_setting( 'area_page' );

		$details_page_slug          = get_post_field( 'post_name', $details_page_id );
		$properties_page_slug       = get_post_field( 'post_name', $properties_page_id );
		$agent_page_slug            = get_post_field( 'post_name', $agent_page_id );
		$exclusives_page_slug       = get_post_field( 'post_name', $exclusives_page_id );
		$exclusive_detail_page_slug = get_post_field( 'post_name', $exclusive_detail_page_id );
		$area_page_slug             = get_post_field( 'post_name', $area_page );

		add_rewrite_tag( '%by-mls%', '([0-9]+)' );
		add_rewrite_tag( '%mls%', '([0-9]+)' );
		add_rewrite_tag( '%by-mlsid%', '([0-9]+)' );
		add_rewrite_tag( '%mlsid%', '([0-9]+)' );
		add_rewrite_tag( '%team-member%', '([0-9]+)' );
		add_rewrite_tag( '%area%', '([^/]+)' );
		add_rewrite_tag( '%areas%', '([^/]+)' );
		add_rewrite_tag( '%pak%', '([^/]+)' );
		add_rewrite_tag( '%polygonKey%', '([^/]+)' );
		add_rewrite_tag( '%listings-exclusives%', '([^/]+)' );
		add_rewrite_tag( '%exclusive-listing-id%', '([0-9]+)' );
		add_rewrite_tag( '%priceMin%', '([0-9]+)' );
		add_rewrite_tag( '%min%', '([0-9]+)' );
		add_rewrite_tag( '%max%', '([0-9]+)' );
		add_rewrite_tag( '%priceMax%', '([0-9]+)' );
		add_rewrite_tag( '%beds%', '([0-9]+)' );
		add_rewrite_tag( '%baths%', '([0-9]+)' );
		add_rewrite_tag( '%minacres%', '([0-9]+)' );
		add_rewrite_tag( '%maxacres%', '([0-9]+)' );
		add_rewrite_tag( '%acresMin%', '([0-9]+)' );
		add_rewrite_tag( '%acresMax%', '([0-9]+)' );
		add_rewrite_tag( '%minfootage%', '([0-9]+)' );
		add_rewrite_tag( '%maxfootage%', '([0-9]+)' );
		add_rewrite_tag( '%footageMax%', '([0-9]+)' );
		add_rewrite_tag( '%footageMin%', '([0-9]+)' );
		add_rewrite_tag( '%disable_reg%', '([0-9]+)' );
		add_rewrite_tag( '%noreg%', '([0-9]+)' );
		add_rewrite_tag( '%vowKey%', '([0-9]+)' );
		add_rewrite_tag( '%view_timing%', '([0-9]+)' );
		add_rewrite_tag( '%searchtype%', '([^/]+)' );
		add_rewrite_tag( '%ourListings%', '([0-9]+)' );
		add_rewrite_tag( '%types%', '([0-9]+)' );
		add_rewrite_tag( '%paginate%', '([0-9]+)' );
		add_rewrite_tag( '%type%', '[^/]+)' );
		add_rewrite_tag( '%propertyTypes%', '([0-9]+)' );
		add_rewrite_tag( '%paginate%', '([0-9]+)' );
		add_rewrite_tag( '%key%', '([^/]+)' );
		add_rewrite_tag( '%styles%', '([^/]+)' );
		add_rewrite_tag( '%options%', '([^/]+)' );
		add_rewrite_tag( '%mlsids%', '([^/]+)' );
		add_rewrite_tag( '%subType%', '([0-9]+)' );
		add_rewrite_tag( '%polygons%', '([^/]+)' );
		add_rewrite_tag( '%sub%', '([0,1])' );
		add_rewrite_tag( '%showalerts%', '([1,2])' );
		add_rewrite_tag( '%pass%', '([1,2])' );
		add_rewrite_tag( '%filter%', '([^/]+)' );
		add_rewrite_tag( '%entityName%', '([^/]+)' );
		add_rewrite_tag( '%entity%', '([^/]+)' );
		add_rewrite_tag( '%buildingStyles%', '([^/]+)' );
		add_rewrite_tag( '%keywords%', '([^/]+)' );

		add_rewrite_tag( '%areaslug%', '([^/]+)' );

		add_rewrite_rule( '^' . $details_page_slug . '/([^\-]+)-([^\-]+)-?(.+)?/?', 'index.php?page_id=' . $details_page_id . '&action=get-details&by-mls=$matches[1]&by-mlsid=$matches[2]', 'top' );

		add_rewrite_rule( '^' . $properties_page_slug . '/([^/]+)/([^/]+)/?', 'index.php?page_id=' . $properties_page_id . '&area=$matches[1]|$matches[2]', 'top' );

		add_rewrite_rule( '^' . $agent_page_slug . '/([0-9]+)-([^/\.]+)/?', 'index.php?page_id=' . $agent_page_id . '&team-member=$matches[1]', 'top' );

		add_rewrite_rule( '^' . $exclusives_page_slug . '/([^/]+)/?', 'index.php?page_id=' . $exclusives_page_id . '&listings-exclusives=$matches[1]', 'top' );

		add_rewrite_rule( '^' . $exclusive_detail_page_slug . '/([0-9]+)-([^/\.]+)/?', 'index.php?page_id=' . $exclusive_detail_page_id . '&exclusive-listing-id=$matches[1]', 'top' );

		add_rewrite_rule( '^details' . '/([^\-]+)-([^\-]+)-?(.+)?/?', 'index.php?page_id=' . $details_page_id . '&action=get-details&by-mls=$matches[1]&by-mlsid=$matches[2]', 'top' );

		add_rewrite_rule( '^settings', 'index.php?page_id=' . $profile_page_id, 'top' );

		add_rewrite_rule( '^sell/', 'index.php?page_id=' . $sell_page_id, 'top' );

		add_rewrite_rule( '^index', 'index.php?page_id=' . $properties_page_id, 'top' );

		add_rewrite_rule( '^details', 'index.php?page_id=' . $details_page_id, 'top' );

		add_rewrite_rule( '^listings-sitemap/homes-in-([^\-]+)-from-([0-9]+)-to-([0-9]+)', 'index.php?page_id=' . $listing_sitemap_page_id . '&min=$matches[2]&max=$matches[3]&filter=$matches[1]', 'top' );
		add_rewrite_rule( '^listings-sitemap/homes-in-([^\-]+)-from-([0-9]+)', 'index.php?page_id=' . $listing_sitemap_page_id . '&filter=$matches[1]&min=$matches[2]', 'top' );
		add_rewrite_rule( '^listings-sitemap/homes-in-([^\-]+)', 'index.php?page_id=' . $listing_sitemap_base_page_id . '&pass=3&filter=$matches[1]', 'top' );
		add_rewrite_rule( '^listings-sitemap/([^\-]+)', 'index.php?page_id=' . $listing_sitemap_base_page_id . '&pass=2&filter=$matches[1]', 'top' );
		add_rewrite_rule( '^listings-sitemap/', 'index.php?page_id=' . $listing_sitemap_base_page_id, 'top' );

		add_rewrite_rule( '^agents-sitemap/agents-in-([^\-]+)', 'index.php?page_id=' . $agent_sitemap_page . 'pass=2&entityName=$matches[1]', 'top' );
		add_rewrite_rule( '^agents-sitemap/', 'index.php?page_id=' . $agent_sitemap_page, 'top' );

		if ( $area_page_slug && KVCORE_IDX_ENABLE_AREA_PAGES ) {
			add_rewrite_rule( '^' . $area_page_slug . '/([^/]+)', 'index.php?page_id=' . $area_page . '&areaslug=$matches[1]', 'top' );
		}
	}

	public function register_rest_api_endpoints() {
		Rest\v1\Add_Hotsheet::init();
		Rest\v1\Area_Page::init();
		Rest\v1\Create_Required_Pages::init();
		Rest\v1\Get_Lat_Lng_From_Address::init();
		Rest\v1\kvCORE_API_Proxy::init();
		Rest\v1\Save_Hotsheets::init();
		Rest\v1\Social_Login::init();
		Rest\v1\Zillow_Valuation::init();
		Rest\v1\Area_Pages::init();
	}

	public function settings_info() {
		register_rest_route(
			'idx',
			'meta',
			array(
				'methods'             => 'GET',
				'callback'            => array( $this, 'idx_settings_response' ),
				'permission_callback' => array( $this, 'auth_callback' ),
			)
		);
	}

	public function auth_callback( \WP_REST_Request $request ) {
		if ( function_exists( 'apache_request_headers' ) ) {
			$bearerToken = apache_request_headers()['Authorization'] ?? '';
			$bearerToken = explode( ' ', $bearerToken );
			return count( $bearerToken ) === 2 && $bearerToken[1] === Settings::get_api_key();
		}
		return false;
	}

	public function idx_settings_response() {
		$settings                   = Settings::get_settings();
		$settings['plugin_version'] = KVCORE_IDX_PLUGIN_VERSION;
		$settings['php_version']    = phpversion();
		return rest_ensure_response( $settings );
	}

	/**
	 * This function will properly modify the title tag for certain pages for better seo, way we had it before created two title tags.
	 */
	public function set_page_titles( $title_parts_array ) {
		$siteName = get_bloginfo( 'name' );

		if ( $this->detailsPageId == get_the_ID() ) {
			$listing                    = $this->listing;
            $address = isset($listing->address) ? $listing->address : "";
            $city = isset($listing->city) ? $listing->city : "";
            $state = isset($listing->state) ? $listing->state : "";
            $zip = isset($listing->zip) ? $listing->zip : "";
            $mlsid = isset($listing->mlsid) ? $listing->mlsid : "";
			$fullAddress                = "{$address}, {$city}, {$state} {$zip}";
			$title_parts_array['title'] = "{$fullAddress} | MLS# {$mlsid} ";
			$title_parts_array['site']  = "{$siteName}";
			return $title_parts_array;
		}

		if ( $this->agentPageId == get_the_ID() ) {
			$agent                      = $this->agent;
			$title_parts_array['title'] = ! empty( $agent->office->data )
			? "{$agent->first_name} {$agent->last_name}, {$agent->office->data->name} Real Estate Agent | {$siteName}"
			: "{$agent->first_name} {$agent->last_name}, Real Estate Agent | {$siteName}";
			$title_parts_array['site']  = ''; // has to be set this way for the | above
			return $title_parts_array;
		}
		return $title_parts_array;

	}

	public function set_homepage_json() {
		$url  = empty( $_SERVER['HTTPS'] ) || $_SERVER['HTTPS'] == 'off' ? 'http' : 'https';
		$url .= '://' . $_SERVER['HTTP_HOST'];

		if ( is_front_page() ) {

			$data        = Api::request( 'GET', 'public/company/', array() );
			$companyData = $data->data;

			$content             = array();
			$content['@context'] = 'https://schema.org';
			$content['@type']    = 'RealEstateAgent';

			$content2             = array();
			$content2['@context'] = 'https://schema.org';
			$content2['@type']    = 'Organization';

			if ( $companyData->name ) {
				$content['name'] = $companyData->name;
			}

			$content['address'] = array(
				'@type' => 'PostalAddress',
			);

			if ( $companyData->address ) {
				$content['address']['streetAddress'] = $companyData->address;
			}

			if ( $companyData->city ) {
				$content['address']['addressLocality'] = $companyData->city;
			}

			if ( $companyData->state ) {
				$content['address']['addressRegion'] = $companyData->state;
			}

			if ( $companyData->zip ) {
				$content['address']['postalCode'] = $companyData->zip;
			}

			if ( $companyData->photo ) {
				$content['image'] = $companyData->photo;
				$content2['logo'] = $companyData->photo;
			}

			if ( $companyData->email ) {
				$content['email'] = $companyData->email;
			}

			if ( $companyData->phone ) {
				$content['telePhone'] = $companyData->phone;
			}

			if ( $companyData->fax ) {
				$content['faxNumber'] = $companyData->fax;
			}

			if ( $url ) {
				$content['url']  = $url;
				$content2['url'] = $url;
			}

			if ( $companyData->lat && $companyData->lng ) {
				$content['geo'] = array(
					'@type'     => 'GeoCoordinates',
					'latitude'  => $companyData->lat,
					'longitude' => $companyData->lng,
				);
			}

			echo '<script type="application/ld+json">' . json_encode( $content, JSON_UNESCAPED_SLASHES ) . '</script>';
			echo '<script type="application/ld+json">' . json_encode( $content2, JSON_UNESCAPED_SLASHES ) . '</script>';
		}
	}

	/**
	 * Fix for when we don't have a default OG image defined in Yoast SEO
	 *
	 * Either a bug or a feature, depending on interpretation...
	 *
	 * @see https://github.com/Yoast/wordpress-seo/issues/392#issuecomment-146634436
	 *
	 * @param object $image
	 *
	 * @return void
	 */
	public function default_og_image( $image ) {

		if ( ! $image->has_images() ) {
			$image->add_image( 'default' ); // this can be whatever you want it to be as long as it isn't falsey
		}

	}

	/**
	 * Fire the Yoast SEO hook to change the og:url link for a property
	 *
	 * @see https://gist.github.com/amboutwe/811e92b11e5277977047d44ea81ee9d4#file-yoast_seo_opengraph_change_protocol-php.
	 *
	 * @param string $url As generated by Yoast.
	 *
	 * @return sring      Fixed URL.
	 */
	public function set_listing_url( $url ) {

		if ( ! $this->check_for_listing_detail() ) {
			return $url;
		}

		$this->set_listing();

		$listing            = $this->listing;
		$detail_page_url    = trailingslashit( get_permalink( $this->detailsPageId ) );
		$listing_detail_url = $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug( $listing->address ) . '-' . $this->get_slug( $listing->city ) . '-' . $listing->state . '-' . $listing->zip;

		return $listing_detail_url;

	}

	/**
	 * Fire the Yoast SEO hook to change the og:image url for a property
	 *
	 * @see https://gist.github.com/amboutwe/811e92b11e5277977047d44ea81ee9d4#file-yoast_seo_opengraph_change_protocol-php.
	 *
	 * @param string $url As generated by Yoast.
	 *
	 * @return sring      Fixed URL.
	 */
	public function set_listing_image( $url ) {

		if ( ! $this->check_for_listing_detail() ) {
			return $url;
		}

		$this->set_listing();

		$listing   = $this->listing;
		$meta_image = $listing->photos->data[0]->url ?? '';

		return $meta_image ?? $url;

	}

	/**
	 * Fire the Yoast SEO hook to change the og:description for a property
	 *
	 * @param string $description As generated by Yoast.
	 *
	 * @return sring              Fixed description.
	 */
	public function set_listing_description( $description ) {

		if ( ! $this->check_for_listing_detail() ) {
			return $description;
		}

		$this->set_listing();

		$listing = $this->listing;

		$neighborhood    = ! empty( $listing->neighborhood ) ? " in the beautiful neighborhood of {$listing->neighborhood}." : '.';
		$full_address     = "{$listing->address}, {$listing->city}, {$listing->state} {$listing->zip}";
		$meta_description = sprintf(
			'%s beds, %s baths in this %s located at %s%s Priced at $%s. See photos, schedule a showing, and request information for this beautiful listing.',
			(string) $listing->beds,
			(string) $listing->baths,
			$listing->style,
			$full_address,
			$neighborhood,
			(string) $listing->price
		);

		return $meta_description ?? $description;

	}

	public function set_listing_data_meta() {

		if ( ! $this->check_for_listing_detail() ) {
			return;
		}

		$this->set_listing();

		if ( empty( $this->listing ) ) {
			status_header( 404 );
			return;
		}

		$listing     = $this->listing;
		$fullAddress = "{$listing->address}, {$listing->city}, {$listing->state} {$listing->zip}";

		if ( ! empty( $listing->openHouses->data ) ) {
			$openHouseData = $listing->openHouses->data;

			foreach ( $openHouseData as $key => $openhouse ) {
				$timeWithNoSpaces = str_replace( ' ', '', $openHouseData[ $key ]->time );
				$bothTimes        = explode( '-', $timeWithNoSpaces );
				// certain values causing issues here adding extra check that it generates integer
				if ( is_int( strtotime( $bothTimes[0] ) ) ) {
					$startTime = date( 'H:i', strtotime( $bothTimes[0] ) );
				}
				if ( is_int( strtotime( $bothTimes[1] ) ) ) {
					$endTime = date( 'H:i', strtotime( $bothTimes[1] ) );
				}
				$startDate           = "{$openHouseData[$key]->year}-{$openHouseData[$key]->month}-{$openHouseData[$key]->day}T" . $startTime;
				$endDate             = "{$openHouseData[$key]->year}-{$openHouseData[$key]->month}-{$openHouseData[$key]->day}T" . $endTime;
				$startTime           = $openHouseData[ $key ]->time;
				$content             = array();
				$content['@context'] = 'https://schema.org';
				$content['@type']    = 'Event';
				if ( $listing->address ) {
					$content['name'] = 'Open House at ' . $listing->address;
				}
				if ( $listing->remarks ) {
					$content['description'] = $listing->remarks;
				}
				if ( $listing->photos->data[ $key ]->url ) {
					$content['image'] = $listing->photos->data[0]->url;
				}
				if ( $startDate ) {
					$content['startDate'] = $startDate;
				}
				if ( $endDate ) {
					$content['endDate'] = $endDate;
				}
				$content['location']['@type'] = 'Place';

				if ( $listing->address ) {
					$content['location']['name'] = $fullAddress ?? 'Unknown';
				}
				if ( $listing->address ) {
					$content['location']['address']['@type']         = 'PostalAddress';
					$content['location']['address']['streetAddress'] = $listing->address ?? 'Unknown';
				}
				if ( $listing->city ) {
					$content['location']['address']['addressLocality'] = $listing->city ?? 'Unknown';
				}
				if ( $listing->zip ) {
					$content['location']['address']['postalCode'] = $listing->zip ?? 'Unknown';
				}
				$content['location']['address']['addressCountry'] = Settings::get_setting( 'optimize_for_canada' ) ? 'CA' : 'US';

				echo '<script type="application/ld+json">' . json_encode( $content, JSON_UNESCAPED_SLASHES ) . '</script>';
			}
		}

		$detail_page_url  = trailingslashit( get_permalink( $this->detailsPageId ) );
		$site_url         = get_site_url();
		$listingDetailUrl = $detail_page_url . $listing->mls . '-' . $listing->mlsid . '-' . $this->get_slug( $listing->address ) . '-' . $this->get_slug( $listing->city ) . '-' . $listing->state . '-' . $listing->zip;
		$listingCity      = $listing->city ? $listing->city : 'No City';
		$listingAddress   = $listing->address ? $listing->address : 'No Address';
		echo '<script type="application/ld+json">
            {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "Listings",
                "item": "' . $site_url . '/listings-sitemap/"
            },{
                "@type": "ListItem",
                "position": 2,
                "name": "' . $listing->county . '",
                "item": "' . $site_url . '/listings-sitemap/homes-in-' . $listing->county . '?type=county"
            },{
                "@type": "ListItem",
                "position": 3,
                "name": "' . $listingCity . '",
                "item": "' . $site_url . '/listings-sitemap/homes-in-' . $listing->city . '?type=city"
            },{
                "@type": "ListItem",
                "position": 4,
                "name": "' . $listingAddress . '",
                "item": "' . $listingDetailUrl . '"
            }]
            }
        </script>';


		$neighborhood = ! empty( $listing->neighborhood ) ? " in the beautiful neighborhood of {$listing->neighborhood}." : '.';

		$metaDescription = sprintf(
			'%s beds, %s baths in this %s located at %s%s Priced at $%s. See photos, schedule a showing, and request information for this beautiful listing.',
			(string) $listing->beds,
			(string) $listing->baths,
			$listing->style,
			$fullAddress,
			$neighborhood,
			(string) $listing->price
		);
		$metaKeyWords    = sprintf(
			'mls listing id %s, %s, %s, homes, %s, homes for sale, %s real estate, houses, houses in %s, properties, properties in %s, property near %s, %s, %s, %s',
			(string) $listing->mlsid,
			$listing->address,
			(string) $listing->zip,
			$listing->city,
			$listing->city,
			$listing->county,
			(string) $listing->zip,
			(string) $listing->zip,
			$listing->state,
			$listing->style,
			$listing->typeName
		);

		$metaImage = $listing->photos->data[0]->url ?? '';

		$siteName = get_bloginfo( 'name' );

		$companyData = Api::request( 'GET', 'public/company/', array() );
		$companyName = $companyData->data->name;

		$listingVideo = ! empty( $this->listing->enhancements->data->virtualoh ) ? $this->listing->enhancements->data->virtualoh : ( ! empty( $this->listing->enhancements->data->virtualtour ) ? $this->listing->enhancements->data->virtualtour : false );
		echo "\r\n<link rel='canonical' href=\"$listingDetailUrl/\" />";
		echo "\r\n<meta name=\"description\" content=\"{$metaDescription}\" />";
		echo "\r\n<meta name=\"keywords\" content=\"{$metaKeyWords}\" />";

		if ( ! empty( $metaImage ) ) {
			echo "\r\n<meta name=\"image\" content=\"{$metaImage}\" />";
		}

		if ( $listingVideo ) {
			echo "\r\n\t<meta property=\"og:video\" content=\"{$listingVideo}\" />";
		}

		if ( ! defined( 'WPSEO_VERSION' ) ) {
			echo "\r\n\r\n\t<!-- OpenGraph Tags -->";
			$siteName = get_bloginfo( 'name' );
			echo "\r\n\t<meta property=\"og:locale\" content=\"en_US\" />";
			echo "\r\n\t<meta property=\"og:type\" content=\"place\" />";
			echo "\r\n\t<meta property=\"og:title\" content=\"{$fullAddress} - {$companyName}\" />";
			echo "\r\n\t<meta property=\"og:description\" content=\"{$metaDescription}\" />";
			echo "\r\n\t<meta property=\"og:url\" content=\"{$listingDetailUrl}\" />";
			echo "\r\n\t<meta property=\"og:site_name\" content=\"{$siteName}\" />";
			if ( ! empty( $metaImage ) ) {
				echo "\r\n\t<meta property=\"og:image\" content=\"{$metaImage}\" />";
			}
			echo "\r\n\t<!-- / OpenGraph -->\r\n";
		}

		echo "\r\n<meta property=\"place:location:latitude\" content=\"{$listing->lat}\" />";
		echo "\r\n<meta property=\"place:location:longitude\" content=\"{$listing->long}\" />";


		$sqft = isset($listing->sqft) ? $listing->sqft : '';
		$totalrooms = isset($listing->totalrooms) ? $listing->totalrooms : '';
		$baths = isset($listing->baths) ? $listing->baths : '';
		$halfbaths = isset($listing->halfbaths) ? $listing->halfbaths : '';
		$address = isset($listing->address) ? $listing->address : '';
		$city = isset($listing->city) ? $listing->city : '';
		$state = isset($listing->state) ? $listing->state : '';
		$zip = isset($listing->zip) ? $listing->zip : '';
		$lat = isset($listing->lat) ? $listing->lat : '';
		$long = isset($listing->long) ? $listing->long : '';
		$price = isset($listing->price) ? $listing->price : '';
		$beds = isset($listing->beds) ? $listing->beds : '';
		$bath = isset($listing->bath) ? $listing->bath : '';

		$singleFamilyHomeSchema = array(
			'@type'                    => 'SingleFamilyResidence',
			'@context'                 => 'http://schema.org',
			'name'                     => $fullAddress,
			'floorSize'                => array(
				'@type'    => 'QuantitativeValue',
				'@context' => 'http://schema.org',
				'value'    => $sqft,
			),
			'numberOfRooms'            => $totalrooms,
			'numberOfBedrooms'         => $totalrooms,
			'numberOfFullBathrooms'    => $baths,
			'numberOfPartialBathrooms' => $halfbaths,
			'address'                  => array(
				'@type'           => 'PostalAddress',
				'@context'        => 'http://schema.org',
				'streetAddress'   => $address,
				'addressLocality' => $city,
				'addressRegion'   => $state,
				'postalCode'      => $zip,
			),
			'geo'                      => array(
				'@type'     => 'GeoCoordinates',
				'@context'  => 'http://schema.org',
				'latitude'  => $lat,
				'longitude' => $long,
			),
			'url'                      => $listingDetailUrl,
		);
		echo "\r\n";
		echo '<script type="application/ld+json">' . json_encode( $singleFamilyHomeSchema, JSON_UNESCAPED_SLASHES ) . '</script>';

		$productSchema = array(
			'@type'       => 'Product',
			'@context'    => 'http://schema.org',
			'offers'      => array(
				'@type'         => 'Offer',
				'@context'      => 'http://schema.org',
				'price'         => $price,
				'priceCurrency' => Settings::get_setting( 'optimize_for_canada' ) ? 'CAD' : 'USD',
				'availability'  => 'http://schema.org/InStock',
				'url'           => $listingDetailUrl,
			),
			'name'        => $fullAddress,
			'description' => $beds . ' bed, ' . $bath . ' bath, ' . $sqft . ' sqft in ' . $city,
			'image'       => $metaImage,
		);
		echo "\r\n";
		echo '<script type="application/ld+json">' . json_encode( $productSchema, JSON_UNESCAPED_SLASHES ) . '</script>';
		echo "\r\n";

	}

	/**
	 * This function will check if a WordPress plugin is active
	 */
	public function is_plugin_active( $plugin ) {
		return in_array( $plugin, (array) get_option( 'active_plugins', array() ) );
	}

	/**
	 * This function will check if the request is for an agent detail page, get agent id, get agent info and set transient, then echo meta data.
	 */
	public function set_agent_meta_data() {
		$this->isAgentProfileRequest = $this->check_for_agent_detail();
		if ( ! $this->isAgentProfileRequest ) {
			return;
		}

		$agentId = $this->get_agent_id();
		$this->set_agent_transient( $agentId );
		if ( empty( $this->agent ) ) {
			return;
		}

		$siteName = get_bloginfo( 'name' );

		$this->agent->bio !== null ? $strippedBio = strip_tags( $this->agent->bio ) : $strippedBio = '';
		$metaKeyWords                             = "real estate, real estate agent, {$this->agent->first_name} {$this->agent->last_name}, $siteName";
		$metaDescription                          = ! empty( $this->agent->office->data )
			? "{$this->agent->first_name} {$this->agent->last_name}, Real Estate Agent in {$this->agent->office->data->name}, {$strippedBio}"
			: "{$this->agent->first_name} {$this->agent->last_name}, {$strippedBio}";

		if ( empty( $this->agent->bio ) ) {
			$metaDescription = "Looking to buy or sell a home? Choose {$this->agent->first_name} {$this->agent->last_name}, a licensed and professional real estate agent.";
		}

		if ( strlen( $metaDescription ) > 120 ) {
			$metaDescription = substr( $metaDescription, 0, 117 ) . '...';
		}

		echo "<meta name=\"description\" content=\"{$metaDescription}\" />";
		echo "<meta property=\"og:description\" content=\"{$metaDescription}\" />";
		echo "<meta name=\"keywords\" content=\"{$metaKeyWords}\" />";
		if ( ! empty( $this->agent->photo ) ) {
			echo "<meta name=\"image\" content=\"{$this->agent->photo}\" />";
			echo "<meta property=\"og:image\" content=\"{$this->agent->photo}\" />";
		}

		$agent_first_name = is_string( $this->agent->first_name ) ? strtolower( $this->agent->first_name ) : '';
		$agent_last_name  = is_string( $this->agent->last_name ) ? strtolower( $this->agent->last_name ) : '';
		$url_suffix       = ( '' !== ( $agent_first_name . $agent_last_name ) ) ? '-' . $agent_first_name . '-' . $agent_last_name : '';

		$agentUrl = get_permalink( $this->agentPageId ) . $agentId . $url_suffix;
		$site_url = get_site_url();
		$agentOfficeName = $this->agent->office->data->name ?? '';
		$agentOfficeId = $this->agent->office->data->id ?? '';
		echo '
        <script type="application/ld+json">
            {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{
                "@type": "ListItem",
                "position": 1,
                "name": "' . $agentOfficeName . '",
                "item": "' . $site_url . '/agents-sitemap/agents-in-' . $agentOfficeName . '?pass=2&entity=' . $agentOfficeId . '"
            },{
                "@type": "ListItem",
                "position": 2,
                "name": "' . $this->agent->full_name . '",
                "item": "' . $agentUrl . '"
            }]
            }
        </script>
        ';
	}

	public function set_meta_title_yoast( $value ) {
		$this->isAgentProfileRequest = $this->check_for_agent_detail();

		$siteName = get_bloginfo( 'name' );

		if ( $this->detailsPageId == get_the_ID() ) {
			$listing     = $this->listing;
			$fullAddress = "{$listing->address}, {$listing->city}, {$listing->state} {$listing->zip}";
			$metaTitle   = "{$fullAddress} | MLS# {$listing->mlsid} | {$siteName}";
			return $metaTitle;
		}

		if ( $this->isAgentProfileRequest ) {
			$agentId = $this->get_agent_id();
			$this->set_agent_transient( $agentId );

			if ( empty( $this->agent ) ) {
				status_header( 404 );
				return $value;
			}

			$metaTitle = ! empty( $this->agent->office->data )
			? "{$this->agent->first_name} {$this->agent->last_name}, {$this->agent->office->data->name} Real Estate Agent | $siteName"
			: "{$this->agent->first_name} {$this->agent->last_name}, Real Estate Agent | $siteName";
			return $metaTitle;
		}
		// other pages should return normally
		return $value;
	}

	// public function set_agent_meta_description($value)
	// {
	// $this->isAgentProfileRequest = $this->check_for_agent_detail();
	// if(!$this->isAgentProfileRequest)
	// return $value;
	//
	// $agentId = $this->get_agent_id();
	// $this->set_agent_transient($agentId);
	// if(empty($this->agent))
	// return $value;
	//
	// $metaDescription = "Looking to buy or sell a home? Choose {$this->agent->first_name} {$this->agent->last_name}, a licensed and professional real estate agent.";
	//
	// return $metaDescription;
	// }

	public function set_agent_meta_image( $value ) {
		$this->isAgentProfileRequest = $this->check_for_agent_detail();
		if ( ! $this->isAgentProfileRequest ) {
			return $value;
		}

		$agentId = $this->get_agent_id();
		$this->set_agent_transient( $agentId );
		if ( empty( $this->agent ) ) {
			return $value;
		}

		if ( ! empty( $this->agent->photo ) ) {
			return $this->agent->photo;
		}
		return $value;
	}

	public function set_agent_keywords( $value ) {
		$this->isAgentProfileRequest = $this->check_for_agent_detail();
		if ( ! $this->isAgentProfileRequest ) {
			return $value;
		}

		$agentId = $this->get_agent_id();
		$this->set_agent_transient( $agentId );
		if ( empty( $this->agent ) ) {
			return $value;
		}

		$siteName = get_bloginfo( 'name' );

		$metaKeyWords = "real estate, real estate agent, {$this->agent->first_name} {$this->agent->last_name}, $siteName";

		return $metaKeyWords;

	}

	/**
	 * Check if the current page is an agent detail page.
	 *
	 * @return bool
	 */
	private function check_for_agent_detail() {
		if ( $this->isAgentProfileRequest === false ) {
			return false;
		}

		if ( ! is_singular() ) {
			return false;
		}
		global $post;
		if ( ! empty( $post->post_content ) ) {
			// Get regex pattern
			$regex = get_shortcode_regex( array( 'kvcoreidx_agent_profile' ) );

			// Run regex on the post content. (Expected [kvcoreidx_agent_profile])
			preg_match_all( '/' . $regex . '/', $post->post_content, $matches );

			// The result, if correct, will be in $matches[2].
			if ( ! empty( $matches[2] ) && in_array( 'kvcoreidx_agent_profile', $matches[2] ) ) {
				return true;
			}
		}
		return false;

	}

	private function check_for_listing_detail() {
		$this->mls   = get_query_var( 'by-mls' );
		$this->mlsid = get_query_var( 'by-mlsid' );

		if ( empty( $this->mls ) && empty( $this->mlsid ) ) {
			$this->mls   = get_query_var( 'mls' );
			$this->mlsid = get_query_var( 'mlsid' );
		}

		if ( empty( $this->mls ) || empty( $this->mlsid ) ) {
			return false;
		}

		return true;
	}

	private function set_listing() {
		if ( ! $this->listing ) {
			$this->listing = get_transient( "kv_listing_detail_info_{$this->mls}_{$this->mlsid}" );

			if ( empty( $this->listing ) ) {
				$listingObj    = new Listing( $this->mls, $this->mlsid );
				$this->listing = $listingObj->get_data();
				if ( ! empty( $this->listing ) ) {
					set_transient( "kv_listing_detail_info_{$this->mls}_{$this->mlsid}", $this->listing, DAY_IN_SECONDS );
				}
			}
		}
	}

	/**
	 * Get agent id
	 *
	 * @return string
	 */
	private function get_agent_id() {
		global $wp_query;
		$agentId = $wp_query->query_vars['team-member'];
		if ( empty( $agentId ) ) {
			global $wp;
			preg_match_all( '/\/([0-9]+)-/m', $wp->request, $matches, PREG_SET_ORDER );
			$agentId = $matches[0][1] ?? '';
		}

		return $agentId;
	}

	/**
	 * Get agent data from kvcore then set agent transient
	 *
	 * @param $agentId
	 */
	private function set_agent_transient( $agentId ) {
		if ( empty( $this->agent ) ) {
			$data = Api::request( 'GET', 'public/members/' . $agentId, array() );
			if ( ! empty( $data->data ) ) {
				$agentTransient = $data->data;
				set_transient( "agent_profile_{$agentId}", $agentTransient, DAY_IN_SECONDS );
				$this->agent = $agentTransient;
			}
		}
	}



	public function maybe_output_share_meta() {
		$user_agent = isset( $_SERVER['HTTP_USER_AGENT'] ) ? $_SERVER['HTTP_USER_AGENT'] : '';

		if ( empty( $user_agent ) || ! is_string( $user_agent ) ) {
			return;
		}

		$user_agent = strtolower( $user_agent );

		$is_twitter  = false !== strpos( $user_agent, 'twitter' );
		$is_facebook = false !== strpos( $user_agent, 'facebook' );

		if ( $is_twitter ) {
			$meta_type = 'twitter';
		} elseif ( $is_facebook ) {
			$meta_type = 'facebook';
		} else {
			return;
		}

		$mls    = get_query_var( 'by-mls' );
		$mls_id = get_query_var( 'by-mlsid' );

		if ( empty( $mls ) && empty( $mls_id ) ) {
			$mls    = get_query_var( 'mls' );
			$mls_id = get_query_var( 'mlsid' );
		}

		$team_member_id = get_query_var( 'team-member' );

		if ( ! empty( $mls ) && ! empty( $mls_id ) ) {
			$meta_source = new Listing( $mls, $mls_id );
		} elseif ( ! empty( $team_member_id ) ) {
			$meta_source = new Agent( $team_member_id );
		} else {
			return;
		}

		if ( $meta_source->print_meta_init( $meta_type ) ) {
			$meta_source->print_meta_title();
			$meta_source->print_meta_image();
			$meta_source->print_meta_description();
		}
	}

	/**
	 * @return void
	 */
	public function listing_detail_sidebar() {
		$sidebars = kvCORE\Settings::get_setting( 'sidebars' );

		if ( ! is_array( $sidebars ) || count( $sidebars ) === 0 ) {
			return;
		}

		foreach ( $sidebars as $sidebar ) {
			register_sidebar(
				array(
					'id'   => $sidebar['id'],
					'name' => $sidebar['name'],
				)
			);
		}
	}

	/**
	 * @return void
	 */
	public function update_permalinks() {
		$should_update_permalinks = Settings::get_setting( 'should_update_permalinks' );

		if ( $should_update_permalinks ) {
			global $wp_rewrite;

			$wp_rewrite->set_permalink_structure( '/%postname%/' );
			$wp_rewrite->flush_rules();

			if ( function_exists( 'flush_rewrite_rules' ) ) {
				flush_rewrite_rules( true );
			}

			kvCORE\Admin\Page\Settings::update_setting( 'should_update_permalinks', false );
		}
	}

	public function set_sitemap_canonical() {
		if ( ! $this->check_for_shortcodes( array( 'kvcoreidx_listings_sitemap_ranges', 'kvcoreidx_listings_sitemap_page', 'kvcoreidx_agent_profile_sitemap', 'kvcoreidx_agent_profile' ) ) ) {
			return;
		}
		global $wp;
		$link  = home_url( $wp->request );
		$count = 0;
		foreach ( $_REQUEST as $key => $value ) {
			if ( $count++ === 0 ) {
				$link .= "/?{$key}={$value}";
				continue;
			}
			$link .= "&{$key}={$value}";
		}
		echo "<link rel='canonical' href=\"{$link}\" />";
	}

	public function yoast_remove_canonical_items( $canonical ) {
		if ( ! is_singular() ) {
			return $canonical;
		}
		if ( $this->check_for_shortcodes( array( 'kvcoreidx_listings', 'kvcoreidx_listing_detail_page', 'kvcoreidx_listings_sitemap_ranges', 'kvcoreidx_listings_sitemap_page', 'kvcoreidx_agent_profile_sitemap' ) ) ) {
			return false;
		}

		return $canonical;
	}

	public function check_for_shortcodes( $shortCodes ) {
		global $post;

		$post_content = $post->post_content ?? null;
		if ( ! empty( $post_content ) ) {
			foreach ( $shortCodes as $shortCode ) {
				// Get regex pattern
				$regex = get_shortcode_regex( array( $shortCode ) );

				// Run regex on the post content.
				preg_match_all( '/' . $regex . '/', $post_content, $matches );

				// The result, if correct, will be in $matches[2].
				if ( ! empty( $matches[2] ) && in_array( $shortCode, $matches[2] ) ) {
					return true;
				}
			}
		}
		if ( 'spark_page' === get_post_meta( $post->ID, 'afe_element_id', true ) ) {
			$afe_values   = get_post_meta( $post->ID, 'afe_values', true );
			$post_content = json_encode( $afe_values );
			foreach ( $shortCodes as $shortCode ) {
				// Get regex pattern
				$regex = get_shortcode_regex( array( $shortCode ) );

				// Run regex on the post content.
				preg_match_all( '/' . $regex . '/', $post_content, $matches );

				// The result, if correct, will be in $matches[2].
				if ( ! empty( $matches[2] ) && in_array( $shortCode, $matches[2] ) ) {
					return true;
				}
			}
		}
		return false;
	}

	protected function get_slug( $string ) {

		if ( ! is_string( $string ) ) {
			return '';
		}

		$result = strtolower( $string );

		$result = preg_replace( '/[^a-z0-9\s-]/', '', $result );
		$result = trim( preg_replace( '/[\s-]+/', ' ', $result ) );
		$result = ucwords( $result );
		$result = preg_replace( '/\s/', '-', $result );

		return $result;
	}

	public function remove_header_links() {
		if ( ! $this->check_for_shortcodes( array( 'kvcoreidx_listings', 'kvcoreidx_listing_detail_page', 'kvcoreidx_agent_profile' ) ) ) {
			return;
		}

		remove_action( 'wp_head', 'wp_shortlink_wp_head', 10 );
		remove_action( 'wp_head', 'wp_shortl', 10 );
		remove_action( 'template_redirect', 'wp_shortlink_header', 11 );

		remove_action( 'wp_head', 'rest_output_link_wp_head', 10 );
		remove_action( 'wp_head', 'wp_oembed_add_discovery_links', 10 );

		add_action( 'feed_links_show_posts_feed', '__return_false', -1 );
		add_action( 'feed_links_show_comments_feed', '__return_false', -1 );
		remove_action( 'wp_head', 'feed_links', 2 ); // Display the links to the general feeds: Post and Comment Feed
		remove_action( 'wp_head', 'feed_links_extra', 3 ); // Display the links to the extra feeds such as category feeds
	}

	public function maybe_flush_rewrite_rules() {
		if ( get_option( 'kvcoreidx_flush_rewrite_rules', 1 ) ) {
			flush_rewrite_rules();
			update_option( 'kvcoreidx_flush_rewrite_rules', 0 );
		}
	}

	// flush rewrite rules when page is saved if saved page is
	// one of the pages used by IDX (ie: updating url)
	public function save_post( $id ) {
		$idx_page_ids = array(
			Settings::get_setting( 'listing_detail_page' ),
			Settings::get_setting( 'properties_page' ),
			Settings::get_setting( 'agent_profile_page' ),
			Settings::get_setting( 'exclusives_page' ),
			Settings::get_setting( 'exclusive_detail_page' ),
			Settings::get_setting( 'valuation_pdf_page' ),
			Settings::get_setting( 'user_profile_page' ),
			Settings::get_setting( 'listings_sitemap_ranges_page' ),
			Settings::get_setting( 'listings_sitemap_page' ),
			Settings::get_setting( 'agents_sitemap_page' ),
			Settings::get_setting( 'area_page' ),
		);

		update_option( 'kvcoreidx_flush_rewrite_rules', 1 );
	}
}

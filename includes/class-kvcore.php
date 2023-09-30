<?php

declare( strict_types = 1 );

use kvCORE\Settings;

class kvCORE {
	protected static $instance = null;
	public static $active_idx_page = null;

	public static function init() {
		if( is_null( static::$instance ) ) {
			static::$instance = new static();
		}

		return static::$instance;
	}

	public function __construct() {
		kvCORE\Actions::init();
		kvCORE\Filters::init();

		$this->run();
	}

	public function run() {
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_styles' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ] );
	}

	public function enqueue_styles() {
		$stylesheets = [
			'font_awesome' => 'https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css',
			'material_icons' => 'https://fonts.googleapis.com/icon?family=Material+Icons&display=swap',
			'kvcoreidx' => KVCORE_IDX_PUBLIC_URL . 'css/kvcoreidx.css',
		];

		$doNotLoadFontAwesome = Settings::get_setting( 'not_load_font_awesome' );
		if ($doNotLoadFontAwesome) {
			unset($stylesheets['font_awesome']);
		}

		foreach ( $stylesheets as $name => $src ) {
			wp_enqueue_style( KVCORE_IDX_PLUGIN_NAME . $name, $src, [], KVCORE_IDX_PLUGIN_VERSION, 'all' );
		}
	}

	public function enqueue_scripts() {
		$this->set_active_idx_page();

		$js_url = KVCORE_IDX_PUBLIC_URL . 'js/';
		$core_js_file_handle = KVCORE_IDX_PLUGIN_NAME . '_core';

		$options = kvCORE\Settings::get_settings();

		if ( \kvCORE\Admin::allow_custom_templates() ) {
			$options['customViews'] = \kvCORE\Settings\Custom_Templates::get_custom_template_uri_array();
		}

		wp_enqueue_script(
			$core_js_file_handle, $js_url . 'kvcoreidx.js',
			[ 'jquery' ], KVCORE_IDX_PLUGIN_VERSION, true
		);

		wp_enqueue_script('jquery-validate', 'https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.16.0/jquery.validate.min.js', [], '1.16.0');

		wp_enqueue_script('jquery-mask', 'https://cdnjs.cloudflare.com/ajax/libs/jquery.maskedinput/1.4.1/jquery.maskedinput.js', [], '1.4.1');

		global $wp_query;

		$has_url_request = count( $_REQUEST );
		$listings_per_row = kvCORE\Settings::get_setting('listings/per_row');
		$listings_per_page = kvCORE\Settings::get_setting('listings/per_page');
		$team_per_row = kvCORE\Settings::get_setting('team/per_row');
		$team_per_page = kvCORE\Settings::get_setting('team/per_page');
		$domain_settings = kvCORE\Api::request( 'POST', 'public/domain' );
		$has_drive_time = isset($domain_settings->settings->drivetime ) ? $domain_settings->settings->drivetime : null;
        $domain_settings_state = isset($domain_settings->state ) ? $domain_settings->state : null;
        $domain_settings_name = isset($domain_settings->name ) ? $domain_settings->name : null;
        $domain_settings_mlses_serviced = isset($domain_settings->settings->mlses_serviced ) ? $domain_settings->settings->mlses_serviced : null;
        $domain_settings_popularoptions = isset($domain_settings->settings->popularoptions ) ? $domain_settings->settings->popularoptions : null;
        $domain_settings_type = isset($domain_settings->type ) ? $domain_settings->type : null;
        $authorization_token = isset($options['authorization_token']) ? $options['authorization_token'] : '';
        $mapbox_access_token = isset($options['mapbox_access_token']) ? $options['mapbox_access_token'] : '';

		wp_localize_script( $core_js_file_handle, "kvcoreidxConfig", apply_filters( 'kvcoreidx/js/config', [
			'plugin' => [
				'Version' => KVCORE_IDX_PLUGIN_VERSION,
				'Name' => 'kvcoreidx'
			],
			'siteUrl' => get_site_url(),
			'siteName' => get_bloginfo('name'),
			'homeUrl' => get_home_url(),
			'currentUrl' => get_home_url(null, $_SERVER['REQUEST_URI']),
			'publicUrl' => KVCORE_IDX_PUBLIC_URL,
			'jsUrl' => $js_url,
			'apiUrl' => rtrim(kvCORE\Settings::get_api_url(), '/' ) . '/',
			'restNamespace' => rest_url('kvcoreidx/v1/'),
			'adminRestNamespace' => rest_url( 'kvcoreidx/v1' . \kvCORE\Admin::REST_NAMESPACE ),
			'socialApi' => rest_url('kvcoreidx/v1/social-login'),
			'apiKey' => $authorization_token,
			'mapsApi' => $mapbox_access_token,
			'listingApi' => 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIsImFjdCI6MjEsImp0aSI6ImtAZWFhJDdUZHJtTVlSJV5wWSN6N2dyZll3I05weGZhSWtqT3BZayFHY1VeSjRAZzJtZlNQZHBRZFZNTiFtZ28iLCJuYmYiOjE1OTMwNDA1NTUsImV4cCI6MTYyNDU3NjU1NSwiaWF0IjoxNTkzMDQwNTU1LCJhdWQiOiJsaXN0aW5ncyJ9.3zZA9G-W-BZIc3BjflQcLJI9lPSG86ltpdfOVSh-KH0',
			'wrapper_class' => implode( ' ', apply_filters('kvcoreidx/wrapper_class', [ 'kvcore' ] ) ),
			'additional_scripts' => $this->get_additional_scripts( $js_url ),
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'nonce' => wp_create_nonce( 'wp_rest' ),
			// temporarily send all options to JS
			'options' => $options,
			'user' => [
				'lead_id' => null,
				'display_name' => null,
				'user_profile' => [],
				'saved_properties' => [],
			],
			'pages' => kvCORE\Settings::get_plugin_page_urls(),
			'activeIdxPage' => self::$active_idx_page,
			'defaultFilters' => apply_filters( 'kvcoreidx/search/default_filters', [
				'perRow' => !empty($listings_per_row) ? $listings_per_row : 4,
				'perPage' => 800
			] ),
			'defaultTeamFilters' => apply_filters( 'kvcoreidx/team/default_filters', [
				'perRow' => !empty($team_per_row) ? $team_per_row : 4,
				'perPage' => !empty($team_per_page) ? $team_per_page : 24,
			] ),
			'listingTypes' => kvCORE\Settings::get_listing_types(),
			'hasDriveTime' => $has_drive_time,
			'parentDomain' => $this->get_parent_domain($domain_settings),
			'parentState' => $domain_settings_state,
			'parentName' => $domain_settings_name,
			'mlsesServiced' => $domain_settings_mlses_serviced,
			'enableSoldData' => $domain_settings->account_settings->enable_sold_data,
			'vowWebsiteConfiguration' => $domain_settings->account_settings->vow_website_configuration,
			'allowSoldOnWebsites' => $domain_settings->account_settings->allow_sold_on_websites,
			'soldDataActive' => $domain_settings->account_settings->sold_data_active,
			'popularOptions' => $domain_settings_popularoptions,
			'websiteOwnerType' => $domain_settings_type,
			'listingAreas' => $this->get_listing_areas_transient(),
			'openListingsInNewTab' => (kvCORE\Settings::get_setting('listings/open_in_new_tab') ? 'true' : '' ),
			'openTeamMembersOfficesInNewTab' => (kvCORE\Settings::get_setting('team/open_in_new_tab') ? 'true' : '' ),
			'showPrequalifyButton' => (kvCORE\Settings::get_setting('listing_detail/show_prequalify_button') ? 'true' : '' ),
			'showListingAgentAndMLSInHeader' => (kvCORE\Settings::get_setting('listing_detail/show_listing_agent_and_mls_in_header') ? 'true' : '' ),
			'showMLSDisclaimerInHeader' => (kvCORE\Settings::get_setting('listing_detail/show_mls_disclaimer_in_header') ? 'true' : '' ),
			'showMLSLogoInHeader' => (kvCORE\Settings::get_setting('listing_detail/show_mls_logo_in_header') ? 'true' : '' ),
			'hideListingDate' => (kvCORE\Settings::get_setting('listing_detail/hide_listing_date') ? 'true' : '' ),
			'query' => $wp_query->query_vars,
			'enableDebug' => current_user_can('edit_pages') ? 'true' : 'false',
			'isAdmin' => current_user_can('edit_pages') ? 'true' : 'false',
			'request' => [
				'args' => $has_url_request ? $_REQUEST : [],
				'url'  => $has_url_request ? http_build_query( $_REQUEST ) : '',
				'converted' => $this->convert_request(),
				'userAgent' => $_SERVER['HTTP_USER_AGENT']
			],
			'propertyDetailCategories' => apply_filters(
				'kvcoreidx/listings/property_detail_categories', $this->get_default_property_detail_categories()
			)
		] ) );
	}

	/**
	 * @param string $js_url
	 * @return array
	 */
	private function get_additional_scripts( $js_url ): array {
		$result = [];

		$directory = KVCORE_IDX_PUBLIC_PATH . 'js/frontend/';

		$post = get_post();

		$detail_page_id = kvCORE\Settings::get_setting( 'listing_detail_page' );
		$exclusive_detail_page_id = kvCORE\Settings::get_setting( 'exclusive_detail_page' );
		$team_page_id = kvCORE\Settings::get_setting( 'team_page' );
		$agent_profile_id = kvCORE\Settings::get_setting( 'agent_profile_page' );
		$offices_page_id = kvCORE\Settings::get_setting( 'offices_page' );
		$user_profile_id = kvCORE\Settings::get_setting( 'user_profile_page' );
		$terms_page_id = kvCORE\Settings::get_setting( 'terms_of_use_page' );
		$market_report_page_id = kvCORE\Settings::get_setting( 'market_report_page' );
		$valuation_report_page_id = kvCORE\Settings::get_setting( 'valuation_report_page' );
		$valuation_pdf_page_id = kvCORE\Settings::get_setting( 'valuation_pdf_page' );
		$contact_form_page_id = kvCORE\Settings::get_setting( 'contact_form_page' );

		$post_names = apply_filters( 'kvcoreidx/plugin/post_names', [
			$detail_page_id => 'detail-v2',
			$exclusive_detail_page_id => 'detail-v2',
			$team_page_id => 'team',
			$agent_profile_id => 'agent-profile',
			$offices_page_id => 'offices',
			$user_profile_id => 'profile',
			$terms_page_id => 'terms',
			$market_report_page_id => 'market-report',
			$valuation_report_page_id => 'market-report',
			$valuation_pdf_page_id => 'valuation-pdf',
			$contact_form_page_id => 'contact-form',
		] );

		$post_name = $post_names[$post->ID] ?? '';


		//Deprecation of listing_detail v1.
//		// Temporary check to load correct detail script
//		if ($post_name === 'detail' && kvCORE\Settings::get_setting('listing_detail_design') === 'v2') {
//			$post_name .= '-v2';
//		}

		if ( file_exists( "{$directory}page/{$post_name}.js" ) ) {
			$result[] = $js_url . "frontend/page/{$post_name}.js";
		}

		return $result;
	}

	/**
	 * @return array
	 */
	private function get_listing_areas_transient(): array {
		$area_list_transient_name = KVCORE_IDX_PLUGIN_NAME . '_area_list';

		$areas = get_transient( $area_list_transient_name );

		if ( !is_array( $areas ) || empty($areas) ) {
			$areas_list = kvCORE\Api::request( 'GET', 'public/areas' );

			$areas_list = $areas_list->areas ?? [];
			$areas = [];

			foreach( $areas_list as $index => $area_data ) {
				$areas[$index] = $area_data;
			}

			set_transient( $area_list_transient_name, $areas, 2 * DAY_IN_SECONDS );
		}

		return $areas;
	}

	/**
	 * @return void
	 */
	private function set_active_idx_page() {
		$active_idx_page = null;
		$plugin_pages = kvCORE\Admin\Page\Settings::get_plugin_pages();
		$post_id = get_post()->ID;

		foreach ($plugin_pages as $plugin_page) {
			$plugin_page_post_id = (int) kvCORE\Settings::get_setting("{$plugin_page['id']}_page");
			if ($plugin_page_post_id === $post_id) {
				$active_idx_page = $plugin_page['id'];
				break;
			}
		}

		self::$active_idx_page = $active_idx_page;
	}

	/**
	 * @return string
	 */
	private function get_parent_domain( $domain ) {
	    $domain_parent_size = isset($domain->parent_site) ? $domain->parent_site : false;
        $domain_parent_size_domain = isset($domain->parent_site->domain) ? $domain->parent_site->domain : '';
        $domain_domain = isset($domain->domain) ? $domain->domain : '';

		return $domain_parent_size ? $domain_parent_size_domain : $domain_domain;
	}

	/**
	 * @return array
	 */
	private function get_default_property_detail_categories(): array {
		return [
			[
				'label' => 'General Information',
				'data_points' => [
					[
						'label' => 'Brokerage Name',
						'name' => 'brokername'
					],
					[
						'label' => 'MLS Number',
						'name' => 'mlsid'
					],
					[
						'label' => 'County',
						'name' => 'county'
					],
					[
						'label' => 'City',
						'name' => 'city'
					],
					[
						'label' => 'Zip',
						'name' => 'zip'
					],
					[
						'label' => 'Style',
						'name' => 'style'
					],
					[
						'label' => 'Year Built',
						'name' => 'yearbuilt'
					],
					[
						'label' => 'Taxes',
						'name' => 'taxes'
					],
					[
						'label' => 'Price',
						'name' => 'price'
					],
					[
						'label' => 'Bedrooms',
						'name' => 'beds'
					],
					[
						'label' => 'Full Baths',
						'name' => 'baths'
					],
					[
						'label' => 'Half Baths',
						'name' => 'halfbaths'
					],
					[
						'label' => 'Footage',
						'name' => 'footage'
					],
					[
						'label' => 'Lot Size',
						'name' => 'acreage'
					],
				],
			],
		];
	}

	/**
	 * Convert options array to id->name collection
	 *
	 * @param $array
	 * @param string $name_key
	 * @return array
	 */
	public static function array_to_collection( $array, $name_key = 'name' ): array {
		$collection = [];

		$canada = Settings::get_setting( 'optimize_for_canada' );

        foreach ( $array as $key => $value ) {

            //Don't want to show short sales or reduced filters when Canada optimization is set.
            if(($value === "Short Sales" || $value === "Reduced") && $canada) {
                continue;
            }

			$collection[] = [ 'id' => $key, $name_key => $value ];
		}

		return $collection;
	}

	/**
	 * @param $collection
	 * @param $replacements
	 */
	public static function rename_collection_keys( &$collection, $replacements ) {
		$keys_to_replace = array_keys($replacements);

		foreach ( $collection as &$item ) {
			foreach ($item as $key => $value) {
				if (in_array($key, $keys_to_replace)) {
					$item[$replacements[$key]] = $value;
					unset($item[$key]);
				}
			}
		}
	}

	/**
	 * @return array
	 */
	private function convert_request(): array {
		$filtersPipe = [
			'acresMax', 'acresMin', 'agents', 'baths', 'beds', 'footageMax', 'footageMin', 'garageCapacity',
			'halfBaths', 'listingEnd', 'listingStart', 'maxDaysOnSite', 'maxYear', 'minDaysOnSite', 'options',
			'order', 'ourListings', 'ownerListings', 'priceMax', 'priceMin', 'propertyFeature', 'propertyStatus',
			'propertyTypes', 'propertyViews', 'stories', 'styles', 'year', 'buildingStyles', 'keywords'
		];

		$filtersSemicolon = [ 'area' ];

		$arrayFilters = [
			'agents', 'area', 'options', 'propertyTypes', 'propertyFeature', 'propertyViews', 'styles', 'buildingStyles', 'keywords'
		];

		$request = [];

		foreach ( $_REQUEST as $param => $value ) {
			$usePipe = in_array( $param, $filtersPipe );
			$useSemicolon = in_array( $param, $filtersSemicolon );

			if ( !is_string($value) || (!$usePipe && !$useSemicolon) ) {
				$request[$param] = $value;
				continue;
			}

			$delimeter = $usePipe ? '|' : ';';

			// convert piped to array
			if ( strpos( $value, $delimeter ) !== false ) {
				$value = explode( $delimeter, $value );
			} elseif ( in_array( $param, $arrayFilters ) ) {
				$value = [ $value ];
			}

			$request[$param] = $value;
		}

		return $request;
	}
}

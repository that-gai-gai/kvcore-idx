<?php

declare( strict_types=1 );

namespace kvCORE\Admin\Page;

use kvCORE;
use kvCORE\Admin\Page;
use kvCORE\View;

/**
 * Class Settings
 * @package kvCORE\Admin\Page
 */
class Settings extends Page {
	const PAGE_SLUG = 'kvcoreidx_settings';

	/**
	 * @var null
	 */
	protected $authorization_token = null;

	/**
	 * @var null | array
	 */
	protected $pages = null;

	public function __construct($sOptionKey = null, $sCallerPath = null, $sCapability = 'manage_options', $sTextDomain = 'kvcore') {
		if ( isset( $_GET['page'] ) && static::PAGE_SLUG === $_GET['page'] ) {
			add_filter( 'kvcoreidx/admin/enqueue_script', '__return_true' );
			add_filter( 'kvcoreidx/admin/enqueue_style', '__return_true' );
		}

		parent::__construct($sOptionKey, $sCallerPath, $sCapability, $sTextDomain);
	}

	public function __call( $sMethodName, $aArgs = null ) {
		$get_settings_method_name_prefix = 'load_' . static::PAGE_SLUG . '_';

		if( $get_settings_method_name_prefix === substr( $sMethodName, 0, strlen($get_settings_method_name_prefix ) ) ){
			$settings_page_name = str_replace( $get_settings_method_name_prefix, "", $sMethodName);

			return $this->_load_kvcoreidx_settings_custom_tab( $settings_page_name, $aArgs );
		} else {
			return parent::__call( $sMethodName, $aArgs );
		}
	}

	public function content( $sContent ) {
	    return apply_filters('kvcoreidx/admin/settings/content', $sContent);
    }

	/**
	 * @param $old_value
	 * @param $new_value
	 */
	public function on_save_settings( $old_value, $new_value ) {
		kvCORE\Settings::delete_cached_brand_css();

		if ( $this->should_flush_rewrite_rules( $old_value, $new_value ) ) {
            update_option('kvcoreidx_flush_rewrite_rules', 1);
		}

		if ( $new_value['area_page'] ?? null ) {
		    kvCORE\Areas_Table::maybe_create_or_update_database();
        }

		parent::on_save_settings( $old_value, $new_value );
	}

	/**
	 * @param array $old_values
	 * @param array $new_values
	 *
	 * @return bool
	 */
	protected function should_flush_rewrite_rules( $old_values = [], $new_values = [] ) {
		$plugin_pages = static::get_plugin_pages();

		foreach ( $plugin_pages as $i => $page ) {
			$option_name = "{$page['id']}_page";

			$old_value = $old_values[ $option_name ] ?? null;
			$new_value = $new_values[ $option_name ] ?? null;

			if ( $old_value !== $new_value ) {
				return true;
			}
		}

		return false;
	}

	/**
	 *
	 */
	public function setUp() {
		// load authorization_token - used to determine if
		// we should show tabs or not
		$this->authorization_token = static::get_setting( 'authorization_token' );

		add_action( 'admin_menu', function(){
			add_menu_page( 'kvCORE', 'kvCORE', 'manage_options', static::PAGE_SLUG, '', "data:image/svg+xml;base64," . base64_encode( file_get_contents( KVCORE_IDX_PLUGIN_PATH . 'admin/images/kvcoreidx-icon.svg' ) ) );
		}, 0, 10);

		$this->addSubMenuItem(
			[
				'title'     => 'kvCORE IDX Settings',
				'page_slug' => static::PAGE_SLUG,
			]
		);

		if ( $this->authorization_token ) {
			$settings_tabs = [];

			if( apply_filters( 'kvcoreidx/admin/settings/tabs/activation/enable', true ) ) {
				$settings_tabs[] = [
					'tab_slug' => 'activation',
					'title'    => __( 'Setup', 'kvcoreidx' ),
				];
			}

			$settings_tabs = array_merge($settings_tabs, apply_filters('kvcoreidx/admin/settings/tabs', [
				[
					'tab_slug' => 'branding',
					'title'    => __( 'Branding & Colors', 'kvcoreidx' ),
				],
				[
					'tab_slug' => 'pages',
					'title'    => __( 'IDX Pages', 'kvcoreidx' ),
				],
				[
					'tab_slug' => 'page_options',
					'title'    => __( 'IDX Page Options', 'kvcoreidx' ),
				],
				[
					'tab_slug' => 'registration',
					'title'    => __( 'Lead Registration', 'kvcoreidx' ),
				],
				[
					'tab_slug' => 'social',
					'title'    => __( 'Social', 'kvcoreidx' ),
				],
				[
					'tab_slug' => 'custom_scripts',
					'title'    => __( 'Custom Scripts', 'kvcoreidx' ),
				],
			]));

			if ( KVCORE_IDX_ENABLE_AREA_PAGES ) {
                $settings_tabs = array_merge($settings_tabs, [
                    [
                        'tab_slug' => 'area_pages',
                        'title'    => __( 'Area Pages', 'kvcoreidx' ),
                    ],
                ]);
            }

			$settings_tabs_deduped = [];
			$settings_tabs_slugs = $settings_tabs;

			foreach ( $settings_tabs as $i => $v ) {
				if( ! isset( $settings_tabs_slugs[ $v['tab_slug'] ] ) ) {
					$settings_tabs_slugs[ $v['tab_slug'] ] = 1;
					$settings_tabs_deduped[] = $v;
				}
			}

			$settings_tabs = $settings_tabs_deduped;

			$page_slug = static::PAGE_SLUG;

			foreach( $settings_tabs as $i => $tab ) {
				$load_function_name = "load_{$page_slug}_{$tab['tab_slug']}";

				if ( ! method_exists( $this, $load_function_name ) && is_callable( [ $this, $load_function_name ] ) ) {
					add_action ( $load_function_name, [ $this, $load_function_name ] );
				}
			}

			call_user_func_array( [ $this, 'addInPageTabs' ], array_merge( [ static::PAGE_SLUG ], $settings_tabs ) );

			$this->setPageHeadingTabsVisibility( false );
			$this->setInPageTabTag( 'h2' );
		}
	}

	/**
	 * @param $tab_name
	 * @param $args
	 */
	protected function _load_kvcoreidx_settings_custom_tab( $tab_name, $args = [] ) {
		new \kvCORE_AceCustomFieldType( get_class( $this ) );

		$require_auth_token = apply_filters(  "kvcoreidx/admin/settings/tab/{$tab_name}/require_auth_token", true );

		if( $this->authorization_token || ! $require_auth_token ) {
			$this->_add_fields_to_tab( $tab_name, [] );
		}
	}

	protected function _add_fields_to_tab( $tab_name, $fields = [], $add_submit_button = true ) {
		$fields = apply_filters( "kvcoreidx/admin/settings/tab/{$tab_name}/fields", $fields );

		if( count( $fields ) ) {
			if( true === $add_submit_button ) {
				$fields[] = 			[
					'field_id' => 'submit_button',
					'type'     => 'submit',
					'save'     => false,
				];
			}

			call_user_func_array( [ $this, 'addSettingFields' ], $fields );
		}
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_activation( $oAdminPage ) {
		/**
		 * don't return early, as we want activation settings
		 * to show even if there is no authorization_token
		 * since user needs to be able to enter api key + url
		 */

		$selected_api_url = kvCORE\Settings::get_setting('api_url' );

		$default_api_version = 'live';

		if ( $selected_api_url && trim( $selected_api_url, '/' ) !== 'https://api.kvcore.com' ) {
			$default_api_version = 'custom';
		}

		$this->_add_fields_to_tab(
			'activation',
			[
				[
					'field_id'          => 'info',
					'type'              => 'hidden',
					'description'       => __( '<a href="https://help.insiderealestate.com/en/articles/3317219-kvcore-wordpress-shortcodes" target="_blank">Please click here to see the available shortcodes</a>', 'kvcoreidx' ),
					'show_title_column' => false,
					'save'              => false
				],
				[
					'field_id'          => 'api_version',
					'type'              => 'select',
					'title'             => 'kvCORE API Host',
					'description'       => 'Set the API host to communicate with. Options are:<br><ul><li><strong>Live</strong>: live API</li><li><strong>Staging</strong>: staging API</li><li><strong>WP-JSON</strong>: proxies through /wp-json/ on local URL (useful for caching, additional data filters, etc)</li><li><strong>Custom</strong>: enter a custom URL as provided by kvCORE, or if you have a custom proxy set up</li></ul>',
					'default'           => $default_api_version,
					'label'         => [
						'live' => __('Live', 'kvcoreidx' ),
						'staging' => __('Staging', 'kvcoreidx' ),
						'wp-json' => __('WP-JSON Proxy', 'kvcoreidx' ),
						'custom' => __('Custom', 'kvcoreidx' ),
					],
					'attributes'  => [
						'select' => [
							'data-conditional' => 'conditional',
							'data-show' => json_encode([
								'custom' => [ 'api_url' ],
							]),
						]
					],
 				],
				[
					'field_id'          => 'api_url',
					'type'              => 'text',
					'title'             => 'Custom API URL',
					'description'       => 'Set the API URL to communicate with.',
					'default'           => 'https://api.kvcore.com/',
					'attributes'  => [
						'data-conditional' => 'conditional',
						'data-hide' => json_encode([
							'self' => true,
						]),
					],
				],
				[
					'field_id'          => 'logged_in_admin_api_version',
					'type'              => 'select',
					'title'             => 'kvCORE API Host for Logged-in WP Admins',
					'description'       => 'Set the API host to communicate with when user is logged in as a WP Admin.',
					'default'           => 'default',
					'label'         => [
						'live' => __('Live', 'kvcoreidx' ),
						'staging' => __('Staging', 'kvcoreidx' ),
						'wp-json' => __('WP-JSON Proxy', 'kvcoreidx' ),
						'custom' => __('Custom', 'kvcoreidx' ),
					],
					'attributes'  => [
						'select' => [
							'data-conditional' => 'conditional',
							'data-show' => json_encode([
								'custom' => [ 'logged_in_admin_api_url' ],
							]),
						]
					],
 				],
				[
					'field_id'          => 'logged_in_admin_api_url',
					'type'              => 'text',
					'title'             => 'Custom API URL for Logged-in WP Admins',
					'description'       => 'Set the API URL to communicate with for Logged-in WP Admins.',
					'default'           => 'https://api.kvcore.com/',
					'attributes'  => [
						'data-conditional' => 'conditional',
						'data-hide' => json_encode([
							'self' => true,
						]),
					],
				],
				[
					'field_id'          => 'authorization_token',
					'type'              => 'text',
					'title'             => 'kvCORE Authorization Token',
					'description'       => 'For kvCORE Authorization Token please get in touch with the kvCORE.',
				],
				[
					'field_id'          => 'mapbox_access_token',
					'type'              => 'text',
					'title'             => 'Mapbox Access Token',
					'description'       => 'Please <a href="https://www.mapbox.com/signup/" target="_blank">sign up for Mapbox</a> or <a href="https://www.mapbox.com/account/access-tokens" target="_blank">log in to your Mapbox account</a> to retrieve your access token.',
				],
				[
					'field_id'          => 'hide_market_report_links',
					'type'              => 'checkbox',
					'title'             => 'Hide Market Report Links',
					'description'       => 'The links "Get FREE Market Report" appear on search results pages. Use this setting to hide them.',
				],
				[
					'field_id'          => 'optimize_for_canada',
					'type'              => 'checkbox',
					'title'             => 'Optimize for Canada',
					'description'       => 'Optimize plugin for use in Canada. Change verbiage to Province and Postal Code instead of State and Zip, hide pending and contingent listings, and hide historical price data.',
				],
				[
					'field_id'          => 'not_load_font_awesome',
					'type'              => 'checkbox',
					'title'             => 'Do Not Load Font Awesome',
					'description'       => 'Our plugin uses version 4.7 of Font Awesome. If you want to load another version this can be used to avoid version conflicts.',
				],
				[
					'field_id'          => 'create_required_pages',
					'type'              => 'submit',
					'label'             => 'Run',
					'title'             => 'Create Required Pages',
					'description'       => 'Click "Run" to automatically create all of the pages that are required for the plugin.',
					'default'           => '',
				]
			]
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_branding( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		$plugin_colors = static::get_plugin_colors();

		$tab_fields = [
			[
				'field_id'      => 'design',
				'type'          => 'radio',
				'title'         => 'Cards And Filters Design',
				'label'         => [
					'v1' => 'Design v1',
					'v2' => 'Design v2',
				],
				'default'       => 'v2'
			],
			[
				'field_id'      => 'listing_detail_design',
				'type'          => 'radio',
				'title'         => 'Listing Detail Design',
				'label'         => [
//					'v1' => 'Design v1',
					'v2' => 'Design v2'
				],
				'default'       => 'v2',
                'description'   => 'Listing Detail Design v1 is no longer supported. Please click v2 design. The new design requires full-width page with [kvcoreidx_listing_detail_page] shortcode.'
//				'description'   => 'The original listing detail page design will be retired on 3/1/19. Please update to the new design prior to March 1st to avoid any issues with your website. New design requires full-width page with [kvcoreidx_listing_detail_page] shortcode.'
			],
			[
				'field_id'      => 'agent_profile_design',
				'type'          => 'radio',
				'title'         => 'Agent Profile Design',
				'label'         => [
//					'v1' => 'Design v1',
					'v2' => 'Design v2',
				],
				'default'       => 'v2',
				'description'   => 'Agent Profile page design v1 is no longer supported. Please click v2 design.'
//				'description'   => 'The original agent profile page design will be retired on 3/1/19. Please update to the new design prior to March 1st to avoid any issues with your website.'
			]
		];

		foreach ( $plugin_colors as $i => $color ) {
			$tab_fields[] = [
				'field_id'    => "{$color['id']}_color",
				'type'        => 'color',
				'title'       => $color['label'],
				'description' => $color['description'] ?? '',
				'default'     => $color['default'] ?? '#fff',
			];
		}

		$this->_add_fields_to_tab(
			'branding',
			$tab_fields
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_pages( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		$plugin_pages = static::get_plugin_pages();

		$tab_fields = [];

		foreach ( $plugin_pages as $i => $page ) {
			$tab_fields[] = [
				'field_id'    => "{$page['id']}_page",
				'type'        => 'select',
				'title'       => $page['label'],
				'description' => $page['description'],
				'label'       => [
						0 => '--- ' . __( 'Disable this Page', 'kvcoreidx' ) . ' ---',
					] + $this->get_pages(),
			];
		}

		$this->_add_fields_to_tab(
			'pages',
			$tab_fields
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_page_options( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		$collapsible_settings = [
			'container'         => 'section',
			'toggle_all_button' => false,
			'is_collapsed'      => false,
		];

		$this->addSettingSections(
			'kvcoreidx_settings',
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'listings',
				'title'         => __( 'Listings', 'kvcoreidx' ),
				'collapsible'   => $collapsible_settings,
			],
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'team',
				'title'         => __( 'Offices/Roster', 'kvcoreidx' ),
				'collapsible'   => $collapsible_settings,
			],
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'listing_detail',
				'title'         => __( 'Listing Detail', 'kvcoreidx' ),
				'collapsible'   => $collapsible_settings,
			],
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'agent_profile',
				'title'         => __( 'Agent Profile', 'kvcoreidx' ),
				'collapsible'   => $collapsible_settings,
			],
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'lender_info',
				'title'         => __( 'Lender Info', 'kvcoreidx' ),
				'collapsible'   => $collapsible_settings,
			],
			[
				'tab_slug'      => 'page_options',
				'section_id'    => 'page_options_submit',
				'save'          => false,
			]
		);

		$listing_types = static::get_supported_types_key_value();

		$this->addSettingFields(
			'listings',
			[
				'field_id'      => 'per_row',
				'type'          => 'radio',
				'title'         => __( 'Max Listings Per Row', 'kvcoreidx' ),
				'label'         => [
					'auto'  => 'Auto',
					2       => 2,
					3       => 3,
					4       => 4,
					6       => 6,
				],
				'default'       => 'auto',
			],
			[
				'field_id'      => 'per_page',
				'type'          => 'radio',
				'title'         => __( 'Listings Per Page', 'kvcoreidx' ),
				'label'         => [
					12    => 12,
					24    => 24,
					48    => 48,
				],
				'default'       => 24,
			],
			[
				'field_id'      => 'types',
				'type'          => 'select',
				'is_multiple'   => true,
				'title'         => __( 'Listing Types Supported <small>(Hold ctrl/cmd for multiple)</small>', 'kvcoreidx' ),
				'label'         => $listing_types,
				'default'       => array_keys($listing_types),
				'attributes'    => [
					'select'    => [
						'size'      => min(count($listing_types), 15),
					],
				],
			],
            [
                'field_id'      => 'inherit_kvcore_county_settings',
                'type'          => 'checkbox',
                'title'         => __( 'Match kvCORE County Settings', 'kvcoreidx' ),
			],
			[
				'field_id'      => 'open_in_new_tab',
				'type'          => 'checkbox',
				'title'         => __( 'Open Listing In New Tab', 'kvcoreidx' ),
			],
			[
				'field_id'      => 'default_to_map_view',
				'type'          => 'checkbox',
				'title'         => __( 'Default To Map View', 'kvcoreidx' ),
				'description'       => 'We recommend you use default to map view for polygon searches.',
			],
            [
                'field_id'      => 'neighborhood_school_boundary_search',
                'type'          => 'checkbox',
				'title'         => __( 'Polygon Search Areas', 'kvcoreidx' ),
			],
            [
                'field_id'      => 'enable_zoom_on_map',
                'type'          => 'checkbox',
                'title'         => __( 'Enable Scroll Zoom On Map', 'kvcoreidx' ),
            ]
		);

		$this->addSettingFields(
			'team',
			[
				'field_id'      => 'per_row',
				'type'          => 'radio',
				'title'         => __( 'Max Agents/Offices Per Row', 'kvcoreidx' ),
				'label'         => [
					'auto'  => 'Auto',
					2       => 2,
					3       => 3,
					4       => 4,
					6       => 6,
				],
				'default'       => 'auto',
			],
			[
				'field_id'      => 'per_page',
				'type'          => 'radio',
				'title'         => __( 'Agents/Offices Per Page', 'kvcoreidx' ),
				'label'         => [
					12    => 12,
					24    => 24,
					48    => 48,
				],
				'default'       => 24,
			],
			[
				'field_id'      => 'filter_offices_by',
				'type'          => 'select',
				'is_multiple'   => false,
				'title'         => __( 'Filter Offices By', 'kvcoreidx' ),
				'label'         => [
					'city' => 'City',
					'name' => 'Name'
				],
				'default'       => 'city',
				'attributes'    => [
				],
			],
			[
				'field_id'      => 'open_in_new_tab',
				'type'          => 'checkbox',
				'title'         => __( 'Open Agent/Office In New Tab', 'kvcoreidx' ),
			],
			[
				'field_id'      => 'agents_default_sort_ascending',
				'type'          => 'checkbox',
				'title'         => __( 'Agents Default Sort Ascending', 'kvcoreidx' ),
			],
			[
				'field_id'      => 'do_not_display_map_offices_page',
				'type'          => 'checkbox',
				'title'         => __( 'Do Not Display Map On Offices Page', 'kvcoreidx' ),
			],
			[
				'field_id'      => 'phone_format',
				'type'          => 'radio',
				'title'         => __( 'Phone Format', 'kvcoreidx' ),
				'label'         => [
					'dot'       => '123.456.7890',
					'bracket'   => '(123) 456-7890',
				],
				'default'       => 'dot',
			],
			[
				'field_id'          => 'hide_agent_email_addresses',
				'type'              => 'checkbox',
				'title'             => 'Hide Email Addresses on Agent Roster',
			]
		);

		$this->addSettingFields(
			'listing_detail',
			[
				'field_id'          => 'default_agent_id',
				'type'              => 'text',
				'title'             => 'Default Listing Agent ID',
				'description'       => 'Enter a kvCORE agent id. This agent will appear in the "Your Agent" section for all non-agency listings.',
			],
			[
				'field_id'      => 'show_prequalify_button',
				'type'          => 'radio',
				'title'         => __( 'Show Pre-Approval Button', 'kvcoreidx' ),
				'label'         => [
					'0' => __('Off', 'kvcoreidx' ),
					'1' => __('Internal Form', 'kvcoreidx' ),
					'2' => __('External Link', 'kvcoreidx' ),
				],
				'default'           => 'off',
				'attributes'  => [
					'data-conditional' => 'conditional',
					'data-hide' => json_encode([
						//had to name this wierd to get around a selector problem
						'0' => [ 'listing_detail_prequalify_link' ],
						'1' => [ 'listing_detail_prequalify_link']
					]),
				],
			],
			[
				'field_id'    => 'prequalify_link',
				'type'        => 'text',
				'title'       => __( 'Link', 'kvcoreidx' ),
				'attributes'  => [
					'style'         => 'text-align: left;',
				],
				'description' => 'Adding a link will override the default behavior of the pre-approval button. The button will open the provided link instead of the default form. Be sure to use full url with http:// part.'
			],
			[
				'field_id'          => 'show_listing_agent_and_mls_in_header',
				'type'              => 'checkbox',
				'title'             => 'Show Listing Agent and MLS In Header',
			],
			[
				'field_id'          => 'show_mls_disclaimer_in_header',
				'type'              => 'checkbox',
				'title'             => 'Show MLS Disclaimer In Header',
			],
			[
				'field_id'          => 'show_mls_logo_in_header',
				'type'              => 'checkbox',
				'title'             => 'Show MLS Logo In Header',
			],
			[
				'field_id'          => 'hide_listing_date',
				'type'              => 'checkbox',
				'title'             => 'Hide Listing Date',
			],
			[
				'field_id'          => 'email_only_registration',
				'type'              => 'checkbox',
				'title'             => 'Email Only Registration',
				'description'       => 'Registration will only prompt for email address.',
			],
			[
				'field_id'          => 'hide_mortgage_calculator',
				'type'              => 'checkbox',
				'title'             => 'Hide Mortgage Calculator',
			],
			[
				'field_id'          => 'tracking_code_script',
				'type'              => 'text',
				'title'             => 'Page View Tracking Code',
				'description'       => 'The dynamic fields you can use are [mlsid], [address], [city], [state], [price], [beds], [baths], [area], [neighborhood].',
			]
		);

		$this->addSettingFields(
			'agent_profile',
			[
				'field_id'          => 'header_image_url',
				'type'              => 'text',
				'title'             => 'Header Image URL',
			],
			[
				'field_id'      => 'limit',
				'type'          => 'radio',
				'title'         => __( 'Max Listings to show', 'kvcoreidx' ),
				'label'         => [
					3       => 3,
					6       => 6,
					9       => 9,
					12      => 12,
					99      => "All",
				],
				'default'       => 3,
			],
			[
				'field_id'          => 'link_agent_listings_to_agent_subdomain',
				'type'              => 'checkbox',
				'title'             => 'Link Agent Profile Listings to Agent Subdomain',
				'description'       => 'If agent subdomain exists it will link to their domain.',
			],
			[
				'field_id'          => 'include_manual_listings_to_agent_profile',
				'type'              => 'checkbox',
				'title'             => 'Add Manual Listings to Agent Profile Pages'
			]
		);

		$this->addSettingFields(
			'lender_info',
			[
				'field_id'          => 'logo_url',
				'type'              => 'text',
				'title'             => 'Logo URL',
			],
			[
				'field_id'          => 'title',
				'type'              => 'text',
				'title'             => 'Title',
			],
			[
				'field_id'          => 'phone_1_label',
				'type'              => 'text',
				'title'             => 'Phone #1 Label',
			],
			[
				'field_id'          => 'phone_1_number',
				'type'              => 'text',
				'title'             => 'Phone #1 Number',
			],
			[
				'field_id'          => 'phone_2_label',
				'type'              => 'text',
				'title'             => 'Phone #2 Label',
			],
			[
				'field_id'          => 'phone_2_number',
				'type'              => 'text',
				'title'             => 'Phone #2 Number',
			],
			[
				'field_id'          => 'license_number',
				'type'              => 'text',
				'title'             => 'License Number',
			]
		);

		$this->addSettingFields(
			'page_options_submit',
			[
				'field_id'      => 'submit',
				'type'          => 'submit',
				'title'         => __( 'Save Options', 'kvcoreidx' ),
				'save'          => false,
			]
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_registration( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		$this->addSettingFields(
			[
				'field_id'    => 'registration',
				'type'        => 'radio',
				'title'       => __( 'Registration', 'kvcoreidx' ),
				'label'       => [
					'off'         => __( 'Off', 'kvcoreidx' ),
					'required'    => __( 'Required', 'kvcoreidx' ),
					'optional'    => __( 'Optional', 'kvcoreidx' ),
				],
				'default'     => 'required',
				'attributes'  => [
					'data-conditional' => 'conditional',
					'data-hide' => json_encode([
						'off' => [ 'registration_property_views', 'registration_image_views' ],
					]),
				],
				'description' => 'It will not take effect, while logged into WordPress as a site admin'
			],
			[
				'field_id'    => 'registration_property_views',
				'type'        => 'number',
				'title'       => __( 'Property Views', 'kvcoreidx' ),
				'attributes'  => [
					'min'           => 0,
					'data-if-empty' => 0,
					'style'         => 'text-align: left;',
				],
				'default'     => 2,
				'description' => 'Set how many properties a visitor can view before they\'re prompted to register. Leave this blank for unlimited property views.'
			],
			[
				'field_id'    => 'registration_image_views',
				'type'        => 'number',
				'title'       => __( 'Image Views', 'kvcoreidx' ),
				'attributes'  => [
					'min'           => 0,
					'data-if-empty' => 0,
					'style'         => 'text-align: left;',
				],
				'default'     => 3,
				'description' => 'Set how many property images a visitor can view (on the property detail page) before they\'re prompted to register. Leave this blank for unlimited image views.'
			],
            [
                'field_id'      => 'registration_lead_duplication_agent_selection',
                'type'          => 'checkbox',
                'title'         => __( 'Check for Duplicate Agents', 'kvcoreidx' ),
                'description' => 'Upon registering, the kvCORE plugin will check for multiple agents who may be assigned to the lead (based on lead\'s email address) and will allow the lead to choose which agent they\'ve worked with before. Note: this will only apply if your account has lead duplication enabled.'

			],

			[
				'field_id'    => 'submit_button',
				'type'        => 'submit',
				'save'        => false,
			]
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_social( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		$base_callback_url = rest_url('kvcoreidx/v1/social-login') . '?action=submit-login&callback=true&hauth_done=';

		$this->_add_fields_to_tab(
			'social',
			[
				[
					'field_id'          => 'facebook_client_description',
					'type'              => 'hidden',
					'description'       =>  __( 'To allow visitors to register on your site using Facebook, please follow these instructions: <a href="https://developers.facebook.com/docs/apps/register/#create-app" target="_blank">Create Facebook App</a>', 'kvcoreidx' ),
					'show_title_column' => false,
					'save'              => false
				],
				[
					'field_id'          => 'facebook_client_callback_url',
					'type'              => 'text',
					'title'             => __( 'Facebook Callback URL', 'kvcoreidx' ),
					'value'             => "{$base_callback_url}Facebook",
					'save'              => false,
					'attributes'        => [
						'readonly' => 'readonly'
					]
				],
				[
					'field_id'          => 'facebook_client_id',
					'type'              => 'text',
					'title'             => 'Facebook Client ID',
				],
				[
					'field_id'          => 'facebook_secret_key',
					'type'              => 'text',
					'title'             => 'Facebook Secret Key',
				],
				[
					'field_id'          => 'twitter_client_description',
					'type'              => 'hidden',
					'description'       =>  __( 'To allow visitors to register on your site using Twitter, please follow these instructions: <a href="https://apps.twitter.com/" target="_blank">Create Twitter App</a>', 'kvcoreidx' ),
					'show_title_column' => false,
					'save'              => false
				],
				[
					'field_id'          => 'twitter_client_callback_url',
					'type'              => 'text',
					'title'             => __( 'Twitter Callback URL', 'kvcoreidx' ),
					'value'             => "{$base_callback_url}Twitter",
					'save'              => false,
					'attributes'        => [
						'readonly' => 'readonly'
					]
				],
				[
					'field_id'          => 'twitter_client_id',
					'type'              => 'text',
					'title'             => 'Twitter Client ID',
				],
				[
					'field_id'          => 'twitter_secret_key',
					'type'              => 'text',
					'title'             => 'Twitter Secret Key',
				]
			]
		);
	}

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings_custom_scripts( $oAdminPage ) {
		// return if no authorization_token
		if ( ! $this->authorization_token ) {
			return;
		}

		new \kvCORE_AceCustomFieldType( get_class( $this ) );

		$this->addSettingSections(
			static::PAGE_SLUG,
			[
				'tab_slug'          => 'custom_scripts',
				'section_id'        => 'custom_scripts',
				'title'             => __( 'Custom Script', 'kvcoreidx' ),
				'repeatable'        => true,
				'collapsible'   => [
					'container'         => 'section',
					'toggle_all_button' => false,
					'is_collapsed'      => false,
				],
			],
			[
				'tab_slug'          => 'custom_scripts',
				'section_id'        => 'custom_scripts_submit',
				'save'              => false,
			]
		);

		$plugin_pages = [];
		foreach (static::get_plugin_pages() as $plugin_page) {
			$is_page_active = !empty(Settings::get_setting("{$plugin_page['id']}_page"));
			if (!$is_page_active) {
				continue;
			}
			$plugin_pages[$plugin_page['id']] = $plugin_page['label'];
		}

		$this->addSettingFields(
			'custom_scripts',
			[
				'field_id'          => 'script_page',
				'type'              => 'select',
				'title'             => __( 'IDX Page', 'kvcoreidx' ),
				'description'       => __( 'Select an IDX Page to place a script on it', 'kvcoreidx' ),
				'label'      => [
						'all'       => __( 'All IDX Pages', 'kvcoreidx' ),
					] + $plugin_pages
			],
			[
				'field_id'          => 'script_js',
				'type'              => 'ace',
				'title'             => __( 'JavaScript', 'kvcoreidx' ),
				'description'       => __( htmlspecialchars('Please use only JavaScript. Additional HTML tags, such as <'.'script>, are not allowed.'), 'kvcoreidx' ),
				'attributes' =>  [
					'cols'          => 150,
					'rows'          => 10
				],
				'options'    => [
					'language'      => 'javascript',
					'theme'         => 'tomorrow', // Demo page https://ace.c9.io/build/kitchen-sink.html
					'gutter'        => true,
					'fontsize'      => 14,
				]
			]
		);

		$this->addSettingFields(
			'custom_scripts_submit',
			[
				'field_id'          => 'submit',
				'type'              => 'submit',
				'title'             => __( 'Save All Scripts', 'kvcoreidx' ),
				'save'              => false,
			]
		);
	}

	public function load_kvcoreidx_settings_area_pages( $oAdminPage ) {
        // return if no authorization_token
        if ( ! $this->authorization_token ) {
            return;
        }

        $this->addSettingSections(
            [
                'tab_slug'          => 'area_pages',
                'section_id'        => 'area_pages',
                'title'             => __( 'Area Pages', 'kvcoreidx' ),
                'repeatable'        => true,
                'collapsible'   => [
                    'container'         => 'section',
                    'toggle_all_button' => false,
                    'is_collapsed'      => false,
                ],
            ],
            [
                'tab_slug'          => 'area_pages',
                'section_id'        => 'area_pages_submit',
                'save'              => false,
            ]
        );

        add_filter('kvcoreidx/admin/settings/content', [ $this, 'area_pages_content']);
    }

    public function area_pages_content() {
        $context = [
            'test' => 'test value',
        ];

        return View::render( 'area-pages', $context );
    }

	/**
	 * @param $oAdminPage
	 */
	public function load_kvcoreidx_settings( $oAdminPage ) {
		// load ONLY activation settings if no authorization_token is set
		// this means the activation settings show as the only options,
		// with no tabs
		if ( ! $this->authorization_token ) {
			$this->load_kvcoreidx_settings_activation( $oAdminPage );
		}
	}

	protected function get_pages() {
		if ( is_null( $this->pages ) ) {
			$this->pages = [];

			$pages = get_posts( [
				'post_type'      => 'page',
				'status'         => 'publish',
				'posts_per_page' => - 1,
				'orderby'        => 'post_title',
				'order'          => 'asc',
			] );

			foreach ( $pages as $i => $page ) {
				$this->pages[ $page->ID ] = $page->post_title;
			}
		}

		return $this->pages;
	}

	/**
	 * @return array
	 */
	public static function get_supported_types_key_value(): array {
		$supported_types = kvCORE\Settings::get_all_supported_types();

		$supported_types_key_value = [];
		foreach ( $supported_types as $type ) {
			$supported_types_key_value[$type->id] = $type->name;
		}

		return $supported_types_key_value;
	}

	/**
	 * @return array
	 */
	public static function get_plugin_pages(): array {
	    $plugin_pages = [
            [
                'id'          => 'properties',
                'label'       => 'Properties',
                'description' => 'Page to be used for Properties search. The page must have the `[kvcoreidx_listings]` shortcode added.',
            ],
            [
                'id'          => 'listing_detail',
                'label'       => 'Listing Detail',
                'description' => 'Page to be used for Listing Details. The page must have the `[kvcoreidx_listing_detail_page]` shortcode.',
            ],
            [
                'id'          => 'exclusives',
                'label'       => 'Manual Listings (Exclusives)',
                'description' => 'Page to be used for Properties search. The page must have the `[kvcoreidx_listings exclusives="1"]` shortcode added.',
            ],
            [
                'id'          => 'coming-soon',
                'label'       => 'Coming Soon',
                'description' => 'Page to be used to show Coming Soon listings. The page must have the `[kvcoreidx_listings exclusives="1" type="coming soon"]` shortcode added.',
            ],
            [
                'id'          => 'exclusive_detail',
                'label'       => 'Manual Listing Detail',
                'description' => 'Page to be used for Listing Details. The page must have the `[kvcoreidx_listing_detail_page exclusive="1"]` shortcode.',
            ],
            [
                'id'          => 'site_map_index',
                'label'       => 'Sitemap Index',
                'description' => 'This page will be what Google pings to get the sitemap for this site. The url must be /sitemap-index and the page must have the `[kvcoreidx_site_map_index]` shortcode.'
            ],
            [
                'id'          => 'listings_sitemap',
                'label'       => 'Listings Sitemap',
                'description' => 'This page will be a sitemap of links to listing pages in a certain price range. Must have `[kvcoreidx_listings_sitemap]` shortcode.'
            ],
            [
                'id'          => 'listings_sitemap_ranges',
                'label'       => 'Listings Price Sitemap',
                'description' => 'This will be a sitemap of links to different pages of listing sitemaps. Must have `[kvcoreidx_listings_sitemap_ranges]` shortcode.'
            ],
            [
                'id'          => 'agents_sitemap',
                'label'       => 'Agents Sitemap',
                'description' => 'This will be a sitemap of all agents. Must have `[kvcoreidx_agent_profile_sitemap]` shortcode.'
            ],
            [
                'id'          => 'team',
                'label'       => 'Roster',
                'description' => 'Page to be used for Roster. The page must have the `[kvcoreidx_team]` shortcode.',
            ],
            [
                'id'          => 'agent_profile',
                'label'       => 'Agent Profile',
                'description' => 'Page to be used for Agent Profiles. The page must have the `[kvcoreidx_agent_profile]` shortcode.',
            ],
            [
                'id'          => 'offices',
                'label'       => 'Offices',
                'description' => 'Page to be used for Offices. The page must have the `[kvcoreidx_offices]` shortcode.',
            ],
            [
                'id'          => 'user_profile',
                'label'       => 'Lead Profile',
                'description' => 'Page to be used for Lead Profile. The page must have the `[kvcoreidx_leads]` shortcode.',
            ],
            [
                'id'          => 'terms_of_use',
                'label'       => 'Terms of Use',
                'description' => 'Page to be used for Terms of Use. This page does not require a special shortcode.',
            ],
            [
                'id'          => 'privacy_policy',
                'label'       => 'Our Privacy Policy',
                'description' => 'Page to be used for Our Privacy Policy. This page does not require a special shortcode.',
                'content'     => kvCORE\View::render( 'pages/privacy-policy', [
                    'site_name' =>  get_bloginfo('name')
                ]),
            ],
            [
                'id'          => 'market_report',
                'label'       => 'Market Report',
                'description' => 'Page to be used for Market Report. The page must have the `[kvcoreidx_market_report]` shortcode.',
            ],
            [
                'id'          => 'valuation_report',
                'label'       => 'Valuation Report',
                'description' => 'Page to be used for Valuation Report. The page must have the `[kvcoreidx_valuation_report]` shortcode.',
            ],
            [
                'id'          => 'valuation_pdf',
                'label'       => 'Sell',
                'description' => 'Page to be used for Property Valuation PDF. The page must have the `[kvcoreidx_valuation_pdf_search]` and `[kvcoreidx_valuation_pdf]` shortcodes.',
			],
			[
                'id'          => 'contact_form',
                'label'       => 'Contact Form',
                'description' => 'Page to be used for Contact Form. The page must have the `[kvcoreidx_contact_form]` shortcode.',
            ],
        ];

	    if (KVCORE_IDX_ENABLE_AREA_PAGES) {
	        array_push($plugin_pages, [
                'id'          => 'area',
                'label'       => 'Area Page',
                'description' => 'Page to be used for rendering an area page. This page must have the `[kvcoreidx_area]` shortcode.',
            ]);
        }

		return apply_filters( 'kvcoreidx/plugin/pages', $plugin_pages );
	}

	public static function get_plugin_colors() {
		return apply_filters( 'kvcoreidx/plugin/colors', [
			[
				'id'            => 'primary',
				'label'         => 'Primary Color',
				'default'       => '#da322f',
				'description'   => 'Applies to the search button and call-to-action button on the search and property detail pages.',
			],
			[
				'id'            => 'dark_filter',
				'label'         => 'Dark Filter Color',
				'default'       => kvCORE\Settings::color_luminance('#da322f', -0.2),
				'description'   => 'Applies to search filter elements and card buttons.',
			],
			[
				'id'            => 'light_filter',
				'label'         => 'Light Filter Color',
				'default'       => kvCORE\Settings::color_luminance('#da322f', -0.1),
				'description'   => 'Applies to search filter elements and card buttons.',
			],
			[
				'id'            => 'text_form',
				'label'         => 'Filter Form Text Color',
				'default'       => '#7d7d7d',
				'description'   => 'Applies to search filter elements and forms.',
			],
			[
				'id'            => 'border_form',
				'label'         => 'Filter Form Border Color',
				'default'       => '#d7d7d7',
				'description'   => 'Applies to search filter elements and forms.',
			],
			[
				'id'            => 'button_text',
				'label'         => 'Button Text Color',
				'default'       => '#fff',
			],
			[
				'id'            => 'border',
				'label'         => 'Border Color',
				'default'       => '#eaeaea',
				'description'   => 'Applies to borders on the lead profile page.',
			],
			[
				'id'            => 'dark_background',
				'label'         => 'Dark Background Color',
				'default'       => '#333',
			],
			[
				'id'            => 'light_background',
				'label'         => 'Light Background Color',
				'default'       => '#f7f7f7',
			],
		] );
	}

	/**
	 * @return array
	 */
	public static function get_active_idx_pages(): array {
		$plugin_pages = static::get_plugin_pages();
		$active_idx_pages = [];

		foreach ($plugin_pages as $plugin_page) {
			$active_page = get_post((int) static::get_setting("{$plugin_page['id']}_page"));

			if (isset($active_page->ID) && isset($active_page->post_status) && $active_page->post_status !== 'trash') {
				array_push($active_idx_pages, $plugin_page['id']);
			}
		}

		return $active_idx_pages;
	}
}
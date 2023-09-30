<?php

declare( strict_types=1 );

namespace kvCORE\Admin\Page\Settings;

use kvCORE;
use kvCORE\Admin\Page\Settings;

/**
 * Class Settings
 * @package kvCORE\Admin\Page
 */
class Custom_Templates extends Settings {
	const PAGE_SLUG = 'kvcoreidx_custom_templates';

	/**
	 * @var null
	 */
	protected $authorization_token = null;

	/**
	 * @var null | array
	 */
	protected $pages = null;

	public function __call( $sMethodName, $aArgs = null ) {
		$get_settings_method_name_prefix = 'load_' . static::PAGE_SLUG . '_';

		if( $get_settings_method_name_prefix === substr( $sMethodName, 0, strlen($get_settings_method_name_prefix ) ) ){
			$settings_page_name = str_replace( $get_settings_method_name_prefix, "", $sMethodName);

			return $this->_load_kvcoreidx_custom_templates_custom_tab( $settings_page_name, $aArgs );
		} else {
			return parent::__call( $sMethodName, $aArgs );
		}
	}

	/**
	 * @param $old_value
	 * @param $new_value
	 */
	public function on_save_settings( $old_value, $new_value ) {
		kvCORE\Settings\Custom_Templates::delete_cached_custom_templates();
	}

	protected function recache_saved_templates( $templates ) {
		$js_content = [];

		foreach( $templates as $option_name => $content ) {
			if ( $content ) {
				$view_name = preg_replace( "/_/", "-", str_replace( "_content", "", $option_name ) );

				$js_content[ $view_name ] = sprintf(
					"kvCORE.View.add('%s', %s, null)",
					$view_name,
					json_encode( $content )
				);
			}
		}

		file_put_contents( '/tmp/kvcore-templates.js', implode(";\n", $js_content ) );
	}

	/**
	 *
	 */
	public function setUp() {
		// load authorization_token - used to determine if
		// we should show tabs or not
		$this->authorization_token = kvCORE\Settings::get_api_key();

		$this->setRootMenuPageBySlug( parent::PAGE_SLUG );
		$this->addSubMenuItem(
			[
				'title'     => 'Custom Templates',
				'page_slug' => static::PAGE_SLUG,
			]
		);

		if ( $this->authorization_token ) {
			$settings_tabs = apply_filters( 'kvcoreidx/admin/settings/tabs', $this->get_view_tabs() );

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
	protected function _load_kvcoreidx_custom_templates_custom_tab( $tab_name, $args = [] ) {
		new \kvCORE_AceCustomFieldType( get_class( $this ) );

		$require_auth_token = apply_filters(  "kvcoreidx/admin/settings/tab/{$tab_name}/require_auth_token", true );

		if( $this->authorization_token || ! $require_auth_token ) {
			$this->_add_fields_to_tab( $tab_name, [] );
		}
	}

	protected function _add_fields_to_tab( $tab_name, $fields = [], $add_submit_button = true ) {
		$view_name = preg_replace( "/\_/", "-", $tab_name );
		$view_file_name = $view_name . '.twig';
		$path = $this->oProp->aInPageTabs[static::PAGE_SLUG][$tab_name]['path'];
		if (!empty($path)) {
			$view_file = KVCORE_IDX_PUBLIC_PATH . $path . $view_file_name;
			$view_url  = KVCORE_IDX_PUBLIC_URL . $path . $view_file_name;
		} else {
			$view_file = KVCORE_IDX_PUBLIC_PATH . "partials/$view_file_name";
			$view_url  = KVCORE_IDX_PUBLIC_URL . "partials/$view_file_name";
		}

		$default = "";

		if ( file_exists( $view_file ) ) {
			$default = ''; // file_get_contents( $view_file );
		}

		$fields = apply_filters( "kvcoreidx/admin/settings/custom_templates/tab/{$tab_name}/fields", [
			[
				'field_id'    => "{$tab_name}_content",
				'type'        => 'ace',
				'title'       => __( 'Content', 'kvcoreidx' ),
				'description' => sprintf(
					__( '<strong>Instructions</strong><br />Customize the HTML for the <code>%s</code> template. The default HTML is available <a href="%s" id="link-to-%s" class="kvadmin-default-template-link" target="_blank">here</a>.<br />To have your site use the default Twig template bundled with the kvCORE plugin, leave the Text Editor blank and click <strong>Submit</strong>.', 'kvcoreidx' ),
					$view_name,
					$view_url,
					$view_name,
					$view_name
				),
				'attributes'  => [
					'cols' => 150,
					'rows' => 30,
				],
				'options'     => [
					'language' => 'twig',
					'theme'    => 'tomorrow',
					'gutter'   => true,
					'fontsize' => 14,
				],
				'default'     => $default,
			],
		] );

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

	protected function get_view_tabs() {
		return [
			[
				'tab_slug' => 'properties_listings',
				'title'    => __( 'Properties', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'properties_filters',
				'title'    => __( 'Property Filters', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'properties_pagination',
				'title'    => __( 'Property Pagination', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'search',
				'title'    => __( 'Property Search', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'listing_detail',
				'title'    => __( 'Listing Detail V2', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'listing_detail_home_details',
				'title'    => __( 'Listing Detail (Home Details)', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'agent_profile',
				'title'    => __( 'Agent Profile', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'team',
				'title'    => __( 'Roster Page', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'offices',
				'title'    => __( 'Offices Page', 'kvcoreidx' ),
			],
			[
				'tab_slug' => 'prequalify',
				'path'     => 'partials/shortcodes/',
				'title'    => __( 'Pre-Qualify Popup', 'kvcoreidx' ),
			],
		];
	}
}
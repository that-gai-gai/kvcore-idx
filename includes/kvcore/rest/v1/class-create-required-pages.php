<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Admin\Page\Settings;
use kvCORE\Rest\v1;

class Create_Required_Pages extends v1 {
	protected $methods = [ 'GET' ];
	protected $isAdmin = true;

	public function callback() {
		$pages = Settings::get_plugin_pages();

		foreach ( $pages as $index => $page ) {
			switch ( $page['id'] ) {
				case 'properties':
					$multi_line = strpos( (string) wp_get_theme(), 'Twenty' ) === 0
						? ' multi_line_filters="yes"'
						: '';
					$pages[$index] += [ 'content' => "[kvcoreidx_search{$multi_line}][kvcoreidx_listings]" ];
					break;

				case 'listing_detail':
					$pages[$index] += [
						'content' => '[kvcoreidx_listing_detail_page]',
						'sidebars' => [
							[
								'id' => 'kvcoreidx_listing_detail_sidebar',
								'label' => 'kvCORE IDX Listing Detail Sidebar'
							]
						]
					];
					$pages[$index]['label'] = 'Property';
					break;

				case 'exclusives':
					$pages[$index] += [
						'content' => '[kvcoreidx_listings exclusives="1"]'
					];
					$pages[$index]['label'] = 'Exclusives';
					break;

				case 'coming-soon':
					$pages[$index] += [
						'content' => '[kvcoreidx_listings exclusives="1" type="Coming Soon"]'
					];
					$pages[$index]['label'] = 'Coming Soon';
					break;

				case 'exclusive_detail':
					$pages[$index] += [
						'content' => '[kvcoreidx_listing_detail_page exclusive="1"]'
					];
					$pages[$index]['label'] = 'Exclusive';
					break;

                case 'site_map_index':
                    $pages[$index] += [
                        'content' => '[kvcoreidx_site_map_index]'
                    ];
                    $pages[$index]['label'] = 'Sitemap Index';
                    break;

                case 'listings_sitemap_ranges':
                    $pages[$index] += [
                        'content' => '[kvcoreidx_listings_sitemap_ranges]'
                    ];
                    $pages[$index]['label'] = 'Listings Sitemap';
                    break;

                case 'listings_sitemap':
                    $pages[$index] += [
                        'content' => '[kvcoreidx_listings_sitemap_page]'
                    ];
                    $pages[$index]['label'] = 'Listings Sitemap Filtered';
                    break;

                case 'agents_sitemap':
                    $pages[$index] += [
                        'content' => '[kvcoreidx_agent_profile_sitemap]'
                    ];
                    $pages[$index]['label'] = 'Agents Sitemap';
                    break;

				case 'team':
					$pages[$index] += [ 'content' => '[kvcoreidx_team]' ];
					break;

				case 'agent_profile':
					$pages[$index] += [ 'content' => '[kvcoreidx_agent_profile]' ];
					$pages[$index]['label'] = 'Agent';
					break;

				case 'offices':
					$pages[$index] += [ 'content' => '[kvcoreidx_offices]' ];
					break;

				case 'user_profile':
					$pages[$index] += [ 'content' => '[kvcoreidx_leads]' ];
					$pages[$index]['label'] = 'Profile';
					break;

				case 'terms_of_use':
					$pages[$index] += [ 'content' => '' ];
					break;

				case 'market_report':
					$pages[$index] += [ 'content' => '[kvcoreidx_market_report_search][kvcoreidx_market_report]' ];
					break;

				case 'valuation_report':
					$pages[$index] += [ 'content' => '[kvcoreidx_valuation_report]' ];
					break;

				case 'valuation_pdf':
					$pages[$index] += ['content' => '[kvcoreidx_valuation_pdf_search][kvcoreidx_valuation_pdf]'];
					break;

				case 'contact_form':
					$pages[$index] += [ 'content' => '[kvcoreidx_contact_form]' ];
					break;

                case 'area':
                    $pages[$index] += ['content' => '[kvcoreidx_area]'];
                    break;
			}
		}

		$created = [];

		foreach ( $pages as $page ) {
			$post_id = $this->maybe_create_page( $page );
			if ( $post_id !== 0 ) {
				$created["{$page['id']}_page"] = $post_id;
			}
		}

		Settings::update_settings( $created );
		Settings::update_setting( 'should_update_permalinks', true );

		$created_count = count( $created );
		$already_exist_count = ( count( $pages ) - $created_count );

		$message = '';

		if ( $created_count === 0 ) {
			$title = 'All pages already exist';
		} elseif ( $already_exist_count === 0 ) {
			$s = $created_count !== 1 ? 's' : '';
			$title = "{$created_count} page{$s} created";
		} else {
			$s = $created_count !== 1 ? 's' : '';
			$title = "{$created_count} page{$s} created";
			$s = $already_exist_count !== 1 ? 's' : '';
			$message = "{$already_exist_count} page{$s} already exist";
		}

		return [ 'title' => $title, 'message' => $message ];
	}

	/**
	 * @param $page
	 * @return int
	 */
	private function maybe_create_page(array $page): int {
		$existing_page = get_post((int) Settings::get_setting("{$page['id']}_page"));
		if (isset($existing_page->ID) && isset($existing_page->post_status) && $existing_page->post_status !== 'trash') {
			return 0;
		}

		$page_args = array(
			'post_type' => 'page',
			'post_title' => $page['label'],
			'post_content' => $page['content'],
			'post_status' => 'publish',
			'post_author' => 1,
		);
		$page['template'] = isset($page['template']) ? $page['template'] : '';

		$post_id = wp_insert_post($page_args);

		if (!empty($page['template'])) {
			update_post_meta($post_id, '_wp_page_template', $page['template']);
		}

		if (is_array($page['sidebars']) && count($page['sidebars']) !== 0) {
			foreach ($page['sidebars'] as $sidebar) {
				$is_active = is_active_sidebar($sidebar['id']);

				if (!$is_active) {
					$new_sidebar = [
						'id' => $sidebar['id'],
						'name' => $sidebar['label'],
					];
					register_sidebar($new_sidebar);

					$sidebars = Settings::get_setting('sidebars');
					$sidebars[] = $new_sidebar;
					Settings::update_setting('sidebars', $sidebars);
				}

				if (!is_array($sidebar['widgets']) || count($sidebar['widgets']) === 0) {
					continue;
				}

				foreach ($sidebar['widgets'] as $widget) {
					$this->insert_widget_in_sidebar($widget, [], $sidebar['id']);
				}
			}
		}

		return $post_id;
	}

	/**
	 * Insert a widget in a sidebar.
	 *
	 * @param string $widget_id ID of the widget (search, recent-posts, etc.)
	 * @param array $widget_data Widget settings.
	 * @param string $sidebar ID of the sidebar.
	 */
	private function insert_widget_in_sidebar(string $widget_id, array $widget_data, string $sidebar) {
		// Retrieve sidebars, widgets and their instances
		$sidebars_widgets = get_option('sidebars_widgets', []);
		$widget_instances = get_option('widget_' . $widget_id, []);

		// Retrieve the key of the next widget instance
		$numeric_keys = array_filter(array_keys($widget_instances), 'is_int');
		$next_key = $numeric_keys ? max($numeric_keys) + 1 : 2;

		// Add this widget to the sidebar
		if (!isset($sidebars_widgets[$sidebar])) {
			$sidebars_widgets[$sidebar] = [];
		}
		$sidebars_widgets[$sidebar][] = $widget_id . '-' . $next_key;

		// Add the new widget instance
		$widget_instances[$next_key] = $widget_data;

		// Store updated sidebars, widgets and their instances
		update_option('sidebars_widgets', $sidebars_widgets);
		update_option('widget_' . $widget_id, $widget_instances);
	}
}

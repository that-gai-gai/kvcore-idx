<?php

declare( strict_types=1 );

namespace kvCORE\Data_Store;

use http\QueryString;
use kvCORE\Settings;

class Area_Page {
    private static $listing_api_endpoint = 'https://listing-api.kvcore.com/graphql';
    private static $listing_api_token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOjIsImFjdCI6MjEsImp0aSI6ImtAZWFhJDdUZHJtTVlSJV5wWSN6N2dyZll3I05weGZhSWtqT3BZayFHY1VeSjRAZzJtZlNQZHBRZFZNTiFtZ28iLCJuYmYiOjE1OTMwNDA1NTUsImV4cCI6MTYyNDU3NjU1NSwiaWF0IjoxNTkzMDQwNTU1LCJhdWQiOiJsaXN0aW5ncyJ9.3zZA9G-W-BZIc3BjflQcLJI9lPSG86ltpdfOVSh-KH0';

    public static function get($module_name = null, $area_uid = null, $allow_inactive = false) {
        global $wpdb;

        $area_slug = $area_uid ?: get_query_var('areaslug');

        $uid_column = is_numeric($area_slug) ? 'id=%d' : 'slug=%s';

        if (!$area_slug) {
            return new \stdClass();
        }

        $sql = $wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}kvcoreidx_areas WHERE $uid_column AND is_active=%d",
            $area_slug,
            1
        );

        $data = $wpdb->get_row($sql);

        if (!$data) {
            return false;
        }

        return static::get_formatted_object($data);
    }

    public static function get_list($page = 1, $per_page = 10, $text_query = null) {
        global $wpdb;

        $result = new \stdClass();

        if ($text_query) {
            $text_like = $wpdb->esc_like($text_query);

            $sql = $wpdb->prepare(
                "SELECT * FROM `{$wpdb->prefix}kvcoreidx_areas`
                    WHERE 
                        `name` LIKE %s
                        OR `name` LIKE %s  
                        OR `name` LIKE %s
                LIMIT %d, %d",
                $text_like,
                "$text_like%",
                "%$text_like%",
                $page - 1,
                $per_page
            );
        } else {
            $sql = $wpdb->prepare(
                "SELECT * FROM `{$wpdb->prefix}kvcoreidx_areas` LIMIT %d, %d",
                $page - 1,
                $per_page
            );
        }

        $local = $wpdb->get_results($sql);
        $remote = static::get_list_from_remote($text_query);

        return static::get_formatted_list($local, $remote);
    }

    public static function get_active($count = 10) {
        global $wpdb;

        $query = $wpdb->prepare(
            "SELECT `id`, `name`, `slug`, `url` FROM `{$wpdb->prefix}kvcoreidx_areas` WHERE `is_active`=1 LIMIT 0, %d",
            $count
        );

        return $wpdb->get_results($query);
    }

    public static function get_active_by_type($type = 'area', $count = 3) {
        global $wpdb;

        $query = $wpdb->prepare(
            "SELECT `id`, `name`, `slug`, `url`, `type`
                FROM `{$wpdb->prefix}kvcoreidx_areas`
                WHERE `is_active`=1 AND `type`=%s LIMIT 0,%d",
            $type,
            $count
        );

        return $wpdb->get_results($query);
    }

    protected static function get_formatted_object($data) {
        $remote = static::get_from_remote_by_id($data->remote_id);

        $result = static::get_basic_data($data, $remote);

        $result->enabled_modules = static::get_enabled_modules($data, $remote);
        $result->modules = static::get_modules($result->enabled_modules, $data, $remote);

        return $result;
    }

    protected static function get_formatted_min_object($data, $remote) {
        $result = static::get_basic_data($data, $remote);
        $result->enabled_modules = $data->enabled_modules ?? static::get_enabled_modules($data, $remote);

        return $result;
    }

    protected static function get_formatted_list($data, $remote) {
        $result = [];
        $local_item_remote_ids = [];

        foreach ($data as $item) {
            $result[] = static::get_formatted_min_object($item, $remote);
            $local_item_remote_ids[] = $item->remote_id;
        }

        foreach($remote->areas as $area) {
            if (!in_array( $area->id, $local_item_remote_ids ) ) {
                $result[] = $area;
            }
        }

        return $result;
    }

    public static function get_from_remote_by_id($id) {
        $options   = Settings::get_settings();
        $curl_url = "{$options['api_url']}/public/wp-areas/{$id}";
        $auth_key = $options['authorization_token'];

        $ch = curl_init();

        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: {$auth_key}",
        ] );

        $output = curl_exec( $ch );

        curl_close( $ch );

        return json_decode($output);
    }

    protected static function get_list_from_remote($text_query = null) {
        $options   = Settings::get_settings();
        $curl_url = "{$options['api_url']}/public/wp-areas";
        $auth_key = $options['authorization_token'];

        $all_areas = get_transient('kvcoreidx_wpareapages', null);

        if (empty($all_areas)) {
            $ch = curl_init();

            curl_setopt( $ch, CURLOPT_URL, $curl_url );
            curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
            curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

            curl_setopt( $ch, CURLOPT_HTTPHEADER, [
                "Authorization: {$auth_key}",
            ] );

            $output = curl_exec( $ch );

            curl_close( $ch );

            $all_areas = json_decode($output);
        }

        if ($text_query) {
            $filtered = $all_areas;
            $all_areas = $all_areas->areas;
            $filtered->areas = [];

            $lc_query = strtolower($text_query);

            foreach ($all_areas as $i => $area) {
                $area_name = strtolower($area->name);

                if (strpos($area_name, $lc_query) !== false) {
                    array_push($filtered->areas, $area);
                }
            }

            return $filtered;
        }

        return $all_areas;
    }

    protected static function get_from_public_api($id) {
        //
    }

    protected static function get_polygon_from_listings_api($polygon_key) {
        $options   = Settings::get_settings();
        $token = static::$listing_api_token;
        $data = [
            'query' => '{
                geoAreas(
                    filter: {
                        size: 1000
                        from: 0
                        body: "{\"query\": {\"bool\": {\"filter\": [{\"term\": {\"_id\": \"' . $polygon_key . '\"}}]}}}"
                        }
                ) {
                    geo_areas {
                        name_en
                        geog_id
                        geometry {
                            coordinates
                        }
                    }
                }
            }',
        ];
        $curl_url = static::$listing_api_endpoint . '?' . http_build_query($data);

        $ch = curl_init();

        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
        ] );

        $output = curl_exec( $ch );

        curl_close( $ch );

        $response = json_decode($output);
        $result = null;

        // get coordinates from response object if exists, and not empty
        if (
            $response->data
            && $response->data->geoAreas
            && is_array($response->data->geoAreas->geo_areas)
        ) {
            $geo_area = array_shift($response->data->geoAreas->geo_areas);

            if (
                is_object($geo_area)
                && is_object($geo_area->geometry)
                && is_array($geo_area->geometry->coordinates)
                && !empty($geo_area->geometry->coordinates)
            ) {
                $result = $geo_area->geometry->coordinates;
            }
        }
        $result = json_encode($result,1);
        $result = preg_replace('/\[{2,}/', '[', $result);
        $result = preg_replace('/\]{2,}/', ']', $result);
        $result =  "[" . $result ."]";
        return $result;
    }

    protected static function get_highlights_from_listings_api($coordinates) {
        $options   = Settings::get_settings();
        $token = static::$listing_api_token;
        $coordinates = json_decode($coordinates);
        $data = [
            'query' => '{
                listings(
                    filter: {
                        size: 10
                        from: 0
                        body: "{  \\"query\\": {\\"bool\\": {  \\"filter\\": [{  \\"term\\" : {\\"is_on_market\\" : true  }},{  \\"geo_polygon\\": {\\"location\\": {  \\"points\\": '.json_encode($coordinates).'}  }}  ]}  },  \\"aggs\\": {\\"avg_price\\": {  \\"avg\\": {\\"field\\": \\"price\\"  }},\\"avg_price_sft\\": {  \\"avg\\": {\\"field\\": \\"price\\",\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"doc[\\\\\\"footage\\\\\\"].value > 0 ? _value/doc[\\\\\\"footage\\\\\\"].value : 0\\"}  }},\\"total_new_homes\\": {  \\"range\\": {\\"field\\": \\"listingdate\\",\\"ranges\\": [  {\\"from\\": ' . strtotime('10 days ago') . '  }]  }},\\"total_homes\\": {  \\"value_count\\": {\\"script\\": {  \\"source\\": \\"doc[\\\\\\"type\\\\\\"].value\\"}  }}  }}"
                    }
                ) {
                    aggregations
                }
            }',
        ];

        $curl_url = static::$listing_api_endpoint;

        $ch = curl_init();

        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt($ch, CURLOPT_POST,           1 );
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
            'Content-Type: application/json',
            'Accept: application/json',
            'DNT: 1'
        ] );

        $output = curl_exec( $ch );

        curl_close( $ch );
        $result = json_decode($output);
        $result->query = $data;
        return $result;
    }

    protected static function get_previous_highlights_from_listings_api($coordinates) {
        $options   = Settings::get_settings();
        $token = static::$listing_api_token;
        $data = [
            'query' => '{
                listings(
                    filter: {
                        size: 10
                        from: 0
                        body: "{  \\"query\\": {\\"bool\\": {  \\"filter\\": [{  \\"term\\" : {\\"is_on_market\\" : true  }},{  \\"geo_polygon\\": {\\"location\\": {  \\"points\\": '.json_encode($coordinates[0]).'}  }}  ]}  },  \\"aggs\\": {\\"avg_price\\": {  \\"avg\\": {\\"field\\": \\"price\\"  }},\\"avg_price_sft\\": {  \\"avg\\": {\\"field\\": \\"price\\",\\"script\\": {  \\"lang\\": \\"painless\\",  \\"source\\": \\"doc[\\\\\\"footage\\\\\\"].value > 0 ? _value/doc[\\\\\\"footage\\\\\\"].value : 0\\"}  }},\\"total_new_homes\\": {  \\"range\\": {\\"field\\": \\"listingdate\\",\\"ranges\\": [  {\\"to\\": ' . strtotime('30 days ago') . '  }, {\\"from\\": ' . strtotime('40 days ago') . '  }]  }},\\"total_homes\\": {  \\"value_count\\": {\\"script\\": {  \\"source\\": \\"doc[\\\\\\"type\\\\\\"].value\\"}  }}  }}"
                    }
                ) {
                    aggregations
                }
            }',
        ];
        $curl_url = static::$listing_api_endpoint . '?' . http_build_query($data);

        $ch = curl_init();

        curl_setopt( $ch, CURLOPT_URL, $curl_url );
        curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1 );
        curl_setopt( $ch, CURLOPT_CUSTOMREQUEST, 'GET' );

        curl_setopt( $ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer {$token}",
        ] );

        $output = curl_exec( $ch );

        curl_close( $ch );

        $result = json_decode($output);
        $result->query = $data;

        return $result;
    }

    protected static function get_basic_data($data, $remote) {
        $result = new \stdClass();
        $result->id = $data->id;
        $result->remote_id = $data->remote_id;
        $result->is_active = $data->is_active;

        $result->original_name = $remote->area->name ?? null;

        $result->name = $data->name;
        $result->slug = $data->slug;
        $result->activated_type = $data->type;
        $result->type = $remote->area->locations->type;
        $result->url = static::get_url($data, $remote);

        return $result;
    }

    protected static function get_url($data, $remote) {
        $area_page = Settings::get_setting('area_page');
        $permalink = get_permalink($area_page) . $data->slug;

        return str_replace(get_home_url(), '', $permalink);
    }

    protected static function get_enabled_modules($data, $remote) {

        if($data->hero != NULL){
            $hero = json_decode($data->hero);
        }
        if($data->highlights != NULL){
            $highlights = json_decode($data->highlights);
        }
        if($data->listings != NULL){
            $listings = json_decode($data->listings);
        }
        if($data->areas_and_neighborhoods != NULL){
            $areas_and_neighborhoods = json_decode($data->areas_and_neighborhoods);
        }
        if($data->market_health != NULL){
            $market_health = json_decode($data->market_health);
        }
        // if($data->areas_we_cover != NULL){
        //     $areas_we_cover = json_decode($data->areas_we_cover);
        // }
        if($data->quick_links != NULL){
            $quick_links = json_decode($data->quick_links);
        }

        $enabled_modules = [];

        if($hero->is_active == 1 || $hero == NULL){
            array_push($enabled_modules, 'hero');
        }

        if($highlights->is_active == 1 || $highlights == NULL){
            array_push($enabled_modules, 'highlights');
        }

        if($listings->is_active == 1 || $listings == NULL){
            array_push($enabled_modules, 'listings');
        }

        if($areas_and_neighborhoods->is_active == 1 || $areas_and_neighborhoods == NULL){
            array_push($enabled_modules, 'areas_and_neighborhoods');
        }

        if($market_health->is_active == 1 || $market_health == NULL){
            array_push($enabled_modules, 'market_health');
        }

        // if($areas_we_cover->is_active == 1 || $areas_we_cover == NULL){
        //     array_push($enabled_modules, 'areas_we_cover');
        // }

        if($quick_links->is_active == 1 || $quick_links == NULL){
            array_push($enabled_modules, 'quick_links');
        }
        
        return $enabled_modules;
    }

    protected static function get_modules($enabled_modules, $data, $remote) {
        $result = [];

        foreach($enabled_modules as $module_name) {
            $result[] = static::get_formatted_module(
                $module_name,
                $data,
                $remote,
                $result
            );
        }

        return $result;
    }

    protected static function get_formatted_module($module_name, $data, $remote, $formatted_modules) {
        if ($data->{$module_name}) {
            $module = json_decode($data->{$module_name});
        } else {
            $module = new \stdClass();
        }
        $module->name = $module_name;

        if (!isset($module->is_active)) {
            $module->is_active = true;
        }

        // allow module-specific static method in the event
        // modules require any custom formatting
        // naming: get_formatted_module_{module_name}
        // ie: get_formatted_module_hero($module, $data, $remote)
        $format_method = "get_formatted_module_{$module_name}";

        return method_exists(static::class, $format_method)
            ? static::$format_method($module, $data, $remote, $formatted_modules)
            : $module;
    }

    protected static function get_formatted_module_hero($module, $data, $remote, $formatted_modules) {
        // in the future, will use a variation of $module->location once areas feature
        // supports custom area polygons and/or locations
        $module->polygon = static::get_polygon_from_listings_api($remote->area->locations->polygon);
        $module->polygon_key = $remote->area->locations->polygon;
        $module->geog_id = $remote->area->locations->geog_id;

        return $module;
    }

    protected static function get_formatted_module_highlights($module, $data, $remote, $formatted_modules) {
        // find better solution to grab polygon from hero
        $hero = $formatted_modules[0];

        if ($hero->polygon) {
            $current = static::get_highlights_from_listings_api($hero->polygon ?? []);
            $previous = static::get_previous_highlights_from_listings_api($hero->polygon ?? []);

            if ($current && $previous) {
                $current_data = $current->data->listings->aggregations;
                $previous_data = $previous->data->listings->aggregations;

                $module->current_average_home_price = $current_data->avg_price->value;
                $module->previous_current_average_home_price = $previous_data->avg_price->value;

                $module->new_to_market = $current_data->total_new_homes->buckets[0]->doc_count;
                $module->previous_new_to_market = $previous_data->total_new_homes->buckets[0]->doc_count;

                $module->total_homes = $current_data->total_homes->value;
                $module->previous_total_homes = $previous_data->total_homes->value;

                $module->cost_sqft = $current_data->avg_price_sft->value;
                $module->previous_cost_sqft = $previous_data->avg_price_sft->value;
            }
        }

        return $module;
    }

    protected static function get_formatted_module_areas_and_neighborhoods($module, $data, $remote, $formatted_modules) {
        $module->area = static::get_active_by_type('area');
        $module->neighborhood = static::get_active_by_type('neighbourhood');

        return $module;
    }
}

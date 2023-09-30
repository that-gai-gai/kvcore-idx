<?php

declare( strict_types=1 );

namespace kvCORE;

class Areas_Table {
    protected static $table_name = 'kvcoreidx_areas';

    public static function maybe_create_or_update_database() {
        if (true === KVCORE_IDX_ENABLE_AREA_PAGES) {
            static::create_or_update_database();
        }
    }

    public static function create_or_update_database() {
        global $wpdb;
        $table_name = $wpdb->prefix . static::$table_name;

        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            is_active tinyint(1),
            slug tinytext NOT NULL,
            url tinytext,
            name tinytext NOT NULL,
            original_name tinytext,
            type tinytext,
            description text,
            module_order text,
            hero text,
            highlights text,
            listings text,
            areas_and_neighborhoods text,
            market_health text,
            areas_we_cover text,
            quick_links text,
            remote_id mediumint(9),
            PRIMARY KEY  (id)
        ) $charset_collate;";

        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        dbDelta( $sql );
    }

    public static function get_by_slug( $slug ) {
        global $wpdb;
        $table_name = $wpdb->prefix . static::$table_name;

        return $wpdb->get_row("SELECT * FROM {$table_name} WHERE `slug`='{$slug}'");
    }

    public static function get_by_slug_specific( $slug, $column ) {
        global $wpdb;
        $table_name = $wpdb->prefix . static::$table_name;

        return $wpdb->get_var("SELECT {$column} FROM {$table_name} WHERE `slug`='{$slug}'");
    }
};

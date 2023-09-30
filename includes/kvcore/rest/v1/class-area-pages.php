<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Admin\Page\Settings;
use kvCORE\Rest\v1;
use kvCORE\Data_Store;
use WP_REST_Request;

class Area_Pages extends v1 {
	protected static $instance = null;
    protected $methods = [ 'GET', 'POST', 'PUT', 'DELETE', 'OPTION' ];
    protected $isAdmin = true;

	public function callback( WP_REST_Request $request ) {
        global $wpdb;
		$options   = Settings::get_settings();
		$method    = $request->get_method();
        $raw_data = $_REQUEST;
        $post_data = $request->get_json_params();
        $column_formats = $this->get_area_table_columns();
        $area_id = $request['id'];
        $table_name = $wpdb->prefix . "kvcoreidx_areas";
        $limit = '';
        $number = '';
        $offset = '';

		if ( 'GET' === $method ) {

            /* Parse defaults */
            $fields = $raw_data;

            if($raw_data['limit']){
                $limit = $raw_data['limit'];
            }
            else{
                $limit = 10;
            }
            if($raw_data['offset']){
                $offset = $raw_data['offset'];
            }
            else{
                $offset = 0;
            }

            /* SQL Select */
            //Whitelist of allowed fields
            $allowed_fields = $this->get_area_table_columns();
            if( is_array($fields) ){
                //Sanitize by white listing
                $fields = array_intersect($fields, $allowed_fields);

            }

            //Return only selected fields. Empty is interpreted as all
            if( empty($fields) ){
                $select_sql = "SELECT * FROM $table_name";
            }
            elseif( 'count' == $fields ) {
                $select_sql = "SELECT COUNT(*) FROM $table_name";
            }
            else{
                $select_sql = "SELECT ".implode(',',$fields)." FROM $table_name";
            }

            /* SQL Where */
            //Initialise WHERE
            $where_sql = '';
            if( !empty($area_id) ){
            $where_sql .=  $wpdb->prepare('Where id=%d', $area_id);
            }

            /* SQL Limit */
            $offset = absint($offset); //Positive integer
            if( $number == -1 ){
                $limit_sql = "";
            }
            else{
                $number = absint($limit); //Positive integer
                $limit_sql = "LIMIT $offset, $number";
            }

            /* Form SQL statement */
            $sql = "$select_sql $where_sql $limit_sql";
            if( 'count' == $fields ){
                return $wpdb->get_var($sql);
            }

            /* Perform query */
            $areas = $wpdb->get_results($sql);

            return $areas;
			
        }
        
        if ( 'POST' === $method ) {

            $area_name = $request['name'];

            $slug = str_replace(' ', '-', strtolower($area_name));
            $url = $this->get_area_url($slug);

            $post_data += [
                'slug' => $slug,
                'url' => $url,
                'type' => $this->get_area_type($post_data)
            ];
            $data = array_intersect_key($post_data, $column_formats);
            $data_keys = array_keys($data);
            $column_formats = array_merge(array_flip($data_keys), $column_formats);

            $wpdb->insert($table_name, $data, $column_formats);

            return $wpdb->insert_id;
			
        }
        
        if ( 'PUT' === $method ) {

            $data = array_intersect_key($post_data, $column_formats);
            $data_keys = array_keys($data);
            $column_formats = array_merge(array_flip($data_keys), $column_formats);

            //Area ID must be positive integer
            $area_id = absint($area_id);
            if( empty($area_id) )
                return false;
            
            if ( false === $wpdb->update($table_name, $data, array('id'=>$area_id), $column_formats) ) {
                return 'Error updating Area, please check request';
            }
       
            return 'Area Updated';
			
        }
        
        if ( 'DELETE' === $method ) {

            //Area ID must be positive integer
            $area_id = absint($area_id);
            if( empty($area_id) )
                return false;
            
            $sql = $wpdb->prepare("DELETE from $table_name WHERE id = %d", $area_id);

            if( !$wpdb->query( $sql ) )
                    return 'Error deleting Area, please check request';
       
            return 'Area Deleted';
			
		}

		
    }

    public function get_area_table_columns(){
        return array(
            'is_active'=> '%d',
            'slug'=>'%s',
            'url'=>'%s',
            'name'=>'%s',
            'original_name'=>'%s',
            'type' => '%s',
            'module_order'=>'%s',
            'description'=>'%s',
            'remote_id' => '%d',
            'hero'=>'%s',
            'highlights' => '%s',
            'quick_links' => '%s',
            'listings' => '%s',
            'areas_and_neighborhoods' => '%s',
            'market_health' => '%s',
            'areas_we_cover' => '%s',
        );
    }

    protected function get_area_type($post_data) {
	    $remote_area = Data_Store\Area_Page::get_from_remote_by_id($post_data['remote_id']);

	    $result = 'area';

	    if (
	        !empty($remote_area->area->locations)
            && !empty($remote_area->area->locations->type)
        ) {
            $result = $remote_area->area->locations->type;
        }

	    return $result;
    }

    protected static function get_area_url($slug) {
        $area_page = Settings::get_setting('area_page');
        $permalink = get_permalink($area_page) . $slug;

        return str_replace(get_home_url(), '', $permalink);
    }
}

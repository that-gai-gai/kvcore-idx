<?php

declare( strict_types=1 );

namespace kvCORE\Rest\v1;

use kvCORE\Data_Store;
use kvCORE\Rest\v1;
use WP_REST_Request;
use WP_REST_Response;

class Area_Page extends v1 {
    protected static $instance = null;
    protected $methods = [ 'GET', 'PUT', 'POST', 'DELETE' ];
    protected $endpoint = 'area-page/(?P<action_or_id>[\w?]+)';
    protected $isAdmin = true;

    public function callback( WP_REST_Request $request ) {
        $method = strtolower($request->get_method());

        if (method_exists($this, $method)) {
            return $this->$method($request);
        }

        throw new \Exception('Invalid method');
    }

    public function get( WP_REST_Request $request ) {
        $action_or_id = $request->get_param('action_or_id');
        $page = $request->get_param('page') ?: 1;
        $per_page = $request->get_param('per_page') ?: 10;
        $text_query = $request->get_param('q') ?: null;

        if (is_numeric($action_or_id)) {
            $area = Data_Store\Area_Page::get(null, $action_or_id);

            return new WP_REST_Response(
                $area ?: [ 'message' => 'Area page not found'],
                $area ? 200 : 404
            );
        } else if ($action_or_id === 'list') {
            return new WP_REST_Response(
                [ 'areas' => Data_Store\Area_Page::get_list($page, $per_page, $text_query) ]
            );
        }

        return new WP_REST_Response('Invalid request', 500);
    }

    public function post( WP_REST_Request $request ) {
    }

    public function put( WP_REST_Request $request ) {
        $area = $request->get_param('action_or_id');
        $data = json_decode($request->get_body());

        if (is_numeric($area)) {
            return new WP_REST_Response(
                Data_Store\Area_Page::update($area, $data)
            );
        }

        return new WP_REST_Response('Invalid request', 500);
    }

    public function delete( WP_REST_Request $request ) {

    }
}

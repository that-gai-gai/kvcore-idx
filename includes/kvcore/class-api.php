<?php

declare( strict_types=1 );

namespace kvCORE;

class Api {
	const PRICES = [
		25000 => '25,000',
		50000 => '50,000',
		75000 => '75,000',
		100000 => '100,000',
		125000 => '125,000',
		150000 => '150,000',
		175000 => '175,000',
		200000 => '200,000',
		250000 => '250,000',
		300000 => '300,000',
		350000 => '350,000',
		400000 => '400,000',
		450000 => '450,000',
		500000 => '500,000',
		550000 => '550,000',
		600000 => '600,000',
		650000 => '650,000',
		700000 => '700,000',
		750000 => '750,000',
		800000 => '800,000',
		850000 => '850,000',
		900000 => '900,000',
		950000 => '950,000',
		1000000 => '1,000,000',
		1050000 => '1,050,000',
		1100000 => '1,100,000',
		1150000 => '1,150,000',
		1200000 => '1,200,000',
		1250000 => '1,250,000',
		1300000 => '1,300,000',
		1350000 => '1,350,000',
		1400000 => '1,400,000',
		1450000 => '1,450,000',
		1500000 => '1,500,000',
		1550000 => '1,550,000',
		1600000 => '1,600,000',
		1650000 => '1,650,000',
		1700000 => '1,700,000',
		1750000 => '1,750,000',
		1800000 => '1,800,000',
		1850000 => '1,850,000',
		1900000 => '1,900,000',
		1950000 => '1,950,000',
		2000000 => '2,000,000',
		5000000 => '5,000,000',
		10000000 => '10,000,000',
		15000000 => '15,000,000',
		100000000 => '100,000,000',
	];

	const BEDS = [
		1 => '1+',
		2 => '2+',
		3 => '3+',
		4 => '4+',
		5 => '5+',
		6 => '6+',
	];

	const BATHS = [
		'1' => '1+',
		'1.5' => '1.5+',
		'2' => '2+',
		'2.5' => '2.5+',
		'3' => '3+',
		'4' => '4+',
		'5' => '5+',
		'6' => '6+',
	];

	const FEATURES = [
		'justListed' => 'Just Listed',
		'walkable' => 'Walkable',
		'fixerUpper' => 'Fixer Upper',
		'newlyBuilt' => 'Newly Built',
		'openHouse' => 'Open House',
		'adult' => 'Adult 55+',
		'green' => 'Green/Energy Star',
		'horse' => 'Horse Property',
		'golf' => 'Golf Course',
		'pool' => 'Pool',
		'reduced' => 'Reduced',
		'foreclosures' => 'Foreclosures',
		'shortSales' => 'Short Sales',
		'deck' => 'Deck',
		'basement' => 'Basement',
		'masterOnMain' => 'Master on Main',
		'airConditioner' => 'Air Conditioning',
		'furnished' => 'Furnished',
		'allowsPets' => 'Allows Pets',
		'notdistresssed' => 'Not Distressed',
		'sellerfinance' => 'Seller Financing',
		'fireplace' => 'Fireplace',
		'leasetoown' => 'Lease to Own',
		'hoa' => 'No HOA Fees',
	];

	const VIEWS = [
		'waterfront' => 'Water Front',
		'waterView' => 'Water View',
		'views' => 'Views'
	];

	const BUILDING_STYLE = [
	    'attached' => 'Attached',
        'detached' => 'Detached',
        'mobile' => 'Mobile',
        'semi-detached' => 'Semi-Detached',
        'townhouse' => 'Townhouse',
        'duplex' => 'Duplex',
        'triplex' => 'Triplex',
        'fourplex' => 'Fourplex',
        'multi' => 'Multiplex',

    ];

	const STORIES = [
		'1story' => '1 Story',
		'2story' => '2 Stories',
		'3story' => '3 Stories'
	];

	const GARAGE_CAPACITY = [
		'1garage' => '1-Car Garage+',
		'2garage' => '2-Car Garage+',
		'3garage' => '3-Car Garage+'
	];

	const MULTIPLE_VALUE_FILTERS = ['options', 'propertyViews', 'propertyTypes', 'styles', 'buildingStyles', 'keywords'];

	public static function replaceStringInObject($object, $search, $replace) {
		// Check if the given object is an array
		if (is_array($object)) {
			// Iterate over each element in the array
			foreach ($object as $key => $value) {
				// Recursively call the function for each element
				$object[$key] = replaceStringInObject($value, $search, $replace);
			}
		} elseif (is_object($object)) {
			// If the given object is an object, iterate over its properties
			foreach ($object as $key => $value) {
				// Recursively call the function for each property value
				$object->$key = replaceStringInObject($value, $search, $replace);
			}
		} elseif (is_string($object)) {
			// If the given object is a string, replace the search string with the replace string
			$object = str_replace($search, $replace, $object);
		}
	
		return $object;
	}

	public static function request( $method, $endpoint, $body = null, $includeFeaturedAgent = null, $asArray = false, $isListingDetail = false ) {
		if ( is_array( $body ) ) {
			$body = http_build_query( $body );
		}

		// Fix slashes if there are trailing and leading slashes to data passed in.
		$endpoint = ltrim( $endpoint, '/' );
		$url = rtrim( Settings::get_api_url(), '/' ) . '/';

		$url = $url . $endpoint;

		$headers = [ 'Authorization' => Settings::get_api_key(), 'x-kvcore-wordpress' => true ];

		if(!empty($includeFeaturedAgent)) {
            $headers['X-Agent-Id'] = Settings::get_setting('listing_detail/default_agent_id');
        }

		$args = [
			'method' => $method,
			'timeout' => 45,
			'redirection' => 0, //defult 5
			'httpversion' => '1.0', //default 1.0
			'blocking' => true, //default true
			'headers' => $headers,
			'body' => $body,
			'cookies' => [],
		];

		if(strpos($url, 'public/domain') !== false || strpos($url, 'public/areas') !== false) {
            return self::checkTransientData($method, $url, $args);
        } else {
            if ($method === 'POST') {
                $response = wp_remote_post($url, $args);
            } elseif ($method === 'PUT') {
                $response = wp_remote_request($url, $args);
            } else {
                $response = wp_remote_get($url, $args);
            }

            // TODO: all calls should start handling it in array format not stdclass
			if (strpos($url, 'public/listings') !== false && $isListingDetail === true) {
				$response = self::replaceStringInObject(wp_remote_retrieve_body($response), '\u0000*\u0000items', 'items');
				return json_decode($response);
            }
            if (strpos($url, 'public/listings') !== false && $asArray) {
				return json_decode(wp_remote_retrieve_body($response), true);
            }
			
			if (is_wp_error($response)) {
				return $response;
			}
			//check if error try to render standard way
			if (json_decode(stripslashes($response['body'])) === null) {
				return json_decode(wp_remote_retrieve_body($response));
			} else {
				return json_decode(stripslashes($response['body']));
			}
        }
	}

    public static function checkTransientData($method, $url, $args)
    {
        $transientData = get_transient( "wp_{$method}_{$url}" );

        if ( empty( $transientData ) ) {
            if ( $method === 'POST' ) {
                $response = wp_remote_post( $url, $args );
            } elseif ( $method === 'PUT' ) {
                $response = wp_remote_request( $url, $args );
            } else {
                $response = wp_remote_get( $url, $args );
            }
            $transientData = json_decode( wp_remote_retrieve_body( $response ));
            if(!empty($transientData)) {
                set_transient("wp_{$method}_{$url}", $transientData, 24 * HOUR_IN_SECONDS);
            }
        }
        return $transientData;
    }

	public static function get( $endpoint, $data = [] ) {
		return static::request( 'GET', static::get_relative_url( $endpoint, $data ) );
	}

	protected static function get_relative_url( string $endpoint, array $params = [] ): string {
		$cleaned_endpoint = trim( $endpoint, '/' );
		$cleaned_params = http_build_query( $params );

		if ( $cleaned_params ) {
			$cleaned_params = "?{$cleaned_params}";
		}

		return "{$cleaned_endpoint}{$cleaned_params}";
	}
}

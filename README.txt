=== kvCORE IDX ===
Tags: kvcore, idx, mls, kunversion, insiderealestate
Requires at least: 4.6
Tested up to: 5.7
Requires PHP: 7.1.3
Stable tag: trunk
License: GPLv2 or later
License URI: http://www.gnu.org/licenses/gpl-2.0.html

Display listings, capture leads, and so much more. Now you have the flexibility of WordPress plus the power of kvCORE.

== Description ==

Display listings, capture leads, and so much more. Now you have the flexibility of WordPress plus the power of kvCORE.

== Installation ==

Please note that the Properties and Property Detail page shortcodes are intended to be used on a full-width page that does not have a container.

1. Upload `kvcore-idx` to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress

== Frequently Asked Questions ==

= Do I need to follow the "Development Instructions" in order to use this plugin? =

No, the Development Instructions are only required if you wish to modify the SCSS, Ajax Twig templates, or JavaScript files that are included with the plugin.

== Screenshots ==

1. kvCORE IDX Settings

== Development Instructions ==

*Note*: this is only required if you wish to rebuild the SCSS and JavaScript assets used by the plugin.

Requires:
- npm, yarn or similar
- grunt
- composer

1. run `composer install` in kvcore-idx/includes
2. run `npm install` in kvcore-idx/ directory
3. if you do not have grunt installed, run `npm install -g grunt`
4. run `grunt build` to compile SCSS and Twig.js views

== Changelog ==

= 1.5.0.0 =
* Initial public plugin release
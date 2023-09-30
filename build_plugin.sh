#!/bin/bash

set -eo pipefail

function check_for_bin {
    local bin=$1

    if ! which "$1" > /dev/null; then
        echo "ERROR -- \`$bin\` is not available on this system. Please install it first." 1>&2
        exit 1
    fi
}

# Check for dependencies
check_for_bin node
check_for_bin npm
check_for_bin composer

# Making sure we're in the same directory as the build script
pushd $(dirname $0); {

    # Install dependencies of includes
    pushd includes; {
        composer install
    }; popd

    # Install npm dependencies
    npm install

    # Run grunt build with local installation of grunt and grunt-cli
    $(npm bin)/grunt build
}; popd


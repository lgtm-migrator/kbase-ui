cd tools/node
DIR=`pwd`/../../react-app docker compose run --rm node npm clean-install
DIR=`pwd`/../../react-app docker compose run --rm node npm run start 
cd tools/build
DIR=`pwd`/../../react-app docker-compose run node npm clean-install
DIR=`pwd`/../../react-app docker-compose run node npm run build 
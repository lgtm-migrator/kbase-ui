# Makefile for kbase-ui.
#
# The general flow is as follows:
# 1. Local development = just run 'make'
# 2. KBase deployment = run 'make && make deploy'
# (this might take a little configuration depending on the
# deployment location)
# 3. Run all tests = make test
#
# This Makefile is mostly here as a convenience to the devops
# crew. The actual build/test/deploy process is managed by
# Grunt (in a common JavaScript style), but some essential tasks
# are exposed here.

# set TARGET to use different deploy-*.cfg files (deploy-ci, deploy-prod, etc)
# currently only 'prod', 'ci', and 'next' are valid variables.
TARGET			= ci
PACKAGE			= ui-common
TOPDIR			= $(PWD)
DISTLIB			= $(TOPDIR)/build
DOCSLIB			= $(TOPDIR)/docs
DEPLOY_CFG		= deploy-$(TARGET).cfg
KB_TOP			= /kb
GRUNT		    = ./node_modules/.bin/grunt
KARMA			= ./node_modules/.bin/karma

# The config used to control the build (build task)
# dev, prod
# Defaults to prod
config			= 

# The kbase-ui build folder to use for the docker image.
# values: build, dist
# Defaults to dist 
# For local development, one would use the build, since is much faster 
# to create. A debug build may be available in the future.
build           = dev

# The deploy environment; used by dev-time image runners
# dev, ci, next, appdev, prod
# No default, because one should think about this.
# Used to target the actual deploy config file (see kbase-ini-dir).
env             = dev

# The custom docker network
# For local development.
net 			= kbase-dev

# The source of deployment configuration files.
# The value can be a filesystem path or a url; note that the actual config (ini) file is 
# applied to the path based on the "env" 
# This is for development only - deployment uses it's own script to launch the image.
# TODO: for the sake of completeness, https with self-signed certs should be supported.
kbase-ini-dir  = /kb/deployment/config

# functions

# check_defined variable-name message
# Ensures that the given variable 'variable-name' is defined; if not 
# prints 'message' and the process exits with 1.
# thanks https://stackoverflow.com/questions/10858261/abort-makefile-if-variable-not-set
check_defined = \
    $(strip $(foreach 1,$1, \
        $(call __check_defined,$1,$(strip $(value 2)))))
__check_defined = \
    $(if $(value $1),, \
        $(error Undefined $1$(if $2, ($2))$(if $(value @), \
                required by target `$@')))

.PHONY: all test build docs

# Standard 'all' target = just do the standard build
all:
	@echo Use "make init && make build config=TARGET build"
	@echo see docs/quick-deploy.md

# See above for 'all' - just running 'make' should locally build
default:
	@echo Use "make init && make build config=TARGET build"
	@echo see docs/quick-deploy.md

# Initialization here pulls in all dependencies from Bower and NPM.
# This is **REQUIRED** before any build process can proceed.
# bower install is not part of the build process, since the bower
# config is not known until the parts are assembled...

setup-dirs:
	@echo "> Setting up directories."
	mkdir -p temp/files

node_modules:
	@echo "> Installing build and test tools."
	npm install

setup: setup-dirs

init: setup node_modules

# Perform the build. Build scnearios are supported through the config option
# which is passed in like "make build config=ci"
build: clean-build 
	@echo "> Building."
	cd mutations; node build $(config)

build-deploy-configs:
	@echo "> Building Deploy Configs..."
	@mkdir -p $(TOPDIR)/build/deploy/configs
	@cd mutations; node build-deploy-configs $(TOPDIR)/deployment/ci/docker/kb-deployment/conf/config.json.tmpl $(TOPDIR)/config/deploy $(TOPDIR)/build/deploy/configs
	@echo "> ... deploy configs built in $(TOPDIR)/build/deploy/configs"

docker-network:
	@:$(call check_defined, net, "the docker custom network: defaults to 'kbase-dev'")
	bash tools/docker/create-docker-network.sh $(net)

# $(if $(value network_exists),$(echo "exists"),$(echo "nope"))

docker-ignore:
	@echo "> Syncing .dockerignore from .gitignore"
	@$(TOPDIR)/node_modules/.bin/dockerignore

# Build the docker image, assumes that make init and make build have been done already
docker-image: 
	@echo "> Building docker image for this branch; assuming we are on Travis CI"
	@bash $(TOPDIR)/deployment/tools/build-travis.bash

fake-travis-build:
	@echo "> Building docker image for this branch, using fake "
	@echo "  Travis environment variables derived from git."
	@bash $(TOPDIR)/tools/docker/build-travis-fake.bash


docker-compose-override: 
	@echo "> Creating docker compose override..."
	@echo "> With options:"
	@echo "> plugins $(plugins)"
	@echo "> internal $(internal-plugins)"
	@echo "> libraries $(libraries)"
	@echo "> paths $(paths)"
	@echo "> local narrative $(local-narrative)"
	@echo "> dynamic service proxies $(dynamic-services)"
	$(eval cmd = node $(TOPDIR)/tools/docker/build-docker-compose-override.js $(env) \
	  $(foreach p,$(plugins),--plugin $(p)) \
	  $(foreach i,$(internal-plugins),--internal $i) \
	  $(foreach l,$(libraries),--lib $l) \
	  $(foreach f,$(paths),---path $f) \
	  $(foreach d,$(dynamic-services),--dynamic_services $d) \
	  $(if $(findstring t,$(local-narrative)),--local_narrative))
	@echo "> Issuing: $(cmd)"
	$(cmd)

docker-compose-up: docker-network docker-compose-override
	@:$(call check_defined, build, "the kbase-ui build config: defaults to 'dev'")
	@:$(call check_defined, env, "the runtime (deploy) environment: defaults to 'dev'")
	@echo "> Building and running docker image for development"
	$(eval cmd = cd dev; BUILD=$(build) DEPLOY_ENV=$(env) docker-compose up \
		$(if $(findstring t,$(build-image)),--build))
	@echo "> Issuing $(cmd)"
	$(cmd)

# @cd dev; BUILD=$(build) DEPLOY_ENV=$(env) docker-compose up --build

docker-compose-clean:
	@echo "> Cleaning up after docker compose..."
	@cd dev; BUILD=$(build) DEPLOY_ENV=$(env) docker-compose rm -f -s
	@echo "> If necessary, Docker containers have been stopped and removed"

docker-network-clean:
	# @:$(call check_defined, net, "the docker custom network: defaults to 'kbase-dev'")
	bash tools/docker/clean-docker-network.sh

dev-start: init docker-compose-up

dev-stop: docker-compose-clean docker-network-clean


uuid:
	@node ./tools/gen-uuid.js

# Tests are managed by grunt, but this also mimics the workflow.
#init build
unit-tests:
	$(KARMA) start test/unit-tests/karma.conf.js

integration-tests:
	@:$(call check_defined, host, first component of hostname)
	$(GRUNT) integration-tests --host=$(host)

travis-tests:
	$(GRUNT) test-travis

test: unit-tests

test-travis: unit-tests travis-tests


# Clean slate
clean: clean-docs
	$(GRUNT) clean-all

clean-temp:
	$(GRUNT) clean:temp

clean-build:
	$(GRUNT) clean-build

clean-docs:
	@rm -rf ./docs/book/_book
	@rm -rf ./docs/node_modules

# If you need more clean refinement, please see Gruntfile.js, in which you will
# find clean tasks for each major build artifact.

docs:
	cd docs; \
	npm install; \
	./node_modules/.bin/gitbook build ./book

docs-viewer: docs
	cd docs; \
	(./node_modules/.bin/wait-on -t 10000 http://localhost:4000 && ./node_modules/.bin/opn http://localhost:4000 &); \
	./node_modules/.bin/gitbook serve ./book

# git -c http.sslVerify=false clone https://oauth2:s5TDQnKk4kpHXCVdUNfh@gitlab.kbase.lbl.gov:1443/devops/kbase_ui_config.git
get-gitlab-config:
	mkdir -p dev/gitlab-config; \
	git clone -b develop ssh://git@gitlab.kbase.lbl.gov/devops/kbase_ui_config.git dev/gitlab-config

clean-gitlab-config:
	rm -rf dev/gitlab-config
	


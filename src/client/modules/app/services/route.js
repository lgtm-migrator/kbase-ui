define(['bluebird', 'lib/router', 'kb_lib/lang'], function (Promise, routerMod, lang) {
    'use strict';
    function factory(config, params) {
        var runtime = params.runtime,
            router = new routerMod.Router(config),
            currentRouteHandler = null,
            receivers = [],
            eventListeners = [];

        function doRoute() {
            var handler;
            try {
                handler = router.findCurrentRoute();
            } catch (ex) {
                console.error(ex);
                if (ex instanceof routerMod.NotFoundException) {
                    handler = {
                        request: ex.request,
                        original: ex.original,
                        path: ex.path,
                        params: {
                            request: ex.request,
                            original: ex.original,
                            path: ex.path
                        },
                        route: {
                            authorization: false,
                            widget: 'notFound'
                        }
                    };
                } else {
                    throw ex;
                }
            }
            runtime.send('route', 'routing', handler);
            currentRouteHandler = handler;

            // Ensure that if authorization is enabled for this route, that we have it.
            // If not, route to the login path with the current path encoded as
            // "nextrequest". This ensures that we can close the loop for accessing
            // auth-required endpoints.
            if (handler.route.authorization) {
                if (!runtime.service('session').isLoggedIn()) {
                    var loginParams = {
                        source: 'authorization'
                    };
                    if (handler.request.path) {
                        loginParams.nextrequest = JSON.stringify(handler.request);
                    }
                    // TODO refactor-expt: here is where SOMETHING needs to listen for the login event.
                    // This is where we can hook in.
                    runtime.send('app', 'navigate', {
                        path: 'login',
                        // path: runtime.feature('auth', 'paths.login'),
                        // TODO: path needs to be the path + params
                        params: loginParams
                    });
                    return;
                }
            }

            // We can also require that the route match at least one role defined in a list.
            if (handler.route.rolesRequired) {
                var roles = runtime.service('session').getRoles();
                if (
                    !roles.some(function (role) {
                        return handler.route.rolesRequired.some(function (requiredRole) {
                            return requiredRole === role.id;
                        });
                    })
                ) {
                    handler = {
                        params: {
                            title: 'Access Error',
                            error:
                                'One or more required roles not available in your account: ' +
                                handler.route.rolesRequired.join(', ')
                        },
                        route: {
                            authorization: false,
                            widget: 'error'
                        }
                    };
                    // throw new Error('One or more required roles not available in your account: ' + handler.route.requiredRoles.join(', '));
                    // throw new lang.UIError({
                    //     type: 'ConfiguratonError',
                    //     name: 'RouterConfigurationError',
                    //     source: 'installRoute',
                    //     message: 'invalid route',
                    //     suggestion: 'Fix the plugin which specified this route.',
                    //     data: route
                    // });
                }
            }
            var route = {
                routeHandler: handler
            };
            if (handler.route.redirect) {
                runtime.send('app', 'route-redirect', route);
            } else if (handler.route.widget) {
                runtime.send('app', 'route-widget', route);
            } else if (handler.route.handler) {
                runtime.send('app', 'route-handler', route);
            }
        }

        function installRoute(route) {
            return Promise.try(function () {
                if (route.widget) {
                    router.addRoute(route);
                    return true;
                } else if (route.redirectHandler) {
                    router.addRoute(route);
                    return true;
                } else {
                    throw new lang.UIError({
                        type: 'ConfiguratonError',
                        name: 'RouterConfigurationError',
                        source: 'installRoute',
                        message: 'invalid route',
                        suggestion: 'Fix the plugin which specified this route.',
                        data: route
                    });
                }
            });
        }

        function installRoutes(routes) {
            return Promise.try(() => {
                if (!routes) {
                    return;
                }
                return Promise.all(
                    routes.map(function (route) {
                        return installRoute(route);
                    })
                );
            });
        }

        function pluginHandler(pluginConfig) {
            return installRoutes(pluginConfig);
        }

        function start() {
            runtime.receive('app', 'do-route', function () {
                doRoute();
            });

            runtime.receive('app', 'new-route', function (data) {
                if (data.routeHandler.route.redirect) {
                    runtime.send('app', 'route-redirect', data);
                } else if (data.routeHandler.route.widget) {
                    runtime.send('app', 'route-widget', data);
                } else if (data.routeHandler.route.handler) {
                    runtime.send('app', 'route-handler', data);
                }
            });

            runtime.receive('app', 'route-redirect', function (data) {
                runtime.send('app', 'navigate', {
                    path: data.routeHandler.route.redirect.path,
                    params: data.routeHandler.route.redirect.params
                });
            });

            runtime.receive('app', 'navigate', function (data) {
                router.navigateTo(data);
            });

            runtime.receive('app', 'redirect', function (data) {
                router.redirectTo(data.url, data.new_window || data.newWindow);
            });

            eventListeners.push({
                target: window,
                type: 'hashchange',
                listener: function () {
                    // $(window).on('hashchange', function () {
                    // NB this is called AFTER it has changed. The browser will do nothing by
                    // default
                    doRoute();
                }
            });
            eventListeners.forEach(function (listener) {
                listener.target.addEventListener(listener.type, listener.listener);
            });
        }

        function stop() {
            receivers.forEach(function (receiver) {
                if (receiver) {
                    runtime.drop(receiver);
                }
            });
            eventListeners.forEach(function (listener) {
                listener.target.removeEventListener(listener.type, listener.listener);
            });
        }

        function isAuthRequired() {
            if (!currentRouteHandler) {
                return false;
            }
            return currentRouteHandler.route.authorization;
        }

        return {
            pluginHandler: pluginHandler,
            start: start,
            stop: stop,
            isAuthRequired: isAuthRequired
        };
    }
    return {
        make: factory
    };
});

import { stache } from "../../lib/kb_lib/Utils";
import {
    NotFoundException,
    NotFoundHasRealPathException,
    NotFoundNoHashException,
    RedirectException,
    RoutedRequest,
    RouteOptions,
    Router,
    RouteSpec,
    RoutingLocation,
} from "./router";
import { Receiver, Runtime, Service, SimpleMap } from "../../lib/types";

type RouteHandler = RoutedRequest;

interface EventListener {
    target: Element | Window;
    type: string;
    listener: () => void;
}

interface ServiceConfig {
    routes: Array<RouteSpec>;
    mode: string;
}

interface AppletConfig {
}

interface AppletDefinition {
    package: {
        name: string;
    };
}

interface RouteServiceConfig extends ServiceConfig {
    defaultLocation: RoutingLocation;
    urls: SimpleMap<string>;
}

interface RouteServiceParams {
    config: RouteServiceConfig;
    params: UIServiceParams;
}

interface UIServiceParams {
    runtime: Runtime;
}

interface Role {
    id: string;
}

export class RouteService extends Service<RouteServiceConfig> {
    runtime: Runtime;
    router: Router;
    currentRouteHandler: RouteHandler | null;
    receivers: Array<Receiver>;
    eventListeners: Array<EventListener>;

    constructor(param: RouteServiceParams) {
        super();
        const { config, params } = param;
        this.runtime = params.runtime;
        this.router = new Router({
            runtime: params.runtime,
            defaultLocation: config.defaultLocation,
            urls: config.urls,
        });
        this.currentRouteHandler = null;
        this.receivers = [];
        this.eventListeners = [];
    }

    doRoute() {
        const routed = ((): RoutedRequest | null => {
            try {
                const routed = this.router.findCurrentRoute();
                const rolesRequired = routed.route.rolesRequired;
                if (rolesRequired) {
                    const roles = this.runtime.service("session").getRoles() as Array<Role>; // TODO
                    if (
                        !roles.some((role) => {
                            return rolesRequired.some((requiredRole) => {
                                return requiredRole === role.id;
                            });
                        })
                    ) {
                        return {
                            request: routed.request,
                            params: {
                                title: {
                                    name: "title",
                                    type: "string",
                                    value: "Access Error"
                                },
                                message: {
                                    name: "message",
                                    type: "string",
                                    value:
                                        `One or more required roles not available in your account:${rolesRequired.join(", ")
                                        }`
                                }
                            },
                            route: {
                                path: [],
                                view: "",
                                authorization: false,
                                component: "reactComponents/Error",
                                type: 'component',
                                name: 'error'
                            }
                        };
                    }
                }
                return routed;
            } catch (ex) {
                if (ex instanceof NotFoundException) {
                    return {
                        // request: ex.request,
                        // original: ex.original,
                        // path: ex.path,
                        request: ex.request,
                        params: {
                            // request: ex.request,
                            // original: ex.original,
                        },
                        route: {
                            path: [],
                            view: "",
                            authorization: false,
                            component: "/reactComponents/NotFound",
                            type: 'component',
                            name: 'notfound'
                        },
                    };
                } else if (ex instanceof RedirectException) {
                    // TODO: do as redirect route!
                    window.location.href = ex.url;
                    return null;
                } else if (ex instanceof NotFoundNoHashException) {
                    // TODO: refactor this, "reason" is just an idea.
                    // return {
                    //     request: {
                    //         path: [],
                    //         query: {},
                    //         realPath: ''
                    //     },
                    //     params: {
                    //         reason: {
                    //             name: 'reason',
                    //             type: 'string',
                    //             value: 'not found no hash'
                    //         }
                    //     },
                    //     route: {
                    //         path: [],
                    //         view: '',
                    //         authorization: false,
                    //         component: '/reactComponents/NotFound'
                    //     }
                    // };
                    this.runtime.send("app", "navigate", this.router.defaultLocation);
                    return null;
                } else if (ex instanceof NotFoundHasRealPathException) {
                    return {
                        request: {
                            path: [],
                            original: "",
                            query: {},
                            realPath: ex.realPath,
                        },
                        params: {
                            reason: {
                                name: "reason",
                                type: "string",
                                value: "has real path",
                            },
                        },
                        route: {
                            path: [],
                            view: "",
                            authorization: false,
                            component: "/reactComponents/NotFound",
                            type: 'component',
                            name: 'notfound'
                        },
                    };
                } else {
                    throw ex;
                }
            }
        })();

        // Already handled!
        if (routed === null) {
            return;
        }

        this.runtime.send("route", "routing", routed);
        this.currentRouteHandler = routed;

        // Hack to handle narrative redirects until we improve them.
        if (
            routed.params.nextrequest && routed.params.nextrequest.type === "string"
        ) {
            try {
                // TODO: hmm, maybe multi-typed params is not a good idea?
                // TODO: narrative will set the nextrequest param to a string
                // which begins with /narrative.
                const nextRequest = JSON.parse(routed.params.nextrequest.value);
                if (typeof nextRequest.path === "string") {
                    if (nextRequest.path.match(/^\/narrative/)) {
                        // routed.route.authorization = true;
                        routed.params.source = {
                            name: "source",
                            type: "string",
                            value: "authorization",
                        };
                    }
                    nextRequest.path = nextRequest.path.split("/").slice(1);
                    nextRequest.original = nextRequest.path;
                } else {
                    nextRequest.original = nextRequest.path.join("/");
                }

                routed.params.nextrequest.value = JSON.stringify(nextRequest);
            } catch (ex) {
                console.warn("Bad nextrequest", routed.params.nextrequest, ex);
            }
        }

        // Ensure that if authorization is enabled for this route, that we have it.
        // If not, route to the login path with the current path encoded as
        // "nextrequest". This ensures that we can close the loop for accessing
        // auth-required endpoints.
        if (routed.route.authorization) {
            if (!this.runtime.service("session").isAuthenticated()) {
                const loginParams: SimpleMap<string> = {
                    source: "authorization",
                };
                if (routed.request.path) {
                    loginParams.nextrequest = JSON.stringify(routed.request);
                }
                // TODO refactor-expt: here is where SOMETHING needs to listen for the login event.
                // This is where we can hook in.
                this.runtime.send("app", "navigate", {
                    path: "login",
                    // path: runtime.feature('auth', 'paths.login'),
                    // TODO: path needs to be the path + params
                    params: loginParams,
                });
                return;
            }
        }

        this.runtime.send("app", "route-component", routed);
    }

    installRoute(route: RouteSpec, options: RouteOptions) {
        // TODO: improve typing by route type
        route.type = options.type;
        route.name = options.name;

        route.path = stache(
            route.path,
            new Map<string, string>([["name", options.name], ["plugin", options.name]]),
        );

        if (route.component) {
            // This used to be internal plugins, now they are "applets".
            this.router.addRoute(route, options);
        } else {
            // This is how iframe-mounted plugins are managed.
            route.component = "/pluginSupport/Plugin";
            this.router.addRoute(route, options);
        }
    }

    installRoutes(routes: Array<RouteSpec>, options: RouteOptions) {
        if (!routes) {
            return;
        }
        routes.map((route) => {
            return this.installRoute(route, options);
        });
    }

    pluginHandler(
        serviceConfig: ServiceConfig,
        type: 'applet' | 'plugin',
        name: string
    ) {
        return new Promise((resolve, reject) => {
            try {
                // Install all the routes
                this.installRoutes(serviceConfig.routes || serviceConfig, {
                    type,
                    name: name,
                    mode: serviceConfig.mode,
                });
                resolve(null);
            } catch (ex) {
                reject(ex);
            }
        });
    }

    start() {
        this.runtime.receive("app", "do-route", () => {
            this.doRoute();
        });

        this.runtime.receive("app", "new-route", (routed) => {
            if (routed.route.redirect) {
                this.runtime.send("app", "route-redirect", routed);
            } else if (routed.route.component) {
                this.runtime.send("app", "route-component", routed);
            } else if (routed.route.handler) {
                this.runtime.send("app", "route-handler", routed);
            }
        });

        this.runtime.receive("app", "route-redirect", (routed) => {
            this.runtime.send("app", "navigate", {
                path: routed.route.redirect.path,
                params: routed.route.redirect.params,
            });
        });

        this.runtime.receive("app", "navigate", (data) => {
            // NEW: convert the legacy navigation location to the
            // new easier-to-type one defined in router.ts
            const location: RoutingLocation = ((): RoutingLocation => {
                if (!data || !data.path && !data.url) {
                    return {
                        type: "internal",
                        path: "dashboard",
                    };
                }

                if (data.url) {
                    return {
                        type: "external",
                        newWindow: true,
                        url: data.url,
                    };
                }

                // Catch narrative  requests.
                // TODO: we should establish a full url format for this.
                if (data.path[0] === "narrative") {
                    return {
                        type: "external",
                        newWindow: false,
                        url: [window.location.origin, data.path.join("/")].join("/"),
                    };
                }

                // TODO: umm, in routing location the path is a string path,
                // the hash path, but in the navigate message it may be
                // an array also. need to sort that out.
                const path = ((possiblePath) => {
                    if (Array.isArray(possiblePath)) {
                        return possiblePath.join("/");
                    }
                    if (typeof possiblePath !== "string") {
                        throw new Error('Invalid value for "path" in location');
                    }
                    return possiblePath;
                })(data.path);

                return {
                    type: "internal",
                    path,
                    params: data.params,
                };
            })();
            this.router.navigateTo(location);
        });

        this.runtime.receive("app", "redirect", ({ url }) => {
            if (!url) {
                throw new Error('"url" is required for a "redirect" message');
            }
            if (typeof url !== "string") {
                throw new Error('"url" must be a string');
            }
            this.router.navigateTo({
                type: "external",
                url,
            });
            // data.url, data.new_window || data.newWindow);
        });

        this.eventListeners.push({
            target: window,
            type: "hashchange",
            listener: () => {
                this.doRoute();
            },
        });
        this.eventListeners.forEach((listener) => {
            listener.target.addEventListener(listener.type, listener.listener);
        });
        return Promise.resolve();
    }

    stop() {
        this.receivers.forEach((receiver) => {
            if (receiver) {
                this.runtime.drop(receiver);
            }
        });
        this.eventListeners.forEach((listener) => {
            listener.target.removeEventListener(listener.type, listener.listener);
        });
        return Promise.resolve();
    }

    isAuthRequired() {
        if (!this.currentRouteHandler) {
            return false;
        }
        return this.currentRouteHandler.route.authorization;
    }
}

export const ServiceClass = RouteService;
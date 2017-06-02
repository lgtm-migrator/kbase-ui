define([
    'jquery',
    'bluebird',
    'knockout-plus',
    'uuid',
    'kb_common/html',
    'bootstrap'
], function (
    $,
    Promise,
    ko,
    Uuid,
    html
) {
    'use strict';

    var t = html.tag,
        div = t('div'),
        a = t('a');

    function factory(config) {
        var container;
        var runtime = config.runtime;
        var sendingChannel = new Uuid(4).format();

        // individual notification item
        function notification(params) {
            var message = ko.observable(params.message.message);
            var autodismiss = params.message.autodismiss;
            var type = params.message.type;
            var over = ko.observable(false);

            function doMouseOver() {
                over(true);
            }

            function doMouseOut() {
                over(false);
            }

            return {
                message: message,
                autodismiss: autodismiss,
                type: type,

                over: over,
                doMouseOver: doMouseOver,
                doMouseOut: doMouseOut
            };
        }

        // a bunch of notifications together.
        function viewModel(params) {
            var queue = ko.observableArray();
            var over = ko.observable(false);
            var show = ko.observable(false);
            var autoDismisser;

            function runAutoDismisser() {
                var toRemove = [];
                var now = new Date().getTime();
                queue().forEach(function (item) {
                    if (item.autodismiss) {
                        var elapsed = now - item.addedAt;
                        if (item.autodismiss < elapsed) {
                            toRemove.push(item);
                        }
                    }
                });
                toRemove.forEach(function (item) {
                    var summaryItem = summary[item.type];
                    if (summaryItem) {
                        summaryItem.count(summaryItem.count() - 1);
                    }

                    queue.remove(item);
                });
                if (queue().length > 0) {
                    startAutoDismisser(true);
                } else {
                    autoDismisser = null;
                }
            }

            function startAutoDismisser(force) {
                if (autoDismisser && !force) {
                    return;
                }
                autoDismisser = window.setTimeout(function () {
                    runAutoDismisser();
                }, 1000);
            }

            queue.subscribe(function (newQueue) {
                // start or stop the autodismiss listener
                var autoDismissable = false;
                var newItems = false;
                newQueue.forEach(function (item) {
                    if (!item.addedAt) {
                        newItems = true;
                        item.addedAt = new Date().getTime();
                    }
                    if (item.autodismiss) {
                        autoDismissable = true;
                    }
                });
                if (newItems) {
                    show(true);
                }
                if (queue().length === 0) {
                    show(false);
                }
                if (autoDismissable) {
                    startAutoDismisser();
                }
            });

            // EVENT HANDLERS

            function doMouseOver() {
                over(true);
            }

            function doMouseOut() {
                over(false);
            }

            function doToggleNotification() {
                // only allow toggling if have items...
                // if (queue().length === 0) {
                //     return;
                // }
                if (show()) {
                    show(false);
                } else {
                    show(true);
                }
            }

            function doCloseNotifications() {
                console.log('closing?');
                show(false);
            }

            function doClearNotification(data, event) {
                event.stopPropagation();

                var summaryItem = summary[data.type];
                if (summaryItem) {
                    summaryItem.count(summaryItem.count() - 1);
                }

                queue.remove(data);
            }

            function summaryItem(name) {
                var count = ko.observable(0);
                return {
                    label: name,
                    count: count,
                    myClass: ko.pureComputed(function () {
                        if (count() > 0) {
                            return '-' + name + ' -hasitems';
                        } else {
                            return '-' + name;
                        }
                    })
                };
            }

            var summary = {
                success: summaryItem('success'),
                info: summaryItem('info'),
                warn: summaryItem('warn'),
                error: summaryItem('error'),
            };

            function processMessage(message) {
                // start simple, man.
                if (!message.id) {
                    message.id = new Uuid(4).format();
                }
                var summaryItem = summary[message.type];
                if (summaryItem) {
                    summaryItem.count(summaryItem.count() + 1);
                }
                queue.unshift(notification({
                    message: message
                }));
            }

            var hasNotifications = ko.pureComputed(function () {
                if (queue().length === 0) {
                    return false;
                }
                return true;
            });

            runtime.send('notification', 'ready', {
                channel: sendingChannel
            });
            runtime.recv(sendingChannel, 'new', function (message) {
                processMessage(message);
            });


            return {
                label: params.label,
                queue: queue,
                summary: summary,
                over: over,
                show: show,
                hasNotifications: hasNotifications,
                // backgroundColor: backgroundColor,
                doMouseOver: doMouseOver,
                doMouseOut: doMouseOut,
                doToggleNotification: doToggleNotification,
                doClearNotification: doClearNotification,
                doCloseNotifications: doCloseNotifications
            };
        }


        // function xviewModel(params) {
        //     var notifications = notificationSet();
        //     //var notificationSummary = 
        //     // var notifications = {
        //     //     info: notificationSet({
        //     //         label: 'info'
        //     //     }),
        //     //     warn: notificationSet({
        //     //         label: 'warn'
        //     //     }),
        //     //     error: notificationSet({
        //     //         label: 'error'
        //     //     })
        //     // };

        //     function processMessage(message) {
        //         // start simple, man.
        //         var type = message.type;
        //         if (!message.id) {
        //             message.id = new Uuid(4).format();
        //         }
        //         notifications[type].queue.unshift(notification({
        //             message: message
        //         }));
        //     }

        //     var hasNotifications = ko.pureComputed(function () {
        //         if (notifications.info.queue().length +
        //             notifications.warn.queue().length +
        //             notifications.error.queue().length === 0) {
        //             return false;
        //         }
        //         return true;
        //     });

        //     runtime.send('notification', 'ready', {
        //         channel: sendingChannel
        //     });
        //     runtime.recv(sendingChannel, 'new', function (message) {
        //         processMessage(message);
        //     });

        //     return {
        //         notifications: notifications,
        //         hasNotifications: hasNotifications
        //     };
        // }

        function buildSummaryItem(name) {
            return div({
                dataBind: {
                    with: name
                }
            }, div({
                dataBind: {
                    css: 'myClass'
                },
                class: '-item'
            }, [
                div({
                    dataBind: {
                        text: 'count'
                    },
                    style: {
                        display: 'inline-block',
                        width: '30%',
                        textAlign: 'right',
                        paddingRight: '3px',
                        lineHeight: '1'
                    }
                }),
                div({
                    dataBind: {
                        text: 'label'
                    },
                    style: {
                        display: 'inline-block',
                        width: '60%'
                    }
                })
            ]));
        }

        function buildSummary() {
            return div({
                dataBind: {
                    with: 'summary',
                    click: 'doToggleNotification'
                },
                class: '-summary'
            }, [
                buildSummaryItem('success'),
                buildSummaryItem('info'),
                buildSummaryItem('warn'),
                buildSummaryItem('error')
            ]);
        }

        function buildNotificationDisplay() {
            return div({
                dataBind: {

                    css: {
                        '"-active"': 'show'
                    },
                },
                class: '-container'
            }, [
                div({
                    dataBind: {
                        css: {
                            hidden: '!show()'
                        }
                    },
                    class: '-notification-set',
                    style: {
                        position: 'absolute',
                        top: '0px',
                        right: '20px',
                        zIndex: '100',
                        width: '200px'
                    }
                }, [
                    div({
                        class: '-triangle'
                    }, '▶'),
                    div({
                        style: {
                            display: 'inline-block'
                        }
                    }, 'current messages'),
                    a({
                        dataBind: {
                            click: '$component.doCloseNotifications',
                        },
                        class: '-close-button'
                    }, 'dismiss'),
                    div({
                        class: '-notification-container',
                        dataBind: {
                            foreach: 'queue'
                        }
                    }, div({
                        class: '-notification',
                        dataBind: {
                            css: {
                                '"-success"': 'type === "success"',
                                '"-info"': 'type === "info"',
                                '"-warn"': 'type === "warn"',
                                '"-error"': 'type === "error"'
                            }
                        },
                    }, [
                        div({
                            dataBind: {
                                html: 'message'
                            },
                            style: {
                                display: 'inline-block'
                            }
                        }),
                        a({
                            dataBind: {
                                click: '$parent.doClearNotification',
                            },
                            class: '-close-button'
                        }, 'x')
                    ]))
                ])
            ]);
        }

        function template() {
            return div({
                dataBind: {
                    if: 'queue().length > 0'
                },
                dataElement: 'widget-notification',
                class: 'widget-notification'
            }, div({
                style: {
                    // padding: '4px',
                    display: 'inline-block',
                    height: '100%',
                    verticalAlign: 'top',

                    border: '1px silver solid',
                    fontSize: '90%',
                    width: '80px'
                }
            }, [
                buildSummary(),
                buildNotificationDisplay()
            ]));
        }

        function component() {
            return {
                viewModel: viewModel,
                template: template()
            };
        }

        ko.components.register('notifications', component());

        // SERVICE API

        function attach(node) {
            container = node;
        }

        function start(params) {
            container.innerHTML = div({
                dataBind: {
                    component: {
                        name: '"notifications"',
                        params: {}
                    }
                }
            });
            var vm = {};
            try {
                ko.applyBindings(vm, container);
            } catch (err) {
                console.error('Error binding', err);
            }

        }

        function stop() {

        }

        function detach() {

        }

        return {
            attach: attach,
            start: start,
            stop: stop,
            detach: detach
        };

    }

    return {
        make: function (config) {
            return factory(config);
        }
    };
});
var Obismal = {
    about: {
        name: 'Obismal.js',
        version: '0.1.6',
        authors: [
            'Dorumin',
            'Lil\' Miss Raicow'
        ]
    },
    settings: {
        main: {
            on: true
        },
        plugins: {}
    },
    utility: {
        api: {
            get: function (data, callback) {
                Obismal.utility.api._api('GET', data, callback);
            },
            post: function (data, callback) {
                Obismal.utility.api._api('POST', data, callback);
            },
            _api: function(method, data, callback) {
                data.format = 'json';
                $.ajax({
                    type: method,
                    data: data,
                    dataType: 'json',
                    url: wgScriptPath + '/api.php',
                    success: function(response) {
                        if (response.error)
                            console.log('API error: ' + response.error.info);
                        else
                            callback(response);
                    },
                    error: function(xhr, error) {
                        console.log('AJAX error: ' + error);
                    }
                });
            }
        },
        getInlineRegex: getInlineRegex(variable, Default, title) {
            $.get('/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=' + title, function(data) {
                if (data.query.pages['-1']) {
                    window[variable] = Default;
                } else {
                    window[variable] = RegExp.escape(data.query.pages[Object.keys(data.query.pages)[0]].revisions[0]['*']).replace(/\\\$(1|2|3)/g, '.*');
                }
            });
        },
        plural: function (num, singular, plural) {
            return (num == 1 || num == -1) ? singular : plural;
        },
        lev_dist: function(s, t) {
            var d = []; //2d matrix

            // Step 1
            var n = s.length;
            var m = t.length;

            if (n == 0) return m;
            if (m == 0) return n;

            //Create an array of arrays in javascript (a descending loop is quicker)
            for (var i = n; i >= 0; i--) d[i] = [];

            // Step 2
            for (var i = n; i >= 0; i--) d[i][0] = i;
            for (var j = m; j >= 0; j--) d[0][j] = j;

            // Step 3
            for (var i = 1; i <= n; i++) {
                var s_i = s.charAt(i - 1);

                // Step 4
                for (var j = 1; j <= m; j++) {

                    //Check the jagged ld total so far
                    if (i == j && d[i][j] > 4) return n;

                    var t_j = t.charAt(j - 1);
                    var cost = (s_i == t_j) ? 0 : 1; // Step 5

                    //Calculate the minimum
                    var mi = d[i - 1][j] + 1;
                    var b = d[i][j - 1] + 1;
                    var c = d[i - 1][j - 1] + cost;

                    if (b < mi) mi = b;
                    if (c < mi) mi = c;

                    d[i][j] = mi; // Step 6

                    //Damerau transposition
                    if (i > 1 && j > 1 && s_i == t.charAt(j - 2) && s.charAt(i - 2) == t_j) {
                        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
                    }
                }
            }

            // Step 7
            return d[n][m];
        },

    },
    plugins: {
        add: function (name, hooks, plugin) {
            if (typeof Obismal.plugins[name] === 'undefined') {
                Obismal.plugins[name] = plugin;

                for (var i = 0; i < hooks.length; i++) {
                    switch (hooks[i]) {
                        case 'onJoin':
                            Obismal.plugins.loadout.onJoin.push(name);
                            break;
                        case 'onPart':
                            Obismal.plugins.loadout.onPart.push(name);
                            break;
                        case 'onMessage':
                            Obismal.plugins.loadout.onMessage.push(name);
                            break;
                        default:
                            break;
                    }
                }
            } else {
                throw new Error("Plugin \"" + name + "\" is already defined!");
            }
        },
        loadout: {
            onJoin: [],
            onPart: [],
            onMessage: []
        }
    },
    init: function() {
        // TBH I don't know why this is here
        $.fn.isAfter = function(sel) {
            return this.prevAll(sel).length !== 0;
        };

        // Because extending the object was easier somehow?
        RegExp.escape = function(s) {
            return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        };

        // New messages
        mainRoom.model.chats.bind('afteradd', function(data) {
            for (var i = 0; i < Obismal.plugins.loadout.onMessage.length; i++) {
                Obismal.plugins[Obismal.plugins.loadout.onMessage[i]].onMessage(data);
            }
        });

        // Users joining/leaving
        mainRoom.model.users.bind('add', function(data) {
            for (var i = 0; i < Obismal.plugins.loadout.onJoin.length; i++) {
                Obismal.plugins[Obismal.plugins.loadout.onJoin[i]].onJoin(data);
            }
        });

        mainRoom.model.users.bind('remove', function(data) {
            for (var i = 0; i < Obismal.plugins.loadout.onPart.length; i++) {
                Obismal.plugins[Obismal.plugins.loadout.onPart[i]].onPart(data);
            }
        });

        // Initialize plugins
        for (var plugin in Obismal.plugins) {
            if (plugin !== 'loadout') {
                if (Obismal.plugins[plugin].hasOwnProperty('init')) {
                    Obismal.plugins[plugin].init();
                }
            }
        }
    },
    send: function(msg) {
        if (msg && msg.length <= 1000) {
            mainRoom.socket.send(new models.ChatEntry({
                roomId: mainRoom.roomId,
                name: mw.config.get('wgUserName'),
                text: msg
            }).xport());
        }
    }
};

$(document).ready(function() {
    if (typeof Obismal !== 'undefined') {
        if (typeof mainRoom !== 'undefined') {
            if (Obismal.settings.main.on) {
                window.obismal_start = function(plugins) {
                    if (typeof plugins === 'object') {
                        if (plugins.length !== 0) {
                            $.when(plugins, $.Deferred(function(deferred){
                                $(deferred.resolve);
                            })).done(function(){
                                Obismal.init();
                            });
                        } else {
                            Obismal.init();
                        }
                    }
                }
            }
        }
    }
});

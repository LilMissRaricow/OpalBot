/**
 * Bismuth.js - a pure JS chatbot for those that have the time to run one in
 *              their browser.
 *
 * This bot is primarily a mix between an idea I had two years ago and a bot
 * someone actually wrote that encompasses the same idea. Namely opalbot which
 * you can find on the SU chat.
 *
 * @authors:
 *     - Lil' Miss Raricow
 *
 * @version: v0.1.6
 *
 * License:
 * Copyright (c) 2016 Maria Williams (Lil' Miss Raricow)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * The layout of Bismuth is super simple but just incase you are having issues
 * here is a nice little visualization of the structure of it.
 *
 * Bismuth
 *     - about
 *         - name
 *         - version
 *         - authors
 *     - init
 *     - send
 *     - plugins
 *         - loadout
 *             - onJoin
 *             - onPart
 *             - onMessage
 */

var Bismuth = {
    about: {
        name: 'Bismuth.js',
        version: '0.1.6',
        authors: [
            'Lil\' Miss Raicow'
        ]
    },
    settings: {
        main: {
            on: true
        },
        plugins: {}
    },
    plugins: {
        loadout: {
            onJoin: ['debug', 'welcome'],
            onPart: ['debug'],
            onMessage: ['debug', 'about']
        },
        about: {
            init: function() {
                if (Bismuth.settings.plugins.about) {
                    Bismuth.settings.plugins.about = { on: true };
                }
            },
            onMessage: function(data) {
                if (data.attributes.name !== mw.config.get('wgUserName')) {
                    if (data.attributes.text.substr(0, 6) === '!about') {
                        if (Bismuth.settings.plugins.about.on) {
                            Bismuth.send('[' + data.attributes.name + '] -> Running ' + Bismuth.about.name + ' v' + Bismuth.about.version);
                        }
                    }
                }
            }
        },
        debug: {
            init: function() {
                if (Bismuth.settings.plugins.debug) {
                    Bismuth.settings.plugins.debug = { on: true };
                }
            },
            onMessage: function(data) {
                if (Bismuth.settings.plugins.debug.on) {
                    console.log(data);
                }
            },
            onJoin: function(data) {
                if (Bismuth.settings.plugins.debug.on) {
                    console.log(data);
                }
            },
            onPart: function(data) {
                if (Bismuth.settings.plugins.debug.on) {
                    console.log(data);
                }
            }
        },
        welcome: {
            init: function() {
                if (Bismuth.settings.plugins.welcome) {
                    Bismuth.settings.plugins.welcome = { on: true };
                }
            },
            onJoin: function(data) {
                if (data.attributes.name !== mw.config.get('wgUserName')) {
                    if (Bismuth.settings.plugins.welcome.on) {
                        Bismuth.send('Hello, ' + data.attributes.name + '!');
                    }
                }
            }
        }
    },
    init: function() {
        // New messages
        mainRoom.model.chats.bind('afteradd', function(data) {
            for (var i = 0; i < Bismuth.plugins.loadout.onMessage.length; i++) {
                Bismuth.plugins[Bismuth.plugins.loadout.onMessage[i]].onMessage(data);
            }
        });

        // Users joining/leaving
        mainRoom.model.users.bind('add', function(data) {
            for (var i = 0; i < Bismuth.plugins.loadout.onJoin.length; i++) {
                Bismuth.plugins[Bismuth.plugins.loadout.onJoin[i]].onJoin(data);
            }
        });

        mainRoom.model.users.bind('remove', function(data) {
            for (var i = 0; i < Bismuth.plugins.loadout.onPart.length; i++) {
                Bismuth.plugins[Bismuth.plugins.loadout.onPart[i]].onPart(data);
            }
        });

        // Initialize plugins
        for (var plugin in Bismuth.plugins) {
            if (plugin !== 'loadout') {
                if (Bismuth.plugins[plugin].hasOwnProperty('init')) {
                    Bismuth.plugins[plugin].init();
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
    if (typeof Bismuth !== 'undefined') {
        if (typeof mainRoom !== 'undefined') {
            if (Bismuth.settings.main.on) {
                Bismuth.init();
            }
        }
    }
});

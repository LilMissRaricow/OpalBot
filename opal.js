// Is after
$.fn.isAfter = function(sel) {
    return this.prevAll(sel).length !== 0;
};

// Don't leave
window.onbeforeunload = function() {
    if (leave || restart) return;
    return 'Man you must be out of your mind!';
};

// Regex Escape
RegExp.escape = function(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
};

// Plural
function plural(num, singular, Plural) {
    return (num == 1 || num == -1) ? singular : Plural;
}

// Levenshtein distance, for string comparison.
var levDist = function(s, t) {
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
};

// Call API
function API(method, data, callback) {
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
API.post = function(data, callback) {
    API('POST', data, callback);
};
API.get = function(data, callback) {
    API('GET', data, callback);
};

// For custom inline-alerts
function getInlineRegex(variable, Default, title) {
    $.get('/api.php?action=query&format=json&prop=revisions&rvprop=content&titles=' + title, function(data) {
        if (data.query.pages['-1']) {
            window[variable] = Default;
        } else {
            window[variable] = RegExp.escape(data.query.pages[Object.keys(data.query.pages)[0]].revisions[0]['*']).replace(/\\\$(1|2|3)/g, '.*');
        }
    });
}

getInlineRegex('kickmsg', '.+ has been kicked by .+', 'MediaWiki:Chat-user-was-kicked');
getInlineRegex('cbanmsg', '.+ has been banned by .+', 'MediaWiki:Chat-user-was-banned');
getInlineRegex('quitmsg', '.+ has left the chat', 'MediaWiki:Chat-user-parted');
getInlineRegex('joinmsg', '.+ has joined the chat', 'MediaWiki:Chat-user-joined');

var kickcount = 0,
    cbancount = 0,
    quitcount = 0,
    joincount = 0,
    chatcount = 0,
    restart = false,
    leave = false,
    postLog = false,
    wasFound = false,
    isLogging = false,
    logText = '</pre>',
    version = 'v1.7',
    curDay = new Date().getUTCDate(),
    botStart = new Date().getTime(),
    OpalBot = {};
OpalBot.seenUpdCount = 0;
OpalBot.seenCrtCount = 0;

// Swears
var SWEARS = [
        "\\bfuck",
        "\\bmotherfuck",
        "\\bshit\\b",
        "\\bshitt",
        "\\bshitp",
        "\\bbitch",
        "\\bcunt",
        "\\bdafuq\\b",
        "\\bwhore\\b",
        "\\bmofo\\b",
        "\\bfml\\b",
        "\\bgtfo\\b",
        "\\bstfu\\b",
        "\\bwtf\\b",
        "\\bidfk\\b",
        "\\bidfc\\b",
        "\\bidgaf\\b",
        "\\bidefk\\b",
        "\\bjfc\\b",
        "\\bomf",
        "\\bffs\\b",
        "\\bw t f",
        "\\bmilf\\b"
    ],

    // Slurs
    SLURS = [
        "\\bnigg",
        "\\bniglet\\b",
        "\\bfag\\b",
        "\\bfagg"
    ],

    weekdays = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

OpalBot.impCmds = {
    on: function(n, t, c) {
        if (localStorage.getItem('OBenabled') === 'enabled') {
            send('Already up and running!');
        } else {
            localStorage.setItem('OBenabled', 'enabled');
            send('Booting up!');
        }
    },
    off: function(n, t, c) {
        if (localStorage.getItem('OBenabled') === 'disabled') {
            send('...');
        } else {
            localStorage.setItem('OBenabled', 'disabled');
            send('Shutting down...');
        }
    },
    enable: function(n, t, c) {
        if (localStorage.getItem('disabled') === 'enabled') {
            send('Swear checking is already enabled!');
        } else {
            localStorage.setItem('disabled', 'enabled');
            send('Enabling swear checking!');
        }
    },
    disable: function(n, t, c) {
        if (localStorage.getItem('disabled') === 'disabled') {
            send('Swear checking is already disabled.');
        } else {
            localStorage.setItem('disabled', 'disabled');
            send('Swear checking disabled.');
        }
    },
    leave: function(n, t, c) {
        leave = true;
        submitLogs();
    },
    runtime: function(n, t, c) {
        var botEnd = new Date().getTime();
        var msDiff = Math.floor(botEnd - botStart); // in ms
        var secDiff = Math.floor(msDiff / 1000 % 60); // in s
        var minDiff = Math.floor(msDiff / 60 / 1000 % 60); // in minutes
        var hourDiff = Math.floor(msDiff / 3600 / 1000 % 24); // in hours
        var dayDiff = Math.floor(msDiff / 86400 / 1000); // in days
        send('OpalBot ' + version + ' has been running for ' + dayDiff + ' days, ' + hourDiff + ' hours, ' + minDiff + ' minutes, and ' + secDiff + ' seconds.');
    },
    restart: function(n, t, c) {
        restart = true;
        send('Logging...');
        submitLogs();
    },
    log: function(n, t, c) {
        postLog = true;
        send('Logging...');
        submitLogs();
    }
};

OpalBot.cmds = {
    hello: function(n, t, c) {
        if (n == 'Lenhi') {
            send('Hello meme queen (fire)');
        } else if (n == 'Dorumin') {
            send('Hello useless pile of goop');
        } else if (n == '50000cal') {
            send('Hello Pearl.');
        } else {
            send('Hello there ' + n + '!');
        }
    },
    bye: function(n, t, c) {
        send('Goodbye, ' + n + '. Don\'t be gone for long. :(');
    },
    emotes: function(n, t, c) {
        send('You can view the emoticons [[MediaWiki:Emoticons|here]]. Or the "Emoticons" Rail button, yeah that\'s new and it rendered this command useless.');
    },
    logs: function(n, t, c) {
        var d = new Date();
        var ttl = d.getUTCDate() + '_' + wgMonthNamesShort[d.getUTCMonth() + 1] + '_' + d.getUTCFullYear();
        send('[[[Project:Chat/Logs|All logs]]] - [[[Project:Chat/Logs/' + ttl + '|Today]]]');
    },
    test: function(n, t, c) {
        send('ʇsǝʇ¡');
    },
    info: function(n, t, c) {
        send('OpalBot ' + version + ': Commands [[User:StevenBot/doc|here]]. Swear checking: ' + localStorage.getItem('disabled') + '. Commands: ' + localStorage.getItem('OBenabled') + '.');
    },
    site: function(n, t, c) {
        send('You are using [[w:c:homepage|Wikia.com]], a website dedicated to wiki farming.');
    },
    tou: function(n, t, c) {
        send('Wikia\'s Terms of Use are located [[w:Terms of Use|here]].');
    },
    rules: function(n, t, c) {
        send('You can find the chat rules [[Project:Regulations|here]].');
    },
    fun: function(n, t, c) {
        send('Fun you say? You may be looking for this: http://theuselessweb.com');
    },
    donut: function(n, t, c) {
        send('[big]◯[/big]');
    },
    swag: function(n, t, c) {
        send('The user above me has some serious swag.');
    },
    memes: function(n, t, c) {
        send('[c="red"] [big] [font="chiller"] not today satan [/font] [/big] [/c]');
    },
    ping: function(n, t, c) {
        var msDiff = String(Math.abs(c.attributes.timeStamp - new Date().getTime())).replace(/...$/, '.$&');
        send('Pong!\n' + (msDiff.length == 4 ? '0' : '') + msDiff);
    },
    avatar: function(n, t, c) {
        if (!t.trim()) {
            send('Usage: !avatar USER NAME');
            return;
        }
        var usr = mainRoom.model.users.findByName(t);
        if (usr) {
            send(usr.attributes.avatarSrc.slice(0, -23));
        } else {
            $.get('/wiki/User:' + t, function(page) {
                send($(page).find('.masthead-avatar .avatar').attr('src').replace('/scale-to-width-down/150', ''));
            }).fail(function(page) {
                page = page.responseText;
                send($(page).find('.masthead-avatar .avatar').attr('src').replace(/\/revision\/.*|\/scale.*/, ''));
            });
        }
    },
    tell: function(n, t, c) {
        var s = t.split(' that ');
        s[0] = s[0].charAt(0).toUpperCase() + s[0].slice(1);
        if (t === '') {
            return;
        }
        if (s[0] == n) {
            send('I\'m not sending yourself a message. Winners don\'t use drugs.');
            return;
        }
        if (s[0] == mw.config.get('wgUserName')) {
            send('How about no?');
            return;
        }
        if (mainRoom.model.users.findByName(s[0])) {
            send('They\'re already on chat. Tell them yourself you lazy bum.');
            return;
        }
        if (!localStorage.getItem('tell ' + s[0])) {
            localStorage.setItem('tell ' + s[0], 'Ah! ' + s[0] + '! ' + n + ' wanted me to tell you: ' + s[1] + '.');
            send('Okay! I will tell ' + s[0] + ' that next time we meet.');
        } else {
            send(s[0] + ' already has a message pending. Please wait for them to speak and try again.');
        }
    },
    gettell: function(n, t, c) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (t === '') {
            return;
        }
        if (localStorage.getItem('tell ' + t)) {
            send('on ' + t + (t.slice(-1) == 's' ? "'" : "'s") + ' inbox: ' + localStorage.getItem('tell ' + t).split('tell you: ')[1]);
        } else {
            send(t + ' has no messages pending!');
        }
    },
    seen: function(n, t, c) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (t === '') {
            send('Usage: !seen <user name>')
            return;
        }
        if (t == n) {
            send('Heck I dunno, ask ' + n);
            return;
        }
        if (t == mw.config.get('wgUserName')) {
            send('No.');
            return;
        }
        if (mainRoom.model.users.findByName(t)) {
            send('They\'re in chat right now so... you just pinged them.');
            return;
        }
        if (t == 'Jasper') {
            send('Jasper is dead.');
            return;
        }
        if (OpalBot.seen.hasOwnProperty(t)) {
            var end = (new Date()).getTime();
            var ms = end - OpalBot.seen[t].timeStamp; // in ms
            var sec = Math.floor(ms / 1000 % 60); // in s
            var min = Math.floor(ms / 60 / 1000 % 60); // in minutes
            var hr = Math.floor(ms / 3600 / 1000 % 24); // in hours
            var day = Math.floor(ms / 86400 / 1000); // in days
            var days = day ? day + plural(day, ' day', ' days') + ', ' : '';
            var hours = hr ? hr + plural(hr, ' hour', ' hours') + ', ' : '';
            var minutes = min ? min + plural(min, ' minute', ' minutes') + ', ' : '';
            var seconds = sec ? sec + plural(sec, ' second ago.', ' seconds ago.') : '';
            var msg = (n + ': I last saw ' + t + ' ' + days + hours + minutes + seconds).replace(/, (?!\d)/, '').replace(/, (?!.*, )/, ', and ');
            msg = / ago\.$/.test(msg) ? msg : msg.replace(/$/, ' ago.');
            send(msg);
        } else {
            var objKeys = Object.keys(OpalBot.seen);
            var levDistValues = {};
            for (var key in objKeys) {
                var similarity = levDist(t, objKeys[key]);
                levDistValues[objKeys[key]] = similarity;
            }
            var similarities = [];
            for (var name in levDistValues)
                  similarities.push([name, levDistValues[name]]);
            similarities.sort(function(a, b) {return a[1] - b[1]});
            if (similarities[0][1] <= 6) {
                send('I have not seen ' + t + '. Did you mean ' + similarities[0][0] + '?');
            } else {
                send('I have not seen ' + t + '. Sorry.');
            }
        }
    },
    cleartell: function(n, t, c) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (t === '') {
            return;
        }
        if (localStorage.getItem('tell ' + t)) {
            localStorage.removeItem('tell ' + t);
            send('Messages for ' + t + ' have been cleared!');
        } else {
            send(t + ' has no messages pending!');
        }
    },
    note: function(n, t, c) {
        if (!localStorage.getItem('note ' + n)) {
            localStorage.setItem('note ' + n, n + ': ' + t);
            send('Noted! I will message it to you next time we meet.');
        } else {
            send('You already have given me a note! Winners don\'t use drugs.');
            send(localStorage.getItem('note ' + n));
            localStorage.removeItem('note ' + n);
        }
    },
    miss: function(n, t, c) {
        t = t.charAt(0).toUpperCase() + t.slice(1);
        if (t == n) {
            send('how dang egoistic are you?');
            return;
        }
        if (t == mw.config.get('wgUserName')) {
            send('Aww thank you ;^>');
            return;
        }
        if (mainRoom.model.users.findByName(t)) {
            send('I\'m sure they miss you back.');
            return;
        }
        if (!localStorage.getItem('miss ' + t)) {
            localStorage.setItem('miss ' + t, n);
            send('Okay! I will tell ' + t + ' that you missed them next time we meet.');
        } else {
            var ls = localStorage.getItem('miss ' + t);
            var us = ls.split(', ');
            localStorage.setItem('miss ' + t, ls + ', ' + n);
            send('Okay! I will message ' + t + ' that you missed them, including the first ' + us.length + '.');
        }
    },
    warn: function(n, t, c) {
        localStorage.setItem('warn ' + localStorage.getItem('lastKick'), localStorage.getItem('lastKick') + ': ' + t);
        send('Sure thing.');
    }
};

OpalBot.opCmds = {
    eval: function(n, t, c) {
        eval(t);
    },
    script: function(n, t, c) {
        var keys = t.split(/\|/g);
        keys.forEach(function(el) {
            var pastebinLink = 'http://pastebin.com/raw/' + el.trim();
            importScriptURI(pastebinLink);
        });
    }
};

// Send function
var send = function(m) {
    mainRoom.socket.send(new models.ChatEntry({
        roomId: this.roomId,
        name: mw.config.get('wgUserName'),
        text: m
    }).xport());
};

// Function that will run after each message is sent
BotCheck = function(chat) {
    /* Logging */
    // return if it was found before the bot entered, or if it its placed before the last mesage on !restart
    if (!$('#entry-' + chat.cid).isAfter('.inline-alert') && !wasFound) {
        if (mainRoom.model.chats._byId[Number(localStorage.getItem('lastMsg'))]) {
            wasFound = true;
            document.dispatchEvent(new Event('chatInitialized'));
        }
        return;
    }
    // get variables
    var t = chat.attributes.text,
        te = mw.html.escape(t);
    var n = chat.attributes.name,
        ne = mw.html.escape(n);
    var isInlineAlert = chat.attributes.isInlineAlert == null ? false : true;
    var ns = n + 'Swr';
    cid = chat.cid;
    var msgType;
    // submit at the end of the day
    if (new Date().getUTCDate() != curDay) {
        curDay = new Date().getUTCDate();
        submitLogs(date.getUTCDate() + '_' + wgMonthNamesShort[date.getUTCMonth() + 1] + '_' + date.getUTCFullYear());
    }
    date = new Date();
    // get message type
    if (isInlineAlert) {
        if (new RegExp(joinmsg, 'mi').test(t)) {
            msgType = ' [JOIN] ';
            joincount++;
        } else if (new RegExp(quitmsg, 'mi').test(t)) {
            msgType = ' [QUIT] ';
            quitcount++;
        } else if (new RegExp(kickmsg, 'mi').test(t)) {
            msgType = ' [KICK] ';
            localStorage.setItem('lastKick', t.trim().replace(/\(gem destabilizer left\) \[\[User:.*?\||\]\] has been destabilized by \[\[User:.*\|.*\]\] \(gem destabilizer right\)/g, ''));
            kickcount++;
        } else if (new RegExp(cbanmsg, 'mi').test(t)) {
            msgType = ' [CBAN] ';
            te = te.replace(/\(breakleft\) \(&lt;a href=&quot;#&quot; data-type=&quot;ban-undo&quot; data-user=&quot;.+&quot;\s*&gt;undo&lt;\/a&gt;\)/, '');
            cbancount++;
            API.get({
                action: 'query',
                list: 'logevents',
                lelimit: 1,
                letype: 'chatban'
            }, function(d) {
                var chatBan = d.query.logevents[0];
                var reason = chatBan.comment;
                var expiry = chatBan['2'];
                var user = chatBan.title;
                var mod = chatBan.user;
                var msg = user + ' has been banned by ' + mod + ' for ' + expiry + ': "' + reason + '".';
                send(msg.replace(/\s0?\.?0 (?:hours|minutes?|seconds?)/g, ''));
            });
        } else {
            return;
        }
        te = te.replace(/^\(.*?\)|\(.*?\)$|\[\[User:.+?\||]]/g, '').trim();
    } else if (n === mw.config.get('wgUserName')) {
        msgType = ' [CBOT] ';
    } else {
        msgType = ' [CHAT] ';
        chatcount++;
    }
    te = te.trim();
    // get message time
    var msgDate = new Date();
    var msgTimestamp = (msgDate.getUTCHours() < 10 ? '0' : '') + msgDate.getUTCHours() + ':' + (msgDate.getUTCMinutes() < 10 ? '0' : '') + msgDate.getUTCMinutes() + ':' + (msgDate.getUTCSeconds() < 10 ? '0' : '') + msgDate.getUTCSeconds();
    // adds the values to the actual log
    if (msgType == ' [CHAT] ' || msgType == ' [CBOT] ') {
        te = te.replace(/\n/g, '\n          ' + msgType);
        logText = logText.replace('</pre>', '[' + msgTimestamp + ']' + msgType + ne + ': ' + te + '\n</pre>');
    } else {
        logText = logText.replace('</pre>', '[' + msgTimestamp + ']' + msgType + te + '\n</pre>');
    }
    /* Swear/Rule-break checking */
    if (chat.attributes.name !== mw.config.get('wgUserName')) {
        if (localStorage.getItem('disabled') !== 'disabled' && !isInlineAlert) {
            // kick for swears
            if (new RegExp(SWEARS.join('|'), "mi").test(t) === true) {
                send(n + ', please don\'t swear!');
                setTimeout(function() {
                    mainRoom.kick({
                        name: n
                    });
                }, 200);
            }
            // ban for slurs
            else if (new RegExp(SLURS.join('|'), "mi").test(t) === true) {
                send(n + ', please don\'t use that language.');
                mainRoom.socket.send(new models.BanCommand({
                    userToBan: n,
                    time: 86400,
                    reason: 'Slur'
                }).xport());
            } else if (t.match(/\n/) !== null) {
                if (t.match(/\n/g).length > 10) {
                    send(n + ', please don\'t flood!');
                    mainRoom.kick({
                        name: n
                    });
                }
            }
            // warn for caps
            else if (t.match(/\b[A-Z]{2,}\b/g) !== null) {
                if (t.match(/\b[A-Z]{2,}\b/g).length > 6) {
                    send(n + ', please don\'t abuse caps!');
                }
                // warn for stretching text
            } else if (/(\S)\1{22,}/.test(t)) {
                send(n + ', please don\'t stretch text!');
            }
            // warn for big text
            else if (t.match(/\[big\](.+?)\[\/big\]/g) !== null) {
                if (t.match(/\[big\](.+?)\[\/big\]/g).join(' ').replace(/[.,\/#!$%\^&\*;:{}=\-_`~()']|\b\S\b|\(.*\)|\[big]|\[\/big]/g, '').split(' ').filter(Boolean).length > 6) {
                    send(n + ', please don\'t abuse big text!');
                }
            } else if (t.match(/\[big\](?!.*\[big\])(.*)/g) !== null) {
                if (t.match(/\[big\](?!.*\[big\])(.*)/g)[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()']|\b\S\b|\(.*\)|\[big]|\[\/big]/g, '').split(' ').filter(Boolean).length > 6) {
                    send(n + ', please don\'t abuse big text!');
                }
            }
        }
        // Check everyone
        if (localStorage.getItem('note ' + n)) {
            send(localStorage.getItem('note ' + n));
            localStorage.removeItem('note ' + n);
        }

        if (localStorage.getItem('tell ' + n)) {
            send(localStorage.getItem('tell ' + n));
            localStorage.removeItem('tell ' + n);
        }

        if (localStorage.getItem('miss ' + n)) {
            send('Ah! ' + n + '! ' + localStorage.getItem('miss ' + n) + ' missed you!');
            localStorage.removeItem('miss ' + n);
        }
        /* Commands */
        if (mainRoom.model.users.findByName(n) == null) return; // return if is inline-alert
        // only execute commands if chat moderator
        if (!mainRoom.model.users.findByName(n).attributes.isModerator || !/\/|!|\\/.test(t.charAt(0)) || t.slice(0, 4) == '/me ') return; // return if is inline-alert, isn't a command or is a /me message.
        var cmd = t.slice(1).split(' ')[0];
        var ttext = t.split(' ').slice(1).join(' ');
        if (OpalBot.impCmds.hasOwnProperty(cmd)) {
            OpalBot.impCmds[cmd](n, ttext, chat);
        } else if (OpalBot.cmds.hasOwnProperty(cmd) && localStorage.getItem('OBenabled') == 'enabled') {
            OpalBot.cmds[cmd](n, ttext, chat);
        } else if (OpalBot.opCmds.hasOwnProperty(cmd) && n == 'Dorumin') {
            OpalBot.opCmds[cmd](n, ttext, chat);
        }
    }
};

// Inline-alert checking
mainRoom.model.users.bind('add', function(add) {
    var n = add.attributes.name;
    if (n == mw.config.get('wgUserName')) return;
    if (localStorage.getItem('note ' + n)) {
        send(localStorage.getItem('note ' + n));
        localStorage.removeItem('note ' + n);
    }
 
    if (localStorage.getItem('warn ' + n)) {
        send(localStorage.getItem('warn ' + n));
        localStorage.removeItem('warn ' + n);
    }
 
    if (localStorage.getItem('tell ' + n)) {
        send(localStorage.getItem('tell ' + n));
        localStorage.removeItem('tell ' + n);
    }
 
    if (localStorage.getItem('miss ' + n)) {
        send('Ah! ' + n + '! ' + localStorage.getItem('miss ' + n).replace(/, (?!.*, )/, ' and ') + ' missed you!');
        localStorage.removeItem('miss ' + n);
    }
    if (n == 'Dorumin' && !OpalBot.hasWarnedImages) {
        $.get('/wiki/User:Dorumin/DPL?action=render', function(page) {
            var dplEntries = $(page).find('.forum_title');
            if (dplEntries.length) {
                dplEntries.each(function() {
                    if (OpalBot.hasWarnedImages) return;
                    API.get({
                        prop: 'revisions',
                        titles: $(this).text()
                    }).done(function(d) {
                        if (d.error) return;
                        if (Number(d.query.pages[Object.keys(d.query.pages)[0]].revisions[0].timestamp.replace(/\D/g, '').slice(8, 10)) < ( ( (new Date().getUTCHours() - 1) < 0 ) ? 23 : new Date().getUTCHours() - 1 )) {
                            send('Dorumin: [[User:Dorumin/DPL|there are new files that fail to comply with the file policy]].');
                            OpalBot.hasWarnedImages = true;
                            setTimeout(function() {
                                OpalBot.hasWarnedImages = false;
                            }, 3600000);
                        }
                    });
                });
            }
        });
    }
});

// quits
mainRoom.model.users.bind('remove', function(remove) {
    var n = remove.attributes.name;
    if (n == mw.config.get('wgUserName')) return;
    updateSeen(n, (new Date()).getTime());
});

// Function to submit the logs (uploadText) and then clears them
submitLogs = function(logDate) {
    if (wgPageName != 'Special:Chat' || isLogging) return;
    isLogging = true;
    var d = new Date(),
        ttl = logDate || d.getUTCDate() + '_' + wgMonthNamesShort[d.getUTCMonth() + 1] + '_' + d.getUTCFullYear(),
        uploadText = logText;
    logText = '</pre>';
    localStorage.setItem('lastMsg', mainRoom.model.chats.models[Object.keys(mainRoom.model.chats.models).length - 1].attributes.id);
    API.get({
        'action': 'query',
        'prop': 'info|revisions',
        'intoken': 'edit',
        'titles': 'Project:Chat/Logs/' + ttl,
        'rvprop': 'content|timestamp',
        'rvlimit': '1',
        'indexpageids': 'true'
    }, function(response) {
        var page = response.query.pages[Object.keys(response.query.pages)[0]];
        var pageExists = response.query.pages["-1"] ? false : true;
        var pageContent = typeof(page.revisions) != "undefined" ? page.revisions[0]['*'] : '';
        var newPageContent = pageExists ? pageContent.replace('</pre>', uploadText) : '<pre class="ChatLog">\n' + uploadText + '\n[[Category:Wikia Chat logs|2016 04 23]]';
        if (pageContent.length > newPageContent.length) {
            send('[b][c="red"]Error while logging: ' + window.hasFailed ? 'Aborting...' : 'Retrying...');
            if (window.hasFailed) return;
            isLogging = false;
            window.hasFailed = true;
            submitLogs();
            return;
        }
        if (newPageContent == pageContent) {
            send('Nothing to log. Wow this chat has been dead for a while lol.');
            isLogging = false;
            return;
        }
        API.post({
            'minor': 'yes',
            'bot': 'yes',
            'summary': plural(Number(pageExists), 'Adding to', 'Creating') + ' chatlog: ' + kickcount + ' kicks and ' + cbancount + ' bans reported. ' + joincount + ' joins, ' + quitcount + ' leaves, and ' + chatcount + ' messages logged.',
            'action': 'edit',
            'title': 'Project:Chat/Logs/' + ttl,
            'starttimestamp': page.starttimestamp,
            'token': page.edittoken,
            'text': newPageContent
        }, function(response) {
            console.log(plural(Number(pageExists), 'Adding to', 'Creating') + ' chatlog: ' + kickcount + ' kicks and ' + cbancount + ' bans reported. ' + joincount + ' joins, ' + quitcount + ' leaves, and ' + chatcount + ' messages logged.');
            isLogging = false;
            if (postLog) {
                send(plural(Number(pageExists), 'Adding to', 'Creating') + ' [[Project:Chat/Logs/' + ttl + '|chatlog]] ' + kickcount + ' kicks and ' + cbancount + ' bans reported. ' + joincount + ' joins, ' + quitcount + ' leaves, and ' + chatcount + ' messages logged.');
                postLog = false;
            }
            if (restart || leave) {
                submitSeen();
            }
            kickcount = 0, cbancount = 0, quitcount = 0, joincount = 0, chatcount = 0;
            $('#entry-' + cid).prevAll('.Chat li').remove();
            $('#entry-' + cid).replaceWith('<li class="inline-alert">Window cleared.</li>');
        });
    });
};

// Get unified Seen timestsamps
API.get({
    action: 'query',
    titles: 'Project:Chat/Seen',
    prop: 'revisions',
    rvprop: 'content',
}, function(d) {
    if (!d.error) {
        OpalBot.seenPage = d.query.pages[Object.keys(d.query.pages)[0]].revisions[0]['*'];
        var lines = /<pre>([\s\S]*)<\/pre>/img.exec(OpalBot.seenPage)[1].trim().split(/\n/g);
        OpalBot.seen = {};
        $.each(lines, function(index, val) {
            var splt = val.split('|');
            OpalBot.seen[splt[0]] = {
                timeStamp: splt[1],
                changed: false
            };
        });
    } else {
        mainRoom.viewDiscussion.chatUL.append('<li class="inline-alert">Failed while getting unified seen timestamps.</li>');
    }
});

// Seen unification
updateSeen = function(usr, time) {
    if (OpalBot.seen.hasOwnProperty(usr)) {
        OpalBot.seenPage = OpalBot.seenPage.replace(new RegExp('^' + RegExp.escape(usr) + '\\|.*', 'm'), usr + '|' + time);
        if (!OpalBot.seen[usr].changed) OpalBot.seenUpdCount++;
    } else {
        OpalBot.seenPage = OpalBot.seenPage.replace('</pre>', usr + '|' + time + '\n</pre>');
        OpalBot.seenCrtCount++;
    }
    OpalBot.seen[usr] = {
        timeStamp: time,
        changed: true
    };
};

// Updates the actual seen page
function submitSeen() {
    $.each(OpalBot.seen, function(key, value) {
        OpalBot.seen[key].changed = false;
    });
    API.get({
        'action': 'query',
        'prop': 'info|revisions',
        'intoken': 'edit',
        'titles': 'Project:Chat/Seen',
        'rvprop': 'content',
        'rvlimit': '1',
        'indexpageids': 'true',
        'cb': new Date().getTime()
    }, function(d) {
        if (d.query.pages[Object.keys(d.query.pages)[0]].revisions[0]['*'].length > OpalBot.seenPage) return;
        API.post({
            action: 'edit',
            title: 'Project:Chat/Seen',
            minor: 'yes',
            bot: 'yes',
            summary: 'Updating unified seen timestamps: ' + OpalBot.seenCrtCount + plural(OpalBot.seenCrtCount, ' line', ' lines') + ' added, and ' + OpalBot.seenUpdCount + plural(OpalBot.seenUpdCount, ' timestamp', ' timestamps') + ' updated.',
            token: mw.user.tokens.get('editToken'),
            text: OpalBot.seenPage
        }, function(p) {
            console.log('Updating unified seen timestamps: ' + OpalBot.seenCrtCount + ' lines added, and ' + OpalBot.seenUpdCount + ' timestamps updated.');
            OpalBot.seenCrtCount = 0;
            OpalBot.seenUpdCount = 0;
            if (restart) {
                send('Restarting...');
                window.location.reload();
            }
            if (leave) {
                send('I\'m so sorry...');
                window.open('/wiki/User:I_love_the_Smell_of_Napalm_after_I_bang_Gay_Lenhi', '_self');
            }
        });
    });
}

// Sets the interval for submitting the seen page
setInterval(function() {
    submitSeen();
}, 1800000);

// Sets the interval for submitting the logs
setInterval(function() {
    submitLogs();
}, window.logInterval || 600000);

// Appends the function to chat updates
if (mw.config.get('wgCanonicalSpecialPageName') == 'Chat') {
    mainRoom.model.chats.bind('afteradd', BotCheck);
}

// Submit commands from the bot window
$('[name="message"]').keypress(function(e) {
    var thisVal = $(this).val();
    if (e.which === 13 && mainRoom.active && /!|\/|\\/.test(thisVal.charAt(0)) && thisVal.slice(0, 4) !== '/me ') {
        e.preventDefault();
        $(this).val('');
        var name = mw.config.get('wgUserName');
        var cmd = thisVal.slice(1).split(' ')[0];
        var ttext = thisVal.split(' ').slice(1).join(' ');
        if (OpalBot.cmds.hasOwnProperty(cmd)) {
            OpalBot.cmds[cmd](name, ttext, {
                attributes: {
                    timeStamp: new Date().getTime()
                }
            });
        } else if (OpalBot.impCmds.hasOwnProperty(cmd)) {
            OpalBot.impCmds[cmd](name, ttext, {
                attributes: {
                    timeStamp: new Date().getTime()
                }
            });
        }
    }
});

// Plugins
$.getScript('//cdn.cleverbot.io/build/1.0/cleverbot.io.min.js', function() {
    var clevbot = new cleverbot('dN5AnStXvWPR6oJI', 'qCEhEqkd4Z5Glul3rRpGbZ8wKPsxaJtp');
    clevbot.setNick('OpalBot');
    OpalBot.cmds.cb = function(n, t, c) {
        clevbot.ask(t, function (err, response) {
            if (err || !response) return;
            send(response);
        });
    };
});

// Confirm the bot is up and running
document.addEventListener('chatInitialized', function() {
    send(mw.config.get('wgUserName') + ' ' + version + ' is online!');
});

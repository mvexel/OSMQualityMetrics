/*
 * UserStats.js
 * ====================
 */

var OUT_DIR = '/osm';

var day = 1000* 60*60*24; 
var doingnodes = false, doingways = false, doingrelations = false;
var users = [];
var pf, iscurrent;
var nodecnt = 0, waycnt = 0, relationcnt = 0;
var currentnodecnt = 0, currentwaycnt = 0, currentrelationcnt = 0;
var interval = 1000000;
var t0, t1, tnodes0, tnodes1, tways1, trelations1;

/*
 * Date Format 1.2.3
 * (c) 2007-2009 Steven Levithan <stevenlevithan.com>
 * MIT license
 *
 * Includes enhancements by Scott Trenda <scott.trenda.net>
 * and Kris Kowal <cixar.com/~kris.kowal/>
 *
 * Accepts a date, a mask, or a date and a mask.
 * Returns a formatted version of the given date.
 * The date defaults to the current date/time.
 * The mask defaults to dateFormat.masks.default.
 */

var dateFormat = function () {
    var    token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var    _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? "a"  : "p",
                tt:   H < 12 ? "am" : "pm",
                T:    H < 12 ? "A"  : "P",
                TT:   H < 12 ? "AM" : "PM",
                Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default":      "ddd mmm dd yyyy HH:MM:ss",
    shortDate:      "m/d/yy",
    mediumDate:     "mmm d, yyyy",
    longDate:       "mmmm d, yyyy",
    fullDate:       "dddd, mmmm d, yyyy",
    shortTime:      "h:MM TT",
    mediumTime:     "h:MM:ss TT",
    longTime:       "h:MM:ss TT Z",
    isoDate:        "yyyy-mm-dd",
    isoTime:        "HH:MM:ss",
    isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};


// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};


/* 
 * ====================
 * End date format code
 * ====================
 */

function User(uid,name) 
{
    this.uid=uid;
    this.name=name;
    this.nodes=0;
    this.nodescreated = 0;
    this.currentnodes = 0;
    this.ways=0;
    this.wayscreated = 0;
    this.currentways = 0;
    this.relations=0;
    this.relationscreated = 0;
    this.currentrelations = 0;
    this.firstObj = new Date();
    this.lastObj = new Date(1970,1,1);
}
 
function cloneFeature(n) 
{
    var copy = {};
    copy.id = n.id;
    copy.version = n.version
    copy.timestamp = n.timestamp;
    copy.uid = n.uid;
    copy.user = n.user;
    copy.changeset = n.changeset;
    return copy;
}

function sort_by_totals(a,b) 
{
    return ((a.nodes + a.ways + a.relations) < (b.nodes + b.ways + b.relations) ? 1 : (a.nodes + a.ways + a.relations) > (b.nodes + b.ways + b.relations) ? -1 : 0);
}

function processlastfeature(cf) 
{
    // this relies on the file being sorted by id and version, is this the case?
    //if (doingways) {
    //    print("way id/version: " + pf.id + "/" + pf.version); 
    //}
    // seems to hold...

    iscurrent = (pf.id != cf.id); 
    
    if(!users[pf.uid]) 
    {
        users[pf.uid] = new User(pf.uid,pf.user);
    }
    
    var d1 = users[pf.uid].firstObj;
    var d2 = new Date(pf.timestamp)
    var d3 = users[pf.uid].lastObj;
    
    users[pf.uid].firstObj = (d1 < d2) ? d1 : d2;
    users[pf.uid].lastObj = (d3 > d2) ? d3 : d2;
    
    if (iscurrent)
    {
    //    print('current!!');
        if (doingnodes) 
        {
            currentnodecnt++;
            users[pf.uid].currentnodes++;
        }
        else if (doingways) 
        {
            currentwaycnt++;
            users[pf.uid].currentways++;
        }
        else 
        {
            currentrelationcnt++;
            users[pf.uid].currentrelations++;
        }
    }

    if (doingnodes) 
    {
        nodecnt++;
        users[pf.uid].nodes++;
        if (pf.version == 1) users[pf.uid].nodescreated++
        if (nodecnt % interval == 0) print(nodecnt + '...');
    }
    else if (doingways) 
    {
        waycnt++;
        users[pf.uid].ways++;
        if (pf.version == 1) users[pf.uid].wayscreated++
        if (waycnt % interval == 0) print(waycnt + '...');
    }
    else 
    {
        relationcnt++;
        users[pf.uid].relations++;
        if (pf.version == 1) users[pf.uid].relationscreated++
        if (relationcnt % interval == 0) print(relationcnt + '...');
    }
}

Osmium.Callbacks.init = function() 
{
    print('Running...');
    t0 = new Date();
}

Osmium.Callbacks.node = function() 
{
    if (!doingnodes) 
    {
        // The before_* callbacks are not called, so we need a workaround.
        doingnodes = true;
        tnodes0 = new Date();
        print('parsing nodes...');
    }

    if (pf) 
    {
        processlastfeature(this);
    }
    pf = cloneFeature(this);
}

Osmium.Callbacks.way = function() 
{
    if (doingnodes) 
    {
        // The before_* callbacks are not called, so we need a workaround.
        // process last node before doing ways
        processlastfeature(pf);
        delete pf;
        doingnodes = false;
        doingways = true;
        tnodes1 = new Date();
        print('parsing ways...');
    }

    if (pf) 
    {
        processlastfeature(this);
    }
    pf = cloneFeature(this);
}

Osmium.Callbacks.relation = function() 
{
    if (doingways) 
    {
         // The before_* callbacks are not called, so we need a workaround.
        processlastfeature(pf);
        delete pf;
        doingways = false;
        doingrelations = true;
        tways1 = new Date();
        print('parsing relations...');
    }

    if (pf) processlastfeature(this);
    pf = cloneFeature(this);
}

Osmium.Callbacks.end = function() 
{
    print('output and cleanup...');
    
    trelations1 = new Date();
    users.sort(sort_by_totals);
    var realusercnt = 0;

    // Open output file in OUT_DIR
    var out = Osmium.Output.CSV.open(OUT_DIR + '/userstats.csv');

    // Print headers
    out.print('uid\tusername\tnodes\tnodes_created\tcur nodes\tways\tways_created\tcur ways\trelations\trelations_created\tcur rels\tfirst\tlast\tdays active\ttotal edits\tcurrent objects\tavg edits/day\tpersistence');

    // Caluculate metrics for each user
    for (var i=0;i<users.length;i++)
    {
        if(typeof(users[i])=='undefined') continue;
        realusercnt++;
        var u = users[i];
        var dLast = u.lastObj
        var dLastFormatted = dLast.format("mm/dd/yyyy");
        var dFirst = u.firstObj
        var dFirstFormatted = dFirst.format("mm/dd/yyyy");
        var daysActive = Math.max(1, Math.ceil((dLast - dFirst) / day)); // If a user made no edits at all, daysActive will be 0.
        var totalEdits = u.nodes + u.ways + u.relations;
        var currentObjects = u.currentnodes + u.currentways + u.currentrelations;
        var avgEditsPerDay = totalEdits / daysActive;
        var persistence = currentObjects / totalEdits;
        out.print(u.uid, u.name, u.nodes, u.nodescreated, u.currentnodes, u.ways, u.wayscreated, u.currentways, u.relations, u.relationscreated, u.currentrelations,dFirstFormatted ,dLastFormatted , daysActive ,totalEdits , currentObjects, avgEditsPerDay, persistence);
    }

    out.close();

    // OUTPUT TIMINGS
    t1 = new Date();
    var tnodes=tnodes1-tnodes0;tways=tways1-tnodes1;trelations=trelations1-tways1;
    print('finished!\nTimings:\ntotal: ' + (t1-t0) + ' ms\n---------------------\nnodes: ' + tnodes + 'ms\nways: ' + tways + 'ms\nrelations: ' + trelations + 'ms\noverhead: ' + ((t1-t0)-(tnodes+tways+trelations)) + 'ms');
}

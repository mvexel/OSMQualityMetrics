/*
 * OSMHighwayMetrics.js
 * ====================
 * This is an OSMJS script that generates highway stats for US planets 
 * 
 * Setup
 * =====
 * You need the osmium framework for it to work, get osmium at 
 * https://github.com/joto/osmium and follow the install instructions 
 * given there. With Osmium set up, build OSMJS following the
 * instructions at https://github.com/joto/osmium/tree/master/osmjs
 * 
 * Running the script
 * ==================
 * With OSMJS compiled, run the script:
 * /path/to/osmjs -j OSMHighwayMetrics.js /path/to/data.osm
 * 
 * The script will generate one output file:
 * - highwaystats.csv : Highway statistics.
 * - userstats.csv : users involved with the highways.
 * 
 * Notes
 * =====
 * - The script will save its output files in the current working
 * directory.
 * 
 * License
 * =======
 * Copyright (c) 2011 Martijn van Exel
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the 
 * "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, 
 * distribute, sublicense, and/or sell copies of the Software, and to 
 * permit persons to whom the Software is furnished to do so, subject 
 * to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be 
 * included in all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, 
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF 
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND 
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS 
 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN 
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN 
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
 * SOFTWARE.
 */

/*
 * CONFIGURATION
 */

// Here you can optionally set a directory for the output. If not set,
// the output will be written to your current working directory.
// Should end with a trailing slash.
var OUT_DIR = '';

// Known bots -- these will not be taken into account for the userstats
var known_bots = ['woodpeck_fixbot','nhd-import','TIGERcnl', 'DaveHansenTiger'];

// Highway values that are not part of the navigable road network
var navigablehighwaytags = ['motorway','motorway_link','trunk','trunk_link','primary','primary_link','secondary','secondary_link','tertiary','residential','unclassified','living_street','road','service'];

/*
 * You should only modify the code below this line if you're familiar 
 * with JavaScript and OSMJS
 * =====================================================================
 */

// GLOBALS
var users = [];
var ages = [];
var doingnodes = false, doingways = false, doingrelations = false;
var nodes = 0, ways = 0,relations = 0;
var ways = 0, highways = 0, navigablehighways = 0, tigerways = 0;
var tigeruntouchedways = 0, tigerversionincrease = 0;
var t0, t1, tnodes0, tnodes1, tways1, trelations1;

function User(uid,name) {
    this.uid=uid;
    this.name=name;
    this.ways=0;
    this.highways = 0;
    this.navigablehighways = 0;
    this.tigerways = 0;
}

function sort_by_tigerways(a,b) {
    return (a.tigerways < b.tigerways) ? 1 : (a.tigerways > b.tigerways) ? -1 : 0;
}

Osmium.Callbacks.init = function() {
    print('Running...');
    t0 = new Date();
}

Osmium.Callbacks.node = function() {
    if (!doingnodes) {
        // The before_* callbacks are not called, so we need a workaround.
        doingnodes = true;
        tnodes0 = new Date();
        print('parsing nodes...');
    }
    nodes+=1;
}

Osmium.Callbacks.way = function() {
    if (doingnodes) {
        // The before_* callbacks are not called, so we need a workaround.
        doingnodes = false;
        doingways = true;
        tnodes1 = new Date();
        print('parsing ways...');
    }

    var tiger = 0;
    var navigable = 0;
    var highway = 0;

    if(!users[this.uid]) {
        users[this.uid] = new User(this.uid,this.user);
    }

    users[this.uid].ways+=1;

    ways++;

    for(var key in this.tags) {
        highway += (key.match(/highway/ig)) ? 1:0;
        tiger += (key.match(/tiger/ig)) ? 1:0;
        navigable += (key == 'highway' && navigablehighwaytags.indexOf(this.tags[key]) > -1) ? 1:0;
    }
   
    if(highway>0) {
        users[this.uid].highways++;
        highways++;
    }
    
    if(tiger>0) {
        tigerways++;
        if(this.version==1) tigeruntouchedways++;
        else users[this.uid].tigerways += 1;
        tigerversionincrease = tigerversionincrease + (this.version - 1 - tigerversionincrease) / tigerways;
    }
    
    if (navigable>0) {
        navigablehighways++;
        users[this.uid].navigablehighways++;
    }

}

Osmium.Callbacks.relation = function() {
    if (doingways) {
         // The before_* callbacks are not called, so we need a workaround.
        doingways = false;
        doingrelations = true;
        tways1 = new Date();
        print('parsing relations...');
    }
    relations+=1;
}

Osmium.Callbacks.end = function() {
    print('output and cleanup...');

    // CLEAN UP
    trelations1 = new Date();
    users.sort(sort_by_tigerways);

    var outuserstats = Osmium.Output.CSV.open(OUT_DIR + 'userstats.csv');
    outuserstats.print('#\tuid\tusername\tways\thighways\ttigerways\tnavigablehighways\tprecentile');
    var cumulativetiger = 0;
    var grandtotal = nodes + ways + relations;
    var realusercnt = 0;

    var botnodes = 0;
    var botways = 0; 
    var botrelations = 0;

    for (var i=0;i<users.length;i++) {
        if(typeof(users[i])=='undefined') continue;
        realusercnt+=1;
        if(known_bots.indexOf(users[i].name) > -1) {
            botnodes += users[i].nodes;
            botways += users[i].ways;
            botrelations += users[i].relations;
            continue;
        };
    };
    // SECOND PASS
    for (var i=0; i<users.length; i++) {
        if(typeof(users[i])=='undefined') continue;
        if(known_bots.indexOf(users[i].name) > -1) continue;
        cumulativetiger += users[i].tigerways;
//      outuserstats.print(users[i].uid, users[i].name, users[i].nodes, users[i].ways, users[i].relations, cumfeatures / (grandtotal - botnodes - botways - botrelations));
        outuserstats.print(i+1, users[i].uid, users[i].name, users[i].ways, users[i].highways, users[i].tigerways, users[i].navigablehighways, cumulativetiger / (tigerways - tigeruntouchedways));
    }
    outuserstats.close();
    
    // WRITE BASE STATS
    var outhighways = Osmium.Output.CSV.open(OUT_DIR + 'highwaystats.csv');
    
    outhighways.print('total nodes',nodes)
    outhighways.print('total ways',ways)
    outhighways.print('total relations',relations)
    outhighways.print('total users involved in ways',realusercnt)
    outhighways.print('amt highways',highways);
    outhighways.print('pct highways', highways/ways);
    outhighways.print('amt tiger ways',tigerways);
    outhighways.print('pct tiger ways',tigerways/ways);
    outhighways.print('amt untouched tiger',tigeruntouchedways);
    outhighways.print('pct untouched tiger',tigeruntouchedways / tigerways);
    outhighways.print('avg increase over TIGER',tigerversionincrease);

    outhighways.close();
    
    // OUTPUT TIMINGS
    t1 = new Date();
    var tnodes=tnodes1-tnodes0;tways=tways1-tnodes1;trelations=trelations1-tways1;
    print('finished!\nTimings:\ntotal: ' + (t1-t0) + ' ms\n---------------------\nnodes: ' + tnodes + 'ms\nways: ' + tways + 'ms\nrelations: ' + trelations + 'ms\noverhead: ' + ((t1-t0)-(tnodes+tways+trelations)) + 'ms');
}

/*
 * OSMQualityMetrics.js
 * ====================
 * This is an OSMJS script that generates general statistics as well as 
 * quality metrics for any OSM file you throw at it.
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
 * /path/to/osmjs -j OSMQualityMetrics.js -l array /path/to/data.osm
 * 
 * The script will generate a number of output files:
 * - ways.* : A shapefile containing all way geometries with version and
 * timestamp attributes. 
 * - metrostats.csv : The data metrics. 
 * - userstats.csv : User statistics.
 * 
 * Notes
 * =====
 * - if you don't need the ways shapefile, you can set the OUTPUT_WAYS
 * variable to false in the script. You can also leave out the -l 
 * parameter when running the script and speed things up. 
 * - The -l array script is best for large OSM files. If you're working
 * with smaller, city-sized OSM data files. run OSMJS with the -h option 
 * for more info. 
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

// This controls the output of way geometries. If you set this to true,
// don't forget you will need to set the -l parameter when running.
var OUTPUT_WAYS = true;

// Here you can optionally set a directory for the output. If not set,
// the output will be written to your current working directory.
// Should end with a trailing slash.
var OUT_DIR = '';

// These are the thresholds for the age distribution
// Defaults are 30 days, 90 days, 180 days, 365 days, 730 days
var day = 60*60*24; // Don't touch this. It's just a convenience var. 
var thresholds = [30*day, 90*day, 180*day, 365*day, 2*365*day]; 

// These are the keys that are considered when counting rich nodes
var poikeys = {leisure:1,amenity:1,office:1,shop:1,craft:1,tourism:1,historic:1};
var transportkeys = {highway:1,barrier:1,cycleway:1,tracktype:1,waterway:1,railway:1,aeroway:1,aerialway:1,public_transport:1,power:1}
var namekeys = {name:1,ref:1,place:1,addr:1}

// This is the reference date from which the age statistics are
// calculated. The date should coincide with the timestamp of the
// OSM file you are analyzing.
var REF_DATE = new Date("October 19, 2011 00:00:00");

/*
 * You should only modify the code below this line if you're familiar 
 * with JavaScript and OSMJS
 * =====================================================================
 */

// GLOBALS
var shp;
var users = [];
var nodes = {};
var ages = [];
var tigerbreakdown = {};
var relation_types = {};
var doingnodes = false, doingways = false, doingrelations = false;
var nodecnt = 0, poicnt = 0, transportcnt = 0, namecnt = 0, waycnt = 0,relationcnt = 0, usercnt = 0;
var nodetags = 0, waytags = 0, relationtags = 0;
var ranking = {nodes:1,ways:3,relations:9};
var avgnodeversion = 0, avgwayversion = 0, avgrelationversion = 0;
var tigerways = 0; var tiger_untouched=0;var tigerversionincrease = 0;
var t0, t1, tnodes0, tnodes1, tways1, trelations1;

function User(uid,name) {
    this.uid=uid;
    this.name=name;
    this.nodes=0;
    this.ways=0;
    this.relations=0;
}

User.prototype.rank = function(){return this.nodes*ranking.nodes + this.ways*ranking.ways+ this.relations*ranking.relations};

function calculate_percentiles(ary) {
    var cohorts = [0,0,0,0,0,0];
    var now = Math.round(REF_DATE.getTime()/1000);
    for(var i=0;i<ary.length;i+=1) {
        var t = ary[i];
        var cohorted = false;
        for(var j=thresholds.length-1;j>=0;j-=1) {
            if(t<(now-thresholds[j])) {
                cohorts[j+1]+=1;
                cohorted = true;
                break;
            } 
        }
        if(!cohorted) cohorts[0]+=1;
    }
    for(var j=cohorts.length-1;j>=0;j-=1) {
        cohorts[j] = ((cohorts[j] / ary.length) * 100).toFixed(1);
    }
    return cohorts;
}

function sort_by_rank(a,b) {
    return ((a.rank() < b.rank()) ? 1 : (a.rank() > b.rank()) ? -1 : 0);
}

function sort_by_totals(a,b) {
    return ((a.nodes + a.ways + a.relations) < (b.nodes + b.ways + b.relations) ? 1 : (a.nodes + a.ways + a.relations) > (b.nodes + b.ways + b.relations) ? -1 : 0);
}


Osmium.Callbacks.init = function() {
    print('Running...');
    t0 = new Date();
    if(OUTPUT_WAYS) {
        shp = Osmium.Output.Shapefile.open(OUT_DIR + 'ways', 'line');
        shp.add_field('id', 'integer', 10);
        shp.add_field('name', 'string', 40);
        shp.add_field('version','integer',5);
        shp.add_field('timestamp','integer', 16);
    }
}

Osmium.Callbacks.node = function() {
    if (!doingnodes) {
        // The before_* callbacks are not called, so we need a workaround.
        doingnodes = true;
        tnodes0 = new Date();
        print('parsing nodes...');
    }

    if(!users[this.uid]) {
        users[this.uid] = new User(this.uid,this.user);
        usercnt += 1;
    }
    users[this.uid].nodes+=1;
    for(var key in this.tags) {
        nodetags+=1;
        if (key in poikeys) poicnt += 1;  
        if (key in transportkeys) transportcnt += 1;
        if (key in namekeys) namecnt += 1;
    }
    nodecnt+=1;
    nodes[this.id] = 0;
    ages.push(Math.round(new Date(this.timestamp).getTime()/1000));
    avgnodeversion = avgnodeversion + (this.version - avgnodeversion) / nodecnt;
}

Osmium.Callbacks.way = function() {
    /* todo:
     * average length of road segments
     * shapes for certain tiger features
     * turn restrictions
     */
     
    if(OUTPUT_WAYS) {
        shp.add(this.geom, { id: this.id, name: this.tags.name, version: this.version, timestamp: Math.round(new Date(this.timestamp).getTime()/1000) });
    }
    
    if (doingnodes) {
        // The before_* callbacks are not called, so we need a workaround.
        doingnodes = false;
        doingways = true;
        tnodes1 = new Date();
        print('parsing ways...');
    }
    var tiger = false;
    if(!users[this.uid]) {
        users[this.uid] = new User(this.uid,this.user);
        usercnt += 1;
    }
    users[this.uid].ways+=1;
    waycnt+=1;
    ages.push(Math.round(new Date(this.timestamp).getTime()/1000));
    for (var i=0; i < this.nodes.length; i++) {
       nodes[this.nodes[i]] = 1;
    }
    for(var key in this.tags) {
        waytags+=1;
        tiger=(key.match(/tiger/ig))
        if(key.match(/tiger:cfcc/ig)) {
            tigerbreakdown[this.tags[key]] = isNaN(tigerbreakdown[this.tags[key]]) ? 1 : tigerbreakdown[this.tags[key]] + 1;
        }
    }
    if(tiger) {
        tigerways++;
        if(this.version==1) tiger_untouched++;
        tigerversionincrease = tigerversionincrease + (this.version - 1 - tigerversionincrease) / tigerways;
    }
    avgwayversion = avgwayversion + (this.version - avgwayversion) / waycnt;
}

Osmium.Callbacks.relation = function() {
    if (doingways) {
         // The before_* callbacks are not called, so we need a workaround.
        doingways = false;
        doingrelations = true;
        tways1 = new Date();
        print('parsing relations...');
    }

    if(!users[this.uid]) {
        users[this.uid] = new User(this.uid,this.user);
        usercnt += 1;
    }
    users[this.uid].relations+=1;
    relationcnt+=1;
    ages.push(Math.round(new Date(this.timestamp).getTime()/1000));
    for(var key in this.tags) {
        relationtags+=1;
        if (key.match(/type/i)) {
            relation_types[this.tags[key]] = isNaN(relation_types[this.tags[key]]) ? 1 : relation_types[this.tags[key]] + 1; 
        }
    }
    avgrelationversion = avgrelationversion + (this.version - avgrelationversion) / relationcnt;
}

Osmium.Callbacks.end = function() {
    print('output and cleanup...');

    // CLEAN UP
    trelations1 = new Date();
    users.sort(sort_by_totals);
    if(OUTPUT_WAYS) shp.close();

    var out = Osmium.Output.CSV.open(OUT_DIR + 'userstats.csv');
    out.print('uid\tusername\tnodes\tways\trelations\tpercentile');
    var cumfeatures = 0;
    var grandtotal = nodecnt + waycnt + relationcnt;
    var realusercnt = 0;
    var user_thresholds = [0.9,0.95, 0.99];
    var user_threshold_met = 0;
    var users_for_threshold = [];
    var userperc_for_threshold = [];

    // WRITE USER STATS TO FILE
    for (var i=0;i<users.length;i++) {
        if(typeof(users[i])=='undefined') continue;
        realusercnt+=1;
        cumfeatures += users[i].nodes + users[i].ways + users[i].relations;
        out.print(users[i].uid, users[i].name, users[i].nodes, users[i].ways, users[i].relations, cumfeatures / grandtotal );
        if (cumfeatures / grandtotal > user_thresholds[user_threshold_met]) {
            users_for_threshold.push(i+1);
            user_threshold_met +=1;
        }
    }
    
    for(var i=0;i<user_thresholds.length;i++) {
        userperc_for_threshold.push((users_for_threshold[i])/realusercnt);
    }
    
    out.close();
    
    // WRITE BASE STATS
    var out2 = Osmium.Output.CSV.open(OUT_DIR + 'metrostats.csv');
    var out_tiger = Osmium.Output.CSV.open(OUT_DIR + 'tiger.csv');
    var out_relations = Osmium.Output.CSV.open(OUT_DIR + 'relations.csv');
    
    // Data temperature calculations
    var percentiles = calculate_percentiles(ages);
    var datatemp_user95 = 0.3 * userperc_for_threshold[1] * 100;
    var datatemp_untouchedtiger = -0.3 * (tiger_untouched / tigerways) * 100;
    var datatemp_tigerversionincrease = 5 * tigerversionincrease;
    var datatemp_percentile3M = 0.5 * percentiles[2];
    var datatemp_percentile1Y = 0.4 * percentiles[4];
    var datatemp = datatemp_user95 + datatemp_untouchedtiger + datatemp_tigerversionincrease + datatemp_percentile3M + datatemp_percentile1Y + 20;

    print('total nodes / ways / relations: ' + nodecnt + ' / ' + waycnt + ' / ' + relationcnt);
    
    out2.print('total nodes',nodecnt)
    out2.print('total ways',waycnt)
    out2.print('total relations',relationcnt)
    out2.print('total users',realusercnt)
    out2.print('avg tags per node',nodetags/nodecnt)
    out2.print('avg tags per way',waytags/waycnt)
    out2.print('avg tags per relation',relationtags/relationcnt)

    // CALCULATE NODES IN WAYS.
    var nodeinwaycnt = 0;
    for(n in nodes) {
        if (nodes[n]==0) nodeinwaycnt+=1;
    }

    out2.print('pct nodes not in way',nodeinwaycnt / nodecnt)

    out2.print('avg node version',avgnodeversion)
    out2.print('avg way version',avgwayversion)
    out2.print('avg relation version',avgrelationversion)

    out2.print('contribution thresholds',user_thresholds);
    out2.print('users',users_for_threshold);
    out2.print('percentage',userperc_for_threshold);

    out2.print('data temperature', datatemp);

    

    // OUTPUT TIGER STATS
    out2.print('amt non-tiger ways',tigerways)
    out2.print('pct non-tiger ways',tigerways/waycnt)
    out2.print('amt untouched tiger',tiger_untouched)
    out2.print('pct untouched tiger',tiger_untouched / tigerways)
    out2.print('avg increase over TIGER',tigerversionincrease)


    // OUTPUT RICH NODE STATS
    out2.print('poi nodes',poicnt)
    out2.print('transport nodes',transportcnt)
    out2.print('named cnt',namecnt)

    
    // OUTPUT OBJECT AGE AVERAGE AND PERCENTILES
    out2.print('age cohort thresholds',thresholds);
    out2.print('age cohorts',percentiles);

    // TIGER breakdown
    for (key in tigerbreakdown) {
        out_tiger.print(key,tigerbreakdown[key]);
    };
    
    // Relation types breakdown
    for (key in relation_types) {
        out_relations.print(key,relation_types[key]);
    };

    out2.close();
    out_tiger.close();
    out_relations.close();
    
    // OUTPUT TIMINGS
    t1 = new Date();
    var tnodes=tnodes1-tnodes0;tways=tways1-tnodes1;trelations=trelations1-tways1;
    print('finished!\nTimings:\ntotal: ' + (t1-t0) + ' ms\n---------------------\nnodes: ' + tnodes + 'ms\nways: ' + tways + 'ms\nrelations: ' + trelations + 'ms\noverhead: ' + ((t1-t0)-(tnodes+tways+trelations)) + 'ms');
}

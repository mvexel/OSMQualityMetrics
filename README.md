## Read This First

5/2018: The [osm-editing-metrics](https://github.com/mvexel/osm-editing-metrics) is the spiritual successor to this repo. It uses the new osmium and its nodejs bindings for 🚀 performance.

12/2017: This project is a few years old and I haven't given it any attention. There are probably better tools out there to do quality analysis on OSM data now, especially at scale. Have a look at Mapbox's QA Tiles and some of the work done with them, for example [by Jennings Anderson](https://mapbox.github.io/osm-analysis-collab/). 

If you do find this project useful and are familiar with Osmium and its Javascript bindings, let me know if you want to take it over or become a maintainer!

Quality Metrics Suite
=====================
This is a growing set of OSMJS scripts that allow you to calculate quality
matrics on OSM data. Currently it consists of:
- OSMQualityMetrics.js - various quality metrics, for normal OSM files
- UserStats.js - historical user metrics, for full history OSM files

Setup
=====
You need the osmium framework for it to work, get osmium at 
https://github.com/joto/osmium and follow the install instructions 
given there. With Osmium set up, build OSMJS following the
instructions at https://github.com/joto/osmium/tree/master/osmjs

Running the script
==================
With OSMJS compiled, run one of the scripts:

        /path/to/osmjs -j OSMQualityMetrics.js -l array /path/to/data.osm


(It works equally well - perhaps even better - with a PBF input file, if you have PBF support in osmium)

The output on screen will look something like this:

        Running...
        parsing nodes...
        parsing ways...
        parsing relations...
        output and cleanup...
        total nodes / ways / relations: 51777 / 5040 / 28
        finished!
        Timings:
        total: 5002 ms
        ---------------------
        nodes: 4270ms
        ways: 617ms
        relations: 3ms
        overhead: 112ms

The scripts will generate output in the OUT_DIR specified in the script file.

For OSMQualityMetrics.js the output will be:
- `ways.*` : A shapefile containing all way geometries with `version` and
`timestamp` attributes. 
- `metrostats.csv` : The data metrics. 
- `tiger.csv` : Breakdown of TIGER CFCC classes
- `relations.csv` : Breakdown of relation types
- `userstats.csv` : User breakdown

For UserStats.js the output will be: 
- `userstats.csv` : Historical user breakdown

Sample output files are included in the `example-output` directory

Notes
=====
- if you don't need the ways shapefile, you can set the OUTPUT_WAYS
variable to false in the script. You can then also leave out the -l 
parameter when running the script and speed things up. 
- The `-l array` option is best for large OSM files. If you're working
with smaller, city-sized OSM data files, use `-l sparsetable`. Run `osmjs -h`  
for more info. 
- The scripts will save its output files in the current working
directory if no OUT_DIR is specified.

Timings
=======
OSMQualityMetrics.js: On a Intel® Core™ i5-2410M CPU @ 2.30GHzx4 machine with 8GB of RAM
running Ubuntu Oneiric, a 55MB bz2-compressed OSM XML file takes 103
seconds to process without way shapefile output. With way shapefile 
output using the sparsetable storage, the same file took 133 seconds to
process.  

Extras
======
The generated ways shapefiles will include version and timestamp attributes. You can use those to create interesting visualizations, like the ones shown in Martijn van Exel's [talk](http://www.slideshare.net/mvexel/insert-coin-to-play) at State Of The Map 2011. The Quantum GIS style file used to generate these images is included in the `qgis` folder.  
![Example of a styled ways shapefile](https://github.com/mvexel/OSMQualityMetrics/blob/master/qgis/styled-ways-example.png?raw=true)

What's Next
===========
Easy
----
* Add way length statistics
* More attributes in ways output
* More specific stylings
* More specific statistics on relations

Harder
------
* More metrics on full history files

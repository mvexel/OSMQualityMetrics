OSMQualityMetrics.js
====================
This is an OSMJS script that generates general statistics as well as 
quality metrics for any OSM file you throw at it.

Setup
=====
You need the osmium framework for it to work, get osmium at 
https://github.com/joto/osmium and follow the install instructions 
given there. With Osmium set up, build OSMJS following the
instructions at https://github.com/joto/osmium/tree/master/osmjs

Running the script
==================
With OSMJS compiled, run the script:

        /path/to/osmjs -j OSMQualityMetrics.js -l array /path/to/data.osm

The script will generate a number of output files:

- ways.* : A shapefile containing all way geometries with version and
timestamp attributes. 
- metrostats.csv : The data metrics. 
- userstats.csv : User statistics.

Notes
=====
- if you don't need the ways shapefile, you can set the OUTPUT_WAYS
variable to false in the script. You can also leave out the -l 
parameter when running the script and speed things up. 
- The -l array script is best for large OSM files. If you're working
with smaller, city-sized OSM data files. run OSMJS with the -h option 
for more info. 
- The script will save its output files in the current working
directory.

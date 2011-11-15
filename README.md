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

The output on screen will look something like this:

        Running...
        parsing nodes...
        parsing ways...
        parsing relations...
        output and cleanup...
        total nodes / ways / relations: 418356 / 58727 / 358
        finished -- took 15922 ms: nodes / ways / relations / other : 9007 / 6877 / 15 / 23


The script will generate a number of output files:

- `ways.*` : A shapefile containing all way geometries with `version` and
`timestamp` attributes. 
- `metrostats.csv` : The data metrics. 
- `tiger.csv` : Breakdown of TIGER CFCC classes
- `relations.csv` : Breakdown of relation types
- `userstats.csv` : User breakdown

Sample output files are included in the `example-output` directory

Notes
=====
- if you don't need the ways shapefile, you can set the OUTPUT_WAYS
variable to false in the script. You can then also leave out the -l 
parameter when running the script and speed things up. 
- The -l array script is best for large OSM files. If you're working
with smaller, city-sized OSM data files. run OSMJS with the -h option 
for more info. 
- The script will save its output files in the current working
directory.

Timings
=======
On a Intel® Core™ i5-2410M CPU @ 2.30GHzx4 machine with 8GB of RAM
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
* Work with full history files

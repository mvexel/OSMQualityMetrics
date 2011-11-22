#!/bin/bash

if test -z "$2"
then
    echo "Usage: loaduserstats.sh dbname /path/to/userstats.csv"
else
    cat $2 | psql -d $1 -U osm -c "$(cat userstats_load.sql)";
fi

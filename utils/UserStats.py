import os
from imposm.parser import OSMParser
from tcdb import tdb
from datetime import datetime
import copy

CACHE_LOCATION = '/osm/tmp'

class UserCache(object):
    def __init__(self):
        self.previousFeature = None
        self.currentFeature = None
        try:
            path = os.path.join(CACHE_LOCATION, 'usercache.tdb')
            if os.path.exists(path): os.remove(path)
            print path
            self.cache = tdb.TDB()
            self.cache.open(path)
        except Exception as (strerr):
            print 'user cache file could not be created at %s, does the directory exist? If not, create it. If so, Check permissions and disk space.' % CACHE_LOCATION
            print strerr
            exit(1)

    def increment(self,uid,typ):
        uid = str(uid)
        typ = str(typ)
        try:
            tempdict = self.cache[uid]
            tempdict[typ] = tempdict.get(typ,0) + 1
            self.cache[uid][typ] = self.cache[uid].get(typ, 0) + 1
            self.cache[uid] = tempdict
        except KeyError:
            print 'creating record for {0}'.format(uid)
            self.cache[uid] = {
            'coord' : 0,
            'coordcreated' : 0,
            'currentcoord' : 0,
            'node' : 0,
            'nodecreated' : 0,
            'currentnode' : 0,
            'way' : 0,
            'waycreated' : 0,
            'currentway' : 0,
            'relation' : 0,
            'relationcreated' : 0,
            'currentrelation' : 0,
            'firstobject' : datetime.now(),
            'lastobject' : datetime.now()
            }
            tempdict = self.cache[uid]
            tempdict[typ] = tempdict.get(typ,0) + 1
            self.cache[uid][typ] = self.cache[uid].get(typ, 0) + 1
            self.cache[uid] = tempdict
    def result(self):
        print 'cache is now %i records' % len(self.cache)
        for key in self.cache:
            print key + ': ' + str(self.cache[key])

    def userCount(self):
        return len(self.cache)

    def close(self):
        self.cache.close()
        
class OSMFeature(object):
    def __init__(self, id = 0, version = 0, timestamp = datetime.now(), uid = 0, ftype = None):
        self.id = id
        self.version = version
        self.timestamp = timestamp
        self.uid = uid
        self.featuretype = ftype

class UserStats(object):
    def __init__(self):
        self.cache = UserCache()
        self.currentFeature = OSMFeature()
        self.previousFeature = OSMFeature()
        
    def processLastFeature(self):
        current = (self.currentFeature.id != self.previousFeature.id)
        print '%i === %i' % (self.currentFeature.id, self.previousFeature.id)
        if not current: print 'current? ' + str(current) 
        if self.previousFeature.featuretype == 'coord':
            self.cache.increment(self.previousFeature.uid, 'coord')
        elif self.previousFeature.featuretype == 'node':
            self.cache.increment(self.previousFeature.uid, 'node')
        elif self.previousFeature.featuretype == 'way':
            self.cache.increment(self.previousFeature.uid, 'way')
        elif self.previousFeature.featuretype == 'relation':
            self.cache.increment(self.previousFeature.uid, 'relation')

    def coords_callback(self, coords):
        for osmid, lon, lat, osmversion, osmtimestamp, osmuid in coords:
            print 'coord %i' % osmid
            self.currentFeature = OSMFeature(osmid, osmversion, osmtimestamp, osmuid, 'coord')
            if self.previousFeature.id > 0:
                self.processLastFeature()
            self.previousFeature = copy.deepcopy(self.currentFeature)
            

    def nodes_callback(self, nodes):
        for osmid, tags, ref, osmversion, osmtimestamp, osmuid in nodes:
            print 'node %i' % osmid
            self.currentFeature = OSMFeature(osmid, osmversion, osmtimestamp, osmuid, 'node')
            if self.previousFeature:
                processLastFeature(self.currentFeature)
            self.previousFeature = copy.deepcopy(self.currentFeature)

    def ways_callback(self, ways):
        for osmid, lon, lat, osmversion, osmtimestamp, osmuid in ways:
            print 'way %i' % osmid
            self.currentFeature = OSMFeature(osmid, osmversion, osmtimestamp, osmuid, 'way')
            if self.previousFeature:
                processLastFeature(self.currentFeature)
            self.previousFeature = copy.deepcopy(self.currentFeature)

    def relations_callback(self, relations):
        for osmid, lon, lat, osmversion, osmtimestamp, osmuid in relations:
            print 'relation %i' % osmid
            self.currentFeature = OSMFeature(osmid, osmversion, osmtimestamp, osmuid, 'relation')
            if self.previousFeature:
                processLastFeature(self.currentFeature)
            self.previousFeature = copy.deepcopy(self.currentFeature)


# instantiate counter and parser and start parsing
u = UserStats()
p = OSMParser(concurrency=4, coords_callback = u.coords_callback, nodes_callback = u.nodes_callback, ways_callback = u.ways_callback, relations_callback = u.relations_callback)
print "parsing..."
#try:
#    os.open('/home/mvexel/osm/planet/amsterdam.osh.pbf')
#    os.close()
#except IOError:
#    print 'oops'
p.parse('/osm/planet/utah.osh.pbf')

print u.cache.result()
u.cache.close()

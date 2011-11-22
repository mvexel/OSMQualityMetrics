DROP TABLE IF EXISTS userstats;
CREATE TABLE userstats
    (uid integer PRIMARY KEY,
    username varchar,
    nodes integer,
    curnodes integer,
    ways integer,
    curways integer,
    relations integer,
    currels integer,
    firstedit date,
    lastedit date,
    daysactive smallint,
    totaledits integer,
    currentobjects integer,
    avgeditsperday real,
    persistence real);

COPY userstats FROM stdin WITH (FORMAT 'csv', HEADER, DELIMITER '	');

-- Change routes.geom from geometry(LineString,4326) to geometry(4326)
-- ST_LineMerge returns MultiLineString when ways don't fully connect.
ALTER TABLE routes ALTER COLUMN geom TYPE geometry(Geometry, 4326) USING geom::geometry(Geometry, 4326);

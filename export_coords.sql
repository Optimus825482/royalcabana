\COPY (SELECT name, "coordX", "coordY", rotation, "scaleX", "scaleY" FROM cabanas WHERE "deletedAt" IS NULL) TO 'cabana_coords.csv' WITH CSV HEADER;
\COPY (SELECT key, value FROM system_configs WHERE key IN ('sunset_bar_transform', 'blue_sea_bar_transform')) TO 'bar_positions.csv' WITH CSV HEADER;

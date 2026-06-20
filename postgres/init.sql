CREATE TABLE IF NOT EXISTS results(
	name varchar,
	score integer,
	id varchar,
	row varchar
);

CREATE TABLE IF NOT EXISTS in_progress(
	name varchar,
	id varchar,
	scorerow varchar,
	clicked varchar
);

CREATE TABLE IF NOT EXISTS results(
	name varchar,
	score integer,
	id varchar PRIMARY KEY,
	row varchar
);

CREATE TABLE IF NOT EXISTS in_progress(
	name varchar,
	id varchar PRIMARY KEY,
	scorerow varchar,
	clicked varchar,
	roundnum integer
);

CREATE TABLE IF NOT EXISTS results(
	name  VARCHAR,
	score INTEGER,
	id    VARCHAR,
	row   VARCHAR,
	time  INTEGER
);

CREATE TABLE IF NOT EXISTS in_progress(
	name     VARCHAR,
	id       VARCHAR PRIMARY KEY,
	scorerow VARCHAR,
	clicked  VARCHAR,
	roundnum INTEGER
);

CREATE TABLE IF NOT EXISTS usermap(
	id           VARCHAR PRIMARY KEY,
	name         VARCHAR,
	scorearray   INTEGER ARRAY[15],
	clickedarray BOOLEAN ARRAY[15],
	dicevalue    INTEGER ARRAY[5],
	dicelocked   BOOLEAN ARRAY[5],
	turncount    INTEGER
);

CREATE TABLE IF NOT EXISTS results(
	name  varchar,
	score integer,
	id    varchar PRIMARY KEY,
	row   varchar
);

CREATE TABLE IF NOT EXISTS in_progress(
	name     varchar,
	id       varchar PRIMARY KEY,
	scorerow varchar,
	clicked  varchar,
	roundnum integer
);

CREATE TABLE IF NOT EXISTS usermap(
	id           varchar PRIMARY KEY,
	name         varchar,
	scorearray   integer ARRAY[15],
	clickedarray boolean ARRAY[15],
	dicevalue    integer ARRAY[5],
	dicelocked   boolean ARRAY[5],
	turncount    integer
);

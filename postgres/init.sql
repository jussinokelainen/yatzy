CREATE TABLE IF NOT EXISTS users(
	id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	username      TEXT NOT NULL,
	password_hash TEXT,
	allowed       boolean NOT NULL DEFAULT false,
	created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_username_key ON users (lower(username));

CREATE TABLE IF NOT EXISTS sessions (
	token_hash   BYTEA PRIMARY KEY,
	user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
	expires_at   TIMESTAMPTZ NOT NULL,
	last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
);
CREATE INDEX ON sessions (user_id);

CREATE TABLE IF NOT EXISTS games (
	id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	status      TEXT NOT NULL DEFAULT 'in_progress'
		CHECK (status IN ('in_progress', 'finished')),
	scores      INTEGER[] NOT NULL DEFAULT array_fill(NULL::integer, ARRAY[15]),
	dice        integer[] NOT NULL DEFAULT '{0,0,0,0,0}',
	dice_locked boolean[] NOT NULL DEFAULT '{f,f,f,f,f}',
	turn_count  INTEGER NOT NULL DEFAULT 0,
	total_score INTEGER,
	started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	finished_at TIMESTAMPTZ,
	CHECK (cardinality(scores) = 15),
	CHECK (cardinality(dice) = 5),
	CHECK (cardinality(dice_locked) = 15),
);

CREATE UNIQUE INDEX one_active_game_per_user 
	ON games (user_id) WHERE status = 'in_progress';

CREATE INDEX leaderboard ON games (total_scVre DESC) WHERE status = 'finished';

CREATE TABLE IF NOT EXISTS results(
	name  VARCHAR,
	score INTEGER,
	id    VARCHAR,
	row   VARCHAR,
	time  TIMESTAMPTZ NOT NULL DEFAULT now()
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

CREATE TABLE IF NOT EXISTS users (
	allowed BOOLEAN NOT NULL DEFAULT false,
);


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
	last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON sessions (user_id);

CREATE TABLE IF NOT EXISTS games (
	id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	status      TEXT NOT NULL DEFAULT 'in_progress'
		CHECK (status IN ('in_progress', 'finished')),
	scores      INTEGER[] NOT NULL DEFAULT array_fill(NULL::integer, ARRAY[15]),
	dice        INTEGER[] NOT NULL DEFAULT '{0,0,0,0,0}',
	dice_locked BOOLEAN[] NOT NULL DEFAULT '{f,f,f,f,f}',
	turn_count  INTEGER NOT NULL DEFAULT 0,
	total_score INTEGER,
	started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
	finished_at TIMESTAMPTZ,
	CHECK (cardinality(scores) = 15),
	CHECK (cardinality(dice) = 5),
	CHECK (cardinality(dice_locked) = 5)
);

CREATE UNIQUE INDEX one_active_game_per_user
	ON games (user_id) WHERE status = 'in_progress';

CREATE INDEX leaderboard ON games (total_score DESC) WHERE status = 'finished';

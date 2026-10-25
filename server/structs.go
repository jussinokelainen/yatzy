package main

// Struct used for handling ongoing games' data.
// scorearray and clickedarray mirror the scores array of
// the games database table, where a NULL value means the
// item has not been selected yet.
type GameData struct {
	id           int64
	userID       int64
	scorearray   [15]int
	clickedarray [15]bool
	diceArray    [5]DiceData
	roundNum     int
	roll_count   int
}

// Struct used by GameData to store dice state
type DiceData struct {
	value  int
	locked bool
}

// Struct describing a logged in user, filled from
// the sessions and users database tables
type UserInfo struct {
	id       int64
	username string
	allowed  bool
}

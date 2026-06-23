package main

// Struct used to store and load data
// from the in_progress database table
type progressData struct {
	Name     string `json:"name"`
	Id       string `json:"id"`
	Scorerow string `json:"scorerow"`
	Clicked  string `json:"clicked"`
	Roundnum int    `json:"roundnum"`
}

// Struct used when loading data from
// the results database table
type UserDataStruct struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Id    string `json:"id"`
	Row   string `json:"row"`
}

// Struct used for handling ongoing games' data
type GameData struct {
	name         string
	scorearray   [15]int
	clickedarray [15]bool
	diceArray    [5]DiceData
	roundNum     int
}

// Struct used by GameData to store dice state
type DiceData struct {
	value  int
	locked bool
}

// Struct used to store name for corresponding id when starting a game
// i guess?
type startGameRequest struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

// Struct used to parse id from http requests
// This is most likely useless, but its used for now
type idStruct struct {
	Id string `json:"id"`
}

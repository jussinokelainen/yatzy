package main

type UserDataStruct struct {
	Name  string `json:"name"`
	Score int    `json:"score"`
	Id    string `json:"id"`
	Row   string `json:"row"`
}

type GameData struct {
	name       string
	scorearray [15]int
	diceArray  [5]DiceData
}

type DiceData struct {
	value  int
	locked bool
}

type NewScoreReq struct {
	Id     string `json:"id"`
	Target int    `json:"target"`
	Value  int    `json:"value"`
}

type startGameRequest struct {
	Id   string `json:"id"`
	Name string `json:"name"`
}

type idStruct struct {
	Id string `json:"id"`
}

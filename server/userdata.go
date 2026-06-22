package main

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/lib/pq"
)

// Parses the dice values stored in GameData
// into separate arrays of dice values and lock states
func parseDiceArrays(array [5]DiceData) ([5]int, [5]bool) {
	var values [5]int
	var locked [5]bool
	for i := range array {
		values[i] = array[i].value
		locked[i] = array[i].locked
	}

	return values, locked
}

// Connects arrays of dice values and lockstates into
// a DiceData struct array that can be used in GameData
func formDiceArray(values pq.Int32Array, locked pq.BoolArray) [5]DiceData {
	var data [5]DiceData

	for i := range data {
		data[i].value = int(values[i])
		data[i].locked = locked[i]
	}

	return data
}

// Initializes data for a new game
func InitUser(id string, name string) {
	progress := loadProgress(id)
	var newUser GameData
	if progress.Name != "" {
		newUser.name = progress.Name
	} else {
		newUser.name = name
	}
	newUser.turnCount = progress.Roundnum
	for i := range newUser.diceArray {
		newUser.diceArray[i].value = 0
		newUser.diceArray[i].locked = false
	}

	parsedClicks := strings.Split(progress.Clicked, ";")
	if len(parsedClicks) == len(newUser.clickedarray) {
		for i := range newUser.clickedarray {
			newUser.clickedarray[i], _ = strconv.ParseBool(parsedClicks[i])
		}
	} else {
		for i := range newUser.clickedarray {
			newUser.clickedarray[i] = false
		}
	}

	parsedScores := strings.Split(progress.Scorerow, ";")
	if len(parsedScores) == len(newUser.scorearray) {
		for i := range newUser.scorearray {
			parsedVal, _ := strconv.ParseInt(parsedScores[i], 10, 0)
			newUser.scorearray[i] = int(parsedVal)
		}
	} else {
		for i := range newUser.scorearray {
			newUser.scorearray[i] = 0
		}
	}

	updateCurrentGame(id, newUser)
}

// Loads data of ongoing game and returns it as the http response
func getScoresByID(c *gin.Context) {
	id := c.Param("id")

	currentGame := loadCurrentGame(id)
	scoreRow := currentGame.scorearray
	total, subTotal := calculateTotal(id)

	c.IndentedJSON(http.StatusOK, gin.H{
		"success":  true,
		"scores":   scoreRow,
		"total":    total,
		"subTotal": subTotal,
	})
}

// Switch function used to calculate the correct value
// for a selected item, so each 15 items dont need their own
// http request functions
func itemSelector(c *gin.Context) {
	item := c.Param("what")
	itemInt := 0
	var req idStruct
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	// value that will be set to the calculated value
	// in the switch case
	val := 0

	switch item {
	case "one":
		val = calculateNumbers(req.Id, 1)
		itemInt = 0
	case "two":
		val = calculateNumbers(req.Id, 2)
		itemInt = 1
	case "three":
		val = calculateNumbers(req.Id, 3)
		itemInt = 2
	case "four":
		val = calculateNumbers(req.Id, 4)
		itemInt = 3
	case "five":
		val = calculateNumbers(req.Id, 5)
		itemInt = 4
	case "six":
		val = calculateNumbers(req.Id, 6)
		itemInt = 5
	case "pair":
		val = calculatePair(req.Id)
		itemInt = 6
	case "doublepair":
		val = calculateDoublepair(req.Id)
		itemInt = 7
	case "triples":
		val = calculateTriples(req.Id)
		itemInt = 8
	case "quadruples":
		val = calculateQuadruples(req.Id)
		itemInt = 9
	case "smallstraight":
		val = calculateSmallstraight(req.Id)
		itemInt = 10
	case "bigstraight":
		val = calculateBigstraight(req.Id)
		itemInt = 11
	case "fullhouse":
		val = calculateFullhouse(req.Id)
		itemInt = 12
	case "mixed":
		val = calculateMixed(req.Id)
		itemInt = 13
	case "quintuples":
		val = calculateQuintuples(req.Id)
		itemInt = 14
	}

	currentGame := loadCurrentGame(req.Id)
	currentGame.scorearray[itemInt] = val
	currentGame.clickedarray[itemInt] = true
	currentGame.turnCount += 1

	var progress progressData
	progress.Name = currentGame.name
	progress.Id = req.Id
	progress.Scorerow = getScoreRow(req.Id)
	progress.Clicked = getClickedRow(req.Id)
	progress.Roundnum = currentGame.turnCount
	updateCurrentGame(req.Id, currentGame)
	saveProgress(progress)
	resetDice(req.Id)

	// Check if the game is over
	if currentGame.turnCount >= MAX_ROUND {
		total, _ := calculateTotal(req.Id)
		row := getScoreRow(req.Id)
		info("Saving:", currentGame.name, total, row)
		err = addScore(currentGame.name, total, req.Id, row)
		if err != nil {
			errout(err)
		}
	}
}

// Function to calculate the total and subtotal for given id
// returns (total, subTotal)
func calculateTotal(id string) (int, int) {
	currentGame := loadCurrentGame(id)
	scoreRow := currentGame.scorearray
	total := 0
	subTotal := 0
	for i := range 6 {
		total += scoreRow[i]
		subTotal += scoreRow[i]
	}

	// Check if bonus is given
	if total >= 63 {
		total += 50
	}

	for i := 6; i < 15; i++ {
		total += scoreRow[i]
	}
	return total, subTotal
}

// Returns the contents of an ongoing game's clicked item boolean
// values as true/false strings joined as one string separated by ';'
func getClickedRow(id string) string {
	currentGame := loadCurrentGame(id)
	clickedRow := currentGame.clickedarray
	var stringarr [15]string

	for i := range clickedRow {
		stringarr[i] = strconv.FormatBool(clickedRow[i])
	}
	row := strings.Join(stringarr[:], ";")

	return row
}

// Returns the contents of an ongoing game's score row integer
// values as strings joined as one string separated by ';'
func getScoreRow(id string) string {
	currentGame := loadCurrentGame(id)
	scoreRow := currentGame.scorearray
	var stringarr [15]string

	for i := range scoreRow {
		stringarr[i] = strconv.Itoa(scoreRow[i])
	}
	row := strings.Join(stringarr[:], ";")

	return row
}

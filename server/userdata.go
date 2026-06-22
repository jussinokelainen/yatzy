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

func sendScoresByID(c *gin.Context) {
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

func itemSelector(c *gin.Context) {
	what := c.Param("what")
	whatInt := 0
	var req idStruct
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	val := 0

	switch what {
	case "one":
		val = calculateNumbers(req.Id, 1)
		whatInt = 0
	case "two":
		val = calculateNumbers(req.Id, 2)
		whatInt = 1
	case "three":
		val = calculateNumbers(req.Id, 3)
		whatInt = 2
	case "four":
		val = calculateNumbers(req.Id, 4)
		whatInt = 3
	case "five":
		val = calculateNumbers(req.Id, 5)
		whatInt = 4
	case "six":
		val = calculateNumbers(req.Id, 6)
		whatInt = 5
	case "pair":
		val = calculatePair(req.Id)
		whatInt = 6
	case "doublepair":
		val = calculateDoublepair(req.Id)
		whatInt = 7
	case "triples":
		val = calculateTriples(req.Id)
		whatInt = 8
	case "quadruples":
		val = calculateQuadruples(req.Id)
		whatInt = 9
	case "smallstraight":
		val = calculateSmallstraight(req.Id)
		whatInt = 10
	case "bigstraight":
		val = calculateBigstraight(req.Id)
		whatInt = 11
	case "fullhouse":
		val = calculateFullhouse(req.Id)
		whatInt = 12
	case "mixed":
		val = calculateMixed(req.Id)
		whatInt = 13
	case "quintuples":
		val = calculateQuintuples(req.Id)
		whatInt = 14
	}

	currentGame := loadCurrentGame(req.Id)
	currentGame.scorearray[whatInt] = val
	currentGame.clickedarray[whatInt] = true
	currentGame.turnCount += 1
	if currentGame.turnCount >= MAX_ROUND {
		info("max round, game over")
		total, _ := calculateTotal(req.Id)
		row := getScoreRow(req.Id)
		err = addScore(currentGame.name, total, req.Id, row)
	}
	var progress progressData
	progress.Name = currentGame.name
	progress.Id = req.Id
	progress.Scorerow = getScoreRow(req.Id)
	progress.Clicked = getClickedRow(req.Id)
	progress.Roundnum = currentGame.turnCount
	updateCurrentGame(req.Id, currentGame)
	saveProgress(progress)
	resetDice(req.Id)
}

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

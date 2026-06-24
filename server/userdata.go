package main

import (
	"strconv"
	"strings"

	"github.com/lib/pq"
)

// Reset dice to unlocked and 0 for given id
func resetDice(id string) {
	currentGame := loadCurrentGame(id)
	dicearr := &currentGame.diceArray

	for i := range dicearr {
		dicearr[i].value = 0
		dicearr[i].locked = false
	}
	updateCurrentGame(id, currentGame)
}

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
func InitUser(id string, name string) progressData {
	var newUser GameData
	progress, err := loadProgress(id)
	if err != nil {
		// No progress loaded, init from 0
		newUser.name = name
		for i := range 15 {
			newUser.clickedarray[i] = false
			newUser.scorearray[i] = 0
		}
	} else {
		// Existing progress loaded
		parsedClicks := strings.Split(progress.Clicked, ";")
		parsedScores := strings.Split(progress.Scorerow, ";")
		for i := range 15 {
			newUser.clickedarray[i], _ = strconv.ParseBool(parsedClicks[i])
			parsedVal, _ := strconv.ParseInt(parsedScores[i], 10, 0)
			newUser.scorearray[i] = int(parsedVal)
		}
		newUser.name = progress.Name
	}

	newUser.roundNum = progress.Roundnum

	// This has to be changed when dice values also get
	// loaded from progress
	for i := range newUser.diceArray {
		newUser.diceArray[i].value = 0
		newUser.diceArray[i].locked = false
	}

	updateCurrentGame(id, newUser)
	return progress
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

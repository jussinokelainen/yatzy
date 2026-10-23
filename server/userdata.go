package main

import (
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

// Resets the dice of the given game to unlocked and 0
func resetDice(game *GameData) {
	dicearr := &game.diceArray

	for i := range dicearr {
		dicearr[i].value = 0
		dicearr[i].locked = false
	}
}

// Function to calculate the total and subtotal of the given game
// returns (total, subTotal)
func calculateTotal(game GameData) (int, int) {
	scoreRow := game.scorearray
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

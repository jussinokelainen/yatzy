package main

import "sort"

// Function that returns the values of the dice
// of the given game as a sorted array
func getDiceValuesArray(game GameData) [5]int {
	var valuesArray [5]int
	dicearr := &game.diceArray
	for i := range valuesArray {
		valuesArray[i] = dicearr[i].value
	}
	sort.Ints(valuesArray[:])
	return valuesArray
}

// Function that calculates how many times each number
// appeared in the given array
func getFrequencyMap(arr [5]int) map[int]int {
	freqMap := map[int]int{}
	for _, i := range arr {
		freqMap[i]++
	}
	return freqMap
}

// Calculates the sum for all numbers given as val in
// the dice of the given game
func calculateNumbers(dicearr [5]int, val int) int {
	sum := 0

	for _, i := range dicearr {
		if i == val {
			sum += val
		}
	}
	return sum
}

func calculatePair(dicearr [5]int) int {
	sum := 0
	for i := 4; i >= 1; i-- {
		if dicearr[i] == dicearr[i-1] {
			sum = 2 * dicearr[i]
			break
		}
	}
	return sum
}

func calculateDoublepair(dicearr [5]int) int {
	freqMap := getFrequencyMap(dicearr)
	sum := 0
	paircount := 0
	for i, c := range freqMap {
		if c >= 2 {
			paircount++
			sum += 2 * i
		}
	}

	if paircount >= 2 {
		return sum
	} else {
		return 0
	}
}

func calculateTriples(dicearr [5]int) int {
	freqMap := getFrequencyMap(dicearr)
	sum := 0
	for i, c := range freqMap {
		if c >= 3 {
			sum = 3 * i
		}
	}
	return sum
}

func calculateQuadruples(dicearr [5]int) int {
	freqMap := getFrequencyMap(dicearr)
	sum := 0
	for i, c := range freqMap {
		if c >= 4 {
			sum = 4 * i
		}
	}
	return sum
}

func calculateSmallstraight(dicearr [5]int) int {
	expected := [5]int{1, 2, 3, 4, 5}
	if dicearr == expected {
		return 15
	}

	return 0
}

func calculateBigstraight(dicearr [5]int) int {
	expected := [5]int{2, 3, 4, 5, 6}
	if dicearr == expected {
		return 20
	}

	return 0
}

func calculateFullhouse(dicearr [5]int) int {
	freqMap := getFrequencyMap(dicearr)
	sum := 0
	pairs := false
	triples := false
	for i, c := range freqMap {
		if c >= 3 {
			triples = true
			sum += 3 * i
		} else if c >= 2 {
			pairs = true
			sum += 2 * i
		}
	}

	if triples && pairs {
		return sum
	} else {
		return 0
	}
}

func calculateMixed(dicearr [5]int) int {
	sum := 0
	for _, i := range dicearr {
		sum += i
	}
	return sum
}

func calculateQuintuples(dicearr [5]int) int {
	freqMap := getFrequencyMap(dicearr)
	sum := 0
	for i, c := range freqMap {
		if c >= 5 && i != 0 {
			sum = 50
		}
	}
	return sum
}

// Switch function used to calculate the correct value
// for a selected item, so each 15 items dont need their own
// functions. Returns the calculated value and the index of
// the item in the score row.
func calculateItem(item string, game GameData) (int, int, bool) {
	dicearr := getDiceValuesArray(game)

	switch item {
	case "one":
		return calculateNumbers(dicearr, 1), 0, true
	case "two":
		return calculateNumbers(dicearr, 2), 1, true
	case "three":
		return calculateNumbers(dicearr, 3), 2, true
	case "four":
		return calculateNumbers(dicearr, 4), 3, true
	case "five":
		return calculateNumbers(dicearr, 5), 4, true
	case "six":
		return calculateNumbers(dicearr, 6), 5, true
	case "pair":
		return calculatePair(dicearr), 6, true
	case "doublepair":
		return calculateDoublepair(dicearr), 7, true
	case "triples":
		return calculateTriples(dicearr), 8, true
	case "quadruples":
		return calculateQuadruples(dicearr), 9, true
	case "smallstraight":
		return calculateSmallstraight(dicearr), 10, true
	case "bigstraight":
		return calculateBigstraight(dicearr), 11, true
	case "fullhouse":
		return calculateFullhouse(dicearr), 12, true
	case "mixed":
		return calculateMixed(dicearr), 13, true
	case "quintuples":
		return calculateQuintuples(dicearr), 14, true
	}

	return 0, 0, false
}

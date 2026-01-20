package main

import "sort"

func getDiceValuesArray(id string) [5]int {
	var valuesArray [5]int
	dicearr := &UserMap[id].diceArray
	for i := range valuesArray {
		valuesArray[i] = dicearr[i].value
	}
	sort.Ints(valuesArray[:])
	return valuesArray
}

func getFrequencyMap(arr [5]int) map[int]int {
	freqMap := map[int]int{}
	for _, i := range arr {
		freqMap[i]++
	}
	return freqMap
}

func calculateNumbers(id string, val int) int {
	dicearr := getDiceValuesArray(id)
	sum := 0

	for _, i := range dicearr {
		if i == val {
			sum += val
		}
	}
	return sum
}

func calculatePair(id string) int {
	dicearr := getDiceValuesArray(id)
	sum := 0
	for i := 4; i >= 1; i-- {
		if dicearr[i] == dicearr[i-1] {
			info("pair found")
			sum = 2 * dicearr[i]
			break
		}
	}
	return sum
}

func calculateDoublepair(id string) int {
	freqMap := getFrequencyMap(getDiceValuesArray(id))
	sum := 0
	paircount := 0
	for i, c := range freqMap {
		if c >= 2 {
			paircount++
			sum += 2 * i
		}
	}

	if paircount >= 2 {
		info("double pairs found")
		return sum
	} else {
		return 0
	}
}

func calculateTriples(id string) int {
	freqMap := getFrequencyMap(getDiceValuesArray(id))
	sum := 0
	for i, c := range freqMap {
		if c >= 3 {
			sum = 3 * i
			info("triples found")
		}
	}
	return sum
}

func calculateQuadruples(id string) int {
	freqMap := getFrequencyMap(getDiceValuesArray(id))
	sum := 0
	for i, c := range freqMap {
		if c >= 4 {
			sum = 4 * i
			info("quadruples found")
		}
	}
	return sum
}

func calculateSmallstraight(id string) int {
	dicearr := getDiceValuesArray(id)
	expected := [5]int{1, 2, 3, 4, 5}
	if dicearr == expected {
		info("Small straight found")
		return 15
	}

	return 0
}

func calculateBigstraight(id string) int {
	dicearr := getDiceValuesArray(id)
	expected := [5]int{2, 3, 4, 5, 6}
	if dicearr == expected {
		info("Big straight found")
		return 20
	}

	return 0
}

func calculateFullhouse(id string) int {
	freqMap := getFrequencyMap(getDiceValuesArray(id))
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
		info("full house found")
		return sum
	} else {
		return 0
	}
}

func calculateMixed(id string) int {
	dicearr := getDiceValuesArray(id)
	sum := 0
	for _, i := range dicearr {
		sum += i
	}
	return sum
}

func calculateQuintuples(id string) int {
	freqMap := getFrequencyMap(getDiceValuesArray(id))
	sum := 0
	for _, c := range freqMap {
		if c >= 5 {
			sum = 50
			info("yatzy found!")
		}
	}
	return sum
}

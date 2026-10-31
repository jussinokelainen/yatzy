use std::collections::HashMap;

use crate::userdata::GameData;

// Function that returns the values of the dice
// of the given game as a sorted array
fn get_dice_values_array(game: &GameData) -> [i32; 5] {
    let mut values_array = [0; 5];
    for (i, die) in game.dice.iter().enumerate() {
        values_array[i] = die.value;
    }
    values_array.sort_unstable();
    values_array
}

// Function that calculates how many times each number
// appeared in the given array
fn get_frequency_map(arr: [i32; 5]) -> HashMap<i32, i32> {
    let mut freq_map = HashMap::new();
    for &i in &arr {
        *freq_map.entry(i).or_insert(0) += 1;
    }
    freq_map
}

// Calculates the sum for all numbers given as val in
// the dice of the given game
fn calculate_numbers(dicearr: [i32; 5], val: i32) -> i32 {
    let mut sum = 0;

    for &i in &dicearr {
        if i == val {
            sum += val;
        }
    }
    sum
}

fn calculate_pair(mut dicearr: [i32; 5]) -> i32 {
    dicearr.sort_unstable();
    for i in (1..5).rev() {
        if dicearr[i] == dicearr[i - 1] {
            return 2 * dicearr[i];
        }
    }
    0
}

fn calculate_doublepair(dicearr: [i32; 5]) -> i32 {
    let freq_map = get_frequency_map(dicearr);
    let mut sum = 0;
    let mut paircount = 0;
    for (&i, &c) in &freq_map {
        if c >= 2 {
            paircount += 1;
            sum += 2 * i;
        }
    }

    if paircount >= 2 { sum } else { 0 }
}

fn calculate_triples(dicearr: [i32; 5]) -> i32 {
    let freq_map = get_frequency_map(dicearr);
    let mut sum = 0;
    for (&i, &c) in &freq_map {
        if c >= 3 {
            sum = 3 * i;
        }
    }
    sum
}

fn calculate_quadruples(dicearr: [i32; 5]) -> i32 {
    let freq_map = get_frequency_map(dicearr);
    let mut sum = 0;
    for (&i, &c) in &freq_map {
        if c >= 4 {
            sum = 4 * i;
        }
    }
    sum
}

fn calculate_smallstraight(dicearr: [i32; 5]) -> i32 {
    if dicearr == [1, 2, 3, 4, 5] { 15 } else { 0 }
}

fn calculate_bigstraight(dicearr: [i32; 5]) -> i32 {
    if dicearr == [2, 3, 4, 5, 6] { 20 } else { 0 }
}

fn calculate_fullhouse(dicearr: [i32; 5]) -> i32 {
    let freq_map = get_frequency_map(dicearr);
    let mut sum = 0;
    let mut pairs = false;
    let mut triples = false;
    for (&i, &c) in &freq_map {
        if c >= 3 {
            triples = true;
            sum += 3 * i;
        } else if c >= 2 {
            pairs = true;
            sum += 2 * i;
        }
    }

    if triples && pairs { sum } else { 0 }
}

fn calculate_mixed(dicearr: [i32; 5]) -> i32 {
    let mut sum = 0;
    for &i in &dicearr {
        sum += i;
    }
    sum
}

fn calculate_quintuples(dicearr: [i32; 5]) -> i32 {
    let freq_map = get_frequency_map(dicearr);
    for (&i, &c) in &freq_map {
        if c >= 5 && i != 0 {
            return 50;
        }
    }
    0
}

// Switch function used to calculate the correct value
// for a selected item, so each 15 items dont need their own
// functions. Returns the calculated value and the index of
// the item in the score row.
pub fn calculate_item(item: &str, game: &GameData) -> Option<(i32, usize)> {
    let dicearr = get_dice_values_array(game);

    Some(match item {
        "one" => (calculate_numbers(dicearr, 1), 0),
        "two" => (calculate_numbers(dicearr, 2), 1),
        "three" => (calculate_numbers(dicearr, 3), 2),
        "four" => (calculate_numbers(dicearr, 4), 3),
        "five" => (calculate_numbers(dicearr, 5), 4),
        "six" => (calculate_numbers(dicearr, 6), 5),
        "pair" => (calculate_pair(dicearr), 6),
        "doublepair" => (calculate_doublepair(dicearr), 7),
        "triples" => (calculate_triples(dicearr), 8),
        "quadruples" => (calculate_quadruples(dicearr), 9),
        "smallstraight" => (calculate_smallstraight(dicearr), 10),
        "bigstraight" => (calculate_bigstraight(dicearr), 11),
        "fullhouse" => (calculate_fullhouse(dicearr), 12),
        "mixed" => (calculate_mixed(dicearr), 13),
        "quintuples" => (calculate_quintuples(dicearr), 14),
        _ => return None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::userdata::DiceData;

    fn game_with(values: [i32; 5]) -> GameData {
        let mut game = GameData::default();
        for (i, &value) in values.iter().enumerate() {
            game.dice[i] = DiceData {
                value,
                locked: false,
            };
        }
        game
    }

    fn score(item: &str, values: [i32; 5]) -> i32 {
        calculate_item(item, &game_with(values)).unwrap().0
    }

    #[test]
    fn numbers() {
        assert_eq!(score("one", [1, 3, 1, 5, 1]), 3);
        assert_eq!(score("six", [6, 6, 2, 6, 6]), 24);
        assert_eq!(score("four", [1, 2, 3, 5, 6]), 0);
    }

    #[test]
    fn straights() {
        assert_eq!(score("smallstraight", [5, 3, 2, 4, 1]), 15);
        assert_eq!(score("bigstraight", [5, 3, 2, 4, 6]), 20);
        assert_eq!(score("smallstraight", [2, 3, 4, 5, 6]), 0);
        assert_eq!(score("bigstraight", [1, 2, 3, 4, 5]), 0);
    }

    #[test]
    fn pairs() {
        assert_eq!(score("pair", [6, 3, 6, 1, 2]), 12);
        assert_eq!(score("pair", [1, 3, 5, 2, 6]), 0);
        assert_eq!(score("doublepair", [1, 1, 3, 3, 5]), 8);
        assert_eq!(score("doublepair", [1, 1, 1, 3, 5]), 0);
    }

    #[test]
    fn same_of_a_kind() {
        assert_eq!(score("triples", [4, 4, 4, 1, 2]), 12);
        assert_eq!(score("quadruples", [4, 4, 4, 4, 2]), 16);
        assert_eq!(score("quintuples", [4, 4, 4, 4, 4]), 50);
        assert_eq!(score("quintuples", [0, 0, 0, 0, 0]), 0);
    }

    #[test]
    fn fullhouse_and_mixed() {
        assert_eq!(score("fullhouse", [2, 2, 5, 5, 5]), 19);
        assert_eq!(score("fullhouse", [2, 2, 2, 2, 5]), 0);
        assert_eq!(score("mixed", [6, 5, 4, 3, 2]), 20);
    }

    #[test]
    fn unknown_item() {
        assert!(calculate_item("nosuchitem", &GameData::default()).is_none());
    }
}

// Struct used for handling ongoing games' data.
// scores and clicked mirror the scores array of the games database
// table, where a NULL value means the item has not been selected yet.
#[derive(Clone, Default)]
pub struct GameData {
    // Kept like in the original server, the row is written but
    // nothing is answered based on it
    #[allow(dead_code)]
    pub id: i64,
    pub user_id: i64,
    pub scores: [i32; 15],
    pub clicked: [bool; 15],
    pub dice: [DiceData; 5],
    // Stored in the turn_count column of the games table
    pub round_num: i32,
    pub roll_count: i32,
}

// Struct used by GameData to store dice state
#[derive(Clone, Copy, Default)]
pub struct DiceData {
    pub value: i32,
    pub locked: bool,
}

// Struct describing a logged in user, filled from
// the sessions and users database tables
#[derive(Clone)]
pub struct UserInfo {
    pub id: i64,
    pub username: String,
    pub allowed: bool,
}

// Resets the dice of the given game to unlocked and 0
pub fn reset_dice(game: &mut GameData) {
    for die in &mut game.dice {
        die.value = 0;
        die.locked = false;
    }
}

// Function to calculate the total and subtotal of the given game
// returns (total, subTotal)
pub fn calculate_total(game: &GameData) -> (i32, i32) {
    let mut total = 0;
    let mut sub_total = 0;

    for score in game.scores.iter().take(6) {
        total += score;
        sub_total += score;
    }

    // Check if bonus is given
    if total >= 63 {
        total += 50;
    }

    for score in game.scores.iter().skip(6) {
        total += score;
    }

    (total, sub_total)
}

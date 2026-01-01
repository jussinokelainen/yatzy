package main

func addScore(name string, score int, id string, row string) error {
	sqlStatement := `INSERT INTO results(name, score, id, row) VALUES($1, $2, $3, $4);`
	_, err := db.Exec(sqlStatement, name, score, id, row)
	return err
}

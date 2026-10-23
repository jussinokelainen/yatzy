package main

import (
	"database/sql"
	"fmt"
	"io"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/gin-contrib/static"
	"github.com/gin-gonic/gin"
	_ "github.com/joho/godotenv/autoload"
	_ "github.com/lib/pq"
)

const MAX_ROUND = 15

var db *sql.DB
var (
	port            = 5432
	user            = ""
	password        = ""
	dbname          = ""
	allow_new_users = false
)

func load_env() {
	user = os.Getenv("DATABASE_USER")
	password = os.Getenv("DATABASE_PASSWORD")
	dbname = os.Getenv("DATABASE_NAME")

	allow, err := strconv.ParseBool(os.Getenv("ALLOW_NEW_USERS"))
	if err != nil {
		allow = false
	}
	allow_new_users = allow
}

// Print helper functions
func ok(msg ...any)     { log.Println(append([]any{"[\033[32m OK \033[0m]"}, msg...)...) }
func info(msg ...any)   { log.Println(append([]any{"[\033[35m INFO \033[0m]"}, msg...)...) }
func errout(msg ...any) { log.Println(append([]any{"[\033[31m ERROR \033[0m]"}, msg...)...) }

// Function to open a connection to the database
func openDatabase() *sql.DB {
	psqlInfo := fmt.Sprintf("host=db port=%d user=%s "+
		"password=%s dbname=%s sslmode=disable",
		port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		errout("Error opening database")
		errout(err)
	}

	return db
}

func main() {
	load_env()
	// Setup logging
	timeNow := time.Now().Format("2006-01-02_15-04-05")
	logFileName := "/logs/" + timeNow + ".log"
	logFile, err := os.OpenFile(logFileName, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0666)
	if err != nil {
		panic(err)
	}
	defer logFile.Close()
	mw := io.MultiWriter(os.Stdout, logFile)

	log.SetOutput(mw)

	gin.DefaultWriter = mw
	gin.DefaultErrorWriter = mw
	gin.SetMode(gin.ReleaseMode)
	// Force color to get nicer looking log messages
	gin.ForceConsoleColor()
	db = openDatabase()
	defer db.Close()

	router := gin.Default()

	// router.Use(func(c *gin.Context) {
	// 	c.Next()
	//
	// 	if c.Writer.Written() {
	// 		info("STATUS WRITTEN:", c.Writer.Status(), c.FullPath())
	// 	}
	// })

	// This might be useless or idk,
	// maybe make all requests be part of some group
	api := router.Group("/api")
	{
		// Account routes
		api.POST("/register", register)
		api.POST("/login", login)
		api.POST("/logout", logout)
		api.GET("/me", getMe)

		// Leaderboards, public
		api.GET("/getscores", getTopScores)
		api.GET("/getstats", getStatsById)
	}

	// Routes that belong to a single player. The player is identified by
	// their session cookie instead of the id being part of the url.
	game := router.Group("/")
	{
		game.Use(requireSession)
		// Accounts that have not been allowed yet can not play
		game.Use(requireAllowed)

		// POST requests
		game.POST("/restart", restartGame)
		game.POST("/lockDice/:dice", lockDice)
		game.POST("/selectItem/:what", itemSelector)

		// GET requests
		game.GET("/getRoundNumber", getRound)
		game.GET("/checkExistingProgress", checkExistingProgress)
		game.GET("/start", startGame)
		game.GET("/rollDice", rollDice)
		game.GET("/getScoresByID", getScoresByID)
	}

	router.Use(static.Serve("/", static.LocalFile("web/dist", true)))

	info("Server running...")
	router.Run("0.0.0.0:2222")
}

package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	// Name of the cookie that holds the session token
	sessionCookieName = "yatzy_session"
	// Keys under which the logged in user is stored in the request context
	userInfoContextKey = "yatzy_user"
	// How long a session stays valid
	sessionDuration = 30 * 24 * time.Hour
)

var (
	ErrSessionNotFound = errors.New("session not found or expired")
)

// Request body shared by the login and register handlers
type authRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// Returns true when the cookie should only be sent over https.
// The COOKIE_SECURE environment variable overrides the detection, with
// "true" always enabling it and "false" always disabling it. When the
// variable is not set, it is detected from the request, so the cookie
// works both when the server is served over https and when it is used
// over plain http in a local network.
func cookieSecure(c *gin.Context) bool {
	switch strings.ToLower(os.Getenv("COOKIE_SECURE")) {
	case "true":
		return true
	case "false":
		return false
	}

	// The connection to the server is secure
	if c.Request.TLS != nil {
		return true
	}

	// A proxy in front of the server terminated the https connection
	return strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
}

// Generates a random session token to use as a login credential.
// Only the hash of the token gets stored, so a leaked database
// does not leak usable session tokens.
func newSessionToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func hashToken(token string) []byte {
	hash := sha256.Sum256([]byte(token))
	return hash[:]
}

// Cheap sanity check for the token read from a cookie,
// the real check happens against the database
func looksLikeSessionToken(token string) bool {
	if len(token) < 20 || len(token) > 128 {
		return false
	}

	return true
}

// Sets the session token as a http only cookie for the response
func setSessionCookie(c *gin.Context, token string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     sessionCookieName,
		Value:    token,
		Path:     "/",
		MaxAge:   int(sessionDuration.Seconds()),
		Expires:  time.Now().Add(sessionDuration),
		HttpOnly: true,
		Secure:   cookieSecure(c),
		SameSite: http.SameSiteLaxMode,
	})
}

// Removes the session cookie from the browser
func clearSessionCookie(c *gin.Context) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
		HttpOnly: true,
		Secure:   cookieSecure(c),
		SameSite: http.SameSiteLaxMode,
	})
}

// Creates a new session for the given user and
// returns the token to give to the browser
func createSession(ctx context.Context, userID int64) (string, error) {
	token, err := newSessionToken()
	if err != nil {
		return "", err
	}

	_, err = db.ExecContext(ctx,
		`INSERT INTO sessions (token_hash, user_id, expires_at)
		VALUES ($1, $2, now() + $3 * interval '1 second')`,
		hashToken(token), userID, int(sessionDuration.Seconds()))
	if err != nil {
		return "", err
	}

	return token, nil
}

// Loads the user the given session token belongs to.
// Expired sessions are removed and reported as not found.
func getSessionUser(ctx context.Context, token string) (UserInfo, error) {
	var user UserInfo
	var expiresAt time.Time

	err := db.QueryRowContext(ctx,
		`SELECT u.id, u.username, u.allowed, s.expires_at
		FROM sessions s
		JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1`, hashToken(token)).
		Scan(&user.id, &user.username, &user.allowed, &expiresAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return user, ErrSessionNotFound
		}
		return user, err
	}

	if time.Now().After(expiresAt) {
		deleteSession(ctx, token)
		return user, ErrSessionNotFound
	}

	// Keep track of when the session was last used
	_, _ = db.ExecContext(ctx,
		`UPDATE sessions SET last_used_at = now() WHERE token_hash = $1`,
		hashToken(token))

	return user, nil
}

// Removes the session belonging to the given token
func deleteSession(ctx context.Context, token string) error {
	_, err := db.ExecContext(ctx,
		`DELETE FROM sessions WHERE token_hash = $1`, hashToken(token))

	return err
}

// Returns the logged in user of the current request,
// or nothing if the request never got past requireSession
func getUserInfo(c *gin.Context) (UserInfo, bool) {
	value, exists := c.Get(userInfoContextKey)
	if !exists {
		return UserInfo{}, false
	}

	user, ok := value.(UserInfo)
	if !ok {
		return UserInfo{}, false
	}

	return user, true
}

// Middleware that makes sure the request comes from a logged in user.
// The user is read from the session cookie, and requests without a
// valid session get rejected with a 401.
func requireSession(c *gin.Context) {
	token, err := c.Cookie(sessionCookieName)
	if err != nil || !looksLikeSessionToken(token) {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "not logged in",
		})
		return
	}

	user, err := getSessionUser(c.Request.Context(), token)
	if err != nil {
		if !errors.Is(err, ErrSessionNotFound) {
			errout("Error loading session")
			errout(err)
		}
		clearSessionCookie(c)
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "session expired",
		})
		return
	}

	c.Set(userInfoContextKey, user)
	c.Next()
}

// Middleware that blocks users whose account has not been
// allowed yet from using the game
func requireAllowed(c *gin.Context) {
	user, exists := getUserInfo(c)
	if !exists {
		c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
			"error": "not logged in",
		})
		return
	}

	if !user.allowed {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
			"error": "account not allowed",
		})
		return
	}

	c.Next()
}

// Creates an account for the given username and password and
// logs the new user in. New accounts are not allowed to play yet.
func register(c *gin.Context) {
	var req authRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	id, err := CreateUser(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		if errors.Is(err, ErrUsernameTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "username already taken"})
			return
		}
		if errors.Is(err, ErrInvalidInput) {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "username must be 3-32 characters and password 8-72 characters long",
			})
			return
		}
		errout("Error creating user")
		errout(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
		return
	}

	token, err := createSession(c.Request.Context(), id)
	if err != nil {
		errout("Error creating session")
		errout(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}

	setSessionCookie(c, token)
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"username": strings.TrimSpace(req.Username),
		"allowed":  false,
	})
}

// Logs the user in by checking the given password against
// the stored hash and creating a new session for them
func login(c *gin.Context) {
	var req authRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	user, err := AuthenticateUser(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		if errors.Is(err, ErrInvalidInput) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid username or password"})
			return
		}
		errout("Error authenticating user")
		errout(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not log in"})
		return
	}

	token, err := createSession(c.Request.Context(), user.id)
	if err != nil {
		errout("Error creating session")
		errout(err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create session"})
		return
	}

	setSessionCookie(c, token)
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"username": user.username,
		"allowed":  user.allowed,
	})
}

// Logs the user out by removing their session
func logout(c *gin.Context) {
	if token, err := c.Cookie(sessionCookieName); err == nil && looksLikeSessionToken(token) {
		if err := deleteSession(c.Request.Context(), token); err != nil {
			errout("Error deleting session")
			errout(err)
		}
	}

	clearSessionCookie(c)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Returns the logged in user of the request, if any.
// Unlike the game routes this never rejects the request,
// the frontend uses it to decide whether to show the
// login screen or the game.
func getMe(c *gin.Context) {
	token, err := c.Cookie(sessionCookieName)
	if err != nil || !looksLikeSessionToken(token) {
		c.JSON(http.StatusOK, gin.H{"logged_in": false})
		return
	}

	user, err := getSessionUser(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"logged_in": false})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"logged_in": true,
		"username":  user.username,
		"allowed":   user.allowed,
	})
}

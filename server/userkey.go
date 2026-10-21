package main

import (
	"crypto/rand"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	// Name of the cookie that holds the player identifier
	userCookieName = "yatzy_user"
	// Key under which the player identifier is stored in the request context
	userKeyContextKey = "yatzy_user_key"
	// How long the cookie stays valid, in seconds (one year)
	userCookieMaxAge = 365 * 24 * 60 * 60
)

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

// Generates a random UUID v4 to use as a player identifier
func newUserKey() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	// Set the version (4) and the variant bits
	buf[6] = (buf[6] & 0x0f) | 0x40
	buf[8] = (buf[8] & 0x3f) | 0x80

	return fmt.Sprintf(
		"%x-%x-%x-%x-%x",
		buf[0:4], buf[4:6], buf[6:8], buf[8:10], buf[10:16],
	), nil
}

// Checks that the given key is a valid UUID
func isValidUserKey(key string) bool {
	if len(key) != 36 {
		return false
	}

	for i, r := range key {
		switch i {
		case 8, 13, 18, 23:
			if r != '-' {
				return false
			}
		default:
			if !strings.ContainsRune("0123456789abcdefABCDEF", r) {
				return false
			}
		}
	}

	return true
}

// Sets the player identifier as a http only cookie for the response
func setUserCookie(c *gin.Context, key string) {
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     userCookieName,
		Value:    key,
		Path:     "/",
		MaxAge:   userCookieMaxAge,
		Expires:  time.Now().Add(userCookieMaxAge * time.Second),
		HttpOnly: true,
		Secure:   cookieSecure(c),
		SameSite: http.SameSiteLaxMode,
	})
}

// Middleware that makes sure every request has a player identifier.
// The identifier is read from the cookie, and when the request has none,
// a new one is generated and sent back as a cookie.
func userKeyMiddleware(c *gin.Context) {
	key, err := c.Cookie(userCookieName)
	if err != nil || !isValidUserKey(key) {
		newKey, genErr := newUserKey()
		if genErr != nil {
			errout("Error generating user key")
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
				"error": "Could not create user key",
			})
			return
		}

		key = newKey
		setUserCookie(c, key)
	}

	c.Set(userKeyContextKey, key)
	c.Next()
}

// Returns the player identifier of the current request
func getUserKey(c *gin.Context) string {
	key, exists := c.Get(userKeyContextKey)
	if !exists {
		return ""
	}

	userKey, ok := key.(string)
	if !ok {
		return ""
	}

	return userKey
}

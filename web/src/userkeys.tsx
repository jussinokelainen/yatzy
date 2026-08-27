import { v4 as uuid } from 'uuid'

// Function to create a userkey for a new user
export function createUserKey() {
  const userKey = uuid()
  localStorage.setItem('yatzyUser', userKey);
}

// Function to get the userkey of an existing user
export function getUserKey() {
  return localStorage.getItem('yatzyUser');
}

// Function to check whether a user already has a userkey
export function checkUserKey() {
  const key = localStorage.getItem('yatzyUser')
  if (key === null) return false
  else return true
}

import { v4 as uuid } from 'uuid'

export function createUserKey() {
  const userKey = uuid()
  localStorage.setItem('yatzyUser', userKey);
}

export function getUserKey() {
  return localStorage.getItem('yatzyUser');
}

export function checkUserKey() {
  const key = localStorage.getItem('yatzyUser')
  if (key === null) return false
  else return true
}

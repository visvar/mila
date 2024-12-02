/**
 * Updates the current window's URL with a GET parameter, specified by key and value
 * @param {Window} window window
 * @param {string} key parameter key
 * @param {*} value parameter value (set undefined to remove the URL parameter)
*/
export function setUrlParam(window, key, value) {
  const params = new URLSearchParams(window.location.search)
  if (value !== undefined) {
    params.set(key, value)
  } else {
    params.delete(key)
  }
  const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname
    }?${params.toString()}`
  // has to be pushState to make backward function in browser work correctly
  window.history.pushState({ path: newurl }, '', newurl)
}

/**
 * Get the value of the specfied parameter from the current URL
 * @param {Window} window window
 * @param {string} key parameter key
 * @returns {string|undefined} parameter value
 */
export function getUrlParam(window, key) {
  const params = new URLSearchParams(window.location.search)
  return params.get(key)
}

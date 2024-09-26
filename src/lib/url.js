/**
 * Updates the current window's URL with a GET parameter, specified by key and value
 * @param {Window} window window
 * @param {string} key parameter key
 * @param {*} value parameter value
*/
export function setUrlParam(window, key, value) {
  const params = new URLSearchParams(window.location.search)
  params.set(key, value)
  const newurl = `${window.location.protocol}//${window.location.host}${window.location.pathname
    }?${params.toString()}`
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

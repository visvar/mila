import { version } from '../../package.json'
import saveAs from 'file-saver'

/**
 * Stores a stringified Map in JSON
 * @see https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
 * @param {*} key
 * @param {*} value
 * @returns {object}
*/
export function replacer(key, value) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()), // or with spread: value: [...value]
    }
  } else {
    return value
  }
}

/**
 * Revives a stringified Map in JSON
 * @see https://stackoverflow.com/questions/29085197/how-do-you-json-stringify-an-es6-map
 * @param {*} key
 * @param {*} value
 * @returns {Map} map
 */
export function reviver(key, value) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value)
    }
  }
  return value
}

/**
 * Takes a file input event and returns the file's content as object parsed from JSON
 * @param {File} file file handle of an event
 * @returns {Promise<*>} parsed JSON content of the file
 */
export async function parseJsonFile(file) {
  const text = await file.text()
  const json = JSON.parse(text, reviver)
  return json
}

/**
 * Triggers the download of a JSON file named <appId>.json and containing the data object stringified to JSON
 * @param {string} appId identifier of the app
 * @param {object} data may not contain _date and _appId
 */
export function downloadJsonFile(appId, data) {
  // add meta data
  data._appId = appId
  data._softwareVersion = version
  data._date = (new Date()).toISOString()
  // export
  const json = JSON.stringify(data, replacer, 2)
  const blob = new Blob([json], {
    type: 'text/plain;charset=utf-8'
  })
  saveAs(blob, `${appId}.json`)
}

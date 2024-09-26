import { version } from '../../package.json'

export const SETTINGS_KEY = 'app-settings'
export const USAGE_KEY = 'usage'

const localSt = window.localStorage

/**
 * @see https://stackoverflow.com/questions/4391575/how-to-find-the-size-of-localstorage
 * @returns {number} current localStorage usage in KB
 */
export function localStorageKBytes() {
  let byteTotal = 0
  let entryLength
  let entry
  for (entry in localSt) {
    if (!localSt.hasOwnProperty(entry)) {
      continue
    }
    entryLength = ((localSt[entry].length + entry.length) * 2)
    byteTotal += entryLength
  };
  const total = byteTotal / 1024
  return total
}

/**
 * TODO: this only check how much is still left, so we would need to back current values up, test, and then restore them
 * TODO: use binary search for better result, might underestimate by 50% currently
 * @returns {number} localStorage limit in KB
 */
export function localStorageSizeKBytes() {
  let string = '12345678'
  let characters = 0
  while (true) {
    try {
      localSt.setItem('__test__', string)
    } catch (e) {
      break
    }
    string = `${string}${string}`
    characters = string.length
  }
  // console.log('semi')
  // while (true) {
  //   try {
  //     localSt.setItem('__test__', string)
  //     console.log(characters)
  //     break
  //   } catch (e) {
  //     string = string.slice(0, string.length - 1024 * 1024)
  //     console.log(characters)
  //   }
  //   characters = string.length
  // }

  localSt.removeItem('__test__')
  return (characters * 32) / 1024
}

export function localStorageReport() {
  const currentKb = localStorageKBytes()
  const limitKb = localStorageSizeKBytes()
  return {
    currentKb,
    limitKb,
    percentFull: currentKb / limitKb * 100
  }
}

// /**
//  * @see https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/estimate
//  * @returns {Promise<object>} information on usage
//  */
// export async function localStorageReport2() {
//   const estimate = await navigator.storage.estimate()
//   const percentFull = (estimate.usage / estimate.quota) *
//     100
//   return {
//     currentKb: estimate.usage / 1024,
//     limitKb: estimate.quota / 1024,
//     percentFull
//   }
// }

export function localStorageGetUsageData() {
  let usage
  if (localSt.getItem(USAGE_KEY) !== null) {
    usage = localSt.getItem(USAGE_KEY)
    usage = JSON.parse(usage)
  } else {
    usage = {
      appClicks: {},
      appRecordedData: {},
      ratings: {}
    }
  }
  return usage
}

export function localStorageSetUsageData(usage) {
  try {
    localSt.setItem(USAGE_KEY, JSON.stringify(usage))
  } catch (e) {
    window.alert('localStorage might be full: ' + e.toString())
  }
}

export function localStorageGetSetting(key) {
  const item = localSt.getItem(SETTINGS_KEY)
  if (!item) {
    return undefined
  } else {
    const obj = JSON.parse(item)
    return obj[key]
  }
}

/**
 * Stores the recorded data of the app in the usage localSorage
 * @param {string} appId app ID
 * @param {object} data data to save
 */
export function localStorageAddRecording(appId, data) {
  console.log(`saving recording for ${appId}`, data)
  const usage = localStorageGetUsageData()
  if (!usage.appRecordedData) {
    usage.appRecordedData = {}
  }
  if (!usage.appRecordedData[appId]) {
    usage.appRecordedData[appId] = []
  }
  const recordings = usage.appRecordedData[appId]
  // check if the same recording already exists
  const string = JSON.stringify(data)
  for (const recording of recordings) {
    if (string === JSON.stringify(recording.data)) {
      console.log('the recording already exists')
      return
    }
  }
  // save
  recordings.push({
    date: (new Date()).toISOString(),
    softwareVersion: version,
    data
  })
  localStorageSetUsageData(usage)
}

/**
 * Deletes a recording from the usage data
 * @param {string} appId app ID
 * @param {string} date the date for which the recording should be deleted
 */
export function localStorageDeleteRecording(appId, date) {
  console.log(`deleting recording for ${appId}`, date)
  const usage = localStorageGetUsageData()
  if (!usage.appRecordedData) {
    return
  }
  if (!usage.appRecordedData[appId]) {
    return
  }
  usage.appRecordedData[appId] = usage.appRecordedData[appId].filter(d => d.date !== date)
  localStorageSetUsageData(usage)
}

/**
 * Returns all locally stored recordings for the given app
 * @param {string} appId app ID
 * @returns {object[]} recording objects
 */
export function localSorageGetRecordings(appId) {
  const usage = localStorageGetUsageData()
  if (!usage.appRecordedData) {
    return []
  }
  if (!usage.appRecordedData[appId]) {
    return []
  }
  return usage.appRecordedData[appId]
}

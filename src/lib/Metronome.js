/**
 * Metronome
 *
 * @example
 * const m = new Metronome()
 * m.start(120, 4)
 */
class Metronome {
  // Config
  #beepDuration = 0.04
  #lookAheadTime = 0.1
  #scheduleTimeout = 50
  // State
  #isPlaying = false
  // Stores the timeout
  #timerID = null
  #bpm = null
  #accent = 4
  #maxBeeps = Infinity
  #startTimeStamp
  // Stores the number of the current beat (for accents)
  #beatCount = null
  #audioCtx = new AudioContext()
  // Callback
  #onClick = null

  /**
   * @returns {number} bpm
   */
  get bpm() { return this.#bpm }

  /**
   * @returns {number} beat count
   */
  get beatCount() { return this.#beatCount }

  /**
   * @param {function} callback callback
   */
  onClick(callback) {
    this.#onClick = callback
  }

  /**
   * Starts the metronome with a given tempo in bpm
   *
   * @param {number} bpm tempo in bpm
   * @param {number} [accent=4] accent every nth beat by changing pitch
   * @param {number} [maxBeeps=Infinity] number of beeps to produce, can be
   *  used for count-ins
  */
  start(bpm, accent = 4, maxBeeps = Infinity) {
    if (!bpm || Number.isNaN(+bpm)) {
      console.error(`[Metronome] Invalid bpm ${bpm}`)
      return
    }
    if (!accent || Number.isNaN(+accent)) {
      console.error(`[Metronome] Invalid accent ${accent}`)
      return
    }
    if (!maxBeeps || Number.isNaN(+maxBeeps)) {
      console.error(`[Metronome] Invalid maxBeeps ${maxBeeps}`)
      return
    }
    if (this.#audioCtx.state === 'suspended') {
      this.#audioCtx.resume()
    }
    this.#bpm = +bpm
    this.#accent = +accent
    this.#maxBeeps = +maxBeeps
    this.#isPlaying = true
    console.log(`Metronome @ ${bpm}bpm, accent every ${accent}. beat, limited to ${maxBeeps}`)
    // Reset state
    this.#beatCount = -1
    this.#startTimeStamp = this.#audioCtx.currentTime
    this._scheduler()
  }

  /**
   * Stops the metronome
  */
  stop() {
    console.log('[Metronome] stopped')
    clearTimeout(this.#timerID)
    this.#isPlaying = false
  }

  /**
   * Starts the metronome is it not running and stops it if it is
  *
  * @param {number} bpm tempo in bpm, last used bpm will be used as fallback
  * @param {number} [accent=4] accent every nth beat by changing pitch
   * @param {number} [maxBeeps=Infinity] number of beeps to produce, can be
   */
  toggle(bpm, accent = 4, maxBeeps = Infinity) {
    if (this.#isPlaying) {
      this.stop()
    } else {
      if (bpm === undefined) {
        bpm = this.#bpm
      }
      this.start(bpm, accent, maxBeeps)
    }
  }

  /**
   * Scheduler runs every scheduleTimeout milliseconds to schedule notes
   * for the coming lookahead time in seconds.
   *
   * @private
   */
  _scheduler = () => {
    // Beat properties
    const accentNote = this.#accent
    const secondsPerBeat = 60 / this.#bpm
    let nextNotetime = this.#startTimeStamp + this.#beatCount * secondsPerBeat
    // Only schedule beats until the lookahead is reached
    while (nextNotetime < this.#audioCtx.currentTime + this.#lookAheadTime) {
      if (this.#beatCount < this.#maxBeeps - 1) {
        nextNotetime += secondsPerBeat
        // Accent on every n-th note starting with the 0th
        const isAccent = this.#beatCount % accentNote === accentNote - 1 || this.#beatCount === -1
        const timeToNextBeep = nextNotetime - this.#audioCtx.currentTime
        const globalBeepTime = performance.now() + (timeToNextBeep * 1000)
        this._playSound(nextNotetime, globalBeepTime, isAccent)
        this.#beatCount++
      }
    }
    // Plan next scheduler run
    if (this.#beatCount < this.#maxBeeps - 1) {
      this.#timerID = setTimeout(this._scheduler, this.#scheduleTimeout)
    } else {
      this.stop()
    }
  }

  /**
   * Play a sounds via AudioContext and an oscillator.
   *
   * @private
   * @param {number} time  AudioContext time in seconds
   * @param {boolean} isAccent true for accented beep (higher pitch)
   */
  _playSound(time, globalBeepTime, isAccent) {
    if (this.#onClick) {
      this.#onClick(time, globalBeepTime, isAccent)
    }
    const osc = this.#audioCtx.createOscillator()
    osc.connect(this.#audioCtx.destination)
    const frequency = isAccent ? 300 : 200
    osc.frequency.value = frequency
    osc.start(time)
    osc.stop(time + this.#beepDuration)
  }
}

export default Metronome

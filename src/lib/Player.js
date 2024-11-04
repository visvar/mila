import Soundfont from 'soundfont-player'
import { NoteArray, Note } from 'musicvis-lib'

/**
 * @module audioOutput
 */

/**
 * Note player that uses soundfonts to play back an array note objects.
 *
 * @example
 * const player = new Player()
 *     .onTimeChange(handleTimeChange)
 *     .onStop(handleStop)
 *     .setVolume(3)
 *     .setLogging(true);
 * // List available instruments
 * player.getAvailableInstruments();
 * // Play an Array of Note objects
 * player.playNotes(notes);
 */
class Player {

  // Callbacks
  #playerTimeCallback = null;
  #onStopCallback = null;
  // Settings
  #sound = null;
  #volume = 1;
  #speed = null;
  #loop = false;
  #log = false;
  // Internal state
  currentPlayTime = null;
  #instrument = null;
  #audioCtx = new AudioContext();
  #timerID = null;
  #startTimeStamp = null;
  #startAt = 0;
  #endAt = -1;
  #notes = [];
  #notesLeftToPlay = [];
  #songDuration = null;
  #isPlaying = false;
  #isPaused = false;
  #isMuted = false
  // Cache info
  #lastSoundName = null;
  // Valid instrument / sound names
  // For soundfont instruments see: https://github.com/danigb/soundfont-player/blob/master/INSTRUMENTS.md
  static validInstruments = new Map([
    ['acoustic_grand_piano', { value: 'acoustic_grand_piano', label: 'Acoustic grand piano' }],
    ['acoustic_guitar_nylon', { value: 'acoustic_guitar_nylon', label: 'Acoustic guitar nylon' }],
    ['acoustic_guitar_steel', { value: 'acoustic_guitar_steel', label: 'Acoustic guitar steel' }],
    // ['distortion_guitar', { value: 'distortion_guitar', label: 'Distortion guitar' }],
    ['electric_bass_finger', { value: 'electric_bass_finger', label: 'Electric bass finger' }],
    // ['electric_bass_pick', { value: 'electric_bass_pick', label: 'Electric bass pick' }],
    ['electric_guitar_clean', { value: 'electric_guitar_clean', label: 'Electric guitar clean' }],
    // ['electric_guitar_muted', { value: 'electric_guitar_muted', label: 'Electric guitar muted' }],
    // ['overdriven_guitar', { value: 'overdriven_guitar', label: 'Overdriven guitar' }],
    // ['kalimba', { value: 'kalimba', label: 'Kalimba' }],
    ['percussion', { value: 'percussion', label: 'Percussion' }],
  ]);

  /**
   * Register a callback for player time change
   *
   * @param {Function} callback callback function, argument is the current player
   *      time in seconds
   * @returns {Player} itself
   */
  onTimeChange = (callback) => {
    this.#playerTimeCallback = callback
    return this
  };

  /**
   * Register a callback for player stop
   *
   * @param {Function} callback callback function, no arguments
   * @returns {Player} itself
   */
  onStop = (callback) => {
    this.#onStopCallback = callback
    return this
  };

  /**
   * Returns an array with the supported instrument soundfont names
   *
   * @returns {object[]} {name, description}
   */
  getAvailableInstruments = () => {
    return [...Player.validInstruments.values()]
  };

  /**
   * Changes the volume (loudness)
   *
   * @param {number} volume volume in [0, 1]
   * @returns {Player} itself
   */
  setVolume = (volume) => {
    this.#volume = volume
    return this
  };

  /**
 * Mute
 *
 * @returns {Player} itself
 */
  mute = () => {
    console.log('[Player] muted')

    this.#isMuted = true
    return this
  };

  /**
   * Un-mute
  *
  * @returns {Player} itself
  */
  unMute = () => {
    console.log('[Player] un-muted')
    this.#isMuted = false
    return this
  };
  isMuted = () => this.#isMuted;

  /**
   * Changes the logging flag to enable or disable logging of note events.
   *
   * @param {boolean} log true to turn logs on
   * @returns {Player} itself
   */
  setLogging = (log) => {
    this.#log = log
    return this
  };

  isPlaying = () => this.#isPlaying;

  isPaused = () => this.#isPaused;

  /**
   * Plays a set of notes.
   *
   * @todo filter notes before playing to sort out invalid ones.
   * @param {Note[]} notes array of note objects
   * @param {string} [sound=acoustic_grand_piano] see https://github.com/keithwhor/audiosynth
   * @param {number} [startAt=0] time of the track where to start playing in seconds
   * @param {number} [endAt=-1] time of the track where to end playing in seconds
   *      or -1 for no end limit
   * @param {number} [speed=1] relative speed in [0, 2] (e.g. 0.5 for halfed speed)
   * @param {boolean} [loop=false] if true, player will repeat the notes after finishing
   */
  playNotes = (
    notes,
    sound = 'acoustic_grand_piano',
    startAt = 0,
    endAt = -1,
    speed = 1,
    loop = false
  ) => {
    // Stop if playing
    if (this.#isPlaying && !this.#isPaused && !this.#loop) {
      this.stop()
    }
    // Check arguments
    if (!notes || notes.length === 0) {
      console.warn('[PLAYER] Was called with no data')
      return
    }
    if (!Player.validInstruments.has(sound)) {
      console.error(`[Player] Sound ${sound} is not supported!`)
      return
    }
    // Remember original notes for resume
    this.#notes = [...notes]
    let noteArr = new NoteArray(notes)
      .sortByTime()
    this.#songDuration = noteArr.getDuration()
    // Start time
    if (startAt > 0) {
      noteArr = noteArr.filter(d => d.start >= startAt).shiftTime(-startAt)
      console.log(`[Player] Will start at ${startAt.toFixed(2)} seconds with ${noteArr.length()} notes left`)
    }
    // Consider playback speed
    if (speed !== 1 && speed > 0) {
      noteArr = noteArr.scaleTime(1 / speed)
      this.#songDuration /= speed
    }
    notes = noteArr.getNotes()
    // Start playing
    console.log(`[Player] Playing ${notes.length} notes with '${sound}', speed ${speed}, and volume ${this.#volume}`)
    if (this.#audioCtx.state === 'suspended') {
      this.#audioCtx.resume()
    }
    this.#sound = sound
    this.#startAt = startAt
    this.#endAt = endAt
    this.#speed = speed
    this.#loop = loop
    this.#notesLeftToPlay = [...notes]
    if (sound === this.#lastSoundName) {
      // Re-use instrument
      this._start()
    } else {
      // Load instrument
      this.preloadInstrument(sound)
        .then(this._start)
    }
  };

  /**
   * Loads an instrument (soundfont) in advance so the player can start
   * immediately once it is called
   *
   * @param {string} sound instrument name
   * @returns {Promise<Player>} itself
   */
  async preloadInstrument(sound) {
    if (sound === 'silent') {
      return this
    }
    const file = `soundfonts/${sound}-mp3.js`
    if (this.#log) {
      console.log(`[Player] Pre-loading sound font from ${file}`)
    }
    if (!Player.validInstruments.has(sound)) {
      console.warn(`[Player] Invalid sound ${sound}`)
    }
    if (this.#log) {
      console.log(`[Player] Loading soundfont ${sound}`)
    }
    const options = {
      from: '',
      // soundfont: this.#validInstruments.get(sound).font || 'FluidR3_GM',
      gain: this.#volume,
    }
    // const instrument = await Soundfont.instrument(this.#audioCtx, sound, options);
    const instrument = await Soundfont.instrument(this.#audioCtx, file, options)
    this.#lastSoundName = sound
    this.#instrument = instrument
    if (this.#log) {
      console.log(`[Player] Finished loading soundfont ${sound}`)
    }
    return this
  }

  /**
   * Start scheduler
   *
   * @private
   */
  _start = () => {
    console.log('[Player] Starting')
    this.#isPlaying = true
    this.#isPaused = false
    this.#startTimeStamp = this.#audioCtx.currentTime
    this._scheduler()
  };

  /**
   * Update current time and call callback
   *
   * @private
   * @param {number} time time in milliseconds
   */
  _updateTime = (time) => {
    const current = (time - this.#startTimeStamp) * this.#speed + this.#startAt
    this.currentPlayTime = current
    if (this.#playerTimeCallback) {
      this.#playerTimeCallback(current)
    }
  };

  /**
   * Plays a single note
   *
   * @private
   * @param {Note} note note object
   * @param {number} time time in milliseconds
   */
  _playNote = (note, time) => {
    const duration = note.getDuration()
    if (this.#log) {
      console.log(`[Player] Playing ${note.getName()} for ${duration}s`)
    }
    try {
      this.#instrument.play(note.pitch, time, { duration, gain: note.velocity * this.#volume, sustain: note.getDuration() })
    } catch (error) {
      console.error('[Player] Error for note', note, error)
    }
  };

  /**
   * Scheduler runs every scheduleTimeout milliseconds to schedule notes
   * for the coming lookahead time in seconds
   *
   * @private
   */
  _scheduler = () => {
    const lookahead = 0.1
    const scheduleTimeout = 33
    const contextTime = this.#audioCtx.currentTime
    this._updateTime(contextTime)
    const endAt = (this.#endAt - this.#startAt) / this.#speed + this.#startAt
    // Schedule notes
    while (this.#notesLeftToPlay.length > 0) {
      const nextNotetime = this.#startTimeStamp + this.#notesLeftToPlay[0].start
      // Only schedule until the lookahead is reached
      if (nextNotetime > contextTime + lookahead) {
        break
      }
      // Only schedule until the end of the time selection
      if (this.#endAt !== -1 && this.#notesLeftToPlay[0].start + this.#startAt >= endAt) {
        break
      }
      // Play note
      const note = this.#notesLeftToPlay.shift()
      if (!this.#isMuted) {
        this._playNote(note, nextNotetime)
      }
    }
    const current = contextTime - this.#startTimeStamp + this.#startAt
    if (this.#endAt !== -1 && current >= endAt) {
      // Stop if end of time selection is reached
      this._stopOrLoop()
    } else if (current >= this.#songDuration) {
      // Stop if no notes left to play
      this._stopOrLoop()
    } else {
      // Plan next scheduler run
      this.#timerID = setTimeout(this._scheduler, scheduleTimeout)
    }
  };

  /**
   * Stops or loops the player depending on this.#loop
   *
   * @private
   */
  _stopOrLoop = () => {
    if (this.#loop) {
      this.playNotes(this.#notes, this.#sound, this.#startAt, this.#endAt, this.#speed, this.#loop)
    } else {
      this.stop()
    }
  };

  /**
   * Stops the player
   *
   * @param {boolean} callCallback call the callback function
   * @returns {Player} itself
   */
  stop = (callCallback = true) => {
    if (!this.#isPlaying) {
      return
    }
    console.log('[Player] Stopping player')
    clearTimeout(this.#timerID)
    this.currentPlayTime = null
    this.#isPlaying = false
    this.#isPaused = false
    this.#notes = []
    this.#notesLeftToPlay = []
    // Callback
    if (this.#playerTimeCallback) {
      this.#playerTimeCallback(null)
    }
    if (callCallback && this.#onStopCallback) {
      this.#onStopCallback()
    }
    return this
  };

  /**
   * Pauses the player
   *
   * @returns {Player} itself
   */
  pause = () => {
    console.log('[Player] Pausing player')
    clearTimeout(this.#timerID)
    this.#isPaused = true
    // TODO: onpause callback?
    return this
  };

  /**
   * Resumes the player if paused
   *
   * @returns {Player} itself
   */
  resume = () => {
    console.log('[Player] Resuming player')
    if (!this.#notesLeftToPlay || this.#notesLeftToPlay.length === 0) {
      console.warn('[Player] Cannot resume player since it has not been started!')
      return
    }
    this.playNotes(this.#notes, this.#sound, this.currentPlayTime, this.#endAt, this.#speed, this.#loop)
    // TODO: on resume callback?
    return this
  };

  /**
   * Will either pause or resume depending on player state
   *
   * @returns {Player} itself
   */
  pauseOrResume = () => {
    if (!this.#isPlaying) {
      console.warn('[Player] Cannot pause / resume when player is not playing!')
      return
    }
    if (this.#isPaused) {
      this.resume()
    } else {
      this.pause()
    }
    return this
  };
}


export default Player

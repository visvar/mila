<script>
  import { version } from '../package.json';
  import { getUrlParam, setUrlParam } from './lib/url';
  import { getNumberOfDaysPassed, setHasAny, updSet } from './lib/lib';
  // side bar for skill filtering
  import SkillTree from './SkillTree.svelte';
  // pages for tools etc
  import Tools from './tools/_tools.svelte';
  import Overview from './pages/Overview.svelte';
  import Help from './pages/Help.svelte';
  import Welcome from './pages/Welcome.svelte';
  // APPS
  import { APPS } from './apps';
  import PcKeyboardInput from './common/input-handlers/pc-keyboard-input.svelte';
  import AppTileTags from './common/app-tile-tags.svelte';
  import SelectScollable from './common/input-elements/select-scollable.svelte';
  import { upDownArrowIcon } from './lib/icons';
  import { fade } from 'svelte/transition';

  let currentApp = null;

  // handle URL parameters
  const param = getUrlParam(window, 'd');
  if (param && param !== '') {
    currentApp = APPS.filter((d) => d.id === param)[0];
  }

  /**
   * Opens app/page and updates URL
   * @param {null|string|object} app
   */
  const openPage = (app) => {
    currentApp = app;
    if (app) {
      if (app.id) {
        setUrlParam(window, 'd', app.id);
      } else {
        setUrlParam(window, 'd', app);
      }
    } else {
      setUrlParam(window, 'd', undefined);
    }
    window.scrollTo({ top: 0 });
  };

  // allow to go back to main page with history
  window.onpopstate = () => {
    openPage();
  };

  // track how often and when each app is used
  let appUsageCount = new Map();
  let appUsageRecent = new Map();
  $: {
    let usage;
    if (localStorage.getItem('usage')) {
      usage = localStorage.getItem('usage');
      usage = JSON.parse(usage);
    } else {
      usage = {};
    }
    if (!usage.appClicks) {
      usage.appClicks = {};
    }
    const appClicks = usage.appClicks;
    if (currentApp && currentApp.id) {
      const thisAppUsage = appClicks[currentApp.id] ?? [];
      thisAppUsage.push(new Date().toISOString());
      appClicks[currentApp.id] = thisAppUsage;
      localStorage.setItem('usage', JSON.stringify(usage));
    } else {
      appUsageCount = new Map(
        APPS.map((d) => [d.id, appClicks[d.id]?.length ?? 0]),
      );
      appUsageRecent = new Map(
        APPS.map((d) => {
          const lastTime = appClicks[d.id]?.at(-1);
          return [d.id, lastTime ? lastTime : 'never'];
        }),
      );
    }
  }

  // tags
  const allInputs = new Set(APPS.flatMap((d) => d.input).sort());
  const allInstruments = new Set([
    'drum',
    'guitar/bass',
    'keyboard',
    'singing',
    'pc-key',
    'touch',
  ]);
  const allData = new Set(APPS.flatMap((d) => d.data));
  const allSkills = new Set(APPS.flatMap((d) => d.skills).sort());
  const allDifficulties = new Set(['beginner', 'intermediate', 'advanced']);
  const allPatterns = new Set(APPS.flatMap((d) => d.patterns).sort());
  // filter
  let currentInstruments = new Set(allInstruments);
  let currentInputs = new Set(allInputs);
  let currentSkills = new Set(allSkills);
  let currentDifficulties = new Set(allDifficulties);
  // search
  let currentSearch = '';
  // apply filter
  $: filteredApps = APPS.filter(
    (d) =>
      d.title.toLowerCase().includes(currentSearch) &&
      setHasAny(currentInstruments, d.instruments) &&
      setHasAny(currentSkills, d.skills) &&
      setHasAny(currentDifficulties, d.difficulty) &&
      currentInputs.has(d.input),
  );
  // apply sorting
  let sortAppsBy = localStorage.getItem('display-app-sorting') ?? 'title';
  $: sortedApps = filteredApps.sort((a, b) => {
    if (sortAppsBy === 'title') {
      return a.title < b.title ? -1 : 1;
    }
    if (sortAppsBy === 'used') {
      return appUsageCount.get(b.id) - appUsageCount.get(a.id);
    }
    if (sortAppsBy === 'recent') {
      const recentA = appUsageRecent.get(a.id);
      const recentB = appUsageRecent.get(b.id);
      if (recentA === 'never') {
        return 1;
      }
      if (recentB === 'never') {
        return -1;
      }
      return recentA > recentB ? -1 : 1;
    }
  });

  // row layout?
  let rows = localStorage.getItem('display-app-rows') === 'true' || false;
  let simpleHome = localStorage.getItem('simple-home-menu') === 'false' || true;
</script>

<main>
  <header>
    <h1>Musical Instrument Learning Apps</h1>
    <nav>
      <button on:click="{() => openPage()}"> ☰ apps </button>
      <button on:click="{() => openPage('tools')}"> 🛠️ tools </button>
      <button on:click="{() => openPage('help')}"> ❓ help </button>
      <!-- <button on:click="{openPage('welcome')}"> 👋 welcome </button> -->
    </nav>
  </header>

  {#if !currentApp}
    <div class="grid-filter-app">
      <!-- filter -->
      <div class="filter">
        <!-- search -->
        <div>
          <input
            class="search-box"
            type="search"
            placeholder="search by title"
            bind:value="{currentSearch}"
          />
        </div>
        <!-- sort -->
        <div>
          <SelectScollable
            title="Sorts apps by ..."
            bind:value="{sortAppsBy}"
            callback="{(e) => {
              localStorage.setItem('display-app-sorting', e.target.value);
            }}"
            style="margin-left: -10px"
          >
            <option value="title">{upDownArrowIcon} title (A-Z)</option>
            <option value="used">{upDownArrowIcon} most used</option>
            <option value="recent">{upDownArrowIcon} recently used</option>
          </SelectScollable>
          <!-- layout -->
          <button
            title="Toggle between grid and rows for the app overview"
            on:click="{() => {
              rows = !rows;
              localStorage.setItem('display-app-rows', rows.toString());
            }}"
            class="row-button"
          >
            {rows ? '☰ rows' : '᎒᎒᎒ grid'}
          </button>
          <button
            title="Toggle detailed information for apps"
            on:click="{() => {
              simpleHome = !simpleHome;
              localStorage.setItem('simple-home-menu', simpleHome.toString());
            }}"
            class="row-button"
          >
            {simpleHome ? 'reduced' : 'detailed'}
          </button>
        </div>
        <!-- skill filter -->
        <SkillTree bind:currentSkills />
        <!-- instrument filters -->
        <div>
          <h2>instrument</h2>
          {#each allInstruments.values() as d}
            <button
              on:click="{() =>
                (currentInstruments = updSet(currentInstruments, d))}"
              on:dblclick="{() => (currentInstruments = new Set([d]))}"
              class="{currentInstruments.has(d) ? 'active' : 'hidden'}"
              title="click to toggle, double-click to only show this"
            >
              {d}
            </button>
          {/each}
        </div>
        <!-- instrument filters -->
        <div>
          <h2>difficulty</h2>
          {#each ['beginner', 'intermediate', 'advanced'] as d}
            <button
              on:click="{() =>
                (currentDifficulties = updSet(currentDifficulties, d))}"
              on:dblclick="{() => (currentDifficulties = new Set([d]))}"
              class="{currentDifficulties.has(d) ? 'active' : 'hidden'}"
              title="click to toggle, double-click to only show this"
            >
              {d}
            </button>
          {/each}
        </div>
        <!-- input type filter -->
        <div>
          <h2>input</h2>
          {#each allInputs.values() as d}
            <button
              on:click="{() => (currentInputs = updSet(currentInputs, d))}"
              on:dblclick="{() => (currentInputs = new Set([d]))}"
              class="{currentInputs.has(d) ? 'active' : 'hidden'}"
              title="click to toggle, double-click to only show this"
            >
              {d}
            </button>
          {/each}
        </div>
      </div>

      <!-- app overview grid -->
      <div class="grid {rows ? 'rows' : ''}">
        <!-- current filters -->
        {#if currentSearch !== '' || currentSkills.size === 1 || currentInstruments.size < allInstruments.size || currentDifficulties.size < allDifficulties.size || currentInputs.size < allInputs.size}
          <div class="current-filters" transition:fade>
            current filters:
            {#if currentSearch !== ''}
              <button
                title="click to remove this filter"
                on:click="{() => {
                  currentSearch = '';
                }}"
              >
                search: {currentSearch} &times;
              </button>
            {/if}
            {#if currentSkills.size === 1}
              <button
                title="click to remove this filter"
                on:click="{() => {
                  currentSkills = new Set(allSkills);
                }}"
              >
                skill: {[...currentSkills]} &times;
              </button>
            {/if}
            {#if currentInstruments.size < allInstruments.size}
              <button
                title="click to remove this filter"
                on:click="{() => {
                  currentInstruments = new Set(allInstruments);
                }}"
              >
                {currentInstruments.size} instruments &times;
              </button>
            {/if}
            {#if currentDifficulties.size < allDifficulties.size}
              <button
                title="click to remove this filter"
                on:click="{() => {
                  currentDifficulties = new Set(allDifficulties);
                }}"
              >
                difficulty: {[...currentDifficulties].join(', ')} &times;
              </button>
            {/if}
            {#if currentInputs.size < allInputs.size}
              <button
                title="click to remove this filter"
                on:click="{() => {
                  currentInputs = new Set(allInputs);
                }}"
              >
                input: {[...currentInputs]} &times;
              </button>
            {/if}
            <div style="display: inline-block">
              {sortedApps.length} of {APPS.length} apps shown
            </div>
          </div>
        {/if}
        {#each sortedApps as app (app.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="card {simpleHome ? 'simple' : ''}"
            on:click="{() => openPage(app)}"
            transition:fade
          >
            <h2>
              {app.title}
              {#if !simpleHome && !appUsageCount.get(app.id)}
                <span title="You never used this app, try it!">✨</span>
              {/if}
            </h2>
            <div class="description">
              {app.description}
            </div>
            {#if !simpleHome}
              <div class="usage">
                {#if appUsageCount.get(app.id) > 0}
                  Used {appUsageCount.get(app.id)} times.
                {/if}
                {#if appUsageCount.get(app.id) > 0}
                  Last used {getNumberOfDaysPassed(
                    new Date(appUsageRecent.get(app.id)),
                  )}.
                {/if}
              </div>
              <AppTileTags {app} />
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {:else if currentApp === 'tools'}
    <Tools {rows} />
  {:else if currentApp === 'overview'}
    <Overview apps="{APPS}" {allData} {allPatterns} />
  {:else if currentApp === 'help'}
    <Help />
  {:else if currentApp === 'welcome'}
    <Welcome
      {allInstruments}
      finishWelcome="{(data) => {
        if (data) {
          const { instruments, skills, difficulties } = data;
          // apply settings
          currentInstruments = new Set([instruments]);
          currentSkills = new Set([skills]);
          currentDifficulties = new Set([difficulties]);
        }
        // close welcome screen
        currentApp = null;
      }}"
    />
  {:else}
    <!-- show app by importing dynamically -->
    <svelte:component this="{currentApp.component}" appInfo="{currentApp}" />
  {/if}
  <div class="version-number">
    <span>version {version}</span>
    <!-- appOverview page button -->
    <button
      on:click="{() => openPage('overview')}"
      style="background: none; color: #aaa; font-weight: normal"
    >
      app overview
    </button>
    <a href="https://github.com/visvar/mila">GitHub</a>
  </div>
</main>
<!-- shortcut for search -->
<PcKeyboardInput
  key="f"
  ctrlKey
  keyDown="{() => {
    if (!currentApp) {
      document.querySelector('.search-box').focus();
    }
  }}"
/>

// ==UserScript==
// @name         CS History
// @namespace    https://github.com/shakerrdev/cs-history
// @version      1.0.0
// @description  Adds a CS History button to Steam profiles that looks the player up against your match history.
// @author       shakerrdev
// @match        https://steamcommunity.com/id/*
// @match        https://steamcommunity.com/profiles/*
// @icon         https://steamcommunity.com/favicon.ico
// @run-at       document-idle
// @grant        none
// @updateURL    https://shakerrdev.github.io/cs-history/cs-history.user.js
// @downloadURL  https://shakerrdev.github.io/cs-history/cs-history.user.js
// ==/UserScript==

;(function () {
  'use strict'

  var APP_URL = 'https://shakerrdev.github.io/cs-history'
  var BUTTON_ID = 'cs-history-action'

  // g_rgProfileData.steamid is the profile owner. g_steamID looks tempting but
  // is the logged-in viewer instead, and is `false` when signed out.
  function getQuery() {
    var profileData = window.g_rgProfileData
    if (profileData && profileData.steamid) return profileData.steamid

    var fromUrl = location.pathname.match(/\/profiles\/(\d{17})/)
    if (fromUrl) return fromUrl[1]

    // The backend resolves vanity URLs via Steam's ResolveVanityURL, so handing
    // it the raw profile URL is a fine last resort.
    return location.href
  }

  function addButton() {
    if (document.getElementById(BUTTON_ID)) return

    // Missing on profile subpages (/games, /screenshots, ...), which the @match
    // patterns also catch.
    var actions = document.querySelector('.profile_header_actions')
    if (!actions) return

    var label = document.createElement('span')
    label.textContent = 'CS History'

    var button = document.createElement('a')
    button.id = BUTTON_ID
    button.className = 'btn_profile_action btn_medium'
    button.href = APP_URL + '/#/?q=' + encodeURIComponent(getQuery())
    button.target = '_blank'
    button.rel = 'noopener'
    button.appendChild(label)

    actions.appendChild(button)
  }

  addButton()
})()

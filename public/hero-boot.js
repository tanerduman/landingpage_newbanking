;(function () {
  var promise = fetch('/api/waitlist?hero=1', { credentials: 'same-origin' })
    .then(function (res) {
      return res.ok ? res.json() : null
    })
    .then(function (data) {
      var hero = data && data.hero ? data.hero : null
      if (window.__AURE_HERO === undefined) window.__AURE_HERO = hero
      return window.__AURE_HERO
    })
    .catch(function () {
      window.__AURE_HERO = null
      return null
    })
  window.__AURE_HERO_PROMISE = promise
})()

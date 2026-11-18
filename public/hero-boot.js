;(function () {
  function remember(path, valueKey, promiseKey, pick) {
    var promise = fetch(path, { credentials: 'same-origin' })
      .then(function (res) {
        return res.ok ? res.json() : null
      })
      .then(function (data) {
        var value = pick(data)
        if (window[valueKey] === undefined) window[valueKey] = value
        return window[valueKey]
      })
      .catch(function () {
        window[valueKey] = null
        return null
      })
    window[promiseKey] = promise
  }

  remember('/api/waitlist?hero=1', '__AURE_HERO', '__AURE_HERO_PROMISE', function (data) {
    return data && data.hero ? data.hero : null
  })
  remember('/api/waitlist?plans=1', '__AURE_PLANS', '__AURE_PLANS_PROMISE', function (data) {
    return data && data.plans ? data.plans : null
  })
})()

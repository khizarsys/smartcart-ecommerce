/* Runs before first paint (classic script in <head>) to apply the saved or
   system theme and avoid a flash of the wrong colour scheme. */
(function () {
  var theme = null;
  try {
    theme = JSON.parse(localStorage.getItem('smartcart:theme'));
  } catch (e) {
    /* storage unavailable */
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-theme', theme);
})();

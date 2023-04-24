# chess-heat-extension

---

Fun find: Devtools windows are ignored by the tabs.query API. This means `tabs` will be an empty array when you try and refresh with the Devtools window open for the extension's `index.html` file and you refresh with `Ctrl+R`. So, what you should do is just open the extension and then look at the console errors afterwards in the extension's `index.html` Devtools. Link to this: https://bugs.chromium.org/p/chromium/issues/detail?id=462939.

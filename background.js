// This function runs when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated.");
  // Change icon to green when we are on a chess.com/member/* website
  // https://stackoverflow.com/questions/64473519/how-to-disable-gray-out-page-action-for-chrome-extension/64475504#64475504
  // https://developer.chrome.com/docs/extensions/reference/declarativeContent/
  chrome.declarativeContent.onPageChanged.removeRules(async () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            pageUrl: { urlContains: "chess.com/member", schemes: ["https"] },
          }),
        ],
        actions: [
          new chrome.declarativeContent.SetIcon({
            imageData: {
              16: await loadImageData("static/favicon-16x16-red.png"),
              32: await loadImageData("static/favicon-32x32-red.png"),
            },
          }),
          chrome.declarativeContent.ShowAction ? new chrome.declarativeContent.ShowAction() : new chrome.declarativeContent.ShowPageAction(),
        ],
      },
    ]);
  });
});

// SVG icons aren't supported yet
async function loadImageData(url) {
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const { width: w, height: h } = img;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

// This function listens for a message from the popup.js script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "get_url") {
    // This gets the URL of the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || tabs.length === 0) {
        console.log("Unable to get current tab URL.");
        return;
      }

      const tab = tabs[0];
      if (tab && tab.url) {
        if (tab.url.startsWith("https://www.chess.com/member/")) {
          // Parse the member name from the URL
          const memberName = tab.url.split("https://www.chess.com/member/")[1];
          // Send the member name as the response
          sendResponse({ name: memberName });
        } else {
          console.log("Not on a proper chess.com/member URL.");
          sendResponse({ name: null });
        }
      } else {
        console.log("Unable to get current tab URL.");
        sendResponse({ name: null });
      }
    });
    // This tells the sendResponse function to wait for a response asynchronously
    return true;
  }
});

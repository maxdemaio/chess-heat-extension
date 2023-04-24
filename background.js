// This function runs when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed or updated.");
});

// This function listens for a message from the popup.js script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "get_url") {
    // This gets the URL of the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      console.log(tabs);
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
          console.error("Not on a proper chess.com/member URL.");
          sendResponse({ name: null });
        }
      } else {
        console.error("Unable to get current tab URL.");
        sendResponse({ name: null });
      }
    });
    // This tells the sendResponse function to wait for a response asynchronously
    return true;
  }
});

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
        // This sends the URL to the content.js script to extract the member name
        chrome.tabs.sendMessage(tab.id, { message: "extract_member_name", url: tab.url }, (response) => {
          // This sends the extracted member name back to the popup.js script to update the HTML
          sendResponse({ message: "member_name", name: response.name });
        });
      } else {
        console.log("Unable to get current tab URL.");
      }
    });
  }
  // This tells the sendResponse function to wait for a response asynchronously
  return true;
});

// This function runs when the popup.html is loaded
window.addEventListener("DOMContentLoaded", () => {
  // This sends a message to the background.js script to get the current active tab URL
  chrome.runtime.sendMessage({ message: "get_url" }, (response) => {
    // This updates the HTML with the extracted member name from the URL
    console.log(response);

    document.getElementById("member-name").textContent = response.name;
  });
});

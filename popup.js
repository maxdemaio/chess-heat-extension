import { getResults } from "./results.js";

// This function runs when the index.html is loaded (extension opened and script type is module)
// This sends a message to the background.js script to get the current active tab URL
chrome.runtime.sendMessage({ message: "get_url" }, (response) => {
  // This updates the HTML with the extracted member name from the URL
  const memberNameEl = document.getElementById("member-name");
  if (response.name) {
    memberNameEl.textContent = response.name;
  } else {
    memberNameEl.textContent = "Unable to get member name";
  }
});

/* Constants/globals */
const DAYS_IN_MONTH_NO_LEAP = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_THE_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CURR_YEAR = new Date().getFullYear();

const currentTooltip = document.createElement("div");
currentTooltip.classList.add("svg-tip", "svg-tip-one-line");
currentTooltip.style.pointerEvents = "none"; // Remove pointer events to prevent tooltip flickering
currentTooltip.hidden = true;
document.body.appendChild(currentTooltip); // Add the tooltip to the DOM
/* End constants/globals */

/* Update max year */
const yearInput = document.getElementById("form-input-year");
yearInput.max = CURR_YEAR;
/* End update max year */

generateTable();

function generateTable() {
  const container = document.getElementById("heatmap");
  const descriptorSpan = document.createElement("span");
  const table = document.createElement("table");
  const tableCaption = document.createElement("caption");
  const tableHeader = document.createElement("thead");
  const tableHeaderTR = document.createElement("tr");
  const tableHeaderTD = document.createElement("td");
  const tableHeaderSpan = document.createElement("span");
  const tableBody = document.createElement("tbody");

  descriptorSpan.classList.add("sr-only");
  descriptorSpan.setAttribute("id", "games-played-graph-description");
  descriptorSpan.setAttribute("aria-hidden", "true");
  descriptorSpan.innerText = "User activity over one year of time. Each column is one week, with older weeks to the left.";
  table.setAttribute("aria-readonly", "true");
  table.setAttribute("aria-describedby", "games-played-graph-description");
  table.style.width = "max-content";
  table.style.borderSpacing = "4px";
  table.style.borderCollapse = "separate";
  table.style.overflow = "hidden";
  table.style.position = "relative";
  tableCaption.innerText = "Games Played Graph";
  tableCaption.classList.add("sr-only");
  tableHeaderTR.style.height = "15px";
  tableHeaderTD.style.width = "27px";
  tableHeaderSpan.classList.add("sr-only");
  tableHeaderSpan.innerText = "Day of Week";

  tableHeaderTD.appendChild(tableHeaderSpan);
  tableHeaderTR.appendChild(tableHeaderTD);

  for (let i = 0; i < 12; i++) {
    const tdHeader = document.createElement("td");
    const tdHeaderSpan = document.createElement("span");
    const tdHeaderSpanHidden = document.createElement("span");

    tdHeader.setAttribute("data-month", `month${i}`);
    tdHeader.setAttribute("colspan", "3");
    tdHeader.style.position = "relative";
    tdHeader.style.fontSize = "12px";
    tdHeader.style.textAlign = "left";
    tdHeader.style.padding = "0.125em 0.5em 0.125em 0";
    tdHeaderSpan.setAttribute("aria-hidden", "true");
    tdHeaderSpan.style.position = "absolute";
    tdHeaderSpan.style.top = "0";
    tdHeaderSpanHidden.classList.add("sr-only");

    tdHeader.appendChild(tdHeaderSpanHidden);
    tdHeader.appendChild(tdHeaderSpan);
    tableHeaderTR.appendChild(tdHeader);
  }

  for (let i = 0; i < 7; i++) {
    const tr = document.createElement("tr");
    const tdLabel = document.createElement("td");
    const tdLabelSpan = document.createElement("span");
    const tdLabelSpanHidden = document.createElement("span");

    tr.style.height = "13px";
    tdLabelSpanHidden.classList.add("sr-only");
    tdLabelSpan.setAttribute("aria-hidden", "true");
    tdLabelSpan.style.position = "absolute";
    tdLabelSpan.style.bottom = "-2px";
    tdLabelSpan.style.lineHeight = "1rem";
    tdLabel.style.position = "relative";
    tdLabel.style.padding = "0.125em 0.5em 0.125em 0";
    tdLabel.style.fontSize = "12px";
    tdLabel.style.textAlign = "left";
    tdLabel.style.width = "27px";

    const clipPathStyle = i % 2 === 0 ? "Circle(0)" : "None";
    tdLabelSpanHidden.textContent = DAYS_OF_THE_WEEK[i];
    tdLabelSpan.textContent = DAYS_OF_THE_WEEK[i].slice(0, 3);
    tdLabelSpan.style.clipPath = clipPathStyle;

    tdLabel.appendChild(tdLabelSpan);
    tr.appendChild(tdLabel);

    // Because it is possible to have a leap year that starts on a Saturday,
    // the last day of that leap year could appear on column 54
    for (let j = 0; j < 54; j++) {
      const td = document.createElement("td");
      const tdSpan = document.createElement("span");

      td.style.width = "11px";
      td.style.borderRadius = "2px";
      td.style.backgroundColor = "hsla(0, 0%, 50%, 0.15)";
      td.setAttribute("data-coord", `x${j}-y${i}`);
      td.setAttribute("tabindex", "-1");
      td.setAttribute("aria-selected", "false");
      td.classList.add(`anim${((i + j) % 4) + 1}`);
      td.addEventListener("mouseover", showTooltip);
      td.addEventListener("mouseleave", hideTooltip);
      tdSpan.classList.add("sr-only");
      tdSpan.innerText = "No Data";

      td.appendChild(tdSpan);
      tr.appendChild(td);
    }

    tableHeader.appendChild(tableHeaderTR);
    tableBody.appendChild(tr);
  }

  table.appendChild(tableCaption);
  table.appendChild(tableHeader);
  table.appendChild(tableBody);
  container.appendChild(table);
  container.appendChild(descriptorSpan);
}

function hideTooltip() {
  if (currentTooltip) {
    currentTooltip.hidden = true;
    currentTooltip.innerText = "No Data";
  }
}

function showTooltip(event) {
  const el = event.target;
  if (!(el instanceof HTMLElement || el instanceof SVGElement)) return;
  hideTooltip();

  function isTooFarLeft(graphContainerBounds, tooltipX) {
    return graphContainerBounds.x > tooltipX;
  }

  function isTooFarRight(graphContainerBounds, tooltipX) {
    return graphContainerBounds.x + graphContainerBounds.width < tooltipX + currentTooltip.offsetWidth;
  }

  const elCollection = el.getElementsByTagName("span");
  if (elCollection.length > 0) {
    currentTooltip.innerText = elCollection[0].innerText;
  } else {
    currentTooltip.innerText = "No Data";
  }

  // We have to show the tooltip before calculating it's position.
  currentTooltip.hidden = false;

  const tooltipWidth = currentTooltip.offsetWidth;
  const tooltipHeight = currentTooltip.offsetHeight;
  const bounds = el.getBoundingClientRect();
  const x = bounds.left + window.pageXOffset - tooltipWidth / 2 + bounds.width / 2;
  const y = bounds.bottom + window.pageYOffset - tooltipHeight - bounds.height * 2;
  const graphContainer = document.getElementById("heatmap");
  const graphContainerBounds = graphContainer.getBoundingClientRect();

  currentTooltip.style.top = `${y}px`;

  if (isTooFarLeft(graphContainerBounds, x)) {
    currentTooltip.style.left = `${x + currentTooltip.offsetWidth / 2 - bounds.width}px`;
    currentTooltip.classList.add("left");
    currentTooltip.classList.remove("right");
  } else if (isTooFarRight(graphContainerBounds, x)) {
    currentTooltip.style.left = `${x - currentTooltip.offsetWidth / 2 + bounds.width}px`;
    currentTooltip.classList.add("right");
    currentTooltip.classList.remove("left");
  } else {
    currentTooltip.style.left = `${x}px`;
    currentTooltip.classList.remove("left");
    currentTooltip.classList.remove("right");
  }
}

import { getResults } from "./results.js";

/* Constants/globals */
const DAYS_IN_MONTH_NO_LEAP = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "Febuary", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_OF_THE_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CURR_YEAR = new Date().getFullYear();
const DEFAULT_HUE = 0;
let dataCells; // updated in fetchData to all cells with data

const currentTooltip = document.createElement("div");
currentTooltip.classList.add("svg-tip", "svg-tip-one-line");
currentTooltip.style.pointerEvents = "none"; // Remove pointer events to prevent tooltip flickering
currentTooltip.hidden = true;
document.body.appendChild(currentTooltip); // Add the tooltip to the DOM
/* End constants/globals */

generateTable();
setYearField(CURR_YEAR);

// This function runs when the index.html is loaded (extension opened and script type is module)
// This sends a message to the background.js script to get the current active tab URL
chrome.runtime.sendMessage({ message: "get_url" }, (response) => {
  // This updates the HTML with the extracted member name from the URL
  const memberNameEl = document.getElementById("member-name");
  if (response.name) {
    memberNameEl.textContent = response.name;
    fetchData(response.name, CURR_YEAR);
  } else {
    memberNameEl.textContent = "Unable to get username";
    // Disable submit button
    const submitButton = document.getElementById("submit-button");
    submitButton.disabled = true;
  }
});

chrome.action.setBadgeBackgroundColor({ color: "red" }, () => {
  /* ... */
});

/* Update max year */
const yearInput = document.getElementById("form-input-year");
yearInput.max = CURR_YEAR;
/* End update max year */

function clearTable() {
  const targetDiv = document.getElementById("heatmap");
  const tbodyCollection = targetDiv.getElementsByTagName("tbody")[0].children;

  Array.from(tbodyCollection).map((elem) => {
    const tdToUpdate = Array.from(elem.children).slice(1);
    tdToUpdate.map((item) => {
      item.classList.remove("pulseOpacity");
      item.style.backgroundColor = "hsla(0, 0%, 50%, 0.15)";
      item.getElementsByTagName("span")[0].innerText = "No Data";
      item.style.visibility = "visible";
      delete item.dataset.hsl;
      delete item.dataset.text;
      item.classList.remove("data-cell");
    });
  });
}

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

function isPreviousYearFunc(year) {
  return year < CURR_YEAR;
}

function setYearField(year) {
  const yearField = document.getElementById("form-input-year");
  yearField.value = year;
}

function pulseCells() {
  const targetDiv = document.getElementById("heatmap");
  const tbodyCollection = targetDiv.getElementsByTagName("tbody")[0].children;

  Array.from(tbodyCollection).map((elem) => {
    const tdToUpdate = Array.from(elem.children).slice(1);
    tdToUpdate.map((item) => {
      item.classList.add("pulseOpacity");
    });
  });
}

function easeInPowerBounded(x, yMin, yMax, power = 1) {
  // Ensure that x is within the range of 0 and 1
  x = Math.max(0, Math.min(1, x));

  // Calculate y, the output value of the "ease in" function
  // Scale and shift y to fit within the range of yMin and yMax
  return x ** power * (yMax - yMin) + yMin;
}

function isValidChessComYear(year) {
  const minYear = 2007;
  return !isNaN(year) && year >= minYear && year <= CURR_YEAR;
}

function getDateStrings(currentDate) {
  const startYear = currentDate.getFullYear() - 1;
  const startMonth = String(currentDate.getMonth() + 1);
  const startDate = new Date(startYear, startMonth, 1);

  const dateStrings = [];
  for (let d = startDate; d <= currentDate; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const dateString = `${year}.${month}.${day}`;
    dateStrings.push(dateString);
  }

  return dateStrings;
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

async function fetchUserArchives(username) {
  const url = `https://api.chess.com/pub/player/${username}/games/archives`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch data");
  const { archives } = await resp.json();

  return archives;
}

async function fetchData(username, year) {
  // Disable submit button until end
  const submitButton = document.getElementById("submit-button");
  submitButton.disabled = true;

  const user = String(username).trim().toLocaleLowerCase();
  const gameData = {};
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let totalGames = 0;
  const isLeapYear = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  const isPreviousYear = isPreviousYearFunc(year);
  const today = isPreviousYear ? new Date(year, 11, 31) : new Date();
  const oneYearAgo = isPreviousYear ? new Date(year, 0, 1) : new Date().setFullYear(today.getFullYear() - 1);
  const dateArray = getDateStrings(today);
  const nextMonth = isPreviousYear ? 1 : new Date().getMonth() + 2;
  let maxGamesPlayed = 0;
  let daySum = 0;
  let prevColSum = 0;

  pulseCells();

  const archives = await fetchUserArchives(user);

  const validArchives = [];

  for (let i = 0; i < 12; i++) {
    let loopMonth;
    let loopYear;
    if (nextMonth + i <= 12) {
      loopMonth = String(nextMonth + i).padStart(2, "0");
      loopYear = isPreviousYear ? String(year) : String(year - 1);
    } else {
      loopMonth = String(nextMonth + i - 12).padStart(2, "0");
      loopYear = String(year);
    }

    const url = `https://api.chess.com/pub/player/${user}/games/${loopYear}/${loopMonth}`;

    if (archives.includes(url)) validArchives.push(url);
  }

  for (let i = 0; i < validArchives.length; i++) {
    const url = validArchives[i];
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch data");
    const { games } = await response.json();

    if (games.length === 0) continue; // Skip months with no games

    for (let j = 0; j < games.length; j++) {
      const currGameDate = new Date(games[j].end_time * 1000);
      const year = currGameDate.getFullYear();
      const month = ("0" + (currGameDate.getMonth() + 1)).slice(-2);
      const day = ("0" + currGameDate.getDate()).slice(-2);
      const dateString = `${year}.${month}.${day}`;
      let result = null;

      // Remove Games Outside of Lower Bound Month
      if (currGameDate < oneYearAgo) continue;

      const playerBlack = games[j].black.username.toLowerCase();
      const playerWhite = games[j].white.username.toLowerCase();
      if (playerWhite === user.toLowerCase()) result = games[j].white.result;
      if (playerBlack === user.toLowerCase()) result = games[j].black.result;

      const [win, loss, draw] = getResults(result);
      totalWins += win;
      totalLosses += loss;
      totalDraws += draw;
      totalGames++;

      if (gameData[dateString]) {
        // Stats for the day
        gameData[dateString]["win"] += win;
        gameData[dateString]["loss"] += loss;
        gameData[dateString]["draw"] += draw;
        gameData[dateString]["total"]++;

        // Update max games played
        if (gameData[dateString]["total"] > maxGamesPlayed) maxGamesPlayed = gameData[dateString]["total"];
      } else {
        gameData[dateString] = {
          win: win,
          loss: loss,
          draw: draw,
          total: 1,
        };
      }
    }
  }

  // Get which day the heatmap grid will start at
  const firstDateSplit = dateArray[0].split(".");
  const firstDayOffset = new Date(parseInt(firstDateSplit[0]), parseInt(firstDateSplit[1]) - 1, parseInt(firstDateSplit[2])).getDay();
  let dayIncrement = firstDayOffset;

  clearTable();

  const lightnessCiel = 66;
  const lightnessFloor = 11;
  const saturationCiel = 70;
  const saturationFloor = 50;
  const threshold = 4;

  // Hide Cells that don't appear in the year (Before)
  for (let cellCountBefore = 0; cellCountBefore < dayIncrement; cellCountBefore++) {
    const dataCellBefore = document.querySelector(`[data-coord="x0-y${cellCountBefore}"`);
    dataCellBefore.style.visibility = "hidden";
  }

  // Loop over all the dates in the rolling year
  for (const dateString of dateArray) {
    const cellId = `x${Math.floor(dayIncrement / 7)}-y${dayIncrement % 7}`;
    const dataCell = document.querySelector(`[data-coord="${cellId}"`);
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };

    // Ensure cross-browser compatibility with standardized date
    const dateParts = dateString.split(".");
    const datePretty = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2])).toLocaleDateString("en-US", options);

    if (gameData.hasOwnProperty(dateString)) {
      const totalGames = gameData[dateString]["total"];
      const lightness = Math.floor(easeInPowerBounded(1 - (totalGames - threshold) / (maxGamesPlayed - threshold), lightnessFloor, lightnessCiel, 5));
      const saturation = Math.floor(easeInPowerBounded(1 - (totalGames - threshold) / (maxGamesPlayed - threshold), saturationFloor, saturationCiel, 3));
      const text = `[${gameData[dateString]["win"]}-${gameData[dateString]["loss"]}-${gameData[dateString]["draw"]}] on ${datePretty}`;

      dataCell.dataset.date = dateString;
      dataCell.dataset.text = text;

      // Update popup text
      dataCell.querySelector("span").textContent = text;

      if (totalGames >= 1) {
        dataCell.classList.add("data-cell");
        dataCell.style.backgroundColor = `hsl(${DEFAULT_HUE}, ${saturation}%, ${lightnessCiel}%)`;
        // Store the HSL values as a custom attribute on the td element
        dataCell.dataset.hsl = `${DEFAULT_HUE},${saturation},${lightness}`;
      }
      if (totalGames > threshold) {
        dataCell.classList.add("data-cell");
        dataCell.style.backgroundColor = `hsl(${DEFAULT_HUE}, ${saturation}%, ${lightness}%)`;
        dataCell.dataset.hsl = `${DEFAULT_HUE},${saturation},${lightness}`;
      }
    } else {
      dataCell.querySelector("span").textContent = `[0-0-0] on ${datePretty}`;
      dataCell.style.backgroundColor = "hsla(0, 0%, 50%, 0.15)";
    }

    dayIncrement++;
  }

  // Hide Cells that don't appear in the year (After)
  while (dayIncrement < 54 * 7) {
    const cellId = `x${Math.floor(dayIncrement / 7)}-y${dayIncrement % 7}`;
    const dataCellAfter = document.querySelector(`[data-coord="${cellId}"`);
    dataCellAfter.style.visibility = "hidden";

    dayIncrement++;
  }

  // Set Width of Month Headers
  for (let j = 0; j < 12; j++) {
    const monthIndex = (j + nextMonth - 1) % 12;

    daySum += DAYS_IN_MONTH_NO_LEAP[monthIndex] + (j === 0 ? firstDayOffset : 0) + (j === 1 && isLeapYear ? 1 : 0);

    const colWidth = Math.floor(daySum / 7) - prevColSum;

    const headElem = document.querySelector(`[data-month="month${j}"]`);
    headElem.setAttribute("colspan", String(colWidth));
    headElem.childNodes[0].innerText = MONTHS_LONG[monthIndex];
    headElem.childNodes[1].innerText = MONTHS_SHORT[monthIndex];

    prevColSum += colWidth;
  }

  // Set new data cells
  dataCells = document.querySelectorAll(".data-cell");
  // Update total wins/losses/draws/total and user/year
  const winInfo = document.getElementById("winInfo");
  winInfo.innerText = totalWins;
  const yearInfo = document.getElementById("yearInfo");
  if (year == CURR_YEAR) {
    yearInfo.innerText = "the past year";
  } else {
    yearInfo.innerText = year;
  }
  const userInfo = document.getElementById("usernameInfo");
  userInfo.innerText = user;
  const lossInfo = document.getElementById("lossInfo");
  lossInfo.innerText = totalLosses;
  const drawInfo = document.getElementById("drawInfo");
  drawInfo.innerText = totalDraws;
  const totalInfo = document.getElementById("totalGameInfo");
  totalInfo.innerText = totalGames;

  // Re-enable hue input and submit button at end
  submitButton.disabled = false;
}

/* Form logic */
document.getElementById("form").addEventListener("submit", (e) => {
  // Prevent the form from refreshing the page
  e.preventDefault();

  // Get the value of the inputs
  const user = document.getElementById("member-name").innerText.toLowerCase();
  const year = parseInt(document.getElementById("form-input-year").value);

  // Validate year
  if (!isValidChessComYear(year)) {
    alert("Year must be greater than 2007 and not in the future.");
    return;
  }

  // Call the function that handles the chess.com requests
  fetchData(user, year);
});

const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Data structures
let sessions = [];
let totalSessions = 0;

// DOM Elements
const startButton = document.getElementById('start-button');
const saveButton = document.getElementById('save-button');
const timerNavButton = document.getElementById('timer-nav');
const visualizationNavButton = document.getElementById('visualization-nav');
const loadDataButton = document.getElementById('load-data-button');

// Event Listeners
startButton.addEventListener('click', startTimer);
saveButton.addEventListener('click', saveData);
timerNavButton.addEventListener('click', showTimerPage);
visualizationNavButton.addEventListener('click', showVisualizationPage);
loadDataButton.addEventListener('click', loadDataForVisualization);

function startTimer() {
  const taskInput = document.getElementById('task');
  const durationInput = document.getElementById('duration');
  const task = taskInput.value || 'Untitled Task';
  let duration = parseInt(durationInput.value) * 60; // Convert minutes to seconds

  if (isNaN(duration) || duration <= 0) {
    alert('Please enter a valid duration.');
    return;
  }

  // Hide the app title after starting
  document.getElementById('app-title').style.display = 'none';

  document.getElementById('timer-setup').style.display = 'none';
  document.getElementById('timer-display').style.display = 'block';
  document.getElementById('current-task').innerText = `${task}`;

  const countdownElement = document.getElementById('countdown');

  const interval = setInterval(() => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    countdownElement.innerText = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    if (duration <= 0) {
      clearInterval(interval);
      new Notification('Time is up!', { body: `Task "${task}" is completed.` });
      // Play sound
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3');
      audio.play();

      // Save session data
      addSession(task, parseInt(durationInput.value));

      // Reset UI
      document.getElementById('timer-setup').style.display = 'block';
      document.getElementById('timer-display').style.display = 'none';
      // Show the app title again
      document.getElementById('app-title').style.display = 'block';

      taskInput.value = '';
      durationInput.value = '5';
    }
    duration--;
  }, 1000);
}

function addSession(task, duration) {
  totalSessions++;
  const isBreak = task.trim().toLowerCase() === 'break';

  let session = sessions.find((s) => s.task === task);
  if (session) {
    session.duration += duration;
    session.count += 1;
  } else {
    sessions.push({ task, duration, count: 1, isBreak: isBreak });
  }
  updateStats();
}

function updateStats() {
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = `<h2>Session Stats</h2><p>Total Sessions: ${totalSessions}</p>`;
  sessions.forEach((session) => {
    statsDiv.innerHTML += `<p>Task: ${session.task} | Total Time: ${session.duration} mins | Count: ${session.count}</p>`;
  });
}

function saveData() {
  ipcRenderer.send('save-data', sessions);
  alert('Data saved successfully.');
}

function showTimerPage() {
  document.getElementById('timer-page').style.display = 'block';
  document.getElementById('visualization-page').style.display = 'none';
}

function showVisualizationPage() {
  document.getElementById('timer-page').style.display = 'none';
  document.getElementById('visualization-page').style.display = 'block';
}

function loadDataForVisualization() {
  const dateInput = document.getElementById('date-select');
  const selectedDate = dateInput.value;
  if (!selectedDate) {
    alert('Please select a date.');
    return;
  }

  const filename = `/data/data_${selectedDate}.json`;
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    alert('No data found for the selected date.');
    return;
  }

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      alert('Error reading data file.');
      return;
    }
    const sessionData = JSON.parse(data);
    visualizeData(sessionData);
  });
}

function visualizeData(data) {
  const svgWidth = 800;
  const svgHeight = 400;
  const margin = { top: 20, right: 30, bottom: 50, left: 60 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  // Remove existing SVG if any
  d3.select('#visualization').selectAll('*').remove();

  const svg = d3.select('#visualization')
    .append('svg')
    .attr('width', svgWidth)
    .attr('height', svgHeight)
    .style('background', '#222')
    .style('color', '#fff')
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  // Prepare data
  data.forEach((d) => {
    d.totalTime = d.duration;
  });

  // Set up scales
  const x = d3.scaleBand()
    .domain(data.map((d) => d.task))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.totalTime)])
    .range([height, 0]);

  // X Axis
  svg.append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(d3.axisBottom(x))
    .selectAll('text')
    .attr('fill', '#fff')
    .attr('transform', 'rotate(-45)')
    .style('text-anchor', 'end');

  // Y Axis
  svg.append('g')
    .call(d3.axisLeft(y))
    .selectAll('text')
    .attr('fill', '#fff');

  // Bars
  svg.selectAll('.bar')
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (d) => x(d.task))
    .attr('y', (d) => y(d.totalTime))
    .attr('width', x.bandwidth())
    .attr('height', (d) => height - y(d.totalTime))
    .attr('fill', (d) => d.isBreak ? 'orange' : 'steelblue')
    .on('mouseover', function (event, d) {
      d3.select(this).attr('fill', 'yellow');
    })
    .on('mouseout', function (event, d) {
      d3.select(this).attr('fill', d.isBreak ? 'orange' : 'steelblue');
    });

  // Labels
  svg.selectAll('.label')
    .data(data)
    .enter()
    .append('text')
    .text((d) => `${d.totalTime} mins`)
    .attr('x', (d) => x(d.task) + x.bandwidth() / 2)
    .attr('y', (d) => y(d.totalTime) - 5)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff');
}

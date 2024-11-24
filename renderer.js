const { ipcRenderer } = require('electron');

let sessions = [];
let totalSessions = 0;

const startButton = document.getElementById('start-button');
const saveButton = document.getElementById('save-button');

startButton.addEventListener('click', startTimer);
saveButton.addEventListener('click', saveData);

function startTimer() {
  const taskInput = document.getElementById('task');
  const durationInput = document.getElementById('duration');
  const task = taskInput.value || 'Untitled Task';
  let duration = parseInt(durationInput.value) * 60; // Convert minutes to seconds

  if (isNaN(duration) || duration <= 0) {
    alert('Please enter a valid duration.');
    return;
  }

  document.getElementById('timer-setup').style.display = 'none';
  document.getElementById('timer-display').style.display = 'block';
  document.getElementById('current-task').innerText = `Task: ${task}`;

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
      taskInput.value = '';
      durationInput.value = '5';
    }
    duration--;
  }, 1000);
}

function addSession(task, duration) {
  totalSessions++;
  let session = sessions.find((s) => s.task === task);
  if (session) {
    session.duration += duration;
    session.count += 1;
  } else {
    sessions.push({ task, duration, count: 1 });
  }
  updateStats();
}

function updateStats() {
  const statsDiv = document.getElementById('stats');
  statsDiv.innerHTML = `<h2>Session Stats</h2><p>Total Sessions: ${totalSessions}</p>`;
  sessions.forEach((session) => {
    statsDiv.innerHTML += `<p>Task: ${session.task} | Total Time: ${session.duration} mins | Count: ${session.count}</p>`;
  });

  // Visualization using D3.js
  visualizeData();
}

function saveData() {
  ipcRenderer.send('save-data', sessions);
  alert('Data saved successfully.');
}

function visualizeData() {
  const svg = d3.select('body').selectAll('svg').data([null]);
  svg.enter().append('svg').attr('width', 600).attr('height', 400);

  const data = sessions.map((s) => ({ task: s.task, duration: s.duration }));
  const x = d3.scaleBand()
    .domain(data.map((d) => d.task))
    .range([0, 600])
    .padding(0.1);
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, (d) => d.duration)])
    .range([400, 0]);

  const bars = svg.selectAll('.bar').data(data);

  bars.enter()
    .append('rect')
    .attr('class', 'bar')
    .attr('x', (d) => x(d.task))
    .attr('y', (d) => y(d.duration))
    .attr('width', x.bandwidth())
    .attr('height', (d) => 400 - y(d.duration))
    .attr('fill', 'steelblue');

  bars.exit().remove();
}

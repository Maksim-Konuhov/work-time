const STORAGE_KEY = 'work-tracker-v1';

const defaultEntries = [
  { id: crypto.randomUUID(), date: '2026-09-01', hours: 8, rate: 450, note: 'Обычная смена' },
  { id: crypto.randomUUID(), date: '2026-09-03', hours: 7.5, rate: 450, note: 'Сокращённый день' },
  { id: crypto.randomUUID(), date: '2026-09-06', hours: 9, rate: 500, note: 'Ночная смена' },
  { id: crypto.randomUUID(), date: '2026-09-09', hours: 8, rate: 450, note: 'Смена по графику' }
];

const elements = {
  hourRateInput: document.querySelector('#hourRateInput'),
  lunchBreakInput: document.querySelector('#lunchBreakInput'),
  dateInput: document.querySelector('#dateInput'),
  startTimeInput: document.querySelector('#startTimeInput'),
  endTimeInput: document.querySelector('#endTimeInput'),
  shiftRateInput: document.querySelector('#shiftRateInput'),
  noteInput: document.querySelector('#noteInput'),
  totalHours: document.querySelector('#totalHours'),
  totalShifts: document.querySelector('#totalShifts'),
  totalEarned: document.querySelector('#totalEarned'),
  averageShift: document.querySelector('#averageShift'),
  chart: document.querySelector('#chart'),
  calendar: document.querySelector('#calendar'),
  calendarMonthLabel: document.querySelector('#calendarMonthLabel'),
  previousMonthBtn: document.querySelector('#previousMonthBtn'),
  nextMonthBtn: document.querySelector('#nextMonthBtn'),
  entriesTableBody: document.querySelector('#entriesTableBody'),
  shiftForm: document.querySelector('#shiftForm'),
  menuToggle: document.querySelector('#menuToggle'),
  backToHomeBtn: document.querySelector('#backToHomeBtn'),
  resetDataBtn: document.querySelector('#resetDataBtn'),
  useExampleBtn: document.querySelector('#useExampleBtn')
};

let state = loadState();
let calendarDate = new Date();
const viewMode = new URLSearchParams(window.location.search).get('view');

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    return JSON.parse(saved);
  }

  return {
    hourRate: 450,
    lunchBreak: false,
    entries: defaultEntries
  };
}

function saveState() {
  const payload = {
    hourRate: Number(elements.hourRateInput.value) || 0,
    lunchBreak: elements.lunchBreakInput.checked,
    entries: state.entries
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function formatCurrency(value) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0
  }).format(value);
}

function getEntriesSorted() {
  return [...state.entries].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function calculateTotalHours() {
  return getEntriesSorted().reduce((sum, item) => sum + Number(item.hours || 0), 0);
}

function calculateTotalEarned() {
  return getEntriesSorted().reduce((sum, item) => {
    const rate = Number(item.rate || state.hourRate || 0);
    return sum + Number(item.hours || 0) * rate;
  }, 0);
}

function renderSummary() {
  const entries = getEntriesSorted();
  const totalHours = calculateTotalHours();
  const totalEarned = calculateTotalEarned();
  const averageShift = entries.length ? totalHours / entries.length : 0;

  elements.totalHours.textContent = `${totalHours.toFixed(1)} ч`;
  elements.totalShifts.textContent = `${entries.length}`;
  elements.totalEarned.textContent = formatCurrency(totalEarned);
  elements.averageShift.textContent = `${averageShift.toFixed(1)} ч`;
}

function renderChart() {
  const entries = getEntriesSorted();

  if (!entries.length) {
    elements.chart.innerHTML = '<div class="empty-state">Нет данных о сменах</div>';
    return;
  }

  const maxHours = Math.max(...entries.map((entry) => Number(entry.hours || 0)), 1);

  elements.chart.innerHTML = entries
    .map((entry) => {
      const height = (Number(entry.hours || 0) / maxHours) * 100;
      const label = new Date(`${entry.date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
      return `
        <div class="bar-group" title="${label}: ${entry.hours} ч">
          <div class="bar" style="height: ${Math.max(height, 14)}%"></div>
          <span class="bar-label">${label}</span>
        </div>
      `;
    })
    .join('');
}

function renderTable() {
  const entries = getEntriesSorted();

  if (!entries.length) {
    elements.entriesTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-state">Пока нет ни одной смены</td>
      </tr>
    `;
    return;
  }

  elements.entriesTableBody.innerHTML = entries
    .map((entry) => {
      const money = Number(entry.hours || 0) * Number(entry.rate || state.hourRate || 0);
      const date = new Date(`${entry.date}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

      return `
        <tr>
          <td>${date}</td>
          <td>${Number(entry.hours || 0).toFixed(1)} ч</td>
          <td>${formatCurrency(Number(entry.rate || state.hourRate || 0))}</td>
          <td>${formatCurrency(money)}</td>
          <td><button class="delete-btn" data-id="${entry.id}" type="button">Удалить</button></td>
        </tr>
      `;
    })
    .join('');
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(calendarDate);
  elements.calendarMonthLabel.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const workedByDate = new Map();

  state.entries.forEach((entry) => {
    const entryDate = new Date(`${entry.date}T00:00:00`);
    if (entryDate.getFullYear() === year && entryDate.getMonth() === month) {
      const current = workedByDate.get(entry.date) || { hours: 0, shifts: 0 };
      current.hours += Number(entry.hours || 0);
      current.shifts += 1;
      workedByDate.set(entry.date, current);
    }
  });

  const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const cells = weekdayLabels.map((day) => `<div class="calendar-weekday">${day}</div>`);

  for (let index = 0; index < mondayFirstOffset; index += 1) {
    cells.push('<div class="calendar-cell calendar-empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const worked = workedByDate.get(dateKey);
    const status = worked
      ? `<span class="calendar-status worked-status">Работал</span><span class="calendar-hours">${worked.hours.toFixed(1)} ч · ${worked.shifts} ${worked.shifts === 1 ? 'смена' : 'смены'}</span>`
      : '<span class="calendar-status day-off-status">Выходной</span>';

    cells.push(`
      <div class="calendar-cell ${worked ? 'is-worked' : 'is-day-off'}">
        <strong class="calendar-day">${day}</strong>
        ${status}
      </div>
    `);
  }

  elements.calendar.innerHTML = cells.join('');
}

function syncInputsFromState() {
  elements.hourRateInput.value = String(state.hourRate || 450);
  elements.lunchBreakInput.checked = Boolean(state.lunchBreak);
  elements.shiftRateInput.value = String(state.hourRate || 450);
  const today = new Date().toISOString().slice(0, 10);
  elements.dateInput.value = today;
}

function parseTimeInput(value) {
  const normalized = value.trim().replace('.', ':');
  let hours;
  let minutes;

  if (/^\d{3,4}$/.test(normalized)) {
    hours = Number(normalized.slice(0, -2));
    minutes = Number(normalized.slice(-2));
  } else {
    const match = normalized.match(/^(\d{1,2})(?::(\d{1,2})?)?$/);
    if (!match) return null;
    hours = Number(match[1]);
    minutes = Number(match[2] || 0);
  }

  if (hours > 23 || minutes > 59) return null;

  return {
    hours,
    minutes,
    value: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  };
}

function formatTimeInput(input) {
  const digits = input.value.replace(/\D/g, '').slice(0, 4);
  input.value = digits.length >= 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}

function normalizeInvalidTimeInput(input) {
  const digits = input.value.replace(/\D/g, '');
  if (digits.length < 2) return;

  const hours = Number(digits.slice(0, 2));
  if (hours > 23) {
    input.value = `${digits.charAt(0)}:00`;
  }
}

function calculateShiftHours(startTime, endTime) {
  const start = parseTimeInput(startTime);
  const end = parseTimeInput(endTime);
  if (!start || !end) return 0;

  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;
  let duration = endMinutes - startMinutes;

  if (duration < 0) {
    duration += 24 * 60;
  }

  return duration / 60;
}

function addEntry(event) {
  event.preventDefault();

  const date = elements.dateInput.value;
  const start = parseTimeInput(elements.startTimeInput.value);
  const end = parseTimeInput(elements.endTimeInput.value);
  const startTime = start?.value || '';
  const endTime = end?.value || '';
  const hours = calculateShiftHours(startTime, endTime);
  const paidHours = Math.max(0, hours - (elements.lunchBreakInput.checked ? 0.5 : 0));
  const rate = Number(elements.shiftRateInput.value || elements.hourRateInput.value || 0);
  const note = elements.noteInput.value.trim();

  if (!date || !start || !end || !paidHours || paidHours <= 0 || startTime === endTime) {
    alert('Введите время от 00:00 до 23:59. Например: 16:00 или 04:00');
    return;
  }

  state.entries.push({
    id: crypto.randomUUID(),
    date,
    hours: paidHours,
    startTime,
    endTime,
    rate,
    note
  });

  elements.noteInput.value = '';
  elements.startTimeInput.value = '09:00';
  elements.endTimeInput.value = '17:00';
  elements.shiftRateInput.value = elements.hourRateInput.value;

  saveState();
  renderAll();
}

function removeEntry(id) {
  state.entries = state.entries.filter((entry) => entry.id !== id);
  saveState();
  renderAll();
}

function resetData() {
  const shouldReset = window.confirm('Сбросить все данные и вернуть пример?');
  if (!shouldReset) return;

  state = {
    hourRate: 450,
    lunchBreak: false,
    entries: defaultEntries.map((item) => ({ ...item, id: crypto.randomUUID() }))
  };

  saveState();
  renderAll();
}

function setExampleData() {
  state = {
    hourRate: 450,
    lunchBreak: false,
    entries: [
      { id: crypto.randomUUID(), date: '2026-09-10', hours: 8, rate: 450, note: 'Рабочий день' },
      { id: crypto.randomUUID(), date: '2026-09-11', hours: 7.5, rate: 450, note: 'Сменный график' },
      { id: crypto.randomUUID(), date: '2026-09-12', hours: 9, rate: 500, note: 'Ночная смена' },
      { id: crypto.randomUUID(), date: '2026-09-13', hours: 8, rate: 450, note: 'Режим без переработки' },
      { id: crypto.randomUUID(), date: '2026-09-14', hours: 10, rate: 500, note: 'Переработка' }
    ]
  };

  saveState();
  renderAll();
}

function updateConfig() {
  state.hourRate = Number(elements.hourRateInput.value) || 0;
  state.lunchBreak = elements.lunchBreakInput.checked;
  elements.shiftRateInput.value = String(state.hourRate || 0);
  saveState();
  renderAll();
}

function bindEvents() {
  elements.shiftForm.addEventListener('submit', addEntry);
  [elements.startTimeInput, elements.endTimeInput].forEach((input) => {
    input.addEventListener('input', () => formatTimeInput(input));
    input.addEventListener('blur', () => {
      normalizeInvalidTimeInput(input);
      const parsed = parseTimeInput(input.value);
      if (parsed) input.value = parsed.value;
    });
  });
  elements.resetDataBtn.addEventListener('click', resetData);
  elements.useExampleBtn.addEventListener('click', setExampleData);
  elements.menuToggle.addEventListener('click', () => {
    const isOpen = document.body.classList.toggle('menu-open');
    elements.menuToggle.setAttribute('aria-expanded', String(isOpen));
  });
  elements.backToHomeBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });
  elements.previousMonthBtn.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
    renderCalendar();
  });
  elements.nextMonthBtn.addEventListener('click', () => {
    calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
    renderCalendar();
  });
  elements.entriesTableBody.addEventListener('click', (event) => {
    const button = event.target.closest('.delete-btn');
    if (!button) return;
    removeEntry(button.dataset.id);
  });
  elements.hourRateInput.addEventListener('input', updateConfig);
  elements.lunchBreakInput.addEventListener('change', updateConfig);
}

function renderAll() {
  renderSummary();
  renderChart();
  renderCalendar();
  renderTable();
}

function init() {
  if (viewMode === 'report') {
    document.body.classList.add('view-report');
  }
  syncInputsFromState();
  bindEvents();
  renderAll();
}

init();

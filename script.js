'use strict';

// prettier-ignore
// const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const STORAGE_KEY = 'workouts';
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  marker = null; // will stoe leafnet marker later
  constructor(coords, distance, duration) {
    // this.date=...
    // this.id = ...
    this.coords = coords;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();

    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();

    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this;
  }
}

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const deleteWorkout = document.querySelector('.delete__workout');
const editWorkout = document.querySelector('.edit__workout');
const resetBtn = document.querySelector('.btn--reset');
class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];
  #editingWorkout;

  constructor() {
    // get user's position
    this._getPosition();

    // get data from local storage
    this._getLocalStorage();

    // event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('delete__workout'))
        this._deleteWorkout(e);
    });
    containerWorkouts.addEventListener('click', e => {
      if (e.target.classList.contains('edit__workout')) this._editWorkout(e);
    });
    resetBtn.addEventListener('click', this._reset.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('could not get your position');
        }
      );
    }
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@4${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    if (mapE) this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _validation() {
    const html = `<div class="validation-popup">
    <p>Please enter positive numbers only!</p>
  </div>`;
    form.insertAdjacentHTML('afterend', html);
  }

  _newWorkout(e) {
    e.preventDefault();
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    // get data from form

    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;

    // editing mode
    if (this.#editingWorkout) {
      this.#editingWorkout.distance = distance;
      this.#editingWorkout.duration = duration;
      if (this.#editingWorkout.type === 'running') {
        const cadence = +inputCadence.value;
        if (
          !validInputs(distance, duration, cadence) ||
          !allPositive(distance, duration, cadence)
        )
          return this._validation();
        this.#editingWorkout.cadence = cadence;
        this.#editingWorkout.calcPace();
      }

      if (this.#editingWorkout.type === 'cycling') {
        const elevation = +inputElevation.value;
        if (
          !validInputs(distance, duration, elevation) ||
          !allPositive(distance, duration)
        )
          return this._validation();
        this.#editingWorkout.elevationGain = elevation;
        this.#editingWorkout.calcSpeed();
      }
      // update despription and popup
      this.#editingWorkout._setDescription();

      if (this.#editingWorkout.marker) {
        this.#editingWorkout.marker.setPopupContent(
          `${this.#editingWorkout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${
            this.#editingWorkout.description
          }`
        );
      }
      this._setLocalStorage();
      this.#editingWorkout = null;
      location.reload();
      return;
    }
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    // check if data is valid

    // if activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // check if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return this._validation();

      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if cycling create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return this._validation();

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    // add new obj to workout arr
    this.#workouts.push(workout);
    // render workout  on map as market

    this._renderWorkoutMarker(workout);
    // render workout on list
    this._renderWorkout(workout);
    // hide from + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();
    // display marker

    resetBtn.classList.remove('hidden');
  }

  _renderWorkoutMarker(workout) {
    const marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
    workout.marker = marker;
  }
  // ${workout.type} on Date.month Date.day?
  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">

          <h2 class="workout__title">${
            workout.description
          }<button class="btn edit__workout">✏️</button></h2>
          
          <button class="btn delete__workout">✕</button>
          
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
          `;

    if (workout.type === 'running')
      html += `<div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>`;

    if (workout.type === 'cycling')
      html += ` <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>`;
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    const workoutsToStore = this.#workouts.map(({ marker, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workoutsToStore));
  }
  // _getLocalStorage() {
  //   const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
  //   if (!data) return;

  //   this.#workouts = data;

  //   this.#workouts.forEach(work => {
  //     this._renderWorkout(work);
  //   });
  // }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;

    this.#workouts = data.map(obj => {
      let inst;
      if (obj.type === 'running') {
        // create a proper Running instance (constructor will set pace/description)
        inst = new Running(obj.coords, obj.distance, obj.duration, obj.cadence);
      } else if (obj.type === 'cycling') {
        inst = new Cycling(
          obj.coords,
          obj.distance,
          obj.duration,
          obj.elevationGain
        );
      } else {
        inst = new Workout(obj.coords, obj.distance, obj.duration);
      }

      // restore saved meta (id, date) and recalc description with the original date
      inst.id = obj.id;
      inst.date = new Date(obj.date);
      if (inst.type === 'running') inst.calcPace();
      if (inst.type === 'cycling') inst.calcSpeed();
      inst._setDescription();

      return inst;
    });

    // render list (and markers will be added when map loads)
    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _deleteWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const id = workoutEl.dataset.id;
    const workout = this.#workouts.find(w => w.id === id);

    if (workout && workout.marker) {
      this.#map.removeLayer(workout.marker); // removes marker + popup
    }

    this.#workouts = this.#workouts.filter(w => w.id !== id);
    workoutEl.remove();
    this._setLocalStorage();
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest('.workout');
    workoutEl.classList.add('hidden');
    console.log(workoutEl);
    const workoutId = e.target.closest('.workout').dataset.id;
    console.log(workoutId);
    const [workout] = this.#workouts.filter(w => w.id === workoutId);
    console.log(workout);
    this._showForm();
    this.#editingWorkout = workout;
    // populate the form fields with the existing workout data
    inputType.value = workout.type;
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    inputCadence.value = workout.cadence || '';
    inputElevation.value = workout.elevationGain || '';
    // form.addEventListener('submit', this._newWorkout.bind(this));
  }

  _reset() {
    // localStorage.removeItem('workout');
    // location.reload();
    if (this.#workouts.length === 0) return;
    const confirmReset = confirm(
      'Are you sure you want to reset? This action cannot be undone.'
    );
    if (confirmReset) {
      this.#workouts = [];
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }

    resetBtn.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const app = new App();
});

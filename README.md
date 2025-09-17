# mapty

Mapty is a workout-tracking web app built with JavaScript, Leaflet, and localStorage.
This is my extended version of Jonas Schmedtmann's project from The complete JavaScript Course 2025.
I rebuilt and expanded it to practice OOP, DOM manipulation, async js and APIs.

Features

Core (from course)

- add running and cycling workouts by clicking on the map
- input distance, duration, cadence(running), or elevation(cycling)
- data persisted with localStorage

Adding:

- Edit/delete single workout
- delete all workouts at once
- Restore objects from localStorage (not just plain JSON)
- Custom error + confirmation messages
- Fit map to show workouts (bounds zooming with Leaflet)
- Reverse geocoding (fetch city/street names)

Tech Stack

- Vanilla JavaScript (ES6+)
- Leaflet.js for map rendering
- LocalStorage API for persistence
- OpenWeather API for weather data
- OpenCage API for reverse geocoding

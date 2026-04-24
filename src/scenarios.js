// Scenario data models + seed library.
// A scenario describes: map layout, ego start/goal, actors w/ waypoints, objects, triggers.
// All units SI: meters, seconds, m/s.

export const ACTOR_KINDS = {
  vehicle: { label: "Vehicle", color: "#e7edf3", size: [2.0, 1.6, 4.5] },
  pedestrian: { label: "Pedestrian", color: "#f2d17a", size: [0.6, 1.8, 0.4] },
  cyclist: { label: "Cyclist", color: "#7adfc9", size: [0.7, 1.7, 1.8] },
  animal: { label: "Animal", color: "#c58a6a", size: [0.6, 0.9, 1.1] },
  cone: { label: "Cone", color: "#ff8a3d", size: [0.4, 0.6, 0.4], static: true },
  barrier: { label: "Barrier", color: "#ffd24d", size: [2.4, 0.8, 0.4], static: true },
  building: { label: "Building", color: "#2a3446", size: [10, 8, 10], static: true },
  sign: { label: "Sign", color: "#e7edf3", size: [0.3, 2.5, 0.3], static: true },
};

// Maps: simple layouts made of road segments (centerlines + widths).
// A segment: { a: [x,z], b: [x,z], lanes: 2, width: 7.0 }
export const MAPS = {
  intersection_4way: {
    id: "intersection_4way",
    name: "4-way signalized intersection",
    size: 160,
    segments: [
      { a: [-80, 0], b: [80, 0], width: 8, lanes: 2 },
      { a: [0, -80], b: [0, 80], width: 8, lanes: 2 },
    ],
    crosswalks: [
      { x: -6, z: 0, w: 1.2, l: 8, axis: "z" },
      { x: 6, z: 0, w: 1.2, l: 8, axis: "z" },
      { x: 0, z: -6, w: 8, l: 1.2, axis: "x" },
      { x: 0, z: 6, w: 8, l: 1.2, axis: "x" },
    ],
    lights: [
      { x: 6, z: -6, facing: "W" },
      { x: -6, z: 6, facing: "E" },
      { x: 6, z: 6, facing: "N" },
      { x: -6, z: -6, facing: "S" },
    ],
  },
  straight_road: {
    id: "straight_road",
    name: "Straight urban road",
    size: 180,
    segments: [{ a: [-90, 0], b: [90, 0], width: 8, lanes: 2 }],
    crosswalks: [{ x: 0, z: 0, w: 1.2, l: 8, axis: "z" }],
    lights: [],
  },
};

// Waypoint helpers
const line = (from, to, speed) => ({ from, to, speed });

// Scenarios
export const SCENARIOS = [
  {
    id: "SC-042-intersection-cross",
    name: "Intersection · crossing traffic",
    category: "Intersection",
    difficulty: "Hard",
    duration: 28,
    map: "intersection_4way",
    seed: 42,
    weather: "Clear",
    timeOfDay: "15:20",
    trafficDensity: 0.6,
    egoProfile: "Cautious",
    description:
      "Ego approaches from south, must yield to east-bound vehicle entering from right, then proceed through.",
    thumbnail: "intersection",
    ego: {
      start: [0, -70],
      goal: [0, 70],
      speedLimit: 13.9, // ~50 km/h
      waypoints: [
        { at: [0, -70], v: 12.0 },
        { at: [0, -20], v: 8.0 },
        { at: [0, -8], v: 0.0 }, // yield line
        { at: [0, -8], v: 0.0, hold: 3.2 },
        { at: [0, 8], v: 6.0 },
        { at: [0, 30], v: 11.0 },
        { at: [0, 70], v: 11.0 },
      ],
    },
    actors: [
      {
        id: "NPC-01",
        kind: "vehicle",
        color: "#e0c87a",
        start: [-70, -4],
        waypoints: [
          { at: [-70, -4], v: 12 },
          { at: [-6, -4], v: 12 },
          { at: [30, -4], v: 13 },
          { at: [80, -4], v: 13 },
        ],
      },
      {
        id: "NPC-02",
        kind: "vehicle",
        color: "#7aa7e0",
        start: [70, 4],
        waypoints: [
          { at: [70, 4], v: 10 },
          { at: [10, 4], v: 10 },
          { at: [-40, 4], v: 11 },
          { at: [-80, 4], v: 11 },
        ],
      },
      {
        id: "PED-01",
        kind: "pedestrian",
        start: [8, -8],
        waypoints: [
          { at: [8, -8], v: 1.3 },
          { at: [8, 8], v: 1.3 },
        ],
      },
    ],
    statics: [
      { kind: "building", at: [-28, -28], size: [22, 10, 22] },
      { kind: "building", at: [28, -28], size: [22, 14, 22] },
      { kind: "building", at: [-28, 28], size: [22, 12, 22] },
      { kind: "building", at: [28, 28], size: [22, 16, 22] },
      { kind: "sign", at: [3, -10] },
    ],
    expected: "pass",
  },
  {
    id: "SC-017-ped-crossing",
    name: "Pedestrian crossing",
    category: "Vulnerable road users",
    difficulty: "Medium",
    duration: 18,
    map: "straight_road",
    seed: 17,
    weather: "Overcast",
    timeOfDay: "09:05",
    trafficDensity: 0.2,
    egoProfile: "Balanced",
    description:
      "Pedestrian enters crosswalk from right as ego approaches. Ego must detect and stop.",
    thumbnail: "pedestrian",
    ego: {
      start: [-70, 0],
      goal: [70, 0],
      speedLimit: 11.1,
      waypoints: [
        { at: [-70, 0], v: 10 },
        { at: [-20, 0], v: 9 },
        { at: [-8, 0], v: 0 },
        { at: [-8, 0], v: 0, hold: 2.6 },
        { at: [10, 0], v: 5 },
        { at: [70, 0], v: 10 },
      ],
    },
    actors: [
      {
        id: "PED-01",
        kind: "pedestrian",
        start: [0, 10],
        waypoints: [
          { at: [0, 10], v: 1.4 },
          { at: [0, -10], v: 1.4 },
        ],
      },
    ],
    statics: [
      { kind: "building", at: [-30, -22], size: [24, 10, 14] },
      { kind: "building", at: [30, -22], size: [22, 8, 14] },
      { kind: "building", at: [-30, 22], size: [26, 12, 14] },
    ],
    expected: "pass",
  },
  {
    id: "SC-031-construction",
    name: "Construction zone",
    category: "Static hazard",
    difficulty: "Medium",
    duration: 22,
    map: "straight_road",
    seed: 31,
    weather: "Clear",
    timeOfDay: "13:40",
    trafficDensity: 0.1,
    egoProfile: "Cautious",
    description: "Right lane closed with cones. Ego must merge left and pass.",
    thumbnail: "construction",
    ego: {
      start: [-80, 2],
      goal: [80, 2],
      speedLimit: 8.3,
      waypoints: [
        { at: [-80, 2], v: 9 },
        { at: [-30, 2], v: 7 },
        { at: [-10, -2], v: 5 },
        { at: [20, -2], v: 6 },
        { at: [40, 2], v: 8 },
        { at: [80, 2], v: 9 },
      ],
    },
    actors: [],
    statics: [
      { kind: "cone", at: [-20, 2] },
      { kind: "cone", at: [-12, 2] },
      { kind: "cone", at: [-4, 2] },
      { kind: "cone", at: [4, 2] },
      { kind: "cone", at: [12, 2] },
      { kind: "cone", at: [20, 2] },
      { kind: "barrier", at: [0, 4] },
      { kind: "barrier", at: [8, 4] },
      { kind: "building", at: [-30, -18], size: [18, 10, 12] },
      { kind: "building", at: [30, 18], size: [22, 12, 14] },
    ],
    expected: "pass",
  },
  {
    id: "SC-056-diversion",
    name: "Unavoidable diversion",
    category: "Road blockage",
    difficulty: "Hard",
    duration: 24,
    map: "straight_road",
    seed: 56,
    weather: "Rain",
    timeOfDay: "18:15",
    trafficDensity: 0.3,
    egoProfile: "Cautious",
    description:
      "Road fully blocked by barriers. Ego must detect, stop, and wait for re-route.",
    thumbnail: "diversion",
    ego: {
      start: [-80, 0],
      goal: [80, 0],
      speedLimit: 11.1,
      waypoints: [
        { at: [-80, 0], v: 10 },
        { at: [-20, 0], v: 7 },
        { at: [-6, 0], v: 0 },
        { at: [-6, 0], v: 0, hold: 6 },
      ],
    },
    actors: [],
    statics: [
      { kind: "barrier", at: [0, -2] },
      { kind: "barrier", at: [0, 2] },
      { kind: "cone", at: [-6, -3] },
      { kind: "cone", at: [-6, 0] },
      { kind: "cone", at: [-6, 3] },
      { kind: "sign", at: [-14, -4] },
      { kind: "building", at: [-30, -18], size: [22, 10, 12] },
      { kind: "building", at: [30, 18], size: [24, 14, 14] },
    ],
    expected: "pass",
  },
];

export const getScenario = (id) => SCENARIOS.find((s) => s.id === id);

/* core/sensors.js — register van alle sensoren (volgorde = volgorde in UI en lus)
   Een sensor-module mag core/ui, camera, layout, experiments en loop NIET importeren (cyclus bij het laden). */
import lidar from '../sensors/lidar/index.js';
import radar from '../sensors/radar/index.js';
export const SENSORS=[lidar,radar];
export const SMAP=Object.fromEntries(SENSORS.map(s=>[s.id,s]));

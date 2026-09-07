import { PENGHU_MAIN, TAIWAN_MAIN } from "../world/coast-data.js";

const kilometersPerLatitudeDegree = 110.574;
const kilometersPerLongitudeDegreeAtEquator = 111.32;

const element = (selector) => document.querySelector(selector);

export function createInstrumentPanels() {
  const drawer = element("#instrument-drawer");
  const triggers = [...document.querySelectorAll("[data-panel-trigger]")];
  const panels = [...document.querySelectorAll("[data-instrument-panel]")];
  const rangeButtons = [...document.querySelectorAll("[data-chart-range]")];
  const chart = element("#gps-chart");
  const context = chart.getContext("2d");
  let activePanel = null;
  let chartRangeKilometers = 100;
  let latest = null;

  const fields = {
    gpsPosition: element("#gps-position"),
    gpsCourse: element("#gps-course"),
    gpsScale: element("#gps-scale"),
    engineModel: element("#engine-model"),
    rpm: element("#engine-detail-rpm"),
    condition: element("#engine-condition"),
    load: element("#engine-load"),
    loadBar: element("#engine-load-bar"),
    temperature: element("#engine-temperature"),
    oilPressure: element("#engine-oil-pressure"),
    voltage: element("#engine-voltage"),
    fuelFlow: element("#engine-fuel-flow"),
    gear: element("#engine-gear"),
  };

  function setPanel(name) {
    activePanel = activePanel === name ? null : name;
    const open = activePanel !== null;
    drawer.classList.toggle("open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    document.querySelector("#game").classList.toggle("instrument-open", open);
    triggers.forEach((trigger) => {
      const selected = trigger.dataset.panelTrigger === activePanel;
      trigger.classList.toggle("selected", selected);
      trigger.setAttribute("aria-expanded", String(selected));
    });
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.instrumentPanel !== activePanel;
    });
    if (activePanel === "gps" && latest) requestAnimationFrame(() => drawChart(latest));
  }

  function mapPoint(longitude, latitude, width, height, data) {
    const padding = 13;
    const pixelsPerKilometer = (height - padding * 2) / (chartRangeKilometers * 2);
    const longitudeScale = kilometersPerLongitudeDegreeAtEquator
      * Math.cos(data.latitude * Math.PI / 180);
    return {
      x: width * 0.5 + (longitude - data.longitude) * longitudeScale * pixelsPerKilometer,
      y: height * 0.5
        - (latitude - data.latitude) * kilometersPerLatitudeDegree * pixelsPerKilometer,
      scale: pixelsPerKilometer,
    };
  }

  function drawGrid(width, height) {
    context.strokeStyle = "rgba(145, 205, 216, 0.16)";
    context.lineWidth = 1;
    for (let division = 1; division < 4; division += 1) {
      const x = width * division / 4;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
      const y = height * division / 4;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
  }

  function drawLand(coordinates, width, height, data) {
    context.beginPath();
    coordinates.forEach(([longitude, latitude], index) => {
      const point = mapPoint(longitude, latitude, width, height, data);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.fillStyle = "#4f795d";
    context.strokeStyle = "#d8c77d";
    context.lineWidth = 1.4;
    context.fill();
    context.stroke();
  }

  function drawVessel(data, width, height) {
    const point = mapPoint(data.longitude, data.latitude, width, height, data);
    const heading = data.heading * Math.PI / 180;
    const lineLength = 24;
    context.strokeStyle = "rgba(255, 190, 60, 0.76)";
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(
      point.x + Math.sin(heading) * lineLength,
      point.y - Math.cos(heading) * lineLength,
    );
    context.stroke();

    context.save();
    context.translate(point.x, point.y);
    context.rotate(heading);
    context.beginPath();
    context.moveTo(0, -7);
    context.lineTo(5.5, 6);
    context.lineTo(0, 3.5);
    context.lineTo(-5.5, 6);
    context.closePath();
    context.fillStyle = "#fff5d4";
    context.strokeStyle = "#f2a900";
    context.lineWidth = 2;
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawChart(data) {
    const rect = chart.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    chart.width = Math.round(width * pixelRatio);
    chart.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.fillStyle = "#073949";
    context.fillRect(0, 0, width, height);
    drawGrid(width, height);
    drawLand(TAIWAN_MAIN, width, height, data);
    drawLand(PENGHU_MAIN, width, height, data);
    drawVessel(data, width, height);
  }

  function update(data) {
    latest = data;
    fields.gpsPosition.textContent = `${data.latitude.toFixed(4)}°N ${data.longitude.toFixed(4)}°E`;
    fields.gpsCourse.textContent = `${data.heading}°`;
    fields.gpsScale.textContent = data.navigationMultiplier < 1.05
      ? "近岸 ×1"
      : `巡航 ×${data.navigationMultiplier.toFixed(1)}`;
    const engineNames = {
      classic: "小艇汽油機",
      cargo: "小貨船柴油機",
      yacht: "豪華遊艇雙柴油機",
    };
    fields.engineModel.textContent = engineNames[data.model] || "船舶引擎";
    fields.rpm.textContent = data.engine.rpm.toLocaleString("en-US");
    fields.condition.textContent = data.engine.condition;
    fields.condition.classList.toggle("warning", data.engine.condition !== "正常");
    fields.load.textContent = String(Math.round(data.engine.loadPercent));
    fields.loadBar.style.width = `${data.engine.loadPercent}%`;
    fields.temperature.textContent = data.engine.temperatureCelsius.toFixed(0);
    fields.oilPressure.textContent = data.engine.oilPressureBar.toFixed(1);
    fields.voltage.textContent = data.engine.voltage.toFixed(1);
    fields.fuelFlow.textContent = data.engine.fuelFlowLitersPerHour.toFixed(1);
    fields.gear.textContent = data.gear;
    if (activePanel === "gps") drawChart(data);
  }

  triggers.forEach((trigger) => {
    trigger.addEventListener("click", () => setPanel(trigger.dataset.panelTrigger));
  });
  rangeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      chartRangeKilometers = Number(button.dataset.chartRange);
      rangeButtons.forEach((candidate) => {
        const selected = candidate === button;
        candidate.classList.toggle("selected", selected);
        candidate.setAttribute("aria-pressed", String(selected));
      });
      if (latest) drawChart(latest);
    });
  });
  document.querySelectorAll("[data-panel-close]").forEach((button) => {
    button.addEventListener("click", () => setPanel(activePanel));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activePanel) setPanel(activePanel);
  });
  window.addEventListener("resize", () => {
    if (activePanel === "gps" && latest) drawChart(latest);
  });

  return {
    update,
    get activePanel() { return activePanel; },
    get chartRangeKilometers() { return chartRangeKilometers; },
  };
}

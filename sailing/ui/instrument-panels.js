import { PENGHU_MAIN, TAIWAN_MAIN } from "../world/coast-data.js";

const mapBounds = {
  minLongitude: 119.42,
  maxLongitude: 122.08,
  minLatitude: 21.82,
  maxLatitude: 25.36,
};

const element = (selector) => document.querySelector(selector);

export function createInstrumentPanels() {
  const drawer = element("#instrument-drawer");
  const triggers = [...document.querySelectorAll("[data-panel-trigger]")];
  const panels = [...document.querySelectorAll("[data-instrument-panel]")];
  const chart = element("#gps-chart");
  const context = chart.getContext("2d");
  let activePanel = null;
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

  function mapPoint(longitude, latitude, width, height) {
    const padding = 13;
    const mapWidth = mapBounds.maxLongitude - mapBounds.minLongitude;
    const mapHeight = mapBounds.maxLatitude - mapBounds.minLatitude;
    const scale = Math.min((width - padding * 2) / mapWidth, (height - padding * 2) / mapHeight);
    const contentWidth = mapWidth * scale;
    const contentHeight = mapHeight * scale;
    const offsetX = (width - contentWidth) * 0.5;
    const offsetY = (height - contentHeight) * 0.5;
    return {
      x: offsetX + (longitude - mapBounds.minLongitude) * scale,
      y: offsetY + (mapBounds.maxLatitude - latitude) * scale,
      scale,
    };
  }

  function drawGrid(width, height) {
    context.strokeStyle = "rgba(145, 205, 216, 0.16)";
    context.lineWidth = 1;
    for (let longitude = 120; longitude <= 122; longitude += 1) {
      const top = mapPoint(longitude, mapBounds.maxLatitude, width, height);
      const bottom = mapPoint(longitude, mapBounds.minLatitude, width, height);
      context.beginPath();
      context.moveTo(top.x, top.y);
      context.lineTo(bottom.x, bottom.y);
      context.stroke();
    }
    for (let latitude = 22; latitude <= 25; latitude += 1) {
      const left = mapPoint(mapBounds.minLongitude, latitude, width, height);
      const right = mapPoint(mapBounds.maxLongitude, latitude, width, height);
      context.beginPath();
      context.moveTo(left.x, left.y);
      context.lineTo(right.x, right.y);
      context.stroke();
    }
  }

  function drawLand(coordinates, width, height) {
    context.beginPath();
    coordinates.forEach(([longitude, latitude], index) => {
      const point = mapPoint(longitude, latitude, width, height);
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
    const point = mapPoint(data.longitude, data.latitude, width, height);
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
    drawLand(TAIWAN_MAIN, width, height);
    drawLand(PENGHU_MAIN, width, height);
    drawVessel(data, width, height);
  }

  function update(data) {
    latest = data;
    fields.gpsPosition.textContent = `${data.latitude.toFixed(4)}°N ${data.longitude.toFixed(4)}°E`;
    fields.gpsCourse.textContent = `${data.heading}°`;
    fields.gpsScale.textContent = data.navigationMultiplier < 1.05
      ? "近岸 ×1"
      : `巡航 ×${data.navigationMultiplier.toFixed(1)}`;
    fields.engineModel.textContent = data.model === "cargo" ? "小貨船柴油機" : "小艇汽油機";
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
  };
}

/* global am4core */
/* global am4charts */
/* global am4maps */
/* global am4geodata_worldHigh */
/* global am4geodata_nigeriaHigh */

import { covid_nigeria_state_timeline } from "./data/StateTimeline";
import { covid_nigeria_total_timeline } from "./data/TotalTimeline";
import { ID_TO_STATE_MAP } from "./data/IdToStateMap";
import CovidIcon from "./images/covid-19.png";
import { capitalizeFirstLetter } from "./Utils";

let buttons;
let buttonsContainer;
let chart;
let container;
let chartAndSliderContainer;
let dateAxis;
let lineChart;
let playButton;
let slider;
let sliderAnimation;

let max = { confirmed: 0, recovered: 0, deaths: 0 };
let lineSeries;
let stateSeries;
let imageSeries;

const backgroundColor = am4core.color("#1e2128");
const activeColor = am4core.color("yellow");
const confirmedColor = am4core.color("#cc8400");
const recoveredColor = am4core.color("#45d21a");
const deathsColor = am4core.color("#d21a1a");
const buttonStrokeColor = am4core.color("#ffffff");

const earliestDate = new Date(covid_nigeria_state_timeline[0].date);
const lastDate = new Date(covid_nigeria_state_timeline[covid_nigeria_state_timeline.length - 1].date);
let currentDate = lastDate;
let currentIndex;
const colors = { active: activeColor, confirmed: confirmedColor, recovered: recoveredColor, deaths: deathsColor };

export const init = () => {
	container = am4core.create("chart", am4core.Container);
	container.width = am4core.percent(100);
	container.height = am4core.percent(80);
	chart = container.createChild(am4maps.MapChart);

	chart.height = am4core.percent(90);
	chart.projection = new am4maps.projections.Miller();
	chart.panBehavior = "move";

	chart.zoomControl = new am4maps.ZoomControl();
	chart.zoomControl.align = "right";
	chart.zoomControl.marginRight = 5;
	chart.zoomControl.valign = "middle";
	chart.zoomControl.slider.height = 100;

	prepareMapData();
	prepareMapLayout();
	setupButtonControlsAndStateLabels(container);
	createBottomLineGraph();
	setDataCategory("confirmed");

	setTimeout(updateSeriesTooltip, 3000);

	return chart;
}

const prepareMapData = () => {
	const total = { confirmed: 0, deaths: 0, recovered: 0 }
	covid_nigeria_total_timeline.forEach((entry) => {
		total.confirmed += entry.confirmed;
		total.deaths += entry.deaths
		total.recovered += entry.recovered
		entry.active = entry.confirmed - entry.recovered - entry.deaths
	});

	total.active = total.confirmed - total.recovered - total.deaths;


	let mapData = JSON.parse(JSON.stringify(getSlideData().list));
	for (let i = 0; i < mapData.length; i++) {
		let di = mapData[i];
		if (di.confirmed > max.confirmed) {
			max.confirmed = di.confirmed;
		}
		if (di.recovered > max.recovered) {
			max.recovered = di.recovered;
		}
		if (di.deaths > max.deaths) {
			max.deaths = di.deaths
		}
		max.active = max.confirmed;
	}
	prepareStateTimelineData();
}

const prepareStateTimelineData = () => {
	covid_nigeria_state_timeline.forEach((entry) => {
		const dataList = entry.list
		dataList.forEach((dataEntry) => {
			dataEntry.value = dataEntry.confirmed;
			dataEntry.name = ID_TO_STATE_MAP[dataEntry.id];
			dataEntry.active = dataEntry.confirmed - dataEntry.recovered - dataEntry.deaths
		});
	});
}

const prepareMapLayout = () => {
	//Polygon country series layout and data
	chart.geodata = am4geodata_worldHigh;
	let countrySeries = chart.series.push(new am4maps.MapPolygonSeries());
	countrySeries.include = ["NG"];
	countrySeries.useGeodata = true;

	let polygonTemplate = countrySeries.mapPolygons.template;
	polygonTemplate.tooltipText = "Bayelsa";
	polygonTemplate.fill = am4core.color("#757575");
	polygonTemplate.propertyFields.disabled = "disabled";

	// Polygon state series data
	stateSeries = chart.series.push(new am4maps.MapPolygonSeries());
	stateSeries.dataFields.value = "confirmed";
	stateSeries.dataFields.id = "id";
	stateSeries.calculateVisualCenter = true;
	stateSeries.geodata = am4geodata_nigeriaHigh;

	// Polygon state series layout
	let statePolygonTemplate = stateSeries.mapPolygons.template;
	polygonTemplate.setStateOnChildren = true;
	statePolygonTemplate.tooltipText = "[bold]{name}[/]\nConfirmed: {confirmed}\nActive: {active}\nRecovered: {recovered}\nDeaths: {deaths}";
	let hsState = statePolygonTemplate.states.create("hover");
	hsState.properties.fill = am4core.color("orange");

	//Add heatmap
	stateSeries.data = JSON.parse(JSON.stringify(getSlideData().list));
	stateSeries.heatRules.push({
		"property": "fill",
		"target": statePolygonTemplate,
		"min": am4core.color("#757575"), //3b3b3b
		"max": am4core.color("red"),
		"dataField": "value"
	});

	// Covid image series
	imageSeries = chart.series.push(new am4maps.MapImageSeries());
	imageSeries.data = JSON.parse(JSON.stringify(getSlideData().list));
	imageSeries.dataFields.value = "confirmed";
	imageSeries.dataFields.id = "id";

	// adjust tooltip
	imageSeries.tooltip.animationDuration = 0;
	imageSeries.tooltip.showInViewport = false;
	imageSeries.tooltip.getStrokeFromObject = true;
	imageSeries.tooltip.getFillFromObject = true;


	var imageTemplate = imageSeries.mapImages.template;
	// if you want bubbles to become bigger when zoomed, set this to false
	imageTemplate.nonScaling = true;

	let marker = imageTemplate.createChild(am4core.Image);
	marker.href = CovidIcon;
	marker.getBackgroundFromObject = true;
	marker.getFillFromObject = true;
	marker.tooltipText = "[bold]{name}[/]\nConfirmed: {confirmed}\nActive: {active}\nRecovered: {recovered}\nDeaths: {deaths}";
	marker.fillOpacity = 0.4;
	marker.horizontalCenter = "middle";
	marker.verticalCenter = "middle";
	marker.strokeOpacity = 0;

	marker.hiddenState.properties.scale = 0.0001;
	marker.hiddenState.transitionDuration = 2000;
	marker.defaultState.transitionDuration = 2000;
	marker.defaultState.transitionEasing = am4core.ease.elasticOut;

	imageSeries.heatRules.push({
		"target": marker,
		"property": "width",
		"min": 20,
		"max": 150,
		"dataField": "value"
	});

	// when data items validated, hide 0 value bubbles (because min size is set)
	imageSeries.events.on("dataitemsvalidated", function () {
		imageSeries.dataItems.each((dataItem) => {
			var mapImage = dataItem.mapImage;
			var image = mapImage.children.getIndex(0);
			if (mapImage.dataItem.value === 0) {
				image.hide(0);
			}
			else if (image.isHidden || image.isHiding) {
				image.show();
			}
		})
	});

	// this places bubbles at the visual center of a state
	imageTemplate.adapter.add("latitude", function (latitude, target) {
		var polygon = stateSeries.getPolygonById(target.dataItem.id);
		if (polygon) {
			target.disabled = false;
			return polygon.visualLatitude;
		}
		else {
			target.disabled = true;
		}
		return latitude;
	})

	imageTemplate.adapter.add("longitude", function (longitude, target) {
		var polygon = stateSeries.getPolygonById(target.dataItem.id);
		if (polygon) {
			target.disabled = false;
			return polygon.visualLongitude;
		}
		else {
			target.disabled = true;
		}
		return longitude;
	});
}


const getSlideData = (index) => {
	if (index === undefined) {
		index = covid_nigeria_state_timeline.length - 1;
	}

	return covid_nigeria_state_timeline[index];
}


const setupButtonControlsAndStateLabels = () => {
	const buttonsAndChartContainer = container.createChild(am4core.Container);
	buttonsAndChartContainer.layout = "vertical";
	buttonsAndChartContainer.height = am4core.percent(40);
	buttonsAndChartContainer.width = am4core.percent(100);
	buttonsAndChartContainer.valign = "bottom";

	// state name and buttons container
	const nameAndButtonsContainer = buttonsAndChartContainer.createChild(am4core.Container)
	nameAndButtonsContainer.width = am4core.percent(100);
	nameAndButtonsContainer.padding(0, 10, 5, 20);
	nameAndButtonsContainer.layout = "horizontal";

	// name of a state and date label
	const stateName = nameAndButtonsContainer.createChild(am4core.Label);
	stateName.fontSize = "1.1em";
	stateName.fill = am4core.color("#ffffff");
	stateName.valign = "middle";

	// buttons container (active/confirmed/recovered/deaths)
	buttonsContainer = nameAndButtonsContainer.createChild(am4core.Container);
	buttonsContainer.layout = "grid";
	buttonsContainer.width = am4core.percent(100);
	buttonsContainer.x = 10;
	buttonsContainer.contentAlign = "right";

	// Chart & slider container
	chartAndSliderContainer = buttonsAndChartContainer.createChild(am4core.Container);
	chartAndSliderContainer.layout = "vertical";
	chartAndSliderContainer.height = am4core.percent(100);
	chartAndSliderContainer.width = am4core.percent(100);
	chartAndSliderContainer.background = new am4core.RoundedRectangle();
	chartAndSliderContainer.background.fill = am4core.color("#000000");
	chartAndSliderContainer.background.cornerRadius(30, 30, 0, 0)
	chartAndSliderContainer.background.fillOpacity = 0.25;
	chartAndSliderContainer.paddingTop = 8;
	chartAndSliderContainer.paddingBottom = 0;

	const sliderContainer = chartAndSliderContainer.createChild(am4core.Container);
	sliderContainer.width = am4core.percent(100);
	sliderContainer.padding(0, 15, 15, 10);
	sliderContainer.layout = "horizontal";

	slider = sliderContainer.createChild(am4core.Slider);
	slider.width = am4core.percent(100);
	slider.valign = "middle";
	slider.background.opacity = 0.4;
	slider.opacity = 0.7;
	slider.background.fill = am4core.color("#ffffff");
	slider.marginLeft = 20;
	slider.marginRight = 35;
	slider.height = 15;
	slider.start = 1;

	setupSlideHandler(slider);

	playButton = sliderContainer.createChild(am4core.PlayButton);
	playButton.valign = "middle";
	playButton.events.on("toggled", function (event) {
		if (event.target.isActive) {
			play();
		} else {
			stop();
		}
	});

	// make slider grip look like play button
	slider.startGrip.background.fill = playButton.background.fill;
	slider.startGrip.background.strokeOpacity = 0;
	slider.startGrip.icon.stroke = am4core.color("#ffffff");
	slider.startGrip.background.states.copyFrom(playButton.background.states);
}


const setupSlideHandler = (slider) => {
	slider.events.on("rangechanged", () => {
		let index = Math.round((covid_nigeria_state_timeline.length - 1) * slider.start);
		updateMapData(getSlideData(index).list);
		updateTotals(index);
	})
	slider.startGrip.events.on("drag", () => {
		stop();
		if (sliderAnimation) {
			sliderAnimation.setProgress(slider.start);
		}
	});
}

const updateMapData = (data) => {
	//Update both heat map series and image series 
	imageSeries.dataItems.each((dataItem) => {
		dataItem.dataContext.confirmed = 0;
		dataItem.dataContext.deaths = 0;
		dataItem.dataContext.recovered = 0;
		dataItem.dataContext.active = 0;
	});
	stateSeries.dataItems.each((dataItem) => {
		dataItem.dataContext.confirmed = 0;
		dataItem.dataContext.deaths = 0;
		dataItem.dataContext.recovered = 0;
		dataItem.dataContext.active = 0;
	})


	for (var i = 0; i < data.length; i++) {
		var di = data[i];
		var image = imageSeries.getImageById(di.id);
		let polygon = stateSeries.getPolygonById(di.id);
		if (image) {
			image.dataItem.dataContext.confirmed = di.confirmed;
			image.dataItem.dataContext.deaths = di.deaths;
			image.dataItem.dataContext.recovered = di.recovered;
			image.dataItem.dataContext.active = di.confirmed - di.recovered - di.deaths;
		}
		if (polygon) {
			polygon.dataItem.dataContext.confirmed = di.confirmed;
			polygon.dataItem.dataContext.deaths = di.deaths;
			polygon.dataItem.dataContext.recovered = di.recovered;
			polygon.dataItem.dataContext.active = di.confirmed - di.recovered - di.deaths;
		}
	}

	imageSeries.invalidateRawData();
	stateSeries.invalidateRawData();
}

const updateTotals = (index) => {
	if (!isNaN(index)) {
		const di = covid_nigeria_total_timeline[index];
		const date = new Date(di.date);
		currentDate = date;

		let position = dateAxis.dateToPosition(date);
		position = dateAxis.toGlobalPosition(position);
		const x = dateAxis.positionToCoordinate(position);

		if (lineChart.cursor) {
			lineChart.cursor.triggerMove({ x: x, y: 0 }, "soft", true);
		}
		for (const key in buttons) {
			buttons[key].label.text = capitalizeFirstLetter(key) + ": " + lineChart.data[index][key];
		}
		currentIndex = index;
	}
}

const play = () => {
	if (!sliderAnimation) {
		sliderAnimation = slider.animate({ property: "start", to: 1, from: 0 }, 50000, am4core.ease.linear).pause();
		sliderAnimation.events.on("animationended", () => {
			playButton.isActive = false;
		})
	}

	if (slider.start >= 1) {
		slider.start = 0;
		sliderAnimation.start();
	}
	sliderAnimation.resume();
	playButton.isActive = true;
}

const stop = () => {
	if (sliderAnimation) {
		sliderAnimation.pause();
	}
	playButton.isActive = false;
}

const createBottomLineGraph = () => {
	lineChart = chartAndSliderContainer.createChild(am4charts.XYChart);
	lineChart.fontSize = "0.8em";
	lineChart.paddingRight = 30;
	lineChart.paddingLeft = 30;
	lineChart.maskBullets = false;
	lineChart.zoomOutButton.disabled = true;
	lineChart.paddingBottom = 5;
	lineChart.paddingTop = 3;
	lineChart.marginBottom = 12;

	lineChart.data = JSON.parse(JSON.stringify(covid_nigeria_total_timeline));

	dateAxis = lineChart.xAxes.push(new am4charts.DateAxis());
	dateAxis.renderer.minGridDistance = 50;
	dateAxis.renderer.grid.template.stroke = am4core.color("#000000");
	dateAxis.renderer.grid.template.strokeOpacity = 0.25;

	//dateAxis.min = earliestDate.getTime() + am4core.time.getDuration("day", 3);
	dateAxis.max = lastDate.getTime() + am4core.time.getDuration("day", 3);
	dateAxis.tooltip.label.fontSize = "0.8em";
	dateAxis.tooltip.background.fill = activeColor;
	dateAxis.tooltip.background.stroke = activeColor;
	dateAxis.renderer.labels.template.fill = am4core.color("#ffffff");

	const valueAxis = lineChart.yAxes.push(new am4charts.ValueAxis());
	valueAxis.interpolationDuration = 3000;
	valueAxis.renderer.grid.template.stroke = am4core.color("#000000");
	valueAxis.renderer.grid.template.strokeOpacity = 0.25;
	valueAxis.renderer.baseGrid.disabled = true;
	valueAxis.tooltip.disabled = true;
	valueAxis.extraMax = 0.05;
	valueAxis.maxPrecision = 0;
	valueAxis.renderer.inside = true;
	valueAxis.renderer.labels.template.verticalCenter = "bottom";
	valueAxis.renderer.labels.template.fill = am4core.color("#ffffff");
	valueAxis.renderer.labels.template.padding(2, 2, 2, 2);
	valueAxis.adapter.add("max", function (max) {
		if (max < 5) {
			max = 5
		}
		return max;
	})

	valueAxis.adapter.add("min", function (min) {
		if (min < 0) {
			min = 0;
		}
		return min;
	})

	lineChart.cursor = new am4charts.XYCursor();
	lineChart.cursor.behavior = "none"; // set zoomX for a zooming possibility
	lineChart.cursor.lineY.disabled = true;
	lineChart.cursor.lineX.stroke = activeColor;
	lineChart.cursor.xAxis = dateAxis;
	// this prevents cursor to move to the clicked location while map is dragged
	am4core.getInteraction().body.events.off("down", lineChart.cursor.handleCursorDown, lineChart.cursor)
	am4core.getInteraction().body.events.off("up", lineChart.cursor.handleCursorUp, lineChart.cursor)

	lineChart.legend = new am4charts.Legend();
	lineChart.legend.parent = lineChart.plotContainer;
	lineChart.legend.labels.template.fill = am4core.color("#ffffff");

	lineSeries = createLineSeries();

	lineChart.plotContainer.events.on("up", function () {
		slider.start = lineChart.cursor.xPosition * ((dateAxis.max - dateAxis.min) / (lastDate.getTime() - dateAxis.min));
	})


	// data warning label
	var label = lineChart.plotContainer.createChild(am4core.Label);
	label.text = "Accuracy of current day stats depends on NCDC reports.";
	label.fill = am4core.color("#ffffff");
	label.fontSize = "0.7em";
	label.opacity = 0.5;
	label.align = "right";
	label.horizontalCenter = "right";
	label.verticalCenter = "bottom";

	const confirmedButton = addButton("confirmed", confirmedColor);
	const activeButton = addButton("active", activeColor);
	const recoveredButton = addButton("recovered", recoveredColor);
	const deathsButton = addButton("deaths", deathsColor);

	buttons = { active: activeButton, confirmed: confirmedButton, recovered: recoveredButton, deaths: deathsButton };
}


const createLineSeries = () => {
	const activeSeries = addSeries("active", activeColor);
	activeSeries.tooltip.disabled = true;
	activeSeries.hidden = false;

	const confirmedSeries = addSeries("confirmed", confirmedColor);
	const recoveredSeries = addSeries("recovered", recoveredColor);
	const deathsSeries = addSeries("deaths", deathsColor);

	const series = { active: activeSeries, confirmed: confirmedSeries, recovered: recoveredSeries, deaths: deathsSeries };
	return series;
}


const addSeries = (name, color) => {
	const series = lineChart.series.push(new am4charts.LineSeries())
	series.dataFields.valueY = name;
	series.dataFields.dateX = "date";
	series.name = capitalizeFirstLetter(name);
	series.strokeOpacity = 0.6;
	series.stroke = color;
	series.maskBullets = false;
	series.minBulletDistance = 10;
	series.hidden = true;
	series.hideTooltipWhileZooming = true;
	const bullet = series.bullets.push(new am4charts.CircleBullet());

	bullet.setStateOnChildren = true;

	bullet.circle.fillOpacity = 1;
	bullet.circle.fill = backgroundColor;
	bullet.circle.radius = 2;

	const circleHoverState = bullet.circle.states.create("hover");
	circleHoverState.properties.fillOpacity = 1;
	circleHoverState.properties.fill = color;
	circleHoverState.properties.scale = 1.4;

	series.tooltip.pointerOrientation = "down";
	series.tooltip.getStrokeFromObject = true;
	series.tooltip.getFillFromObject = false;
	series.tooltip.background.fillOpacity = 0.2;
	series.tooltip.background.fill = am4core.color("#000000");
	series.tooltip.dy = -4;
	series.tooltip.fontSize = "0.8em";
	series.tooltipText = "{valueY}";

	return series;
}


const addButton = (name, color) => {
	var button = buttonsContainer.createChild(am4core.Button)
	button.label.valign = "middle"
	button.label.fill = am4core.color("#ffffff");
	button.fontSize = "1em";
	button.background.cornerRadius(30, 30, 30, 30);
	button.background.strokeOpacity = 0.3
	button.background.fillOpacity = 0;
	button.background.stroke = buttonStrokeColor;
	button.background.padding(2, 3, 2, 3);
	button.states.create("active");
	button.setStateOnChildren = true;

	var activeHoverState = button.background.states.create("hoverActive");
	activeHoverState.properties.fillOpacity = 0;

	var circle = new am4core.Circle();
	circle.radius = 8;
	circle.fillOpacity = 0.3;
	circle.fill = buttonStrokeColor;
	circle.strokeOpacity = 0;
	circle.valign = "middle";
	circle.marginRight = 5;
	button.icon = circle;

	// save name to dummy data for later use
	button.dummyData = name;

	var circleActiveState = circle.states.create("active");
	circleActiveState.properties.fill = color;
	circleActiveState.properties.fillOpacity = 0.5;

	button.events.on("hit", handleButtonClick);
	return button;
}

const handleButtonClick = (event) => {
	setDataCategory(event.target.dummyData);
}

const setDataCategory = (name) => {
	let activeButton = buttons[name];
	activeButton.isActive = true;

	for (const key in buttons) {
		if (buttons[key] !== activeButton) {
			buttons[key].isActive = false;
		}
	}
	imageSeries.dataFields.value = name;
	imageSeries.invalidateData();

	dateAxis.tooltip.background.fill = colors[name];
	dateAxis.tooltip.background.stroke = colors[name];
	lineChart.cursor.lineX.stroke = colors[name];

	let activeSeries = lineSeries[name];
	activeSeries.show();
	for (let key in lineSeries) {
		if (lineSeries[key] !== activeSeries) {
			lineSeries[key].hide();
		}
	}
	imageSeries.heatRules.getIndex(0).maxValue = max[name];
}

const updateSeriesTooltip = () => {
	let position = dateAxis.dateToPosition(currentDate);
	position = dateAxis.toGlobalPosition(position);
	const x = dateAxis.positionToCoordinate(position);

	lineChart.cursor.triggerMove({ x: x, y: 0 }, "soft", true);
	lineChart.series.each(function (series) {
		if (!series.isHidden) {
			series.tooltip.disabled = false;
			series.showTooltipAtDataItem(series.tooltipDataItem);
		}
	})
}
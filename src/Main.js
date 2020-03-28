import React from 'react';
import * as ChartFactory from './ChartFactory';

export default class Main extends React.Component {
	componentDidMount = () => {
		this.chart = ChartFactory.init();
	}

	componentWillUnmount = () => {
		if (this.chart) {
			this.chart.dispose();
		}
	}

	render() {
		return (
			<div className="App-body">
				<div id="chart"></div>
			</div>
		);
	}
}
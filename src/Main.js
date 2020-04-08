import React from 'react';
import * as ChartFactory from './ChartFactory';

export default class Main extends React.Component {
	componentWillUnmount = () => {
		if (this.chart) {
			this.chart.dispose();
		}
	}

	render() {
		const { loadChart } = this.props;
		if (loadChart) {
			this.chart = ChartFactory.init();
		}
		return (
			<div className="App-body">
				<div id="chart"></div>
			</div>
		);
	}
}
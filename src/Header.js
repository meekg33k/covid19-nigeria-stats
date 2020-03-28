import React from 'react';
import CovidImage from '../src/images/covid-19.png';

export const Header = () => {
	return (
		<nav className='App-header'>
			<div className='App-header-root'>
				<div className='App-header-content'>
					<img className='App-logo' src={CovidImage} alt='covid-logo' />
					<p className='App-header-text'>Nigeria COVID-19 Spread Tracker</p>
				</div>

			</div>
			<div className='App-header-github'>
				<a href="https://github.com/meekg33k" target="_blank" rel="noopener noreferrer">
					<img width="120" height="120" src="https://github.blog/wp-content/uploads/2008/12/forkme_right_red_aa0000.png?resize=149%2C149"
						alt="Fork me on GitHub" data-recalc-dims="1" />
				</a>
			</div>
		</nav>
	)
}
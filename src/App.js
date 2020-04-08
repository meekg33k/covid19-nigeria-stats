import React from 'react';
import './App.css';
import Main from './Main';
import { Header } from './Header';

class App extends React.Component {
  state = {
    dataFetchSuccess: false
  }

  componentDidMount = async () => {
    const res = await fetch('http://covid-19-nigeria-data.herokuapp.com');
    const data = await res.json();
    if (data) {
      window.data = data;
      this.setState({ dataFetchSuccess: true });
    }
  }

  render() {
    const { dataFetchSuccess } = this.state;
    return (
      <div className="App">
        <Header />
        <Main loadChart={dataFetchSuccess} />
      </div>
    );
  }
}

export default App;

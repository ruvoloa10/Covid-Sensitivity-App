import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Tabs, Tab, Box } from '@mui/material';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const CovidDashboard = () => {
  const [iso, setIso] = useState('USA');
  const [tabIndex, setTabIndex] = useState(0);
  const [stateData, setStateData] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [startDate, setStartDate] = useState('2020-01-22');
  const [endDate, setEndDate] = useState('2020-02-01');
  const [loading, setLoading] = useState(false);
  const [allCountries, setAllCountries] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

useEffect(() => {
  axios.get('https://covid-api.com/api/reports')
    .then(res => {
      const countryTotals = res.data.data
        .filter(item => !item.region.province)
        .map(item => ({
          name: item.region.name,
          iso: item.region.iso,
          confirmed: item.confirmed,
          deaths: item.deaths,
          active: item.active,
        }));
      setAllCountries(countryTotals);
    })
    .catch(err => console.error(err));
}, []);

useEffect(() => {
  const fetchData = async () => {
    setLoading(true);

    try {
      // Fetch state-level data
      const stateRequest = axios.get(`https://covid-api.com/api/reports?iso=${iso}`);

      // Prepare historical date range
      const dates = [];
      const MIN_DATE = '2020-01-22';
      const validatedStartDate = new Date(startDate) < new Date(MIN_DATE)
        ? MIN_DATE
        : startDate;
      const start = new Date(validatedStartDate);
      const end = new Date(endDate);

      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }

      // Fetch historical data in parallel
      const historicalRequests = dates.map(date =>
        axios.get(`https://covid-api.com/api/reports/total?date=${date}&iso=${iso}`)
      );

      const [stateRes, ...historicalRes] = await Promise.all([
        stateRequest,
        ...historicalRequests
      ]);

      // Format state-level data
      const formattedState = stateRes.data.data.map(item => ({
        region: item.region.province || item.region.name,
        confirmed: item.confirmed,
        deaths: item.deaths,
      }));
      setStateData(formattedState);

      // Format historical data
      const formattedHistorical = historicalRes.map(res => ({
        date: res.data.date,
        confirmed: res.data.data.confirmed,
        deaths: res.data.data.deaths,
      }));
      setHistoricalData(formattedHistorical);

          // Save each historical data point to the backend
formattedHistorical.forEach((entry) => {
  axios.post('http://localhost:5000/api/save', {
    iso,
    date: entry.date,
    confirmed: entry.confirmed,
    deaths: entry.deaths,
  }).catch(err => console.error('Save error:', err));
});

    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  fetchData();
}, [iso, startDate, endDate]);

function getStandardDeviation(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function getTrendLine(data, key) {
  const n = data.length;
  const x = data.map((_, i) => i + 1);
  const y = data.map(d => d[key]);

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

function generateDateLabels(startDate, count) {
  const labels = [];
  const start = new Date(startDate);

  for (let i = 1; i < count + 1; i++) {
    const current = new Date(start.getTime()); // clone the original date
    current.setDate(current.getDate() + i);
    labels.push(current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  return labels;
}

const dateLabels = generateDateLabels(startDate, historicalData.length);

const indexedData = historicalData.map((d, i) => ({
  ...d,
  index: i + 1,
  formattedDate: dateLabels[i], // guaranteed to be valid
}));

const confirmedTrend = getTrendLine(indexedData, 'confirmed');
const deathsTrend = getTrendLine(indexedData, 'deaths');

const mergedData = indexedData.map((d) => ({
  ...d,
  confirmedTrend: Math.round(confirmedTrend.slope * d.index + confirmedTrend.intercept),
  deathsTrend: Math.round(deathsTrend.slope * d.index + deathsTrend.intercept),
}));

const confirmedValues = stateData.map(item => item.confirmed);
const deathValues = stateData.map(item => item.deaths);

const confirmedStats = {
  average: Math.round(confirmedValues.reduce((a, b) => a + b, 0) / confirmedValues.length),
  max: Math.max(...confirmedValues),
  min: Math.min(...confirmedValues),
  stdDev: Math.round(getStandardDeviation(confirmedValues)),
};

const deathStats = {
  average: Math.round(deathValues.reduce((a, b) => a + b, 0) / deathValues.length),
  max: Math.max(...deathValues),
  min: Math.min(...deathValues),
  stdDev: Math.round(getStandardDeviation(deathValues)),
};


  return (
    <Box sx={{ width: '100%' }}>
      <label>
        Country ISO:
        <input value={iso} onChange={(e) => setIso(e.target.value.toUpperCase())} />
      </label>
      <Tabs value={tabIndex} onChange={(e, newVal) => setTabIndex(newVal)}>
        <Tab label="Current by State" />
        <Tab label="Historical Trends" />
        <Tab label="All Countries Totals" />
        <Tab label="Death-to-Case Ratio" />
      </Tabs>

      {tabIndex === 0 && (
        <ResponsiveContainer width="100%" height={400}>
        <BarChart
            data={stateData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
            <XAxis dataKey="region" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
            <YAxis
                tickFormatter={(value) => value.toLocaleString()}
                tick={{ fontSize: 12 }}
            />
            <Tooltip
                formatter={(value) => value.toLocaleString()}
            />
            <Bar dataKey="confirmed" fill="#8884d8" />
            <Bar dataKey="deaths" fill="#ff4d4f" />
        </BarChart>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
  <div style={{ display: 'flex', gap: '2rem', maxWidth: '800px' }}>
    <div style={{ flex: 1 }}>
      <h4>Top 10 Regions by Confirmed Cases</h4>
      <ol>
        {[...stateData]
          .sort((a, b) => b.confirmed - a.confirmed)
          .slice(0, 10)
          .map((item, index) => (
            <li key={index}>
              {item.region}: {item.confirmed.toLocaleString()}
            </li>
          ))}
      </ol>
    </div>

    <div style={{ flex: 1 }}>
      <h4>Top 10 Regions by Deaths</h4>
      <ol>
        {[...stateData]
          .sort((a, b) => b.deaths - a.deaths)
          .slice(0, 10)
          .map((item, index) => (
            <li key={index}>
              {item.region}: {item.deaths.toLocaleString()}
            </li>
          ))}
      </ol>
    </div>
  </div>
</div>
       <div style={{ marginBottom: '1rem' }}>
  <h3 style={{ textAlign: 'center' }}>Descriptive Statistics</h3>
  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
    <div style={{ display: 'flex', gap: '2rem', maxWidth: '800px' }}>
      <div style={{ flex: 1 }}>
        <h4>Confirmed Cases</h4>
        <ul>
          <li><strong>Average:</strong> {confirmedStats.average.toLocaleString()}</li>
          <li><strong>Max:</strong> {confirmedStats.max.toLocaleString()}</li>
          <li><strong>Min:</strong> {confirmedStats.min.toLocaleString()}</li>
          <li><strong>Standard Deviation:</strong> {confirmedStats.stdDev.toLocaleString()}</li>
        </ul>
      </div>
      <div style={{ flex: 1 }}>
        <h4>Deaths</h4>
        <ul>
          <li><strong>Average:</strong> {deathStats.average.toLocaleString()}</li>
          <li><strong>Max:</strong> {deathStats.max.toLocaleString()}</li>
          <li><strong>Min:</strong> {deathStats.min.toLocaleString()}</li>
          <li><strong>Standard Deviation:</strong> {deathStats.stdDev.toLocaleString()}</li>
        </ul>
      </div>
    </div>
  </div>
</div>
        </ResponsiveContainer>
      )}

      {tabIndex === 1 && (
  <>
    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
  <label>
    Start Date:
    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
  </label>
  <label>
    End Date:
    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
  </label>
</div>

    {loading ? (
      <p>Loading historical data, please wait...</p>
    ) : (
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={mergedData}>
            <XAxis
                dataKey="formattedDate"
                interval={0} // show every label
                angle={-45}  // tilt for readability
                textAnchor="end"
                height={60}
            />
            <YAxis tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip
                formatter={(value, name) => [`${value.toLocaleString()}`, name]}
            />
            <Line type="linear" dataKey="confirmed" stroke="#8884d8" />
            <Line type="linear" dataKey="deaths" stroke="#ff4d4f" />
            <Line type="linear" dataKey="confirmedTrend" stroke="#00C49F" strokeDasharray="5 5" dot={false} />
            <Line type="linear" dataKey="deathsTrend" stroke="#FFBB28" strokeDasharray="5 5" dot={false} />
        </LineChart>
        <p><strong>Confirmed Trend:</strong> y = {confirmedTrend.slope.toFixed(2)}x + {confirmedTrend.intercept.toFixed(2)}</p>
        <p><strong>Deaths Trend:</strong> y = {deathsTrend.slope.toFixed(2)}x + {deathsTrend.intercept.toFixed(2)}</p>
      </ResponsiveContainer>
    )}
  </>
)}

{tabIndex === 2 && (
  <div style={{ marginTop: '1rem' }}>
    <h3>Current Totals by Country</h3>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Country</th>
          <th style={{ textAlign: 'left' }}>ISO</th>
          <th style={{ textAlign: 'right' }}>Confirmed</th>
          <th style={{ textAlign: 'right' }}>Deaths</th>
          <th style={{ textAlign: 'right' }}>Active</th>
        </tr>
      </thead>
      <tbody>
        {allCountries.map((item) => (
          <tr key={item.iso}>
            <td>{item.name}</td>
            <td>{item.iso}</td>
            <td style={{ textAlign: 'right' }}>{item.confirmed.toLocaleString()}</td>
            <td style={{ textAlign: 'right' }}>{item.deaths.toLocaleString()}</td>
            <td style={{ textAlign: 'right' }}>{item.active?.toLocaleString() ?? 'N/A'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}

{tabIndex === 3 && (
    <div style={{ marginTop: '1rem' }}>
      <h3 style={{ textAlign: 'center' }}>Countries Ranked by Death-to-Confirmed Case Ratio</h3>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <table style={{ width: '100%', maxWidth: '800px', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Country</th>
              <th style={{ textAlign: 'left' }}>ISO</th>
              <th style={{ textAlign: 'right' }}>Confirmed</th>
              <th style={{ textAlign: 'right' }}>Deaths</th>
              <th style={{ textAlign: 'right' }}>Death Ratio</th>
            </tr>
          </thead>
          <tbody>
            {[...allCountries]
              .filter(c => c.confirmed > 0)
              .map(c => ({
                ...c,
                ratio: c.deaths / c.confirmed,
              }))
              .sort((a, b) => b.ratio - a.ratio)
              .slice(0, 20)
              .map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.iso}</td>
                  <td style={{ textAlign: 'right' }}>{item.confirmed.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{item.deaths.toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>{(item.ratio * 100).toFixed(2)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )}
    </Box>  
  );
};

export default CovidDashboard;
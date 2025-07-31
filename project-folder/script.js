document.addEventListener('DOMContentLoaded', function () {
  const chartContainer = document.getElementById('chart');
  const chart = LightweightCharts.createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: 500,
    layout: {
      background: { color: '#000000' },
      textColor: '#ffffff',
    },
    grid: {
      vertLines: { color: '#333' },
      horzLines: { color: '#333' },
    },
    timeScale: {
      timeVisible: true,
      secondsVisible: false,
    },
  });

  const candleSeries = chart.addCandlestickSeries();
  let candleData = [];

  function parseCSV(csvText) {
    const rows = csvText.trim().split('\n');
    const headers = rows[0].split(',').map(h => h.trim());

    const timeIndex = headers.indexOf('timestamp');
    const openIndex = headers.indexOf('open');
    const highIndex = headers.indexOf('high');
    const lowIndex = headers.indexOf('low');
    const closeIndex = headers.indexOf('close');
    const directionIndex = headers.indexOf('direction');
    const buyIndex = headers.indexOf('Buy_Area');
    const sellIndex = headers.indexOf('Sell_Area');

    candleData = [];
    const markers = [];

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].split(/,(?![^[]*\])/).map(c => c.trim());
      const dateStr = cols[timeIndex];
      let ts;

      // Supports both "DDMMYYYY" or "YYYY-MM-DD"
      if (/^\d{8}$/.test(dateStr)) {
        const day = parseInt(dateStr.slice(0, 2));
        const month = parseInt(dateStr.slice(2, 4)) - 1;
        const year = parseInt(dateStr.slice(4, 8));
        ts = Math.floor(new Date(year, month, day).getTime() / 1000);
      } else {
        ts = Math.floor(new Date(dateStr).getTime() / 1000);
      }

      const open = parseFloat(cols[openIndex]);
      const high = parseFloat(cols[highIndex]);
      const low = parseFloat(cols[lowIndex]);
      const close = parseFloat(cols[closeIndex]);
      if ([open, high, low, close].some(isNaN)) continue;

      candleData.push({ time: ts, open, high, low, close });

      // Add direction markers
      const direction = cols[directionIndex]?.toUpperCase();
      if (direction === 'LONG') {
        markers.push({ time: ts, position: 'belowBar', color: 'green', shape: 'arrowUp', text: 'LONG' });
      } else if (direction === 'SHORT') {
        markers.push({ time: ts, position: 'aboveBar', color: 'red', shape: 'arrowDown', text: 'SHORT' });
      }

      // Add Buy Area (green zone)
      try {
        const buyArea = JSON.parse(cols[buyIndex]);
        if (Array.isArray(buyArea) && buyArea.length > 0) {
          const minBuy = Math.min(...buyArea);
          const maxBuy = Math.max(...buyArea);
          chart.addPriceLine({
            price: minBuy,
            color: 'rgba(0,255,0,0.1)',
            lineWidth: 0,
            axisLabelVisible: false,
          });
          chart.addPriceLine({
            price: maxBuy,
            color: 'rgba(0,255,0,0.1)',
            lineWidth: 0,
            axisLabelVisible: false,
          });
        }
      } catch {}

      // Add Sell Area (red zone)
      try {
        const sellArea = JSON.parse(cols[sellIndex]);
        if (Array.isArray(sellArea) && sellArea.length > 0) {
          const minSell = Math.min(...sellArea);
          const maxSell = Math.max(...sellArea);
          chart.addPriceLine({
            price: minSell,
            color: 'rgba(255,0,0,0.1)',
            lineWidth: 0,
            axisLabelVisible: false,
          });
          chart.addPriceLine({
            price: maxSell,
            color: 'rgba(255,0,0,0.1)',
            lineWidth: 0,
            axisLabelVisible: false,
          });
        }
      } catch {}
    }

    candleSeries.setData(candleData);
    candleSeries.setMarkers(markers);
  }

  // Load data.csv automatically
  fetch('data.csv')
    .then(res => res.text())
    .then(csv => parseCSV(csv))
    .catch(err => console.error("Error loading CSV:", err));

  // Replay logic
  document.getElementById('replayBtn').addEventListener('click', function () {
    const fromInput = document.getElementById('fromDate').value;
    const toInput = document.getElementById('toDate').value;

    if (!fromInput || !toInput) {
      alert("Please select both From and To dates");
      return;
    }

    const fromTs = Math.floor(new Date(fromInput).getTime() / 1000);
    const toTs = Math.floor(new Date(toInput).getTime() / 1000);

    const rangeData = candleData.filter(d => d.time >= fromTs && d.time <= toTs);
    if (rangeData.length === 0) {
      alert("No data found in selected date range.");
      return;
    }

    // Zoom to last 30 candles
    const zoomSize = 30;
    const end = rangeData[rangeData.length - 1].time;
    const start = rangeData[Math.max(0, rangeData.length - zoomSize)].time;
    chart.timeScale().setVisibleRange({ from: start, to: end });

    candleSeries.setData([]); // clear chart before replay

    let i = 0;
    const interval = setInterval(() => {
      if (i >= rangeData.length) {
        clearInterval(interval);
        return;
      }
      candleSeries.update(rangeData[i]);
      i++;
    }, 100);
  });
});

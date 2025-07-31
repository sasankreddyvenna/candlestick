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
  const areaLines = [];
  let candleData = [];

  document.getElementById('csvUpload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const csvText = event.target.result;
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

        const direction = cols[directionIndex]?.toUpperCase();
        if (direction === 'LONG') {
          markers.push({ time: ts, position: 'belowBar', color: 'green', shape: 'arrowUp', text: 'LONG' });
        } else if (direction === 'SHORT') {
          markers.push({ time: ts, position: 'aboveBar', color: 'red', shape: 'arrowDown', text: 'SHORT' });
        } else {
          markers.push({ time: ts, position: 'inBar', color: 'orange', shape: 'circle', text: 'None' });
        }

        try {
          const buyArea = JSON.parse(cols[buyIndex]);
          if (Array.isArray(buyArea) && buyArea.length > 0) {
            const minBuy = Math.min(...buyArea);
            const maxBuy = Math.max(...buyArea);
            areaLines.push({ time: ts, from: minBuy, to: maxBuy, color: 'rgba(0,255,0,0.15)' });
          }
        } catch {}

        try {
          const sellArea = JSON.parse(cols[sellIndex]);
          if (Array.isArray(sellArea) && sellArea.length > 0) {
            const minSell = Math.min(...sellArea);
            const maxSell = Math.max(...sellArea);
            areaLines.push({ time: ts, from: minSell, to: maxSell, color: 'rgba(255,0,0,0.15)' });
          }
        } catch {}
      }

      candleSeries.setData(candleData);
      candleSeries.setMarkers(markers);

      areaLines.forEach(band => {
        chart.addPriceLine({
          price: band.from,
          color: band.color,
          lineWidth: 0,
          axisLabelVisible: false,
        });
        chart.addPriceLine({
          price: band.to,
          color: band.color,
          lineWidth: 0,
          axisLabelVisible: false,
        });
      });
    };

    reader.readAsText(file);
  });

  // Date Pickers
  const fromPicker = new Datepicker(document.getElementById('fromDate'), { autohide: true });
  const toPicker = new Datepicker(document.getElementById('toDate'), { autohide: true });

  // Replay Button with Smooth Update
  document.getElementById('replayBtn').addEventListener('click', function () {
    const fromInput = document.getElementById('fromDate').value;
    const toInput = document.getElementById('toDate').value;

    if (!fromInput || !toInput) {
      alert("Please select both From and To dates");
      return;
    }

    const fromDate = new Date(fromInput);
    const toDate = new Date(toInput);
    const fromTs = Math.floor(fromDate.getTime() / 1000);
    const toTs = Math.floor(toDate.getTime() / 1000);

    const rangeData = candleData.filter(d => d.time >= fromTs && d.time <= toTs);
    if (rangeData.length === 0) {
      alert("No data found in selected date range.");
      return;
    }

    // Fix view range and clear chart
   const zoomSize = 30; // number of candles to show initially
const end = rangeData[rangeData.length - 1].time;
const start = rangeData[Math.max(0, rangeData.length - zoomSize)].time;

chart.timeScale().setVisibleRange({
  from: start,
  to: end,
});

    candleSeries.setData([]);

    let i = 0;
    const replayInterval = setInterval(() => {
      if (i >= rangeData.length) {
        clearInterval(replayInterval);
        return;
      }
      candleSeries.update(rangeData[i]);
      i++;
    }, 100);
  });
});

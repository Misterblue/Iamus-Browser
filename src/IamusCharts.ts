//   Copyright 2020 Vircadia Contributors
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.

'use strict';

interface Histogram {
  buckets: number,
  bucketMilliseconds: number,
  totalMilliseconds: number,
  timeBase: number,
  baseNumber: number,
  type: string,
  values: number[]
}
interface OneStatInfo {
  name: string,
  category: string,
  unit: string,
  value: number,
  history: { [key: string]: Histogram }
};
interface CpuInfo {
  model: string,
  speed: number,
  times: {
    user: number,
    nice: number,
    sys: number,
    idle: number,
    irq: number
  }
};
interface StatsOs {
  cpus: CpuInfo[],
  freemem: number,
  totalmem: number,
  loadavg: number[],
  uptime: number,
  cpuBusy: OneStatInfo,
  memUsage: OneStatInfo
};
interface StatsServer {
  apiRequests: OneStatInfo,
  apiErrors: OneStatInfo,
};
interface StatsMv {
  totalOnline: OneStatInfo,
  domainTotalUsers: OneStatInfo,
  domainAnonUsers: OneStatInfo,
  activeDomains: OneStatInfo,
};

document.addEventListener('DOMContentLoaded', ev => {
  UpdateCharts();

  // Start the ticker that fetches and updates chart data
  setInterval(UpdateCharts, 5000);
});

function UpdateCharts(): void {
  if (gLoginTokenInfo && gLoginTokenInfo.token) {
    const tabElem = document.getElementById('tabStats');
    if (tabElem) {
      // Only update the display if the tab is visible
      const style = getComputedStyle(tabElem);
      if (style.display !== 'none' && style.visibility === 'visible') {
        UpdateOSStats();
        UpdateServerStats();
        UpdateMetaverseStats();
      };
    };
  };
};

function UpdateOSStats() {
  InitOSCharts();
  GetDataFromServer('/api/v1/stats/category/os')
  .then( stats => {
    if (stats.os) {
      const osStats: StatsOs = stats.os;
      const statTable = makeTable([
        // makeRow([ makeData('cpus'), makeData(MakeTableOfCpus(osStats.cpus)) ]),
        makeRow([ makeData('freemem'), makeData(osStats.freemem) ]),
        makeRow([ makeData('totalmem'), makeData(osStats.totalmem) ]),
        makeRow([ makeData('loadavg'), makeData(NumArrayToString(osStats.loadavg)) ]),
        makeRow([ makeData('uptime'), makeData(osStats.uptime) ])
      ], 'v-os-table');

      const tablePlace = document.getElementById('v-stat-os-table-place');
      tablePlace.innerHTML = '';
      tablePlace.appendChild(statTable);

      const histoTable = SimpleOneStatInfoDisplay(osStats.cpuBusy);
      tablePlace.appendChild(histoTable);

      if (cpuBusyChart) {
        const yy = cpuBusyChart.data;
        const xx = osStats.cpuBusy.history['5min'].values;
        cpuBusyChart.data.datasets[0].data = osStats.cpuBusy.history['5min'].values;
        cpuBusyChart.update();
      };
    };
  })
  .catch( err => {
    DebugLog('UpdateOSStats: exception: ' + err);
  });
};

function UpdateServerStats() {
  InitServerCharts();
  GetDataFromServer('/api/v1/stats/category/server')
  .then( stats => {
    if (stats.server) {
      const svrStats: StatsServer = stats.server;
      const tablePlace = document.getElementById('v-stat-srv-table-place');
      tablePlace.innerHTML = '';
      Object.keys(svrStats).forEach( key => {
        tablePlace.appendChild(SimpleOneStatInfoDisplay((svrStats as any)[key]));
      });
    };
  })
  .catch( err => {
    DebugLog('UpdateServerStats: exception: ' + err);
  });
};

function UpdateMetaverseStats() {
  InitMvCharts();
  GetDataFromServer('/api/v1/stats/category/metaverse')
  .then( stats => {
    if (stats.metaverse) {
      const mvStats: StatsMv = stats.metaverse;
      const tablePlace = document.getElementById('v-stat-mv-table-place');
      tablePlace.innerHTML = '';
      Object.keys(mvStats).forEach( key => {
        tablePlace.appendChild(SimpleOneStatInfoDisplay((mvStats as any)[key]));
      });
    };
  })
  .catch( err => {
    DebugLog('UpdateMetaverseStats: exception: ' + err);
  });
};

// Make sure the canvases exist for the OS stats
let cpuBusyChart: Chart;
let memUsageChart: Chart;
function InitOSCharts() {
  // Create canvas's if they are not in the document
  const testElem = document.getElementById('v-os-canvas-cpuBusy');
  DebugLog(`InitOSCharts: test element type=${typeof(testElem)}`);
  if (typeof(testElem) === 'undefined') {
    DebugLog(`InitOSCharts: canvas being initialized`);
    const cpuBusyCanvas = makeElement('canvas');
    cpuBusyCanvas.setAttribute('id', 'v-os-canvas-cpuBusy');
    cpuBusyCanvas.setAttribute('height', '450');
    cpuBusyCanvas.setAttribute('width', '600');
    const memUsageCanvas = makeElement('canvas');
    memUsageCanvas.setAttribute('id', 'v-os-canvas-memUsage');
    memUsageCanvas.setAttribute('height', '450');
    memUsageCanvas.setAttribute('width', '600');

    const canvasPlace = document.getElementById('v-stat-os-canvas-place');
    canvasPlace.appendChild( makeDiv( [ cpuBusyCanvas, memUsageCanvas ] ) );
    DebugLog(`InitOSCharts: added canvas to the canvas-place`);

    // Create the charts for the canvas's
    const cpuBusyContext = (document.getElementById('v-os-canvas-cpuBusy') as HTMLCanvasElement).getContext('2d');
    cpuBusyChart = new Chart(cpuBusyContext, {
      'type': 'line',
      'options': {
      }
    });
    const memUsageContext = (document.getElementById('v-os-canvas-cpuBusy') as HTMLCanvasElement).getContext('2d');
    memUsageChart = new Chart(memUsageContext, {
      'type': 'line',
      'options': {
      }
    });
  };
};

function InitServerCharts() {
  return;
};

function InitMvCharts() {
  return;
};

function SimpleOneStatInfoDisplay(pInfo: OneStatInfo, pTableClass?: string): HTMLElement {
  const nameline = `${pInfo.name}/${pInfo.category} = ${pInfo.value} (${pInfo.unit})`;
  const lines: HTMLElement[] = [
    makeDiv(nameline)
  ];
  if (pInfo.history) {
    Object.keys(pInfo.history).map( key => {
      const histo = pInfo.history[key];
      lines.push( makeDiv( `....${key}: ${HistoInfo(histo)}`));
    });
  };
  const block = makeDiv(lines);
  return block;
};

function HistoInfo(pHisto: Histogram): string {
  const bucketsBeginDate = new Date(pHisto.timeBase);
  const bucketsEndDate = new Date(pHisto.timeBase + pHisto.totalMilliseconds);
  const bucketsBeginString = MakeDateString(bucketsBeginDate);
  const bucketsEndString = MakeDateString(bucketsEndDate);
  return 'b=' + bucketsBeginString + ', e=' + bucketsEndString;
};

function MakeDateString(pDate: Date): string {
  return pDate.toISOString();
  /*
  let dateString: string = pDate.getFullYear() + '-';
  dateString += (pDate.getMonth() + 1) + '-';
  dateString += pDate.getDate() + ' ';
  dateString += pDate.getHours() + ':';
  dateString += pDate.getMinutes() + ':';
  dateString += pDate.getSeconds();
  return dateString;
  */
};

// Make a displayable HTML element for the CPU information
function MakeTableOfCpus(pCpus: CpuInfo[]): HTMLElement {
  // short term hack
  return makeDiv( makeElement('pre', makeText(JSON.stringify(pCpus, undefined, 2))));
};

// Convert an array of numbers into a string list of numbers
function NumArrayToString(pArray: number[]): string {
  let ret = '';
  if (pArray && Array.isArray(pArray)) {
    for (const num of pArray) {
      if (ret.length > 0) {
        ret += ', ';
      };
      ret += String(num);
    };
  };
  return ret;
};

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

document.addEventListener('DOMContentLoaded', ev => {
  UpdateCharts();

  // Start the ticker that fetches and updates chart data
  setInterval(UpdateCharts, 5000);
});

function UpdateCharts(): void {
  if (gLoginTokenInfo && gLoginTokenInfo.token) {
    UpdateOSStats();
  };
};

function UpdateOSStats() {
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

      const tablePlace = document.getElementById('v-stat-table-os-place');
      tablePlace.innerHTML = '';
      tablePlace.appendChild(statTable);
    };
  })
  .catch( err => {
    DebugLog('UpdateOSStats: exception: ' + err);
  });
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

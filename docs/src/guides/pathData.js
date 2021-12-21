import { csvParse } from "d3-dsv";

export const temperature_data = `source,target,value
Coal reserves,Coal,127.93
Coal imports,Coal,349.7879708
Oil reserves,Oil,802.5479528
Oil imports,Oil,65.64315528
Gas reserves,Natural Gas,645.7728959
Gas imports,Natural Gas,355.6589677
UK land based bioenergy,Bio-conversion,3.027913952
Agricultural 'waste',Bio-conversion,9.282517755
Other waste,Bio-conversion,28.71472764
Other waste,Solid,7.120255333
Biomass imports,Solid,4.089432558
Coal,Solid,477.7179708
Oil,Liquid,868.1911081
Natural Gas,Gas,1001.431864
Solar,Solar PV,0.028059966
Solar PV,Electricity grid,0.028059966
Bio-conversion,Solid,15.69522779
Bio-conversion,Liquid,1.069127005
Bio-conversion,Gas,18.29875011
Bio-conversion,Losses,5.962054444
Solid,Thermal generation,434.145135
Liquid,Thermal generation,8.534858112
Gas,Thermal generation,343.3066404
Nuclear,Thermal generation,160.71
Thermal generation,District heating,9.042140031
Thermal generation,Electricity grid,366.4405941
Thermal generation,Losses,571.2138994
Wind,Electricity grid,14.4406701
Tidal,Electricity grid,0.005003425
Wave,Electricity grid,0
Hydro,Electricity grid,5.329728
Electricity grid,Over generation / exports,1.14E-13
Electricity grid,Losses,26.94051694
District heating,Industry,9.042140031
Electricity grid,Heating and cooling - homes,28.7767749
Solid,Heating and cooling - homes,13.14794248
Liquid,Heating and cooling - homes,11.7924845
Gas,Heating and cooling - homes,354.8435738
Electricity grid,Heating and cooling - commercial,31.40903798
Liquid,Heating and cooling - commercial,9.357802772
Gas,Heating and cooling - commercial,80.65151402
Electricity grid,Lighting & appliances - homes,87.37770782
Gas,Lighting & appliances - homes,8.015463096
Electricity grid,Lighting & appliances - commercial,73.04774089
Gas,Lighting & appliances - commercial,8.987057559
Electricity grid,Industry,126.2492384
Solid,Industry,56.47800845
Liquid,Industry,137.4335097
Gas,Industry,210.4929841
Electricity grid,Agriculture,4.259002504
Solid,Agriculture,0.851800501
Liquid,Agriculture,3.513677065
Gas,Agriculture,2.023026189
Electricity grid,Road transport,0
Liquid,Road transport,470.2870297
Electricity grid,Rail transport,8.184036114
Liquid,Rail transport,9.540451289
Liquid,Domestic aviation,9.55109733
Liquid,National navigation,26.57289571
Liquid,International aviation,125.0236042
Liquid,International shipping,57.28499215
Gas,Losses,11.41035458`;

const processedEnergy = csvParse(temperature_data);

processedEnergy.forEach(d => {
  Object.keys(d).forEach(key => {
    d[key] = key === "source" || key === "target" ? d[key] : parseFloat(d[key]);
  });
});

const processedEnergyNodeHash = {};
const processedNodes = [];
// const colors = {
//   "Fossil Fuels": "#00a2ce",
//   Agriculture: "#4d430c",
//   Alternative: "#b3331d",
//   Other: "#b6a756"
// };

processedEnergy.forEach(edge => {
  const { source, target } = edge;
  const arrayed = [source, target];
  arrayed.forEach(nodeVal => {
    if (!processedEnergyNodeHash[nodeVal]) {
      processedEnergyNodeHash[nodeVal] = {
        id: nodeVal,
        input: 0,
        output: 0
      };

      // if (["Losses", "Industry", "Lighting & appliances - homes",
      // "Lighting & appliances - commercial",])

      if (
        [
          "Coal reserves",
          "Coal imports",
          "Other waste",
          "Gas reserves",
          "Gas imports",
          "Agricultural 'waste'",
          "UK land based bioenergy",
          "Oil reserves",
          "Oil imports",
          "Nuclear",
          "Solar",
          "Biomass imports",
          "Tidal Wave"
        ].indexOf(nodeVal) !== -1
      ) {
        processedEnergyNodeHash[nodeVal].category = "Base Import";
      } else if (
        [
          "Losses",
          "Industry",
          "Lighting & appliances - homes",
          "Lighting & appliances - commercial",
          "Heating and cooling - homes",
          "Heating and cooling - commercial",
          "Over generation / exports",
          "Road transport",
          "International aviation",
          "Domestic aviation",
          "National navigation",
          "Rail transport",
          "International shipping",

          "Agriculture"
        ].indexOf(nodeVal) !== -1
      ) {
        processedEnergyNodeHash[nodeVal].category = "Usage";
      } else {
        processedEnergyNodeHash[nodeVal].category = "Intermediary";
      }
      processedNodes.push(processedEnergyNodeHash[nodeVal]);
    }
  });
  edge.value = edge.value;

  processedEnergyNodeHash[source].output += edge.value;
  processedEnergyNodeHash[target].input += edge.value;
});

export const or_data = processedNodes.sort((a, b) =>
  a.category < b.category ? -1 : a.category > b.category ? 1 : 0
);

export const network_data = processedEnergy;

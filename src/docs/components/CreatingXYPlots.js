import * as React from "react"
import { XYFrame } from "../../components"

import DocumentComponent from "../layout/DocumentComponent"
import { randomNormal } from "d3-random"
import { scaleThreshold } from "d3-scale"
import { hexbinning, heatmapping } from "../../components/svg/areaDrawing"

// eslint-disable-next-line
const roxySettings = {
  xAccessor: "delta",
  yAccessor: "sigma",
  axes: [
    { orient: "left", ticks: 6, label: "sigma", baseline: true },
    {
      orient: "bottom",
      ticks: 6,
      label: "delta",
      footer: false,
      baseline: true
    }
  ],
  points: [
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80224536,
      "title_desc": "ADAM SANDLER 100% FRESH",
      "mu": 0.5927786126,
      "sigma": 0.818429953,
      "n": 98821,
      "metric": "Avg Title Hour",
      "delta": 0.0058457423,
      "stderr": 0.0030437079,
      "z_score": 1.9205989531,
      "p_value": 0.0547822873,
      "stat_sig": 0,
      "dx-default-pk": 0
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80224536,
      "title_desc": "ADAM SANDLER 100% FRESH",
      "mu": 0.5954231846,
      "sigma": 0.7580193042,
      "n": 98148,
      "metric": "Avg Title Hour",
      "delta": 0.0084903142,
      "stderr": 0.0030553504,
      "z_score": 2.7788348464,
      "p_value": 0.0054554254,
      "stat_sig": 1,
      "dx-default-pk": 1
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80224536,
      "title_desc": "ADAM SANDLER 100% FRESH",
      "mu": 0.597852833,
      "sigma": 0.8336834711,
      "n": 98087,
      "metric": "Avg Title Hour",
      "delta": 0.0109199627,
      "stderr": 0.0030607725,
      "z_score": 3.5677145614,
      "p_value": 0.0003601085,
      "stat_sig": 1,
      "dx-default-pk": 2
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 60027583,
      "title_desc": "Anger Management",
      "mu": 1.1090469854,
      "sigma": 1.3122282873,
      "n": 65317,
      "metric": "Avg Title Hour",
      "delta": -0.0143244328,
      "stderr": 0.0065117002,
      "z_score": -2.1997991961,
      "p_value": 0.027821145,
      "stat_sig": 1,
      "dx-default-pk": 3
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 60027583,
      "title_desc": "Anger Management",
      "mu": 1.1150456736,
      "sigma": 1.1672671821,
      "n": 64534,
      "metric": "Avg Title Hour",
      "delta": -0.0083257446,
      "stderr": 0.0065492425,
      "z_score": -1.2712530605,
      "p_value": 0.2036386355,
      "stat_sig": 0,
      "dx-default-pk": 4
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 60027583,
      "title_desc": "Anger Management",
      "mu": 1.1199939207,
      "sigma": 1.3154990305,
      "n": 64883,
      "metric": "Avg Title Hour",
      "delta": -0.0033774976,
      "stderr": 0.0065522984,
      "z_score": -0.515467601,
      "p_value": 0.6062263041,
      "stat_sig": 0,
      "dx-default-pk": 5
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80091747,
      "title_desc": "Bad Neighbours 2",
      "mu": 0.9034778232,
      "sigma": 0.7881021094,
      "n": 67250,
      "metric": "Avg Title Hour",
      "delta": 0.0093918277,
      "stderr": 0.004593643,
      "z_score": 2.0445271224,
      "p_value": 0.0409015008,
      "stat_sig": 1,
      "dx-default-pk": 6
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80091747,
      "title_desc": "Bad Neighbours 2",
      "mu": 0.8979491083,
      "sigma": 0.7740967554,
      "n": 67219,
      "metric": "Avg Title Hour",
      "delta": 0.0038631128,
      "stderr": 0.0045779355,
      "z_score": 0.8438547832,
      "p_value": 0.3987505581,
      "stat_sig": 0,
      "dx-default-pk": 7
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80091747,
      "title_desc": "Bad Neighbours 2",
      "mu": 0.9024226328,
      "sigma": 0.7775445753,
      "n": 67553,
      "metric": "Avg Title Hour",
      "delta": 0.0083366373,
      "stderr": 0.0045861783,
      "z_score": 1.8177743264,
      "p_value": 0.0690986322,
      "stat_sig": 0,
      "dx-default-pk": 8
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80167498,
      "title_desc": "Chris Rock: Tamborine",
      "mu": 0.7175191448,
      "sigma": 0.5990684612,
      "n": 46633,
      "metric": "Avg Title Hour",
      "delta": -0.0028193693,
      "stderr": 0.0043532247,
      "z_score": -0.6476507484,
      "p_value": 0.5172108661,
      "stat_sig": 0,
      "dx-default-pk": 9
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80167498,
      "title_desc": "Chris Rock: Tamborine",
      "mu": 0.7162497317,
      "sigma": 0.6320023051,
      "n": 46582,
      "metric": "Avg Title Hour",
      "delta": -0.0040887824,
      "stderr": 0.0043497154,
      "z_score": -0.9400114594,
      "p_value": 0.3472116827,
      "stat_sig": 0,
      "dx-default-pk": 10
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80167498,
      "title_desc": "Chris Rock: Tamborine",
      "mu": 0.7156763111,
      "sigma": 0.5938768049,
      "n": 46423,
      "metric": "Avg Title Hour",
      "delta": -0.004662203,
      "stderr": 0.0043507876,
      "z_score": -1.0715767814,
      "p_value": 0.2839101668,
      "stat_sig": 0,
      "dx-default-pk": 11
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 60027689,
      "title_desc": "Daddy Day Care",
      "mu": 1.5685988382,
      "sigma": 1.7751786072,
      "n": 532566,
      "metric": "Avg Title Hour",
      "delta": 0.0010959519,
      "stderr": 0.0033264146,
      "z_score": 0.3294694242,
      "p_value": 0.741800901,
      "stat_sig": 0,
      "dx-default-pk": 12
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 60027689,
      "title_desc": "Daddy Day Care",
      "mu": 1.5670654112,
      "sigma": 1.7792279109,
      "n": 532511,
      "metric": "Avg Title Hour",
      "delta": -0.0004374752,
      "stderr": 0.0033251535,
      "z_score": -0.1315654037,
      "p_value": 0.8953280514,
      "stat_sig": 0,
      "dx-default-pk": 13
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 60027689,
      "title_desc": "Daddy Day Care",
      "mu": 1.5648010332,
      "sigma": 1.767849316,
      "n": 533333,
      "metric": "Avg Title Hour",
      "delta": -0.0027018531,
      "stderr": 0.003321653,
      "z_score": -0.8134061868,
      "p_value": 0.4159852134,
      "stat_sig": 0,
      "dx-default-pk": 14
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80064512,
      "title_desc": "Daddy's Home",
      "mu": 1.2239471612,
      "sigma": 1.0484910713,
      "n": 60263,
      "metric": "Avg Title Hour",
      "delta": -0.0011853652,
      "stderr": 0.0065052201,
      "z_score": -0.1822175356,
      "p_value": 0.855412012,
      "stat_sig": 0,
      "dx-default-pk": 15
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80064512,
      "title_desc": "Daddy's Home",
      "mu": 1.2242715471,
      "sigma": 1.0180267743,
      "n": 60079,
      "metric": "Avg Title Hour",
      "delta": -0.0008609793,
      "stderr": 0.0065103204,
      "z_score": -0.132248379,
      "p_value": 0.8947878363,
      "stat_sig": 0,
      "dx-default-pk": 16
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80064512,
      "title_desc": "Daddy's Home",
      "mu": 1.2353181269,
      "sigma": 1.0762313591,
      "n": 60128,
      "metric": "Avg Title Hour",
      "delta": 0.0101856005,
      "stderr": 0.0065439172,
      "z_score": 1.5564989731,
      "p_value": 0.1195894867,
      "stat_sig": 0,
      "dx-default-pk": 17
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80201490,
      "title_desc": "Dumplin'",
      "mu": 1.8468883853,
      "sigma": 1.4085745468,
      "n": 1946109,
      "metric": "Avg Title Hour",
      "delta": 0.0018144701,
      "stderr": 0.0016610331,
      "z_score": 1.0923744522,
      "p_value": 0.2746685476,
      "stat_sig": 0,
      "dx-default-pk": 18
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80201490,
      "title_desc": "Dumplin'",
      "mu": 1.8455989737,
      "sigma": 1.4287403349,
      "n": 1946474,
      "metric": "Avg Title Hour",
      "delta": 0.0005250585,
      "stderr": 0.00166024,
      "z_score": 0.3162545897,
      "p_value": 0.7518092757,
      "stat_sig": 0,
      "dx-default-pk": 19
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80201490,
      "title_desc": "Dumplin'",
      "mu": 1.846299687,
      "sigma": 1.3880864048,
      "n": 1948496,
      "metric": "Avg Title Hour",
      "delta": 0.0012257719,
      "stderr": 0.0016603254,
      "z_score": 0.738272063,
      "p_value": 0.4603491396,
      "stat_sig": 0,
      "dx-default-pk": 20
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 81040620,
      "title_desc": 'Ellen DeGeneres: Relatable: Special: "Relatable"',
      "mu": 0.950743695,
      "sigma": 0.7091637715,
      "n": 1251746,
      "metric": "Avg Title Hour",
      "delta": 0.0011419881,
      "stderr": 0.0010618671,
      "z_score": 1.0754529219,
      "p_value": 0.2821719989,
      "stat_sig": 0,
      "dx-default-pk": 21
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 81040620,
      "title_desc": 'Ellen DeGeneres: Relatable: Special: "Relatable"',
      "mu": 0.950091048,
      "sigma": 0.7147029973,
      "n": 1250717,
      "metric": "Avg Title Hour",
      "delta": 0.0004893411,
      "stderr": 0.001061556,
      "z_score": 0.4609658563,
      "p_value": 0.6448231017,
      "stat_sig": 0,
      "dx-default-pk": 22
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 81040620,
      "title_desc": 'Ellen DeGeneres: Relatable: Special: "Relatable"',
      "mu": 0.9502520268,
      "sigma": 0.7123036121,
      "n": 1250418,
      "metric": "Avg Title Hour",
      "delta": 0.0006503199,
      "stderr": 0.0010617169,
      "z_score": 0.6125172634,
      "p_value": 0.5401955797,
      "stat_sig": 0,
      "dx-default-pk": 23
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80194946,
      "title_desc": "Franco Escamilla: Por la anécdota",
      "mu": 0.8700592557,
      "sigma": 0.8296686917,
      "n": 61063,
      "metric": "Avg Title Hour",
      "delta": 0.0017495982,
      "stderr": 0.0048185048,
      "z_score": 0.3630998164,
      "p_value": 0.7165303218,
      "stat_sig": 0,
      "dx-default-pk": 24
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80194946,
      "title_desc": "Franco Escamilla: Por la anécdota",
      "mu": 0.8678082829,
      "sigma": 0.8552846175,
      "n": 61456,
      "metric": "Avg Title Hour",
      "delta": -0.0005013746,
      "stderr": 0.0048046534,
      "z_score": -0.1043518815,
      "p_value": 0.9168901071,
      "stat_sig": 0,
      "dx-default-pk": 25
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80194946,
      "title_desc": "Franco Escamilla: Por la anécdota",
      "mu": 0.8744272851,
      "sigma": 0.9179679267,
      "n": 61191,
      "metric": "Avg Title Hour",
      "delta": 0.0061176275,
      "stderr": 0.0048290591,
      "z_score": 1.266836324,
      "p_value": 0.2052138209,
      "stat_sig": 0,
      "dx-default-pk": 26
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80117628,
      "title_desc":
        "Gabriel lglesias: I’m Sorry For What I Said When I Was Hungry",
      "mu": 1.1075547132,
      "sigma": 1.3980813666,
      "n": 131646,
      "metric": "Avg Title Hour",
      "delta": 0.0006840859,
      "stderr": 0.0051873179,
      "z_score": 0.1318766203,
      "p_value": 0.8950818814,
      "stat_sig": 0,
      "dx-default-pk": 27
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80117628,
      "title_desc":
        "Gabriel lglesias: I’m Sorry For What I Said When I Was Hungry",
      "mu": 1.1064836066,
      "sigma": 1.3029547137,
      "n": 130713,
      "metric": "Avg Title Hour",
      "delta": -0.0003870207,
      "stderr": 0.0051976405,
      "z_score": -0.0744608453,
      "p_value": 0.9406436955,
      "stat_sig": 0,
      "dx-default-pk": 28
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80117628,
      "title_desc":
        "Gabriel lglesias: I’m Sorry For What I Said When I Was Hungry",
      "mu": 1.1002371704,
      "sigma": 1.1918451827,
      "n": 130874,
      "metric": "Avg Title Hour",
      "delta": -0.0066334568,
      "stderr": 0.0051854209,
      "z_score": -1.2792513791,
      "p_value": 0.2008085482,
      "stat_sig": 0,
      "dx-default-pk": 29
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 70097579,
      "title_desc": "Mamma Mia!",
      "mu": 1.2548990467,
      "sigma": 2.2742188515,
      "n": 113749,
      "metric": "Avg Title Hour",
      "delta": -0.0016130943,
      "stderr": 0.0081502051,
      "z_score": -0.1979207029,
      "p_value": 0.843107106,
      "stat_sig": 0,
      "dx-default-pk": 30
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 70097579,
      "title_desc": "Mamma Mia!",
      "mu": 1.2502862809,
      "sigma": 2.4461371951,
      "n": 113423,
      "metric": "Avg Title Hour",
      "delta": -0.0062258602,
      "stderr": 0.0081532421,
      "z_score": -0.763605462,
      "p_value": 0.4451023934,
      "stat_sig": 0,
      "dx-default-pk": 31
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 70097579,
      "title_desc": "Mamma Mia!",
      "mu": 1.2599844979,
      "sigma": 2.5438696979,
      "n": 113103,
      "metric": "Avg Title Hour",
      "delta": 0.0034723569,
      "stderr": 0.0081754884,
      "z_score": 0.4247277583,
      "p_value": 0.671035146,
      "stat_sig": 0,
      "dx-default-pk": 32
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 70271959,
      "title_desc": "Masterminds",
      "mu": 0.9123635781,
      "sigma": 0.9490135545,
      "n": 106797,
      "metric": "Avg Title Hour",
      "delta": -0.0058821933,
      "stderr": 0.0042270721,
      "z_score": -1.3915526326,
      "p_value": 0.1640579111,
      "stat_sig": 0,
      "dx-default-pk": 33
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 70271959,
      "title_desc": "Masterminds",
      "mu": 0.9162121675,
      "sigma": 0.9720630374,
      "n": 107484,
      "metric": "Avg Title Hour",
      "delta": -0.002033604,
      "stderr": 0.004227123,
      "z_score": -0.4810846492,
      "p_value": 0.6304563378,
      "stat_sig": 0,
      "dx-default-pk": 34
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 70271959,
      "title_desc": "Masterminds",
      "mu": 0.9118635014,
      "sigma": 1.0588226229,
      "n": 107006,
      "metric": "Avg Title Hour",
      "delta": -0.0063822701,
      "stderr": 0.0042237257,
      "z_score": -1.5110522141,
      "p_value": 0.1307751482,
      "stat_sig": 0,
      "dx-default-pk": 35
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 699257,
      "title_desc": "Monty Python's Life of Brian",
      "mu": 0.7867512504,
      "sigma": 0.8210517492,
      "n": 49540,
      "metric": "Avg Title Hour",
      "delta": 0.0020179913,
      "stderr": 0.0050580069,
      "z_score": 0.3989696675,
      "p_value": 0.6899155544,
      "stat_sig": 0,
      "dx-default-pk": 36
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 699257,
      "title_desc": "Monty Python's Life of Brian",
      "mu": 0.7825564463,
      "sigma": 0.8596981922,
      "n": 49457,
      "metric": "Avg Title Hour",
      "delta": -0.0021768127,
      "stderr": 0.0050469344,
      "z_score": -0.4313138598,
      "p_value": 0.666240174,
      "stat_sig": 0,
      "dx-default-pk": 37
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 699257,
      "title_desc": "Monty Python's Life of Brian",
      "mu": 0.7801233613,
      "sigma": 0.8732259277,
      "n": 49437,
      "metric": "Avg Title Hour",
      "delta": -0.0046098978,
      "stderr": 0.0050398001,
      "z_score": -0.9146985459,
      "p_value": 0.360349908,
      "stat_sig": 0,
      "dx-default-pk": 38
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80214464,
      "title_desc": "Rafinha Bastos: Ultimatum",
      "mu": 0.5589634416,
      "sigma": 0.7327714306,
      "n": 8279,
      "metric": "Avg Title Hour",
      "delta": 0.0138183916,
      "stderr": 0.0098387694,
      "z_score": 1.4044837298,
      "p_value": 0.1601748533,
      "stat_sig": 0,
      "dx-default-pk": 39
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80214464,
      "title_desc": "Rafinha Bastos: Ultimatum",
      "mu": 0.5544310715,
      "sigma": 0.8551673541,
      "n": 8184,
      "metric": "Avg Title Hour",
      "delta": 0.0092860214,
      "stderr": 0.009843872,
      "z_score": 0.9433301682,
      "p_value": 0.3455120496,
      "stat_sig": 0,
      "dx-default-pk": 40
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80214464,
      "title_desc": "Rafinha Bastos: Ultimatum",
      "mu": 0.5432805315,
      "sigma": 0.7879449017,
      "n": 8312,
      "metric": "Avg Title Hour",
      "delta": -0.0018645186,
      "stderr": 0.0097223433,
      "z_score": -0.1917766662,
      "p_value": 0.8479171493,
      "stat_sig": 0,
      "dx-default-pk": 41
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 70044894,
      "title_desc": "Talladega Nights: The Ballad of Ricky Bobby",
      "mu": 1.3169784719,
      "sigma": 1.0283757173,
      "n": 11045,
      "metric": "Avg Title Hour",
      "delta": -0.0063107953,
      "stderr": 0.0167179097,
      "z_score": -0.377487105,
      "p_value": 0.7058116455,
      "stat_sig": 0,
      "dx-default-pk": 42
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 70044894,
      "title_desc": "Talladega Nights: The Ballad of Ricky Bobby",
      "mu": 1.3185996673,
      "sigma": 1.0379127132,
      "n": 11020,
      "metric": "Avg Title Hour",
      "delta": -0.0046896,
      "stderr": 0.0167377645,
      "z_score": -0.2801807825,
      "p_value": 0.7793388098,
      "stat_sig": 0,
      "dx-default-pk": 43
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 70044894,
      "title_desc": "Talladega Nights: The Ballad of Ricky Bobby",
      "mu": 1.3073010276,
      "sigma": 0.9687809292,
      "n": 11061,
      "metric": "Avg Title Hour",
      "delta": -0.0159882396,
      "stderr": 0.0166444793,
      "z_score": -0.9605731299,
      "p_value": 0.3367668445,
      "stat_sig": 0,
      "dx-default-pk": 44
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80202273,
      "title_desc": "The Last Laugh",
      "mu": 1.113574275,
      "sigma": 0.8298975339,
      "n": 935759,
      "metric": "Avg Title Hour",
      "delta": -0.0001186462,
      "stderr": 0.0014349329,
      "z_score": -0.0826841381,
      "p_value": 0.9341026977,
      "stat_sig": 0,
      "dx-default-pk": 45
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80202273,
      "title_desc": "The Last Laugh",
      "mu": 1.1151251477,
      "sigma": 0.8305908302,
      "n": 935950,
      "metric": "Avg Title Hour",
      "delta": 0.0014322265,
      "stderr": 0.0014361669,
      "z_score": 0.9972562779,
      "p_value": 0.3186401303,
      "stat_sig": 0,
      "dx-default-pk": 46
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80202273,
      "title_desc": "The Last Laugh",
      "mu": 1.1129791919,
      "sigma": 0.8268447929,
      "n": 935414,
      "metric": "Avg Title Hour",
      "delta": -0.0007137293,
      "stderr": 0.0014345339,
      "z_score": -0.4975339477,
      "p_value": 0.6188125697,
      "stat_sig": 0,
      "dx-default-pk": 47
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80091658,
      "title_desc": "True Memoirs of an International Assassin",
      "mu": 1.0618846627,
      "sigma": 0.9802735522,
      "n": 152397,
      "metric": "Avg Title Hour",
      "delta": 0.0022518239,
      "stderr": 0.0037419038,
      "z_score": 0.6017856171,
      "p_value": 0.5473168503,
      "stat_sig": 0,
      "dx-default-pk": 48
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80091658,
      "title_desc": "True Memoirs of an International Assassin",
      "mu": 1.0653117346,
      "sigma": 0.8776927612,
      "n": 151794,
      "metric": "Avg Title Hour",
      "delta": 0.0056788958,
      "stderr": 0.0037517922,
      "z_score": 1.5136488267,
      "p_value": 0.1301149303,
      "stat_sig": 0,
      "dx-default-pk": 49
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80091658,
      "title_desc": "True Memoirs of an International Assassin",
      "mu": 1.0599924381,
      "sigma": 0.905978521,
      "n": 152042,
      "metric": "Avg Title Hour",
      "delta": 0.0003595993,
      "stderr": 0.0037404321,
      "z_score": 0.0961384423,
      "p_value": 0.9234106201,
      "stat_sig": 0,
      "dx-default-pk": 50
    },
    {
      "index": 1,
      "test_cell_nbr": 2,
      "title_id": 80134886,
      "title_desc": "Un Padre No Tan Padre",
      "mu": 1.063293136,
      "sigma": 1.0488653712,
      "n": 9405,
      "metric": "Avg Title Hour",
      "delta": -0.0190710232,
      "stderr": 0.0165731005,
      "z_score": -1.1507215068,
      "p_value": 0.2498468257,
      "stat_sig": 0,
      "dx-default-pk": 51
    },
    {
      "index": 2,
      "test_cell_nbr": 3,
      "title_id": 80134886,
      "title_desc": "Un Padre No Tan Padre",
      "mu": 1.0658487878,
      "sigma": 1.0498543601,
      "n": 9670,
      "metric": "Avg Title Hour",
      "delta": -0.0165153714,
      "stderr": 0.0164593794,
      "z_score": -1.0034018292,
      "p_value": 0.3156670219,
      "stat_sig": 0,
      "dx-default-pk": 52
    },
    {
      "index": 3,
      "test_cell_nbr": 4,
      "title_id": 80134886,
      "title_desc": "Un Padre No Tan Padre",
      "mu": 1.0733820012,
      "sigma": 1.0622943335,
      "n": 9429,
      "metric": "Avg Title Hour",
      "delta": -0.008982158,
      "stderr": 0.016628228,
      "z_score": -0.5401752987,
      "p_value": 0.5890761459,
      "stat_sig": 0,
      "dx-default-pk": 53
    }
  ],
  axes: [
    {
      orient: "right",
      marginalSummaryType: {
        type: "ridgeline",
        showPoints: true
      }
    },
    {
      orient: "left",
      marginalSummaryType: {
        type: "boxplot",
        showPoints: true
      }
    },
    {
      orient: "top",
      marginalSummaryType: {
        type: "heatmap",
        showPoints: true
      }
    },
    {
      orient: "bottom",
      marginalSummaryType: {
        type: "violin",
        showPoints: true
      }
    }
  ],
  canvasPoints: false,
  summaryType: { type: "trendline", regressionType: "polynomial" },
  summaryStyle: { fill: "none", stroke: "darkred", strokeWidth: 2 },
  hoverAnnotation: true,
  responsiveWidth: false,
  size: [575, 430],
  margin: { left: 75, bottom: 50, right: 150, top: 30 },
  annotationSettings: {
    layout: { type: "marginalia", orient: "right", marginOffset: 30 }
  }
}

const components = []
const pointTestData = []
const nRando = randomNormal(0, 1000)
const pRando = randomNormal(0, 1000)

const steps = ["none", "#FBEEEC", "#f3c8c2", "#e39787", "#ce6751", "#b3331d"]
const thresholds = scaleThreshold()
  .domain([0.01, 0.25, 0.5, 0.75, 1])
  .range(steps)

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: nRando() * 2 - 3000,
    y: 2000 + nRando(),
    color: "#00a2ce"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: 1000 + pRando(),
    y: 1000 + pRando() * 2,
    color: "#4d430c"
  })
}
for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() - 1000,
    y: pRando() * 2 - 1000,
    color: "#b3331d"
  })
}

for (let x = 1; x < 100; x++) {
  pointTestData.push({
    x: pRando() + 1000,
    y: pRando() * 2 - 2000,
    color: "#b6a756"
  })
}

const preprocessedHexbinData = hexbinning({
  summaryType: { type: "hexbin" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})

const preprocessedHeatmapData = heatmapping({
  summaryType: { type: "heatmap" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})

export default class CreatingXYPlots extends React.Component {
  render() {
    const examples = []
    examples.push({
      name: "Data",
      demo: (
        <div>
          <p>
            XYFrame lets you present points as simple scatterplots but also
            exposes area functions that let you see the density of those points
            with contours, hexbins and grids.
          </p>
          <p>This is the dataset we'll be using in our examples:</p>
        </div>
      ),
      source: `const pointTestData = [
  { x: 5, y: 10, color: "blue },
  { x: 20, y: -20, color: "red"}
]`
    })

    examples.push({
      name: "Scatterplot",
      demo: (
        <div>
          <p>
            Making a scatterplot from this kind of data is simple, just send the
            array to the points attribute of an XYFrame.
          </p>
          <XYFrame {...roxySettings} />
          <XYFrame
            points={pointTestData}
            xAccessor={["x", d => d.x + 1000]}
            yAccessor="y"
            pointStyle={d => ({ fill: d.color })}
            yExtent={[-8500, 8500]}
            //            areaType={{ type: "trendline", regressionType: "logarithmic" }}
            areaStyle={{ stroke: "darkred" }}
            axes={[
              {
                orient: "bottom",
                marginalSummaryType: {
                  type: "ridgeline",
                  showPoints: true,
                  summaryStyle: {
                    fill: "orange",
                    stroke: "brown",
                    fillOpacity: 0.25
                  },
                  pointStyle: {
                    fill: "red",
                    r: 4,
                    fillOpacity: 0.05
                  }
                }
              },
              {
                orient: "left",
                marginalSummaryType: {
                  type: "ridgeline",
                  bins: 4,
                  showPoints: true
                }
              },
              {
                orient: "right",
                marginalSummaryType: {
                  type: "ridgeline",
                  showPoints: true
                }
              },
              {
                orient: "top",
                marginalSummaryType: { type: "ridgeline", showPoints: true }
              }
            ]}
          />
        </div>
      ),
      source: `          <XYFrame
      points={pointTestData}
      xAccessor="x"
      yAccessor="y"
      pointStyle={d => ({ fill: d.color })}
    />`
    })

    examples.push({
      name: "Heatmap",
      demo: (
        <div>
          <p>
            A heatmap, or any other area visualization, requires us to send the
            points data as a coordinates attribute of an object being sent to
            the areas prop of an XYFrame. By setting the summaryType to
            "heatmap" we get a grid of density of that same data.
          </p>
          <p>
            The heatmap cell size is by default set to 5% of the size of the
            XYFrame (which can result in rectangles). You can pass a xBins or
            yBins (they take a number of bins or a percent if less than 1) or
            xCellPx or yCellPx (which take a pixel size of the cell) or any
            combination to create a cell. If you send the pixel size for one
            side it will default to a square of that pixel size but you can set
            the x to cell pixel size and the y to bin number (or percent) if you
            want. If the sizes don't match up with the size of your frame it can
            result in overflowing cells if it is not wholly divisible by your
            frame size.
          </p>
          <p>
            Each cell has an associated datapoint with a calculated percent
            indicating the number of items in that cell. If you turn
            hoverAnnotation on, the grid exposes a hover point at each center
            which has a binItems property with all the points in that cell. You
            can use this to display a simple count (as in this example) or a
            data visualization of the points in that grid, or anything else you
            want in the tooltip using tooltipContent.
          </p>
          <p>
            Heatmap will handle low or power scales, whereas hexbin will not.
          </p>
          <XYFrame
            size={[500, 800]}
            summaries={[{ coordinates: pointTestData }]}
            summaryType={{
              type: "heatmap",
              yBins: 10,
              xCellPx: 35,
              binMax: binMax => console.info("bin max", binMax)
            }}
            useAreasAsInteractionLayer={true}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill: thresholds(d.percent),
              stroke: "black"
            })}
            showSummaryPoints={true}
            hoverAnnotation={true}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>Points in cell: {d.binItems.length}</p>
                </div>
              )
            }}
            areaRenderMode={{
              renderMode: "sketchy",
              fillWeight: 3,
              hachureGap: 4
            }}
            margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
            axes={[
              { orient: "left", footer: true },
              { orient: "bottom", footer: true }
            ]}
          />
        </div>
      ),
      source: `<XYFrame
      size={[500, 800]}
      areas={[{ coordinates: pointTestData }]}
      summaryType={{ type: "heatmap", yBins: 10, xCellPx: 50 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => ({
        fill: thresholds(d.percent),
        stroke: "black"
      })}
      hoverAnnotation={true}
      tooltipContent={d => {
        return (
          <div className="tooltip-content">
            <p>Points in cell: {d.binItems.length}</p>
          </div>
        )
      }}
      margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
      axes={[
        { orient: "left", footer: true },
        { orient: "bottom", footer: true }
      ]}
    />`
    })
    function makeHex(h) {
      const hexBase = h.hexCoordinates.map(d => [
        d[0] * h.percent,
        d[1] * h.percent
      ])

      const sortedColors = h.binItems
        .map(d => d.color)
        .sort((a, b) => {
          if (a < b) return -1
          if (a > b) return 1
          return -1
        })
      const step = sortedColors.length / 6

      return (
        <g>
          {hexBase.map((d, i) => {
            const n = hexBase[i + 1] || hexBase[0]
            const hexStep = parseInt(step * i)
            return (
              <path
                fill={sortedColors[hexStep]}
                stroke={"white"}
                strokeWidth={0.5}
                key={`hex-slice-${i}`}
                d={`M0,0L${d[0]},${d[1]}L${n[0]},${n[1]}Z`}
              />
            )
          })}
          <path
            d={`M${h.hexCoordinates.map(d => d.join(",")).join("L")}Z`}
            fill="none"
            stroke="black"
          />
        </g>
      )
    }
    examples.push({
      name: "Hexbin",
      demo: (
        <div>
          <p>
            A second kind of summaryType available in XYFrame is the hexbin.
            It's fundamentally the same as a grid but there's less visual
            distortion because a grid cell center is much more distant from the
            corners of the cell than it is from the sides, whereas with a hex
            this distortion is significantly decreased. Unlike with heatmap you
            cannot control the distortion of the hexbin, you can only set it to
            a pixel size using cellPx or a number of bins (using a number or a
            percent if less than 1) which will base the number off the width of
            the frame.
          </p>
          <p>
            Like the heatmap, a hexbin exposes binItems for tooltips and a
            percent calculation for styling.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            summaryType={{
              type: "hexbin",
              bins: 10
            }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill: thresholds(d.percent),
              stroke: "black"
            })}
            hoverAnnotation={true}
            tooltipContent={d => {
              return (
                <div className="tooltip-content">
                  <p>{(d.binItems && d.binItems.length) || "empty"}</p>
                </div>
              )
            }}
            margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
            axes={[
              { orient: "left", footer: true },
              { orient: "bottom", footer: true }
            ]}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaType={{ type: "hexbin", xBins: 10 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => ({
        fill: thresholds(d.percent),
        stroke: "black"
      })}
      areaRenderMode="sketchy"
      hoverAnnotation={true}
      tooltipContent={d => {
        return (
          <div className="tooltip-content">
            <p>{d.binItems.length}</p>
          </div>
        )
      }}
      margin={{ left: 60, bottom: 60, top: 30, right: 30 }}
      axes={[
        { orient: "left", footer: true },
        { orient: "bottom", footer: true }
      ]}
    />`
    })

    examples.push({
      name: "Contour Plot",
      demo: (
        <div>
          <p>
            A contour plot results from setting the areaType to "contour". The
            contours are regions of density of that same data.
          </p>
          <p>
            The contour shapes in Semiotic are basically just graphics, they
            don't have any data about which points fall within them and the
            particular method they're drawn means they overlap on each other, so
            the main way to visualize them is via fillOpacity.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaType="contour"
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({ fill: thresholds(d.percent), stroke: "black" })}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaType="contour"
      xAccessor="x"
      yAccessor="y"
      areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
    />`
    })

    examples.push({
      name: "Contour Plot",
      demo: (
        <div>
          <p>
            If you want to layer the area visualization with points for your
            readers, you can add the points separately (like the scatterplot) or
            use the showSummaryPoints property (it was named that because it
            started out for line charts, but the same principle applies to area
            charts) that when set to true will draw the points. You can pair
            this with hoverAnnotation for interactivity.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            showSummaryPoints={true}
            areaType={{ type: "contour", thresholds: 5 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({ fill: thresholds(d.percent), stroke: "black" })}
            pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
            hoverAnnotation={true}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      showSummaryPoints={true}
      areaType="contour"
      xAccessor="x"
      yAccessor="y"
      areaStyle={{ fill: "#b3331d", fillOpacity: 0.2 }}
      pointStyle={{ fill: "none", stroke: "black", strokeOpacity: 0.5 }}
      hoverAnnotation={true}
    />`
    })

    examples.push({
      name: "Multi-Accessor",
      demo: (
        <div>
          <p>
            You can send an array of accessors to areaDataAccessor (or xAccessor
            or yAccessor). The parentSummary has the same basic properties you
            pass but you can inspect the _baseData property to get access to the
            data generated by the areaDataAccessor.
          </p>
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaDataAccessor={[
              d => d.coordinates.filter(p => p.color === "#4d430c"),
              d => d.coordinates.filter(p => p.color === "#00a2ce")
            ]}
            areaType={{ type: "contour", thresholds: 5 }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => {
              return {
                stroke: d.parentSummary._baseData[0].color,
                fill: "none",
                strokeOpacity: 0.5,
                strokeWidth: 3,
                strokeDasharray: "15 5"
              }
            }}
          />
        </div>
      ),
      source: `<XYFrame
      areas={[{ coordinates: pointTestData }]}
      areaDataAccessor={[
        d => d.coordinates.filter(p => p.color === "#4d430c"),
        d => d.coordinates.filter(p => p.color === "#00a2ce")
      ]}
      areaType={{ type: "contour", thresholds: 5 }}
      xAccessor="x"
      yAccessor="y"
      areaStyle={d => {
        return {
          stroke: d.parentSummary._baseData[0].color,
          fill: "none",
          strokeOpacity: 0.5,
          strokeWidth: 3,
          strokeDasharray: "15 5"
        }
      }}
    />`
    })

    examples.push({
      name: "Preprocessed Data",
      demo: (
        <div>
          <p>
            Hexbin and heatmap both accept a customMark property allowing you to
            draw a custom mark in the space of the cell or hex.
          </p>
          <XYFrame
            title={`Max Bin: ${preprocessedHexbinData.binMax} (Gold)`}
            size={[500, 500]}
            areas={preprocessedHexbinData}
            areaType={{
              type: "hexbin"
            }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill:
                d.value === preprocessedHexbinData.binMax
                  ? "gold"
                  : thresholds(d.percent),
              stroke: "black"
            })}
          />
          <XYFrame
            title={`Max Bin: ${preprocessedHeatmapData.binMax} (Gold)`}
            size={[500, 500]}
            areas={preprocessedHeatmapData}
            areaType={{
              type: "heatmap"
            }}
            xAccessor="x"
            yAccessor="y"
            areaStyle={d => ({
              fill:
                d.value === preprocessedHeatmapData.binMax
                  ? "gold"
                  : thresholds(d.percent),
              stroke: "black"
            })}
          />
        </div>
      ),
      source: `const preprocessedHexbinData = hexbinning({
  areaType: { type: "hexbin" },
  data: { coordinates: pointTestData },
  size: [500, 500]
})
      `
    })

    examples.push({
      name: "Custom Glyphs",
      demo: (
        <div>
          <p>
            Hexbin and heatmap both accept a customMark property allowing you to
            draw a custom mark in the space of the cell or hex.
          </p>
          <XYFrame
            size={[500, 800]}
            areas={[{ coordinates: pointTestData }]}
            areaType={{
              type: "heatmap",
              yBins: 10,
              xCellPx: 35,
              customMark: ({ d }) => {
                return (
                  <ellipse
                    fill={thresholds(d.percent)}
                    stroke="none"
                    cx={d.gw / 2}
                    cy={d.gh / 2}
                    rx={(d.gw / 2) * d.percent}
                    ry={(d.gh / 2) * d.percent}
                  />
                )
              }
            }}
            xAccessor="x"
            yAccessor="y"
          />
          <XYFrame
            areas={[{ coordinates: pointTestData }]}
            areaType={{
              type: "hexbin",
              bins: 10,
              customMark: ({ d }) => makeHex(d)
            }}
            xAccessor="x"
            yAccessor="y"
            baseMarkProps={{ forceUpdate: true }}
          />
        </div>
      ),
      source: `//customMark for heatmap
<XYFrame
size={[500, 800]}
areas={[{ coordinates: pointTestData }]}
areaType={{
  type: "heatmap",
  yBins: 10,
  xCellPx: 35,
  customMark: d => (
    <ellipse
      fill={thresholds(d.percent)}
      stroke="none"
      cx={d.gw / 2}
      cy={d.gh / 2}
      rx={d.gw / 2 * d.percent}
      ry={d.gh / 2 * d.percent}
    />
  )
}}
xAccessor="x"
yAccessor="y"
/>
    
//customMark for hexbin
function makeHex(h) {
  const hexBase = h.hexCoordinates.map(d => [
    d[0] * h.percent,
    d[1] * h.percent
  ])

  const sortedColors = h.binItems.map(d => d.color).sort((a, b) => a < b)
  const step = sortedColors.length / 6

  return (
    <g>
      {hexBase.map((d, i) => {
        const n = hexBase[i + 1] || hexBase[0]
        const hexStep = parseInt(step * i)
        return (
          <path
            fill={sortedColors[hexStep]}
            stroke={"white"}
            strokeWidth={0.5}
            key={${"`hex-slice-${i}`"}}
            d={${"`M0,0L${d[0]},${d[1]}L${n[0]},${n[1]}Z`"}}
          />
        )
      })}
      <path
        d={${"`M${h.hexCoordinates.map(d => d.join(',')).join('L')}Z`"}}
        fill="none"
        stroke="black"
      />
    </g>
  )
}
<XYFrame
areas={[{ coordinates: pointTestData }]}
areaType={{
  type: "hexbin",
  bins: 10,
  customMark: d => makeHex(d)
}}
xAccessor="x"
yAccessor="y"
    />`
    })
    return (
      <DocumentComponent
        name="Creating XY Plots"
        components={components}
        examples={examples}
        buttons={[]}
      >
        <p>
          The very basics of how to create XY Plots such as scatterplots, grids
          and hexbins with Semiotic.
        </p>
      </DocumentComponent>
    )
  }
}

CreatingXYPlots.title = "Creating XY Plots"

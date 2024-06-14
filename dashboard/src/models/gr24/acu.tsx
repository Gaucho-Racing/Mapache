export interface ACU {
  id: string;
  vehicle_id: string;
  created_at: Date;

  accumulator_voltage: number;
  accumulator_current: number;
  max_cell_temp: number;

  // Errors
  errors: number;
  over_temp_error: boolean;
  over_voltage_error: boolean;
  over_current_error: boolean;
  bms_error: boolean;
  under_voltage_error: boolean;
  precharge_error: boolean;
  teensy_error: boolean;
  under_temp_error: boolean;

  // Warnings
  warnings: number;
  open_wire_warning: boolean;
  adc_warning: boolean;
  cell_warning: boolean;
  high_current_warning: boolean;
  low_charge_state_warning: boolean;
  cell_imbalance_warning: boolean;
  humidity_warning: boolean;
  hydrogen_warning: boolean;

  ts_voltage: number;

  // States
  states: number;
  is_air_positive: boolean;
  is_air_negative: boolean;
  is_precharging: boolean;
  is_precharge_done: boolean;
  is_shutdown: boolean;

  max_bal_resistor_temp: number;
  sdc_voltage: number;
  glv_voltage: number;
  state_of_charge: number;
  fan1_speed: number;
  fan2_speed: number;
  fan3_speed: number;
  pump_speed: number;
  acu_temp1: number;
  acu_temp2: number;
  acu_temp3: number;

  // CoolingErrors
  cooling_errors: number;
  water_overtemp_error: boolean;
  fan1_error: boolean;
  fan2_error: boolean;
  fan3_error: boolean;
  fan4_error: boolean;
  pump_error: boolean;

  // Cell Voltages
  cell0_voltage: number;
  cell1_voltage: number;
  cell2_voltage: number;
  cell3_voltage: number;
  cell4_voltage: number;
  cell5_voltage: number;
  cell6_voltage: number;
  cell7_voltage: number;
  cell8_voltage: number;
  cell9_voltage: number;
  cell10_voltage: number;
  cell11_voltage: number;
  cell12_voltage: number;
  cell13_voltage: number;
  cell14_voltage: number;
  cell15_voltage: number;
  cell16_voltage: number;
  cell17_voltage: number;
  cell18_voltage: number;
  cell19_voltage: number;
  cell20_voltage: number;
  cell21_voltage: number;
  cell22_voltage: number;
  cell23_voltage: number;
  cell24_voltage: number;
  cell25_voltage: number;
  cell26_voltage: number;
  cell27_voltage: number;
  cell28_voltage: number;
  cell29_voltage: number;
  cell30_voltage: number;
  cell31_voltage: number;
  cell32_voltage: number;
  cell33_voltage: number;
  cell34_voltage: number;
  cell35_voltage: number;
  cell36_voltage: number;
  cell37_voltage: number;
  cell38_voltage: number;
  cell39_voltage: number;
  cell40_voltage: number;
  cell41_voltage: number;
  cell42_voltage: number;
  cell43_voltage: number;
  cell44_voltage: number;
  cell45_voltage: number;
  cell46_voltage: number;
  cell47_voltage: number;
  cell48_voltage: number;
  cell49_voltage: number;
  cell50_voltage: number;
  cell51_voltage: number;
  cell52_voltage: number;
  cell53_voltage: number;
  cell54_voltage: number;
  cell55_voltage: number;
  cell56_voltage: number;
  cell57_voltage: number;
  cell58_voltage: number;
  cell59_voltage: number;
  cell60_voltage: number;
  cell61_voltage: number;
  cell62_voltage: number;
  cell63_voltage: number;
  cell64_voltage: number;
  cell65_voltage: number;
  cell66_voltage: number;
  cell67_voltage: number;
  cell68_voltage: number;
  cell69_voltage: number;
  cell70_voltage: number;
  cell71_voltage: number;
  cell72_voltage: number;
  cell73_voltage: number;
  cell74_voltage: number;
  cell75_voltage: number;
  cell76_voltage: number;
  cell77_voltage: number;
  cell78_voltage: number;
  cell79_voltage: number;
  cell80_voltage: number;
  cell81_voltage: number;
  cell82_voltage: number;
  cell83_voltage: number;
  cell84_voltage: number;
  cell85_voltage: number;
  cell86_voltage: number;
  cell87_voltage: number;
  cell88_voltage: number;
  cell89_voltage: number;
  cell90_voltage: number;
  cell91_voltage: number;
  cell92_voltage: number;
  cell93_voltage: number;
  cell94_voltage: number;
  cell95_voltage: number;
  cell96_voltage: number;
  cell97_voltage: number;
  cell98_voltage: number;
  cell99_voltage: number;
  cell100_voltage: number;
  cell101_voltage: number;
  cell102_voltage: number;
  cell103_voltage: number;
  cell104_voltage: number;
  cell105_voltage: number;
  cell106_voltage: number;
  cell107_voltage: number;
  cell108_voltage: number;
  cell109_voltage: number;
  cell110_voltage: number;
  cell111_voltage: number;
  cell112_voltage: number;
  cell113_voltage: number;
  cell114_voltage: number;
  cell115_voltage: number;
  cell116_voltage: number;
  cell117_voltage: number;
  cell118_voltage: number;
  cell119_voltage: number;
  cell120_voltage: number;
  cell121_voltage: number;
  cell122_voltage: number;
  cell123_voltage: number;
  cell124_voltage: number;
  cell125_voltage: number;
  cell126_voltage: number;
  cell127_voltage: number;

  // Cell Temps
  cell0_temp: number;
  cell1_temp: number;
  cell2_temp: number;
  cell3_temp: number;
  cell4_temp: number;
  cell5_temp: number;
  cell6_temp: number;
  cell7_temp: number;
  cell8_temp: number;
  cell9_temp: number;
  cell10_temp: number;
  cell11_temp: number;
  cell12_temp: number;
  cell13_temp: number;
  cell14_temp: number;
  cell15_temp: number;
  cell16_temp: number;
  cell17_temp: number;
  cell18_temp: number;
  cell19_temp: number;
  cell20_temp: number;
  cell21_temp: number;
  cell22_temp: number;
  cell23_temp: number;
  cell24_temp: number;
  cell25_temp: number;
  cell26_temp: number;
  cell27_temp: number;
  cell28_temp: number;
  cell29_temp: number;
  cell30_temp: number;
  cell31_temp: number;
  cell32_temp: number;
  cell33_temp: number;
  cell34_temp: number;
  cell35_temp: number;
  cell36_temp: number;
  cell37_temp: number;
  cell38_temp: number;
  cell39_temp: number;
  cell40_temp: number;
  cell41_temp: number;
  cell42_temp: number;
  cell43_temp: number;
  cell44_temp: number;
  cell45_temp: number;
  cell46_temp: number;
  cell47_temp: number;
  cell48_temp: number;
  cell49_temp: number;
  cell50_temp: number;
  cell51_temp: number;
  cell52_temp: number;
  cell53_temp: number;
  cell54_temp: number;
  cell55_temp: number;
  cell56_temp: number;
  cell57_temp: number;
  cell58_temp: number;
  cell59_temp: number;
  cell60_temp: number;
  cell61_temp: number;
  cell62_temp: number;
  cell63_temp: number;
  cell64_temp: number;
  cell65_temp: number;
  cell66_temp: number;
  cell67_temp: number;
  cell68_temp: number;
  cell69_temp: number;
  cell70_temp: number;
  cell71_temp: number;
  cell72_temp: number;
  cell73_temp: number;
  cell74_temp: number;
  cell75_temp: number;
  cell76_temp: number;
  cell77_temp: number;
  cell78_temp: number;
  cell79_temp: number;
  cell80_temp: number;
  cell81_temp: number;
  cell82_temp: number;
  cell83_temp: number;
  cell84_temp: number;
  cell85_temp: number;
  cell86_temp: number;
  cell87_temp: number;
  cell88_temp: number;
  cell89_temp: number;
  cell90_temp: number;
  cell91_temp: number;
  cell92_temp: number;
  cell93_temp: number;
  cell94_temp: number;
  cell95_temp: number;
  cell96_temp: number;
  cell97_temp: number;
  cell98_temp: number;
  cell99_temp: number;
  cell100_temp: number;
  cell101_temp: number;
  cell102_temp: number;
  cell103_temp: number;
  cell104_temp: number;
  cell105_temp: number;
  cell106_temp: number;
  cell107_temp: number;
  cell108_temp: number;
  cell109_temp: number;
  cell110_temp: number;
  cell111_temp: number;
  cell112_temp: number;
  cell113_temp: number;
  cell114_temp: number;
  cell115_temp: number;
  cell116_temp: number;
  cell117_temp: number;
  cell118_temp: number;
  cell119_temp: number;
  cell120_temp: number;
  cell121_temp: number;
  cell122_temp: number;
  cell123_temp: number;
  cell124_temp: number;
  cell125_temp: number;
  cell126_temp: number;
  cell127_temp: number;
}

export const getSegments = (acu: ACU) => {
  let segment0VoltageSum = 0;
  let segment1VoltageSum = 0;
  let segment2VoltageSum = 0;
  let segment3VoltageSum = 0;
  let segment4VoltageSum = 0;
  let segment5VoltageSum = 0;
  let segment6VoltageSum = 0;
  let segment7VoltageSum = 0;

  let segment0TempSum = 0;
  let segment1TempSum = 0;
  let segment2TempSum = 0;
  let segment3TempSum = 0;
  let segment4TempSum = 0;
  let segment5TempSum = 0;
  let segment6TempSum = 0;
  let segment7TempSum = 0;

  for (let i = 0; i < 128; i++) {
    const voltageField = acu[`cell${i}_voltage`];
    const voltageAdd = typeof voltageField === "number" ? voltageField : 0;
    if (i < 16) {
      segment0VoltageSum += voltageAdd;
    } else if (i < 32) {
      segment1VoltageSum += voltageAdd;
    } else if (i < 48) {
      segment2VoltageSum += voltageAdd;
    } else if (i < 64) {
      segment3VoltageSum += voltageAdd;
    } else if (i < 80) {
      segment4VoltageSum += voltageAdd;
    } else if (i < 96) {
      segment5VoltageSum += voltageAdd;
    } else if (i < 112) {
      segment6VoltageSum += voltageAdd;
    } else {
      segment7VoltageSum += voltageAdd;
    }

    const tempField = acu[`cell${i}_temp`];
    const tempAdd = typeof tempField === "number" ? tempField : 0;
    if (i < 16) {
      segment0TempSum += tempAdd;
    } else if (i < 32) {
      segment1TempSum += tempAdd;
    } else if (i < 48) {
      segment2TempSum += tempAdd;
    } else if (i < 64) {
      segment3TempSum += tempAdd;
    } else if (i < 80) {
      segment4TempSum += tempAdd;
    } else if (i < 96) {
      segment5TempSum += tempAdd;
    } else if (i < 112) {
      segment6TempSum += tempAdd;
    } else {
      segment7TempSum += tempAdd;
    }
  }

  return {
    segment0_voltage: segment0VoltageSum / 16,
    segment1_voltage: segment1VoltageSum / 16,
    segment2_voltage: segment2VoltageSum / 16,
    segment3_voltage: segment3VoltageSum / 16,
    segment4_voltage: segment4VoltageSum / 16,
    segment5_voltage: segment5VoltageSum / 16,
    segment6_voltage: segment6VoltageSum / 16,
    segment7_voltage: segment7VoltageSum / 16,
    segment0_voltage_sum: segment0VoltageSum,
    segment1_voltage_sum: segment1VoltageSum,
    segment2_voltage_sum: segment2VoltageSum,
    segment3_voltage_sum: segment3VoltageSum,
    segment4_voltage_sum: segment4VoltageSum,
    segment5_voltage_sum: segment5VoltageSum,
    segment6_voltage_sum: segment6VoltageSum,
    segment7_voltage_sum: segment7VoltageSum,
    segment0_temp: segment0TempSum / 16,
    segment1_temp: segment1TempSum / 16,
    segment2_temp: segment2TempSum / 16,
    segment3_temp: segment3TempSum / 16,
    segment4_temp: segment4TempSum / 16,
    segment5_temp: segment5TempSum / 16,
    segment6_temp: segment6TempSum / 16,
    segment7_temp: segment7TempSum / 16,
  };
};

const setDefaultVoltages = (acu: ACU) => {
  for (let i = 0; i < 128; i++) {
    acu[`cell${i}_voltage`] = 0;
  }
};

const setDefaultTemps = (acu: ACU) => {
  for (let i = 0; i < 128; i++) {
    acu[`cell${i}_temp`] = 0;
  }
};

export const setRandomVoltages = (acu: ACU) => {
  for (let i = 0; i < 128; i++) {
    acu[`cell${i}_voltage`] = Math.random() * 4.2;
  }
};

export const setRandomTemps = (acu: ACU) => {
  for (let i = 0; i < 128; i++) {
    acu[`cell${i}_temp`] = Math.random() * 65;
  }
};

export const initACU = () => {
  let init = {
    id: "",
    vehicle_id: "",
    created_at: new Date(),

    accumulator_voltage: 0,
    accumulator_current: 0,
    max_cell_temp: 0,

    // Errors
    errors: 0,
    over_temp_error: false,
    over_voltage_error: false,
    over_current_error: false,
    bms_error: false,
    under_voltage_error: false,
    precharge_error: false,
    teensy_error: false,
    under_temp_error: false,

    // Warnings
    warnings: 0,
    open_wire_warning: false,
    adc_warning: false,
    cell_warning: false,
    high_current_warning: false,
    low_charge_state_warning: false,
    cell_imbalance_warning: false,
    humidity_warning: false,
    hydrogen_warning: false,

    ts_voltage: 0,

    // States
    states: 0,
    is_air_positive: false,
    is_air_negative: false,
    is_precharging: false,
    is_precharge_done: false,
    is_shutdown: false,

    max_bal_resistor_temp: 0,
    sdc_voltage: 0,
    glv_voltage: 0,
    state_of_charge: 0,
    fan1_speed: 0,
    fan2_speed: 0,
    fan3_speed: 0,
    pump_speed: 0,
    acu_temp1: 0,
    acu_temp2: 0,
    acu_temp3: 0,

    // CoolingErrors
    cooling_errors: 0,
    water_overtemp_error: false,
    fan1_error: false,
    fan2_error: false,
    fan3_error: false,
    fan4_error: false,
    pump_error: false,
  };
  setDefaultVoltages(init);
  setDefaultTemps(init);
  return init;
};
